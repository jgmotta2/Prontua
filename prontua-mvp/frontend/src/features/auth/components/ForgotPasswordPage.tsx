import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api, ApiClientError } from '@lib/api/client';
import { useMutation } from '@tanstack/react-query';

const emailSchema = z.object({
  email: z.string().trim().toLowerCase().email('E-mail inválido'),
});

const resetSchema = z.object({
  code: z.string().length(6, 'Código deve ter 6 dígitos').regex(/^\d{6}$/),
  newPassword: z
    .string()
    .min(8, 'Mínimo 8 caracteres')
    .refine((s) => /[a-z]/.test(s), 'Deve conter letra minúscula')
    .refine((s) => /[A-Z]/.test(s), 'Deve conter letra maiúscula')
    .refine((s) => /\d/.test(s), 'Deve conter número'),
});

type EmailValues = z.infer<typeof emailSchema>;
type ResetValues = z.infer<typeof resetSchema>;

export function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');

  const forgotMutation = useMutation<void, ApiClientError, { email: string }>({
    mutationFn: (body) => api.post('/auth/forgot-password', body),
  });

  const resetMutation = useMutation<void, ApiClientError, { email: string; code: string; newPassword: string }>({
    mutationFn: (body) => api.post('/auth/reset-password', body),
  });

  const emailForm = useForm<EmailValues>({ resolver: zodResolver(emailSchema) });
  const resetForm = useForm<ResetValues>({ resolver: zodResolver(resetSchema) });

  const onEmailSubmit = emailForm.handleSubmit(async (values) => {
    await forgotMutation.mutateAsync(values);
    setEmail(values.email);
    setStep('code');
  });

  const onResetSubmit = resetForm.handleSubmit(async (values) => {
    try {
      await resetMutation.mutateAsync({ email, ...values });
      navigate('/entrar', { state: { message: 'Senha redefinida! Faça login com a nova senha.' } });
    } catch (err: any) {
      resetForm.setError('root', { message: err?.message ?? 'Código inválido ou expirado.' });
    }
  });

  if (step === 'code') {
    return (
      <form onSubmit={onResetSubmit} className="space-y-4 p-6" noValidate>
        <div>
          <h2 className="font-display text-2xl font-semibold text-ink">Redefinir senha</h2>
          <p className="text-sm text-muted mt-1">
            Enviamos um código para <strong>{email}</strong>. Pode demorar alguns instantes.
          </p>
        </div>

        <div>
          <label className="label">Código de 6 dígitos</label>
          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            placeholder="000000"
            autoFocus
            className={`input text-center tracking-widest font-semibold ${resetForm.formState.errors.code ? 'input-error' : ''}`}
            {...resetForm.register('code')}
          />
          {resetForm.formState.errors.code && (
            <p className="helper-error">{resetForm.formState.errors.code.message}</p>
          )}
        </div>

        <div>
          <label className="label">Nova senha</label>
          <input
            type="password"
            autoComplete="new-password"
            className={`input ${resetForm.formState.errors.newPassword ? 'input-error' : ''}`}
            {...resetForm.register('newPassword')}
          />
          {resetForm.formState.errors.newPassword ? (
            <p className="helper-error">{resetForm.formState.errors.newPassword.message}</p>
          ) : (
            <p className="helper">Mínimo 8 caracteres, maiúscula, minúscula e número.</p>
          )}
        </div>

        {resetForm.formState.errors.root && (
          <div className="rounded-xl border border-terracotta/30 bg-terracotta/5 p-3 text-sm text-terracotta">
            {resetForm.formState.errors.root.message}
          </div>
        )}

        <button
          type="submit"
          className="btn-primary w-full"
          disabled={resetForm.formState.isSubmitting}
        >
          {resetForm.formState.isSubmitting ? 'Redefinindo...' : 'Redefinir senha'}
        </button>

        <button
          type="button"
          onClick={() => setStep('email')}
          className="w-full text-center text-sm text-muted hover:text-ink transition"
        >
          Usar outro e-mail
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={onEmailSubmit} className="space-y-4 p-6" noValidate>
      <div>
        <h2 className="font-display text-2xl font-semibold text-ink">Esqueci minha senha</h2>
        <p className="text-sm text-muted mt-1">
          Informe seu e-mail e enviaremos um código para redefinir a senha.
        </p>
      </div>

      <div>
        <label className="label">E-mail</label>
        <input
          type="email"
          autoComplete="email"
          autoFocus
          className={`input ${emailForm.formState.errors.email ? 'input-error' : ''}`}
          {...emailForm.register('email')}
        />
        {emailForm.formState.errors.email && (
          <p className="helper-error">{emailForm.formState.errors.email.message}</p>
        )}
      </div>

      {emailForm.formState.errors.root && (
        <div className="rounded-xl border border-terracotta/30 bg-terracotta/5 p-3 text-sm text-terracotta">
          {emailForm.formState.errors.root.message}
        </div>
      )}

      <button
        type="submit"
        className="btn-primary w-full"
        disabled={emailForm.formState.isSubmitting || forgotMutation.isPending}
      >
        {emailForm.formState.isSubmitting || forgotMutation.isPending ? 'Enviando...' : 'Enviar código'}
      </button>

      <p className="text-center text-sm text-muted pt-2">
        Lembrou a senha?{' '}
        <Link to="/entrar" className="font-medium text-sage hover:text-sage-dark">
          Entrar
        </Link>
      </p>
    </form>
  );
}
