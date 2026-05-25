import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, CheckCircle2, CalendarPlus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useCreatePatient, useUpdatePatient } from '../hooks/usePatients';
import type { Patient, PatientSummary } from '../api/patients.api';
import { maskWhatsappBr, unmaskWhatsapp } from '@lib/utils/mask';

const emptyToUndefined = (v: unknown) => (v === '' ? undefined : v);

const schema = z.object({
  fullName:       z.string().trim().min(2, 'Nome muito curto').max(160),
  city:           z.string().trim().min(2, 'Cidade obrigatória').max(80),
  chiefComplaint: z.string().trim().min(3, 'Descreva a queixa principal').max(2000),
  birthDate:      z.preprocess(emptyToUndefined, z.string().optional()),
  email:          z.preprocess(emptyToUndefined, z.string().email('E-mail inválido').max(255).optional()),
  whatsapp:       z.string().min(10, 'WhatsApp inválido'),
  document:       z.preprocess(emptyToUndefined, z.string().regex(/^\d{11}$/, 'CPF: 11 dígitos sem pontuação').optional()),
  sessionValue:   z.coerce.number({ invalid_type_error: 'Obrigatório' }).nonnegative('Valor inválido'),
  frequencyTag:   z.preprocess(emptyToUndefined, z.enum(['Semanal', 'Quinzenal', 'Mensal']).optional()),
  notesGeneral:   z.string().max(1000).optional(),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  patient?: Patient | PatientSummary | null;
  onClose: () => void;
}

export function PatientFormModal({ patient, onClose }: Props) {
  const isEdit = !!patient;
  const create = useCreatePatient();
  const update = useUpdatePatient(patient?.id ?? '');
  const navigate = useNavigate();
  const [createdId, setCreatedId] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
    watch,
    setError,
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      fullName:       (patient as Patient | undefined)?.fullName ?? '',
      city:           (patient as Patient | undefined)?.city ?? '',
      chiefComplaint: '',
      birthDate:      (patient as Patient | undefined)?.birthDate?.slice(0, 10) ?? '',
      email:          (patient as Patient | undefined)?.email ?? '',
      whatsapp:       maskWhatsappBr((patient as PatientSummary | undefined)?.whatsapp ?? ''),
      sessionValue:   (patient as PatientSummary | undefined)?.sessionValue ?? 0,
      frequencyTag:   (patient as PatientSummary | undefined)?.frequencyTag as FormValues['frequencyTag'] ?? undefined,
      notesGeneral:   (patient as Patient | undefined)?.notesGeneral ?? '',
    },
  });

  const whatsappValue = watch('whatsapp');

  const onSubmit = handleSubmit(async (values) => {
    try {
      const payload = {
        ...values,
        whatsapp: unmaskWhatsapp(values.whatsapp),
      };

      if (isEdit) {
        await update.mutateAsync(payload);
        onClose();
      } else {
        const created = await create.mutateAsync(payload as any);
        setCreatedId((created as any).id ?? 'new');
      }
    } catch (err: any) {
      setError('root', { message: err?.message ?? 'Erro ao salvar' });
    }
  });

  // ── Success screen (new patient only) ─────────────────────────────────────
  if (createdId) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 backdrop-blur-sm">
        <div className="w-full max-w-sm bg-cream rounded-2xl shadow-soft p-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-sage/15 mb-5">
            <CheckCircle2 className="h-7 w-7 text-sage-dark" strokeWidth={1.8} />
          </div>
          <h2 className="font-display text-xl font-semibold text-ink mb-2">
            Paciente cadastrado!
          </h2>
          <p className="text-sm text-muted mb-6">
            O cadastro foi salvo com sucesso. Deseja agendar a primeira consulta agora?
          </p>
          <button
            className="btn-primary w-full mb-3"
            onClick={() => {
              onClose();
              navigate(`/agenda?patientId=${createdId}`);
            }}
          >
            <CalendarPlus className="h-4 w-4" />
            Agendar primeira consulta
          </button>
          <button className="btn-secondary w-full" onClick={onClose}>
            Fechar
          </button>
        </div>
      </div>
    );
  }

  // ── Form ──────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-cream rounded-2xl shadow-soft overflow-y-auto max-h-[90vh]">
        <div className="flex items-center justify-between p-6 border-b border-sage/10">
          <h2 className="font-display text-xl font-semibold text-ink">
            {isEdit ? 'Editar paciente' : 'Novo paciente'}
          </h2>
          <button onClick={onClose} className="text-muted hover:text-ink transition">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="p-6 space-y-4">
          {/* Nome */}
          <div>
            <label className="label">Nome completo *</label>
            <input className={`input ${errors.fullName ? 'input-error' : ''}`} {...register('fullName')} />
            {errors.fullName && <p className="helper-error">{errors.fullName.message}</p>}
          </div>

          {/* Cidade + WhatsApp */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Cidade *</label>
              <input
                placeholder="São Paulo"
                className={`input ${errors.city ? 'input-error' : ''}`}
                {...register('city')}
              />
              {errors.city && <p className="helper-error">{errors.city.message}</p>}
            </div>
            <div>
              <label className="label">WhatsApp *</label>
              <input
                type="tel"
                inputMode="numeric"
                placeholder="(11) 9 8765-4321"
                className={`input ${errors.whatsapp ? 'input-error' : ''}`}
                value={whatsappValue ?? ''}
                onChange={(e) => setValue('whatsapp', maskWhatsappBr(e.target.value))}
              />
              {errors.whatsapp && <p className="helper-error">{errors.whatsapp.message}</p>}
            </div>
          </div>

          {/* Queixa principal (criptografada AES-256) */}
          <div>
            <label className="label">Queixa principal / Problema a ser tratado *</label>
            <textarea
              rows={3}
              placeholder="Descreva o motivo do atendimento em detalhes..."
              className={`input resize-none ${errors.chiefComplaint ? 'input-error' : ''}`}
              {...register('chiefComplaint')}
            />
            {errors.chiefComplaint ? (
              <p className="helper-error">{errors.chiefComplaint.message}</p>
            ) : (
              <p className="helper text-xs text-muted mt-1">
                Armazenada com criptografia AES-256 — protegida pela LGPD.
              </p>
            )}
          </div>

          {/* Data nascimento + E-mail */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Data de nascimento</label>
              <input type="date" className="input" {...register('birthDate')} />
            </div>
            <div>
              <label className="label">E-mail</label>
              <input type="email" className="input" placeholder="paciente@email.com" {...register('email')} />
              {errors.email && <p className="helper-error">{errors.email.message}</p>}
            </div>
          </div>

          {/* CPF */}
          <div>
            <label className="label">CPF</label>
            <input placeholder="11 dígitos sem pontuação" className="input" {...register('document')} />
            {errors.document && <p className="helper-error">{errors.document.message}</p>}
          </div>

          {/* Valor + Frequência */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Valor da sessão (R$) *</label>
              <input
                type="number"
                step="0.01"
                min="0"
                className={`input ${errors.sessionValue ? 'input-error' : ''}`}
                {...register('sessionValue')}
              />
              {errors.sessionValue && <p className="helper-error">{errors.sessionValue.message}</p>}
            </div>
            <div>
              <label className="label">Frequência</label>
              <select className={`input ${errors.frequencyTag ? 'input-error' : ''}`} {...register('frequencyTag')}>
                <option value="">— selecione —</option>
                <option value="Semanal">Semanal</option>
                <option value="Quinzenal">Quinzenal</option>
                <option value="Mensal">Mensal</option>
              </select>
              {errors.frequencyTag && <p className="helper-error">{errors.frequencyTag.message}</p>}
            </div>
          </div>

          {/* Observações gerais (não clínicas) */}
          <div>
            <label className="label">Observações administrativas</label>
            <textarea
              rows={2}
              className="input resize-none"
              placeholder="Contato de emergência, convênio, etc."
              {...register('notesGeneral')}
            />
          </div>

          {errors.root && (
            <div role="alert" className="rounded-xl border border-terracotta/30 bg-terracotta/5 p-3 text-sm text-terracotta">
              {errors.root.message}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">
              Cancelar
            </button>
            <button type="submit" className="btn-primary flex-1" disabled={isSubmitting}>
              {isSubmitting ? 'Salvando...' : isEdit ? 'Salvar alterações' : 'Cadastrar paciente'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
