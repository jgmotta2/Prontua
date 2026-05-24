import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import {
  registerSchema,
  BR_STATES,
  SPECIALTIES,
  type RegisterFormValues,
} from '@lib/validation/auth.schema';
import { maskWhatsappBr } from '@lib/utils/mask';
import { useRegister } from '@features/auth/hooks/useRegister';

export function RegisterForm() {
  const navigate = useNavigate();
  const register = useRegister();

  const {
    register: rhfRegister,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
    setValue,
    watch,
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { tags: undefined } as any,
    mode: 'onBlur',
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      await register.mutateAsync(values);
      navigate('/painel', { replace: true });
    } catch (err: any) {
      // Mapeia erros de validação do backend para os campos do form.
      if (err?.code === 'VALIDATION_ERROR' && err.details) {
        for (const [field, msgs] of Object.entries(err.details as Record<string, string[]>)) {
          setError(field as keyof RegisterFormValues, { message: msgs[0] });
        }
        return;
      }
      if (err?.code === 'CONFLICT') {
        setError('email', { message: err.message });
        return;
      }
      setError('root', { message: err?.message ?? 'Falha ao cadastrar' });
    }
  });

  const whatsapp = watch('whatsapp');

  return (
    <form onSubmit={onSubmit} className="mx-auto w-full max-w-md space-y-4 p-6" noValidate>
      <h1 className="font-display text-3xl font-semibold text-ink">Crie sua conta</h1>
      <p className="text-sm text-muted">Comece em 2 minutos. Sem cartão de crédito.</p>

      <div>
        <label className="label" htmlFor="name">Nome completo</label>
        <input
          id="name"
          autoComplete="name"
          className={`input ${errors.name ? 'input-error' : ''}`}
          {...rhfRegister('name')}
        />
        {errors.name && <p className="helper-error">{errors.name.message}</p>}
      </div>

      <div>
        <label className="label" htmlFor="email">E-mail</label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          className={`input ${errors.email ? 'input-error' : ''}`}
          {...rhfRegister('email')}
        />
        {errors.email && <p className="helper-error">{errors.email.message}</p>}
      </div>

      <div>
        <label className="label" htmlFor="password">Senha</label>
        <input
          id="password"
          type="password"
          autoComplete="new-password"
          className={`input ${errors.password ? 'input-error' : ''}`}
          {...rhfRegister('password')}
        />
        {errors.password ? (
          <p className="helper-error">{errors.password.message}</p>
        ) : (
          <p className="helper">Mínimo 8 caracteres, com maiúscula, minúscula e número.</p>
        )}
      </div>

      <div>
        <label className="label" htmlFor="whatsapp">WhatsApp</label>
        <input
          id="whatsapp"
          inputMode="numeric"
          placeholder="(11) 98765-4321"
          value={whatsapp ?? ''}
          onChange={(e) => setValue('whatsapp', maskWhatsappBr(e.target.value), { shouldValidate: true })}
          className={`input ${errors.whatsapp ? 'input-error' : ''}`}
        />
        {errors.whatsapp && <p className="helper-error">{errors.whatsapp.message}</p>}
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-2">
          <label className="label" htmlFor="city">Cidade</label>
          <input
            id="city"
            autoComplete="address-level2"
            className={`input ${errors.city ? 'input-error' : ''}`}
            {...rhfRegister('city')}
          />
          {errors.city && <p className="helper-error">{errors.city.message}</p>}
        </div>
        <div>
          <label className="label" htmlFor="state">UF</label>
          <select
            id="state"
            className={`input ${errors.state ? 'input-error' : ''}`}
            {...rhfRegister('state')}
            defaultValue=""
          >
            <option value="" disabled>--</option>
            {BR_STATES.map((uf) => <option key={uf} value={uf}>{uf}</option>)}
          </select>
          {errors.state && <p className="helper-error">{errors.state.message}</p>}
        </div>
      </div>

      <div>
        <label className="label" htmlFor="specialty">Atendimento principal</label>
        <select
          id="specialty"
          className={`input ${errors.specialty ? 'input-error' : ''}`}
          {...rhfRegister('specialty')}
          defaultValue=""
        >
          <option value="" disabled>Selecione...</option>
          {SPECIALTIES.map((s) => (
            <option key={s} value={s}>
              {s.charAt(0) + s.slice(1).toLowerCase().replace('_', ' ')}
            </option>
          ))}
        </select>
        {errors.specialty && <p className="helper-error">{errors.specialty.message}</p>}
      </div>

      <div>
        <label className="label" htmlFor="clinicName">Nome da clínica / consultório</label>
        <input
          id="clinicName"
          placeholder="Ex: Clínica Bem Estar"
          className={`input ${errors.clinicName ? 'input-error' : ''}`}
          {...rhfRegister('clinicName')}
        />
        {errors.clinicName ? (
          <p className="helper-error">{errors.clinicName.message}</p>
        ) : (
          <p className="helper">Opcional — será o nome exibido nos prontuários.</p>
        )}
      </div>

      {errors.root && (
        <div className="rounded-xl border border-terracotta/30 bg-terracotta/5 p-3 text-sm text-terracotta">
          {errors.root.message}
        </div>
      )}

      <button type="submit" className="btn-primary w-full py-3.5" disabled={isSubmitting}>
        {isSubmitting ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            Criando conta...
          </span>
        ) : (
          'Criar conta grátis'
        )}
      </button>

      {/* LGPD trust badge */}
      <div className="flex items-start gap-2.5 rounded-xl border border-sage/30 bg-sage/5 px-3 py-2.5">
        <svg className="mt-0.5 h-4 w-4 shrink-0 text-sage" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
        <p className="text-xs leading-relaxed text-muted">
          Seus dados estão protegidos com{' '}
          <strong className="text-ink">criptografia de ponta a ponta</strong> e em total
          conformidade com a <strong className="text-ink">LGPD</strong>.
        </p>
      </div>
    </form>
  );
}
