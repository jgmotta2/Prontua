import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@lib/api/client';

export interface VoiceReport {
  id: string;
  sessionId: string;
  rawTranscription: string;
  structuredReport: string;
  isFinalized: boolean;
  hasPdf: boolean;
  createdAt: string;
  updatedAt: string;
  author: { id: string; name: string };
  session: {
    scheduledAt: string;
    patient: { fullName: string };
  };
}

export interface UploadAudioResult {
  reportId: string;
  rawTranscription: string;
  structuredReport: string;
}

/** Busca o relatório de voz de uma sessão específica */
export function useVoiceReport(sessionId: string | null) {
  return useQuery<VoiceReport | null>({
    queryKey: ['voice-report', sessionId],
    queryFn: async () => {
      try {
        return await api.get<VoiceReport>(`/voice/sessions/${sessionId}/report`);
      } catch (err: any) {
        if (err?.status === 404) return null;
        throw err;
      }
    },
    enabled: !!sessionId,
    staleTime: 10_000,
    retry: false,
  });
}

/** Upload do áudio para transcrição e estruturação */
export function useUploadAudio(sessionId: string) {
  const qc = useQueryClient();

  return useMutation<UploadAudioResult, Error, Blob>({
    mutationFn: async (audioBlob: Blob) => {
      const formData = new FormData();
      const ext = audioBlob.type.includes('mp4') ? 'mp4'
                : audioBlob.type.includes('ogg')  ? 'ogg'
                : audioBlob.type.includes('mp3') || audioBlob.type.includes('mpeg') ? 'mp3'
                : 'webm';
      formData.append('audio', audioBlob, `recording.${ext}`);
      return api.upload<UploadAudioResult>(`/voice/sessions/${sessionId}/upload`, formData);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['voice-report', sessionId] });
    },
  });
}

/** Atualiza o texto do relatório (edição manual pelo profissional) */
export function useUpdateReport(reportId: string, sessionId: string) {
  const qc = useQueryClient();

  return useMutation<{ id: string; updatedAt: string }, Error, string>({
    mutationFn: (structuredReport: string) =>
      api.patch<{ id: string; updatedAt: string }>(`/voice/reports/${reportId}`, {
        structuredReport,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['voice-report', sessionId] });
    },
  });
}

/** Finaliza o prontuário e faz download do PDF */
export function useFinalizeReport(reportId: string, sessionId: string) {
  const qc = useQueryClient();

  return useMutation<void, Error>({
    mutationFn: async () => {
      // Chama o endpoint que retorna o PDF como blob binário
      const BASE_URL = (import.meta.env.VITE_API_BASE_URL as string) || '/api';
      const res = await fetch(`${BASE_URL}/voice/reports/${reportId}/finalize`, {
        method: 'POST',
        credentials: 'include',
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as any)?.error?.message ?? `Erro ${res.status}`);
      }

      // Força o download do PDF no navegador
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `prontuario-${reportId.slice(0, 8)}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['voice-report', sessionId] });
    },
  });
}

/** Download do PDF de um relatório já finalizado */
export function useDownloadPdf(reportId: string) {
  return useMutation<void, Error>({
    mutationFn: async () => {
      const BASE_URL = (import.meta.env.VITE_API_BASE_URL as string) || '/api';
      const res = await fetch(`${BASE_URL}/voice/reports/${reportId}/pdf`, {
        credentials: 'include',
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as any)?.error?.message ?? `Erro ${res.status}`);
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `prontuario-${reportId.slice(0, 8)}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },
  });
}
