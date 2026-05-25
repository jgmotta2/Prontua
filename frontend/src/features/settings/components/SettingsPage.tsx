import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { User, Lock, CheckCircle2, LogOut } from 'lucide-react';
import { useProfile, useUpdateProfile, useChangePassword, useLogout } from '../hooks/useSettings';
import { maskWhatsappBr, unmaskWhatsapp } from '@lib/utils/mask';
import { BR_STATES, SPECIALTIES } from '@lib/validation/auth.schema';
import { SecuritySection } from '@features/security/components/SecuritySection';

const SPECIALTY_LABELS: Record<string, string> = {
  PSICOLOGIA:        'Psicologia',
  FISIOTERAPIA:      'Fisioterapia',
  FONOAUDIOLOGIA:    'Fonoaudiologia',
  PSICOPEDAGOGIA:    'Psicopedagogia',
  NUTRICAO:          'Nutrição',
  TERAPIA_OCUPACIONAL: 'Terapia Ocupacional',
  OUTRA:             'Outra',
};

const profileSchema = z.object({
  name:      z.string().trim().min(2, 'Nome muito curto').max(120),
  whatsapp:  z.string().min(10, 'WhatsApp inválido'),
  city:      z.string().trim().min(2, 'Obrigatório').max(80),
  state:     z.enum(BR_STATES, { errorMap: () => ({ message: 'Selecione um estado' }) }),
  specialty: z.enum(SPECIALTIES, { errorMap: () => ({ message: 'Selecione a especialidade' }) }),
  registry:  z.string().max(30).optional(),
});

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Obrigatório'),
    newPassword:     z.string().min(8, 'Mínimo 8 caracteres').max(128),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: 'As senhas não coincidem',
    path:    ['confirmPassword'],
  });

type ProfileValues  = z.infer<typeof profileSchema>;
type PasswordValues = z.infer<typeof passwordSchema>;

