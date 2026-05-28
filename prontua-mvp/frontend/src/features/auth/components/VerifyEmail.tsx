import { useRef, useState, useEffect, type KeyboardEvent, type ClipboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, RefreshCw } from 'lucide-react';
import { useSendVerification, useConfirmVerification } from '../hooks/useVerifyEmail';

const DIGITS = 6;

export function VerifyEmail() {
  const navigate = useNavigate();
  const [digits, setDigits] = useState<string[]>(Array(DIGITS).fill(''));
  const [error, setError] = useState('');
  const [resent, setResent] = useState(false);
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  const confirm = useConfirmVerification();
  const resend = useSendVerification();

  // Foca no primeiro campo ao montar
  useEffect(() => { inputs.current[0]?.focus(); }, []);

  // Submete automaticamente quando todos os dígitos estão preenchidos
  useEffect(() => {
    if (digits.every((d) => d !== '')) {
      void handleSubmit(digits.join(''));
    }
  }, [digits]);

  function updateDigit(index: number, value: string) {
    const d = value.replace(/\D/g, '').slice(-1);
    const next = [...digits];
    next[index] = d;
    setDigits(next);
    setError('');
    if (d && index < DIGITS - 1) inputs.current[index + 1]?.focus();
  }

  function handleKeyDown(index: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  }

  function handlePaste(e: ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, DIGITS);
    if (!pasted) return;
    const next = Array(DIGITS).fill('');
    pasted.split('').forEach((c, i) => { next[i] = c; });
    setDigits(next);
    inputs.current[Math.min(pasted.length, DIGITS - 1)]?.focus();
  }

  async function handleSubmit(code: string) {
    try {
      await confirm.mutateAsync({ code });
      navigate('/painel', { replace: true });
    } catch (err: any) {
      setError(err?.message ?? 'Código inválido. Tente novamente.');
      setDigits(Array(DIGITS).fill(''));
      setTimeout(() => inputs.current[0]?.focus(), 50);
    }
  }

  async function handleResend() {
    try {
      await resend.mutateAsync();
      setResent(true);
      setDigits(Array(DIGITS).fill(''));
      setError('');
      setTimeout(() => { setResent(false); inputs.current[0]?.focus(); }, 3000);
    } catch {
      setError('Não foi possível reenviar. Tente em alguns instantes.');
    }
  }

  return (
    <div className="mx-auto w-full max-w-md space-y-6 p-6">
      <div className="flex flex-col items-center text-center space-y-3">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-sage/10">
          <Mail className="h-6 w-6 text-sage-dark" strokeWidth={1.5} />
        </div>
        <h1 className="font-display text-2xl font-semibold text-ink">Confirme seu e-mail</h1>
        <p className="text-sm text-muted">
          Enviamos um código de 6 dígitos para o seu e-mail. Insira abaixo para ativar sua conta.
        </p>
      </div>

      <div className="flex justify-center gap-2 sm:gap-3">
        {digits.map((d, i) => (
          <input
            key={i}
            ref={(el) => { inputs.current[i] = el; }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={d}
            onChange={(e) => updateDigit(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            onPaste={handlePaste}
            disabled={confirm.isPending}
            className={[
              'h-14 w-11 sm:w-12 rounded-xl border text-center text-xl font-semibold text-ink outline-none transition',
              'focus:border-sage focus:ring-2 focus:ring-sage/20',
              error ? 'border-terracotta' : 'border-sage/20',
              confirm.isPending ? 'opacity-50' : '',
            ].join(' ')}
          />
        ))}
      </div>

      {error && (
        <p className="text-center text-sm text-terracotta">{error}</p>
      )}

      {resent && (
        <p className="text-center text-sm text-sage-dark">Novo código enviado!</p>
      )}

      {confirm.isPending && (
        <p className="text-center text-sm text-muted">Verificando...</p>
      )}

      <div className="flex flex-col items-center gap-3 pt-2">
        <button
          type="button"
          onClick={handleResend}
          disabled={resend.isPending || resent}
          className="flex items-center gap-2 text-sm font-medium text-sage hover:text-sage-dark disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${resend.isPending ? 'animate-spin' : ''}`} />
          {resend.isPending ? 'Reenviando...' : 'Reenviar código'}
        </button>

        <button
          type="button"
          onClick={() => navigate('/', { replace: true })}
          className="text-xs text-muted hover:text-ink"
        >
          Verificar depois
        </button>
      </div>
    </div>
  );
}
