import { useState, useRef, useCallback, useEffect } from 'react';

export type RecordingState = 'idle' | 'recording' | 'paused' | 'stopped';

export interface UseVoiceRecordingReturn {
  state: RecordingState;
  elapsedSeconds: number;
  /** Dados de frequência normalizados [0..1] para desenho da waveform (32 barras) */
  frequencyBars: number[];
  audioBlob: Blob | null;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  resetRecording: () => void;
  error: string | null;
}

const BAR_COUNT = 32;
const MAX_RECORDING_SECONDS = 90 * 60; // 90 minutos

/**
 * Hook de gravação segura usando a MediaRecorder API.
 *
 * Preferências de codecs (maior compressão → menor tamanho → menor custo de API):
 *   1. audio/webm;codecs=opus  (Chrome/Edge/Firefox)
 *   2. audio/webm               (fallback)
 *   3. audio/ogg;codecs=opus   (Firefox sem webm)
 *   4. audio/mp4                (Safari)
 *
 * O blob gerado vai para o upload multipart no backend.
 */
export function useVoiceRecording(): UseVoiceRecordingReturn {
  const [state, setState] = useState<RecordingState>('idle');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [frequencyBars, setFrequencyBars] = useState<number[]>(Array(BAR_COUNT).fill(0));
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopAnalyser = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    setFrequencyBars(Array(BAR_COUNT).fill(0));
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const releaseStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    audioCtxRef.current?.close();
    audioCtxRef.current = null;
    analyserRef.current = null;
  }, []);

  /** Anima a waveform via Web Audio API AnalyserNode */
  const startAnalyser = useCallback((stream: MediaStream) => {
    const ctx = new AudioContext();
    const source = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 128;
    analyser.smoothingTimeConstant = 0.7;
    source.connect(analyser);

    audioCtxRef.current = ctx;
    analyserRef.current = analyser;

    const dataArray = new Uint8Array(analyser.frequencyBinCount);

    const tick = () => {
      analyser.getByteFrequencyData(dataArray);

      // Seleciona BAR_COUNT bins distribuídos pelo espectro
      const step = Math.floor(dataArray.length / BAR_COUNT);
      const bars = Array.from({ length: BAR_COUNT }, (_, i) => {
        const val = dataArray[i * step] ?? 0;
        return Math.min(1, val / 200); // normaliza 0..1
      });

      setFrequencyBars(bars);
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
  }, []);

  const getBestMimeType = (): string => {
    const candidates = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/ogg;codecs=opus',
      'audio/mp4',
    ];
    return candidates.find((m) => MediaRecorder.isTypeSupported(m)) ?? '';
  };

  const startRecording = useCallback(async () => {
    setError(null);
    chunksRef.current = [];
    setAudioBlob(null);
    setElapsedSeconds(0);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16_000,       // 16kHz — ótimo para Whisper e compacto
        },
      });
      streamRef.current = stream;

      const mimeType = getBestMimeType();
      const mr = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = mr;

      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mr.mimeType || 'audio/webm' });
        setAudioBlob(blob);
        stopAnalyser();
        stopTimer();
        releaseStream();
        setState('stopped');
      };

      mr.start(1000); // chunk a cada 1s (garante dados mesmo se parar no meio)
      setState('recording');

      startAnalyser(stream);

      // Cronômetro
      timerRef.current = setInterval(() => {
        setElapsedSeconds((prev) => {
          if (prev >= MAX_RECORDING_SECONDS) {
            mr.stop();
            return prev;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err: any) {
      if (err.name === 'NotAllowedError') {
        setError('Permissão de microfone negada. Autorize o acesso nas configurações do navegador.');
      } else if (err.name === 'NotFoundError') {
        setError('Microfone não encontrado. Verifique se há um dispositivo de áudio conectado.');
      } else {
        setError('Erro ao iniciar gravação: ' + (err.message ?? 'Erro desconhecido'));
      }
      releaseStream();
    }
  }, [startAnalyser, stopAnalyser, stopTimer, releaseStream]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state !== 'inactive') {
      mediaRecorderRef.current?.stop();
    }
  }, []);

  const resetRecording = useCallback(() => {
    stopRecording();
    stopAnalyser();
    stopTimer();
    releaseStream();
    chunksRef.current = [];
    setAudioBlob(null);
    setElapsedSeconds(0);
    setError(null);
    setState('idle');
  }, [stopRecording, stopAnalyser, stopTimer, releaseStream]);

  // Cleanup ao desmontar
  useEffect(() => {
    return () => {
      stopAnalyser();
      stopTimer();
      releaseStream();
      if (mediaRecorderRef.current?.state !== 'inactive') {
        mediaRecorderRef.current?.stop();
      }
    };
  }, [stopAnalyser, stopTimer, releaseStream]);

  return {
    state,
    elapsedSeconds,
    frequencyBars,
    audioBlob,
    startRecording,
    stopRecording,
    resetRecording,
    error,
  };
}
