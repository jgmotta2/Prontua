import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { loginSchema, type LoginFormValues } from '@lib/validation/auth.schema';
import { useLogin, useMfaVerify } from '@features/auth/hooks/useLogin';

export function LoginForm() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const login = useLogin();
  const mfaVerify = useMfaVerify();

  // Estado de MFA: null = etapa de senha, string = preAuthToken aguardando OTP
  const [preAuthToken, setPreAuthToken] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState('');
  const [mfaError, setMfaError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    mode: 'onBlur',
  });

  // ── Passo 1: enviar e-mail + senha ──────────────────────────────────────
  const onSubmit = handleSubmit(async (values) => {
    try {
      const result = await login.mutateAsync(values);

      if (result.step === 'mfa_required') {
        // Guarda o token pré-auth e exibe input de OTP
        setPreAuthToken(result.preAuthToken);
        return;
      }

      // Autenticação direta (ex: fluxo sem MFA no futuro)
      await queryClient.invalidateQueries({ queryKey: ['session'] });
      navigate('/painel', { replace: true });
    } catch (err: any) {
      if (err?.code === 'UNAUTHENTICATED') {
        setError('root', { message: 'E-mail ou senha incorretos.' });
        return;
      }
      if (err?.code === 'RATE_LIMITED') {
        setError('root', { message: 'Muitas tentativas. Aguarde alguns minutos.' });
        return;
      }
      setError('root', { message: err?.message ?? 'Falha ao entrar' });
    }
  });

  // ── Passo 2: verificar código OTP ───────────────────────────────────────
  const onVerifyMfa = async () => {
    if (!preAuthToken) return;
    const code = mfaCode.replace(/\s/g, '');
    if (code.length < 6) {
      setMfaError('Digite os 6 dígitos do código.');
      return;
    }
    setMfaError('');

    try {
      await mfaVerify.mutateAsync({ preAuthToken, code });
      await queryClient.invalidateQueries({ queryKey: ['session'] });
      navigate('/painel', { replace: true });
    } catch (err: any) {
      if (err?.code === 'UNAUTHENTICATED') {
        setMfaError('Código inválido ou expirado. Tente novamente.');
        return;
      }
      setMfaError(err?.message ?? 'Erro ao verificar código.');
    }
  };

  // ── Tela de OTP (passo 2) ───────────────────────────────────────────────
  if (preAuthToken !== null) {
    return (
      <div className="space-y-4 p-6">
        <div>
          <h2 className="font-display text-2xl font-semibold text-ink">Verificação em duas etapas</h2>
          <p className="text-sm text-muted mt-1">
            Enviamos um código de 6 dígitos para o seu e-mail. Ele expira em 10 minutos.
          </p>
        </div>

        <div>
          <label htmlFor="mfa-code" className="label">Código de acesso</label>
          <input
            id="mfa-code"
            type="text"
            inputMode="numeric"
            maxLength={6}
            autoFocus
            autoComplete="one-time-code"
            placeholder="000000"
            className="input text-center tracking-widest text-2xl font-semibold"
            value={mfaCode}
            onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            onKeyDown={(e) => e.key === 'Enter' && onVerifyMfa()}
          />
        </div>

        {mfaError && (
          <div role="alert" className="rounded-xl border border-terracotta/30 bg-terracotta/5 p-3 text-sm text-terracotta">
            {mfaError}
          </div>
        )}

        <button
          type="button"
          className="btn-primary w-full"
          onClick={onVerifyMfa}
          disabled={mfaVerify.isPending}
        >
          {mfaVerify.isPending ? 'Verificando...' : 'Confirmar código'}
        </button>

        <button
          type="button"
          className="w-full text-center text-sm text-muted hover:text-sage-dark transition"
          onClick={() => { setPreAuthToken(null); setMfaCode(''); setMfaError(''); }}
        >
          ← Voltar ao login
        </button>
      </div>
    );
  }

  // ── Tela de login (passo 1) ─────────────────────────────────────────────
  return (
    <form onSubmit={onSubmit} className="space-y-4 p-6" noValidate>
      <div>
        <h2 className="font-display text-2xl font-semibold text-ink">Entrar</h2>
        <p className="text-sm text-muted mt-1">Acesse sua conta para continuar.</p>
      </div>

      <div>
        <label htmlFor="email" className="label">E-mail</label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          autoFocus
          className={`input ${errors.email ? 'input-error' : ''}`}
          {...register('email')}
        />
        {errors.email && <p className="helper-error">{errors.email.message}</p>}
      </div>

      <div>
        <label htmlFor="password" className="label">Senha</label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          className={`input ${errors.password ? 'input-error' : ''}`}
          {...register('password')}
        />
        {errors.password && <p className="helper-error">{errors.password.message}</p>}
      </div>

      {errors.root && (
        <div
          role="alert"
          className="rounded-xl border border-terracotta/30 bg-terracotta/5 p-3 text-sm text-terracotta"
        >
          {errors.root.message}
        </div>
      )}

      <button type="submit" className="btn-primary w-full" disabled={isSubmitting}>
        {isSubmitting ? 'Entrando...' : 'Entrar'}
      </button>

      <p className="text-center text-sm text-muted pt-2">
        Ainda não tem conta?{' '}
        <Link to="/cadastro" className="font-medium text-sage hover:text-sage-dark">
          Criar conta
        </Link>
      </p>
    </form>
  );
}
