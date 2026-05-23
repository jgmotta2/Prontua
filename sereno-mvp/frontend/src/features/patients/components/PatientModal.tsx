import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X } from 'lucide-react';
import { maskWhatsappBr, unmaskWhatsapp } from '@lib/utils/mask';
import { useCreatePatient, useUpdatePatient, type Patient } from '../hooks/usePatients';

const schema = z.object({
  fullName: z.string().trim().min(2, 'Nome muito curto').max(160),
  email: z.string().trim().email('E-mail inválido').optional().or(z.literal('')),
  whatsapp: z.string().min(10, 'WhatsApp inválido'),
  sessionValue: z.coerce.number().min(0, 'Valor inválido').max(99999),
  frequencyTag: z.enum(['Semanal', 'Quinzenal', 'Mensal']).optional(),
  document: z.string().regex(/^\d{11}$/, 'CPF inválido').optional().or(z.literal('')),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onClose: () => void;
  editing?: Patient;
}

export function PatientModal({ open, onClose, editing }: Props) {
  const create = useCreatePatient();
  const update = useUpdatePatient(editing?.id ?? '');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    setValue,
    watch,
    setError,
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { frequencyTag: 'Semanal' },
  });

  useEffect(() => {
    if (open) {
      if (editing) {
        reset({
          fullName: editing.fullName,
          email: editing.email ?? '',
          whatsapp: editing.whatsapp,
          sessionValue: editing.sessionValue,
          frequencyTag: (editing.frequencyTag as any) ?? 'Semanal',
          document: '',
        });
      } else {
        reset({ fullName: '', email: '', whatsapp: '', sessionValue: 0, frequencyTag: 'Semanal', document: '' });
      }
    }
  }, [open, editing, reset]);

  const whatsapp = watch('whatsapp');

  const onSubmit = handleSubmit(async (values) => {
    try {
      const raw = unmaskWhatsapp(values.whatsapp);
      const payload = {
        fullName: values.fullName,
        email: values.email || undefined,
        whatsapp: raw,
        sessionValue: values.sessionValue,
        frequencyTag: values.frequencyTag,
        document: values.document || undefined,
      };
      if (editing) {
        await update.mutateAsync(payload);
      } else {
        await create.mutateAsync({ ...payload, tags: [] });
      }
      onClose();
    } catch (err: any) {
      setError('root', { message: err?.message ?? 'Erro ao salvar' });
    }
  });

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-2xl bg-cream shadow-xl">
        <div className="flex items-center justify-between border-b border-warm p-5">
          <h2 className="font-display text-lg font-semibold text-ink">
            {editing ? 'Editar paciente' : 'Novo paciente'}
          </h2>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-warm/60 text-muted">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4 p-5">
          <div>
            <label className="label">Nome completo *</label>
            <input className={`input ${errors.fullName ? 'input-error' : ''}`} {...register('fullName')} />
            {errors.fullName && <p className="helper-error">{errors.fullName.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">E-mail</label>
              <input type="email" className={`input ${errors.email ? 'input-error' : ''}`} {...register('email')} />
              {errors.email && <p className="helper-error">{errors.email.message}</p>}
            </div>
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
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Valor / sessão (R$) *</label>
              <input
                type="number"
                min={0}
                step={0.01}
                className={`input ${errors.sessionValue ? 'input-error' : ''}`}
                {...register('sessionValue')}
              />
              {errors.sessionValue && <p className="helper-error">{errors.sessionValue.message}</p>}
            </div>
            <div>
              <label className="label">Frequência</label>
              <select className="input" {...register('frequencyTag')}>
                <option value="Semanal">Semanal</option>
                <option value="Quinzenal">Quinzenal</option>
                <option value="Mensal">Mensal</option>
              </select>
            </div>
          </div>

          <div>
            <label className="label">CPF {editing ? '(deixe em branco para manter)' : ''}</label>
            <input
              inputMode="numeric"
              placeholder="000.000.000-00"
              className={`input ${errors.document ? 'input-error' : ''}`}
              {...register('document')}
              onChange={(e) => {
                const digits = e.target.value.replace(/\D/g, '').slice(0, 11);
                setValue('document', digits, { shouldValidate: true });
              }}
            />
            {errors.document && <p className="helper-error">{errors.document.message}</p>}
          </div>

          {errors.root && (
            <div className="rounded-xl border border-terracotta/30 bg-terracotta/5 p-3 text-sm text-terracotta">
              {errors.root.message}
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">
              Cancelar
            </button>
            <button type="submit" disabled={isSubmitting} className="btn-primary flex-1">
              {isSubmitting ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
