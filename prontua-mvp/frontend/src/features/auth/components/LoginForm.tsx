import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { loginSchema, type LoginFormValues } from '@lib/validation/auth.schema';
import { useLogin } from '@features/auth/hooks/useLogin';

export function LoginForm() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const login = useLogin();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    mode: 'onBlur',
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      await login.mutateAsync(values);
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

  // ── Tela de login ────────────────────────────────────────────────────────
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

      <div className="flex justify-end -mt-2">
        <Link to="/esqueci-senha" className="text-xs text-muted hover:text-ink transition">
          Esqueci minha senha
        </Link>
      </div>

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
