import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Shield } from 'lucide-react';
import { useMfaVerify, useMfaSendOtp } from '@features/security/hooks/useMfa';
import type { MfaMethod } from '@features/security/api/mfa.api';

interface TwoFactorFormProps {
  tempToken: string;
  mfaMethod: MfaMethod;
  onBack: () => void;
}

export function TwoFactorForm({ tempToken, mfaMethod, onBack }: TwoFactorFormProps) {
  const [code, setCode]     = useState('');
  const [error, setError]   = useState('');
  const [otpSent, setOtpSent] = useState(false);

  const navigate     = useNavigate();
  const queryClient  = useQueryClient();
  const verify       = useMfaVerify();
  const sendOtp      = useMfaSendOtp();

  const handleSendOtp = async () => {
    setError('');
    try {
      await sendOtp.mutateAsync(tempToken);
      setOtpSent(true);
    } catch (err: any) {
      setError(err?.message ?? 'Erro ao enviar código');
    }
  };

  const handleVerify = async () => {
    if (code.length !== 6) return;
    setError('');
    try {
      await verify.mutateAsync({ tempToken, code });
      await queryClient.invalidateQueries({ queryKey: ['session'] });
      navigate('/painel', { replace: true });
    } catch (err: any) {
      setError('Código inválido ou expirado.');
      setCode('');
    }
  };

  return (
    <div className="space-y-5 p-6">
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-emerald-100 p-2">
          <Shield className="h-5 w-5 text-emerald-600" />
        </div>
        <div>
          <h2 className="font-display text-xl font-semibold text-ink">Verificação em duas etapas</h2>
          <p className="text-xs text-muted mt-0.5">
            {mfaMethod === 'APP'
              ? 'Abra seu app autenticador e digite o código.'
              : 'Digite o código recebido no seu WhatsApp.'}
          </p>
        </div>
      </div>

      {mfaMethod === 'WHATSAPP' && !otpSent && (
        <button
          onClick={handleSendOtp}
          disabled={sendOtp.isPending}
          className="btn-primary w-full"
        >
          {sendOtp.isPending ? 'Enviando...' : 'Enviar código via WhatsApp'}
        </button>
      )}

      {(mfaMethod === 'APP' || otpSent) && (
        <>
          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            placeholder="000000"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            className="input text-center text-3xl tracking-widest font-mono"
            autoFocus
          />

          {error && (
            <div role="alert" className="rounded-xl border border-terracotta/30 bg-terracotta/5 p-3 text-sm text-terracotta">
              {error}
            </div>
          )}

          <button
            onClick={handleVerify}
            disabled={code.length !== 6 || verify.isPending}
            className="btn-primary w-full"
          >
            {verify.isPending ? 'Verificando...' : 'Confirmar'}
          </button>
        </>
      )}

      <button
        onClick={onBack}
        className="w-full text-center text-sm text-muted hover:text-ink transition"
      >
        ← Voltar ao login
      </button>
    </div>
  );
}