export function SettingsPage() {
  const { data: profile, isLoading } = useProfile();
  const updateProfile  = useUpdateProfile();
  const changePassword = useChangePassword();
  const logout         = useLogout();

  const [profileSaved,  setProfileSaved]  = useState(false);
  const [passwordSaved, setPasswordSaved] = useState(false);

  const {
    register: regProfile,
    handleSubmit: handleProfile,
    formState: { errors: pe, isSubmitting: pSubmitting },
    reset: resetProfile,
    setError: setProfileError,
    watch: watchProfile,
    setValue: setProfileValue,
  } = useForm<ProfileValues>({ resolver: zodResolver(profileSchema) });

  const whatsappVal = watchProfile('whatsapp');
  useEffect(() => {
    if (whatsappVal !== undefined) {
      setProfileValue('whatsapp', maskWhatsappBr(whatsappVal));
    }
  }, [whatsappVal, setProfileValue]);

  useEffect(() => {
    if (profile) {
      resetProfile({
        name:      profile.name,
        whatsapp:  maskWhatsappBr(profile.whatsapp),
        city:      profile.city,
        state:     profile.state as ProfileValues['state'],
        specialty: profile.specialty as ProfileValues['specialty'],
        registry:  profile.registry ?? '',
      });
    }
  }, [profile, resetProfile]);

  const {
    register: regPwd,
    handleSubmit: handlePwd,
    formState: { errors: pwe, isSubmitting: pwSubmitting },
    reset: resetPwd,
    setError: setPwdError,
  } = useForm<PasswordValues>({ resolver: zodResolver(passwordSchema) });

  const onSaveProfile = handleProfile(async (values) => {
    try {
      await updateProfile.mutateAsync({
        ...values,
        whatsapp: unmaskWhatsapp(values.whatsapp),
        registry: values.registry || null,
      });
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 3000);
    } catch (err: any) {
      setProfileError('root', { message: err?.message ?? 'Erro ao salvar' });
    }
  });

  const onChangePassword = handlePwd(async (values) => {
    try {
      await changePassword.mutateAsync({
        currentPassword: values.currentPassword,
        newPassword:     values.newPassword,
      });
      resetPwd();
      setPasswordSaved(true);
      setTimeout(() => setPasswordSaved(false), 3000);
    } catch (err: any) {
      setPwdError('root', { message: err?.message ?? 'Erro ao alterar senha' });
    }
  });

  if (isLoading) {
    return (
      <div className="mx-auto max-w-2xl p-6 space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-20 rounded-2xl bg-white animate-pulse shadow-soft" />
        ))}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl p-4 sm:p-6 lg:p-8 space-y-6">
      <h1 className="font-display text-2xl sm:text-3xl font-semibold text-ink">Configurações</h1>

      {/* Profile section */}
      <section className="bg-white rounded-2xl shadow-soft overflow-hidden">
        <div className="flex items-center gap-3 p-5 border-b border-sage/10">
          <div className="rounded-xl bg-sage/10 p-2">
            <User className="h-4 w-4 text-sage-dark" />
          </div>
          <h2 className="font-semibold text-ink">Perfil</h2>
        </div>

        <form onSubmit={onSaveProfile} className="p-5 space-y-4">
          <div>
            <label className="label">Nome completo</label>
            <input className={`input ${pe.name ? 'input-error' : ''}`} {...regProfile('name')} />
            {pe.name && <p className="helper-error">{pe.name.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">WhatsApp</label>
              <input type="tel" className={`input ${pe.whatsapp ? 'input-error' : ''}`} {...regProfile('whatsapp')} />
              {pe.whatsapp && <p className="helper-error">{pe.whatsapp.message}</p>}
            </div>
            <div>
              <label className="label">CRP / Registro</label>
              <input placeholder="Ex: CRP 06/12345" className="input" {...regProfile('registry')} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Cidade</label>
              <input className={`input ${pe.city ? 'input-error' : ''}`} {...regProfile('city')} />
              {pe.city && <p className="helper-error">{pe.city.message}</p>}
            </div>
            <div>
              <label className="label">Estado</label>
              <select className={`input ${pe.state ? 'input-error' : ''}`} {...regProfile('state')}>
                <option value="">— UF —</option>
                {BR_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              {pe.state && <p className="helper-error">{pe.state.message}</p>}
            </div>
          </div>

          <div>
            <label className="label">Especialidade</label>
            <select className={`input ${pe.specialty ? 'input-error' : ''}`} {...regProfile('specialty')}>
              <option value="">— selecione —</option>
              {SPECIALTIES.map((s) => (
                <option key={s} value={s}>{SPECIALTY_LABELS[s] ?? s}</option>
              ))}
            </select>
            {pe.specialty && <p className="helper-error">{pe.specialty.message}</p>}
          </div>

          {pe.root && (
            <div role="alert" className="rounded-xl border border-terracotta/30 bg-terracotta/5 p-3 text-sm text-terracotta">
              {pe.root.message}
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-1">
            {profileSaved && (
              <span className="flex items-center gap-1 text-sm text-sage-dark">
                <CheckCircle2 className="h-4 w-4" /> Salvo
              </span>
            )}
            <button type="submit" className="btn-primary" disabled={pSubmitting}>
              {pSubmitting ? 'Salvando...' : 'Salvar perfil'}
            </button>
          </div>
        </form>
      </section>

      {/* Password section */}
      <section className="bg-white rounded-2xl shadow-soft overflow-hidden">
        <div className="flex items-center gap-3 p-5 border-b border-sage/10">
          <div className="rounded-xl bg-sage/10 p-2">
            <Lock className="h-4 w-4 text-sage-dark" />
          </div>
          <h2 className="font-semibold text-ink">Alterar senha</h2>
        </div>

        <form onSubmit={onChangePassword} className="p-5 space-y-4">
          <div>
            <label className="label">Senha atual</label>
            <input
              type="password"
              autoComplete="current-password"
              className={`input ${pwe.currentPassword ? 'input-error' : ''}`}
              {...regPwd('currentPassword')}
            />
            {pwe.currentPassword && <p className="helper-error">{pwe.currentPassword.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Nova senha</label>
              <input
                type="password"
                autoComplete="new-password"
                className={`input ${pwe.newPassword ? 'input-error' : ''}`}
                {...regPwd('newPassword')}
              />
              {pwe.newPassword && <p className="helper-error">{pwe.newPassword.message}</p>}
            </div>
            <div>
              <label className="label">Confirmar senha</label>
              <input
                type="password"
                autoComplete="new-password"
                className={`input ${pwe.confirmPassword ? 'input-error' : ''}`}
                {...regPwd('confirmPassword')}
              />
              {pwe.confirmPassword && <p className="helper-error">{pwe.confirmPassword.message}</p>}
            </div>
          </div>

          {pwe.root && (
            <div role="alert" className="rounded-xl border border-terracotta/30 bg-terracotta/5 p-3 text-sm text-terracotta">
              {pwe.root.message}
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-1">
            {passwordSaved && (
              <span className="flex items-center gap-1 text-sm text-sage-dark">
                <CheckCircle2 className="h-4 w-4" /> Senha alterada
              </span>
            )}
            <button type="submit" className="btn-primary" disabled={pwSubmitting}>
              {pwSubmitting ? 'Alterando...' : 'Alterar senha'}
            </button>
          </div>
        </form>
      </section>

      {/* Email (read-only) */}
      {profile && (
        <section className="bg-white rounded-2xl shadow-soft p-5">
          <p className="text-sm text-muted">
            <span className="font-medium text-ink">E-mail:</span> {profile.email}
            <span className="ml-2 text-xs text-muted">(não é possível alterar por aqui)</span>
          </p>
        </section>
      )}

      {/* Security / 2FA section */}
      {profile && (
        <SecuritySection
          mfaEnabled={profile.mfaEnabled}
          mfaMethod={profile.mfaMethod}
        />
      )}

      {/* Logout section */}
      <section className="bg-white rounded-2xl shadow-soft overflow-hidden border border-terracotta/20">
        <div className="flex items-center gap-3 p-5 border-b border-terracotta/15">
          <div className="rounded-xl bg-terracotta/10 p-2">
            <LogOut className="h-4 w-4 text-terracotta" />
          </div>
          <h2 className="font-semibold text-ink">Segurança da conta</h2>
        </div>
        <div className="p-5">
          <p className="text-sm text-muted mb-4">
            Encerra a sessão atual e invalida o token de acesso. Use ao sair de um computador compartilhado.
          </p>
          <button
            onClick={() => { if (window.confirm('Deseja realmente finalizar a sessão?')) logout.mutate(); }}
            disabled={logout.isPending}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm
                       bg-terracotta/10 text-terracotta border border-terracotta/25
                       hover:bg-terracotta/20 transition disabled:opacity-60"
          >
            <LogOut className="h-4 w-4" />
            {logout.isPending ? 'Saindo...' : 'Finalizar sessão'}
          </button>
        </div>
      </section>
    </div>
  );
}
