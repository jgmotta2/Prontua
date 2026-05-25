import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { User, Mail, RotateCcw, Check, AlertCircle } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, ApiClientError } from '@lib/api/client';
import { BR_STATES, SPECIALTIES } from '@lib/validation/auth.schema';
import { maskWhatsappBr, unmaskWhatsapp } from '@lib/utils/mask';

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface UserProfile {
  id: string;
  name: string;
  email: string;
  whatsapp: string;
  city: string;
  state: string;
  specialty: string;
  registry: string | null;
  emailVerifiedAt: string | null;
  createdAt: string;
}

// ─── Schema de validação do formulário ────────────────────────────────────────

const profileSchema = z.object({
  name:      z.string().trim().min(3, 'Nome muito curto').max(120),
  whatsapp:  z.string().min(10, 'WhatsApp inválido'),
  city:      z.string().trim().min(2, 'Informe a cidade').max(80),
  state:     z.enum(BR_STATES as [string, ...string[]], { errorMap: () => ({ message: 'Selecione o estado' }) }),
  specialty: z.enum(SPECIALTIES as [string, ...string[]], { errorMap: () => ({ message: 'Selecione a especialidade' }) }),
  registry:  z.string().trim().max(50).optional().or(z.literal('')),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

// ─── Hook: busca o perfil completo ────────────────────────────────────────────

function useUserProfile() {
  return useQuery<UserProfile, ApiClientError>({
    queryKey: ['user-profile'],
    queryFn: () => api.get<UserProfile>('/auth/profile'),
    staleTime: 5 * 60 * 1000,
  });
}

// ─── Hook: salva o perfil ─────────────────────────────────────────────────────

function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation<UserProfile, ApiClientError, Partial<ProfileFormValues>>({
    mutationFn: (body) => api.patch<UserProfile>('/auth/profile', body),
    onSuccess: (updated) => {
      qc.setQueryData(['user-profile'], updated);
      qc.invalidateQueries({ queryKey: ['session'] }); // atualiza nome no header
    },
  });
}

// ─── Componente principal ────────────────────────────────────────────────────

export function SettingsPage() {
  const { data: profile, isLoading, isError } = useUserProfile();
  const update = useUpdateProfile();
  const [saved, setSaved] = useState(false);
  const [tourReset, setTourReset] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isDirty },
    reset,
    setValue,
    watch,
    setError,
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
  });

  const whatsapp = watch('whatsapp');

  // Preenche o formulário quando o perfil carrega
  useEffect(() => {
    if (profile) {
      reset({
        name:      profile.name,
        whatsapp:  maskWhatsappBr(profile.whatsapp.replace('+55', '').replace('+', '')),
        city:      profile.city,
        state:     profile.state,
        specialty: profile.specialty,
        registry:  profile.registry ?? '',
      });
    }
  }, [profile, reset]);

  const onSubmit = handleSubmit(async (values) => {
    try {
      const raw = unmaskWhatsapp(values.whatsapp);
      await update.mutateAsync({
        ...values,
        whatsapp: raw,
        registry: values.registry || undefined,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      if (err?.code === 'VALIDATION_ERROR' && err.details) {
        for (const [field, msgs] of Object.entries(err.details as Record<string, string[]>)) {
          setError(field as keyof ProfileFormValues, { message: msgs[0] });
        }
        return;
      }
      setError('root', { message: err?.message ?? 'Erro ao salvar' });
    }
  });

  const handleRestartTour = () => {
    localStorage.removeItem('prontua_tour_done');
    setTourReset(true);
    setTimeout(() => {
      window.location.href = '/painel';
    }, 1200);
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-2xl p-4 sm:p-6 lg:p-8 space-y-6 animate-pulse">
        <div className="h-8 w-48 rounded bg-warm/60" />
        <div className="rounded-2xl bg-white p-6 space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-10 rounded-xl bg-warm/40" />
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="mx-auto max-w-2xl p-4 sm:p-6 lg:p-8">
        <div className="rounded-2xl border border-terracotta/30 bg-terracotta/5 p-6 flex items-center gap-3 text-sm text-terracotta">
          <AlertCircle className="h-5 w-5 shrink-0" />
          Não foi possível carregar as configurações. Recarregue a página.
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Cabeçalho */}
      <header>
        <h1 className="font-display text-2xl sm:text-3xl font-semibold text-ink">Configurações</h1>
        <p className="text-sm text-muted mt-1">Gerencie seu perfil e preferências do sistema.</p>
      </header>

      {/* ── Perfil profissional ──────────────────────────────────────────── */}
      <section className="rounded-2xl bg-white shadow-soft overflow-hidden">
        <div className="flex items-center gap-3 border-b border-warm px-6 py-4">
          <User className="h-4 w-4 text-sage" strokeWidth={1.8} />
          <h2 className="font-display font-semibold text-ink">Perfil profissional</h2>
        </div>

        <form onSubmit={onSubmit} className="space-y-4 p-6">
          {/* Nome */}
          <div>
            <label className="label">Nome completo *</label>
            <input className={`input ${errors.name ? 'input-error' : ''}`} {...register('name')} />
            {errors.name && <p className="helper-error">{errors.name.message}</p>}
          </div>

          {/* WhatsApp + Número de registro */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">WhatsApp *</label>
              <input
                inputMode="numeric"
                placeholder="(11) 98765-4321"
                value={whatsapp ?? ''}
                onChange={(e) => setValue('whatsapp', maskWhatsappBr(e.target.value), { shouldValidate: true })}
                className={`input ${errors.whatsapp ? 'input-error' : ''}`}
              />
              {errors.whatsapp && <p className="helper-error">{errors.whatsapp.message}</p>}
            </div>
            <div>
              <label className="label">Registro profissional</label>
              <input
                placeholder="CRP 00/00000"
                className={`input ${errors.registry ? 'input-error' : ''}`}
                {...register('registry')}
              />
              <p className="helper">Usado no timbre do PDF de prontuário.</p>
            </div>
          </div>

          {/* Especialidade */}
          <div>
            <label className="label">Especialidade *</label>
            <select className={`input ${errors.specialty ? 'input-error' : ''}`} {...register('specialty')}>
              <option value="" disabled>Selecione...</option>
              {SPECIALTIES.map((s) => (
                <option key={s} value={s}>
                  {s.charAt(0) + s.slice(1).toLowerCase().replace(/_/g, ' ')}
                </option>
              ))}
            </select>
            {errors.specialty && <p className="helper-error">{errors.specialty.message}</p>}
          </div>

          {/* Cidade + Estado */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="label">Cidade *</label>
              <input className={`input ${errors.city ? 'input-error' : ''}`} {...register('city')} />
              {errors.city && <p className="helper-error">{errors.city.message}</p>}
            </div>
            <div>
              <label className="label">UF *</label>
              <select className={`input ${errors.state ? 'input-error' : ''}`} {...register('state')}>
                <option value="" disabled>--</option>
                {BR_STATES.map((uf) => <option key={uf} value={uf}>{uf}</option>)}
              </select>
              {errors.state && <p className="helper-error">{errors.state.message}</p>}
            </div>
          </div>

          {errors.root && (
            <div className="rounded-xl border border-terracotta/30 bg-terracotta/5 p-3 text-sm text-terracotta">
              {errors.root.message}
            </div>
          )}

          <div className="flex items-center gap-3 pt-1">
            <button
              type="submit"
              disabled={isSubmitting || !isDirty}
              className="btn-primary disabled:opacity-50"
            >
              {isSubmitting ? 'Salvando...' : 'Salvar alterações'}
            </button>
            {saved && (
              <span className="flex items-center gap-1.5 text-sm text-sage-dark">
                <Check className="h-4 w-4" />
                Salvo com sucesso!
              </span>
            )}
          </div>
        </form>
      </section>

      {/* ── Conta ────────────────────────────────────────────────────────── */}
      <section className="rounded-2xl bg-white shadow-soft overflow-hidden">
        <div className="flex items-center gap-3 border-b border-warm px-6 py-4">
          <Mail className="h-4 w-4 text-sage" strokeWidth={1.8} />
          <h2 className="font-display font-semibold text-ink">Conta</h2>
        </div>
        <div className="p-6 space-y-3">
          <div>
            <label className="label">E-mail</label>
            <input
              type="email"
              className="input bg-warm/30 cursor-not-allowed"
              value={profile?.email ?? ''}
              readOnly
              disabled
            />
            <p className="helper">
              {profile?.emailVerifiedAt
                ? `Verificado em ${new Date(profile.emailVerifiedAt).toLocaleDateString('pt-BR')}`
                : 'E-mail ainda não verificado.'}
            </p>
          </div>
          <div>
            <label className="label">Membro desde</label>
            <p className="text-sm text-ink">
              {profile?.createdAt
                ? new Date(profile.createdAt).toLocaleDateString('pt-BR', {
                    day: '2-digit', month: 'long', year: 'numeric',
                  })
                : '—'}
            </p>
          </div>
        </div>
      </section>

      {/* ── Preferências ─────────────────────────────────────────────────── */}
      <section className="rounded-2xl bg-white shadow-soft overflow-hidden">
        <div className="flex items-center gap-3 border-b border-warm px-6 py-4">
          <RotateCcw className="h-4 w-4 text-sage" strokeWidth={1.8} />
          <h2 className="font-display font-semibold text-ink">Preferências</h2>
        </div>
        <div className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex-1">
              <p className="text-sm font-medium text-ink">Tour de boas-vindas</p>
              <p className="text-xs text-muted mt-0.5">
                Reinicia o tour guiado do painel. Você será redirecionado para o Dashboard.
              </p>
            </div>
            <button
              type="button"
              onClick={handleRestartTour}
              disabled={tourReset}
              className="btn-secondary flex items-center gap-2 shrink-0 disabled:opacity-50"
            >
              <RotateCcw className="h-3.5 w-3.5" strokeWidth={2} />
              {tourReset ? 'Redirecionando...' : 'Reiniciar tour'}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
