import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X } from 'lucide-react';
import { usePatients } from '@features/patients/hooks/usePatients';
import { useCreateSession } from '../hooks/useSessions';

const schema = z.object({
  patientId: z.string().uuid('Selecione um paciente'),
  scheduledAt: z.string().min(1, 'Informe data e hora'),
  durationMin: z.coerce.number().int().min(15).max(240).default(50),
  mode: z.enum(['PRESENCIAL', 'ONLINE']).default('PRESENCIAL'),
  value: z.coerce.number().min(0.01, 'Valor deve ser maior que zero').max(99999),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onClose: () => void;
  defaultDate?: Date;
}

export function SessionModal({ open, onClose, defaultDate }: Props) {
  const { data: patientsData } = usePatients();
  const create = useCreateSession();

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
    defaultValues: { durationMin: 50, mode: 'PRESENCIAL' },
  });

  const patientId = watch('patientId');

  useEffect(() => {
    if (open) {
      const dtLocal = defaultDate
        ? new Date(defaultDate.getTime() - defaultDate.getTimezoneOffset() * 60000)
            .toISOString()
            .slice(0, 16)
        : '';
      reset({ patientId: '', scheduledAt: dtLocal, durationMin: 50, mode: 'PRESENCIAL', value: 0 });
    }
  }, [open, defaultDate, reset]);

  // Preenche valor ao selecionar paciente
  useEffect(() => {
    if (patientId) {
      const p = patientsData?.patients.find((x) => x.id === patientId);
      if (p) setValue('value', p.sessionValue);
    }
  }, [patientId, patientsData, setValue]);

  const onSubmit = handleSubmit(async (values) => {
    try {
      const scheduledAt = new Date(values.scheduledAt).toISOString();
      await create.mutateAsync({ ...values, scheduledAt });
      onClose();
    } catch (err: any) {
      setError('root', { message: err?.message ?? 'Erro ao criar sessão' });
    }
  });

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-2xl bg-cream shadow-xl">
        <div className="flex items-center justify-between border-b border-warm p-5">
          <h2 className="font-display text-lg font-semibold text-ink">Nova sessão</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-warm/60 text-muted">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4 p-5">
          <div>
            <label className="label">Paciente *</label>
            <select className={`input ${errors.patientId ? 'input-error' : ''}`} {...register('patientId')}>
              <option value="">Selecionar paciente...</option>
              {patientsData?.patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.fullName}
                </option>
              ))}
            </select>
            {errors.patientId && <p className="helper-error">{errors.patientId.message}</p>}
          </div>

          <div>
            <label className="label">Data e hora *</label>
            <input
              type="datetime-local"
              className={`input ${errors.scheduledAt ? 'input-error' : ''}`}
              {...register('scheduledAt')}
            />
            {errors.scheduledAt && <p className="helper-error">{errors.scheduledAt.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Duração (min)</label>
              <input
                type="number"
                min={15}
                max={240}
                className="input"
                {...register('durationMin')}
              />
            </div>
            <div>
              <label className="label">Modalidade</label>
              <select className="input" {...register('mode')}>
                <option value="PRESENCIAL">Presencial</option>
                <option value="ONLINE">Online</option>
              </select>
            </div>
          </div>

          <div>
            <label className="label">Valor (R$) *</label>
            <input
              type="number"
              min={0.01}
              step={0.01}
              className={`input ${errors.value ? 'input-error' : ''}`}
              {...register('value')}
            />
            {errors.value && <p className="helper-error">{errors.value.message}</p>}
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
              {isSubmitting ? 'Salvando...' : 'Agendar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
