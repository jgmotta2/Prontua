import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X } from 'lucide-react';
import { useCreateSession } from '../hooks/useAgenda';
import { usePatients } from '@features/patients/hooks/usePatients';

const schema = z.object({
  patientId:   z.string().uuid('Selecione um paciente'),
  scheduledAt: z.string().min(1, 'Obrigatório'),
  durationMin: z.coerce.number().int().min(15).max(240).default(50),
  mode:        z.enum(['PRESENCIAL', 'ONLINE']).default('PRESENCIAL'),
  value:       z.coerce.number({ invalid_type_error: 'Obrigatório' }).nonnegative('Valor inválido'),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  defaultDate?: string;
  defaultPatientId?: string;
  onClose: () => void;
}

// Converte Date local para datetime-local string (sem offset)
function toLocalDatetimeString(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function SessionFormModal({ defaultDate, defaultPatientId, onClose }: Props) {
  const create = useCreateSession();
  const { data: patients = [] } = usePatients();

  const defaultAt = defaultDate
    ? toLocalDatetimeString(new Date(`${defaultDate}T09:00:00`))
    : toLocalDatetimeString(new Date());

  const { register, handleSubmit, formState: { errors, isSubmitting }, setError } =
    useForm<FormValues>({
      resolver: zodResolver(schema),
      defaultValues: {
        patientId:   defaultPatientId ?? '',
        scheduledAt: defaultAt,
        durationMin: 50,
        mode:        'PRESENCIAL',
        value:       0,
      },
    });

  const onSubmit = handleSubmit(async (values) => {
    try {
      await create.mutateAsync({
        ...values,
        scheduledAt: new Date(values.scheduledAt).toISOString(),
      });
      onClose();
    } catch (err: any) {
      setError('root', { message: err?.message ?? 'Erro ao criar sessão' });
    }
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 backdrop-blur-sm">
      <div className="w-full max-w-md bg-cream rounded-2xl shadow-soft">
        <div className="flex items-center justify-between p-6 border-b border-sage/10">
          <h2 className="font-display text-xl font-semibold text-ink">Nova sessão</h2>
          <button onClick={onClose} className="text-muted hover:text-ink transition">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="p-6 space-y-4">
          <div>
            <label className="label">Paciente *</label>
            <select className={`input ${errors.patientId ? 'input-error' : ''}`} {...register('patientId')}>
              <option value="">— selecione —</option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>{p.fullName}</option>
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

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Duração (min)</label>
              <input type="number" min="15" max="240" step="5" className="input" {...register('durationMin')} />
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
              step="0.01"
              min="0"
              className={`input ${errors.value ? 'input-error' : ''}`}
              {...register('value')}
            />
            {errors.value && <p className="helper-error">{errors.value.message}</p>}
          </div>

          {errors.root && (
            <div role="alert" className="rounded-xl border border-terracotta/30 bg-terracotta/5 p-3 text-sm text-terracotta">
              {errors.root.message}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancelar</button>
            <button type="submit" className="btn-primary flex-1" disabled={isSubmitting}>
              {isSubmitting ? 'Agendando...' : 'Agendar sessão'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
