import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X } from 'lucide-react';
import { useCreatePatient, useUpdatePatient } from '../hooks/usePatients';
import type { Patient, PatientSummary } from '../api/patients.api';
import { maskWhatsappBr, unmaskWhatsapp } from '@lib/utils/mask';

const schema = z.object({
  fullName:     z.string().trim().min(2, 'Nome muito curto').max(160),
  birthDate:    z.string().optional(),
  email:        z.string().email('E-mail inválido').max(255).optional().or(z.literal('')),
  whatsapp:     z.string().min(10, 'WhatsApp inválido'),
  document:     z.string().regex(/^\d{11}$/, 'CPF: 11 dígitos sem pontuação').optional().or(z.literal('')),
  sessionValue: z.coerce.number({ invalid_type_error: 'Obrigatório' }).nonnegative('Valor inválido'),
  frequencyTag: z.enum(['Semanal', 'Quinzenal', 'Mensal']).optional(),
  notesGeneral: z.string().max(1000).optional(),
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

  const { register, handleSubmit, formState: { errors, isSubmitting }, setValue, watch, setError } =
    useForm<FormValues>({
      resolver: zodResolver(schema),
      defaultValues: {
        fullName:     (patient as Patient | undefined)?.fullName ?? '',
        birthDate:    (patient as Patient | undefined)?.birthDate?.slice(0, 10) ?? '',
        email:        (patient as Patient | undefined)?.email ?? '',
        whatsapp:     maskWhatsappBr((patient as PatientSummary | undefined)?.whatsapp ?? ''),
        sessionValue: (patient as PatientSummary | undefined)?.sessionValue ?? 0,
        frequencyTag: (patient as PatientSummary | undefined)?.frequencyTag as FormValues['frequencyTag'] ?? undefined,
        notesGeneral: (patient as Patient | undefined)?.notesGeneral ?? '',
      },
    });

  const whatsappValue = watch('whatsapp');
  useEffect(() => {
    setValue('whatsapp', maskWhatsappBr(whatsappValue ?? ''));
  }, [whatsappValue, setValue]);

  const onSubmit = handleSubmit(async (values) => {
    try {
      const payload = {
        ...values,
        whatsapp:  unmaskWhatsapp(values.whatsapp),
        email:     values.email || undefined,
        document:  values.document || undefined,
        birthDate: values.birthDate || undefined,
      };

      if (isEdit) {
        await update.mutateAsync(payload);
      } else {
        await create.mutateAsync(payload as any);
      }
      onClose();
    } catch (err: any) {
      setError('root', { message: err?.message ?? 'Erro ao salvar' });
    }
  });

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
          <div>
            <label className="label">Nome completo *</label>
            <input className={`input ${errors.fullName ? 'input-error' : ''}`} {...register('fullName')} />
            {errors.fullName && <p className="helper-error">{errors.fullName.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Data de nascimento</label>
              <input type="date" className="input" {...register('birthDate')} />
            </div>
            <div>
              <label className="label">WhatsApp *</label>
              <input
                type="tel"
                placeholder="(11) 9 8765-4321"
                className={`input ${errors.whatsapp ? 'input-error' : ''}`}
                {...register('whatsapp')}
              />
              {errors.whatsapp && <p className="helper-error">{errors.whatsapp.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">E-mail</label>
              <input type="email" className="input" {...register('email')} />
              {errors.email && <p className="helper-error">{errors.email.message}</p>}
            </div>
            <div>
              <label className="label">CPF</label>
              <input placeholder="11 dígitos s/ pontuação" className="input" {...register('document')} />
              {errors.document && <p className="helper-error">{errors.document.message}</p>}
            </div>
          </div>

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
              <select className="input" {...register('frequencyTag')}>
                <option value="">— selecione —</option>
                <option value="Semanal">Semanal</option>
                <option value="Quinzenal">Quinzenal</option>
                <option value="Mensal">Mensal</option>
              </select>
            </div>
          </div>

          <div>
            <label className="label">Observações gerais</label>
            <textarea
              rows={3}
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
              {isSubmitting ? 'Salvando...' : isEdit ? 'Salvar alterações' : 'Cadastrar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
