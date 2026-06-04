import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, Repeat } from 'lucide-react';
import { usePatients } from '@features/patients/hooks/usePatients';
import { useCreateSession } from '../hooks/useSessions';

const schema = z.object({
  patientId: z.string().uuid('Selecione um paciente'),
  schedDate: z.string().min(1, 'Informe a data'),
  schedTime: z.string().min(1, 'Informe o horário'),
  durationMin: z.coerce.number().int().min(15).max(240).default(50),
  mode: z.enum(['PRESENCIAL', 'ONLINE']).default('PRESENCIAL'),
  value: z.coerce.number().min(0.01, 'Valor deve ser maior que zero').max(99999),
});

const TIME_OPTIONS = Array.from({ length: 31 }, (_, i) => {
  const totalMin = 7 * 60 + i * 30;
  return `${String(Math.floor(totalMin / 60)).padStart(2, '0')}:${String(totalMin % 60).padStart(2, '0')}`;
});

type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onClose: () => void;
  defaultDate?: Date;
  defaultPatientId?: string;
}

export function SessionModal({ open, onClose, defaultDate, defaultPatientId }: Props) {
  const { data: patientsData } = usePatients();
  const create = useCreateSession();

  const [repeatEnabled, setRepeatEnabled] = useState(false);
  const [repeatEvery, setRepeatEvery] = useState<'week' | 'biweekly'>('week');
  const [repeatTimes, setRepeatTimes] = useState(4);

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
      setRepeatEnabled(false);
      setRepeatEvery('week');
      setRepeatTimes(4);
      const dtLocal = defaultDate
        ? new Date(defaultDate.getTime() - defaultDate.getTimezoneOffset() * 60000)
            .toISOString().slice(0, 16)
        : '';
      const [datePart = '', timePart = '08:00'] = dtLocal.split('T');
      const roundedTime = TIME_OPTIONS.find((t) => t >= timePart.slice(0, 5)) ?? '08:00';
      reset({ patientId: defaultPatientId ?? '', schedDate: datePart, schedTime: roundedTime, durationMin: 50, mode: 'PRESENCIAL', value: 0 });
    }
  }, [open, defaultDate, defaultPatientId, reset]);

  useEffect(() => {
    if (patientId) {
      const p = patientsData?.patients.find((x) => x.id === patientId);
      if (p) setValue('value', p.sessionValue);
    }
  }, [patientId, patientsData, setValue]);

  const onSubmit = handleSubmit(async (values) => {
    try {
      const scheduledAt = new Date(`${values.schedDate}T${values.schedTime}`).toISOString();
      const { schedDate: _d, schedTime: _t, ...rest } = values;
      const payload: any = { ...rest, scheduledAt };
      if (repeatEnabled) payload.repeat = { every: repeatEvery, times: repeatTimes };
      await create.mutateAsync(payload);
      onClose();
    } catch (err: any) {
      setError('root', { message: err?.message ?? 'Erro ao criar sessão' });
    }
  });

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-2xl bg-cream shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-warm p-5 sticky top-0 bg-cream z-10">
          <h2 className="font-display text-lg font-semibold text-ink">Nova sessão</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-warm/60 text-muted">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4 p-5">
          {!defaultPatientId && (
            <div>
              <label className="label">Paciente *</label>
              <select className={`input ${errors.patientId ? 'input-error' : ''}`} {...register('patientId')}>
                <option value="">Selecionar paciente...</option>
                {patientsData?.patients.map((p) => (
                  <option key={p.id} value={p.id}>{p.fullName}</option>
                ))}
              </select>
              {errors.patientId && <p className="helper-error">{errors.patientId.message}</p>}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Data *</label>
              <input type="date" className={`input ${errors.schedDate ? 'input-error' : ''}`} {...register('schedDate')} />
              {errors.schedDate && <p className="helper-error">{errors.schedDate.message}</p>}
            </div>
            <div>
              <label className="label">Horário *</label>
              <select className={`input ${errors.schedTime ? 'input-error' : ''}`} {...register('schedTime')}>
                {TIME_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Duração (min)</label>
              <input type="number" min={15} max={240} className="input" {...register('durationMin')} />
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
              type="text"
              inputMode="decimal"
              placeholder="0,00"
              className={`input ${errors.value ? 'input-error' : ''}`}
              {...register('value')}
              onChange={(e) => {
                const v = e.target.value.replace(/[^0-9,\.]/g, '').replace(',', '.');
                setValue('value', v as any, { shouldValidate: true });
              }}
            />
            {errors.value && <p className="helper-error">{errors.value.message}</p>}
          </div>

          {/* Recorrência */}
          <div className="rounded-xl border border-warm p-3 space-y-3">
            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={repeatEnabled}
                onChange={(e) => setRepeatEnabled(e.target.checked)}
                className="h-4 w-4 rounded accent-sage"
              />
              <span className="flex items-center gap-1.5 text-sm font-medium text-ink">
                <Repeat className="h-3.5 w-3.5 text-muted" />
                Repetir sessão
              </span>
            </label>

            {repeatEnabled && (
              <div className="flex items-center gap-2 pl-6 flex-wrap">
                <span className="text-sm text-muted">A cada</span>
                <select
                  value={repeatEvery}
                  onChange={(e) => setRepeatEvery(e.target.value as 'week' | 'biweekly')}
                  className="rounded-lg border border-warm px-2 py-1 text-sm text-ink bg-white dark:bg-warm/30"
                >
                  <option value="week">semana</option>
                  <option value="biweekly">quinzena</option>
                </select>
                <span className="text-sm text-muted">por</span>
                <input
                  type="number"
                  min={2}
                  max={52}
                  value={repeatTimes}
                  onChange={(e) => setRepeatTimes(Math.max(2, Math.min(52, Number(e.target.value))))}
                  className="w-16 rounded-lg border border-warm px-2 py-1 text-sm text-ink bg-white dark:bg-warm/30 text-center"
                />
                <span className="text-sm text-muted">semanas</span>
                <p className="w-full text-xs text-muted">
                  Serão criadas <strong className="text-ink">{repeatTimes}</strong> sessões no total.
                </p>
              </div>
            )}
          </div>

          {errors.root && (
            <div className="rounded-xl border border-terracotta/30 bg-terracotta/5 p-3 text-sm text-terracotta">
              {errors.root.message}
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancelar</button>
            <button type="submit" disabled={isSubmitting} className="btn-primary flex-1">
              {isSubmitting
                ? 'Salvando...'
                : repeatEnabled
                ? `Agendar ${repeatTimes} sessões`
                : 'Agendar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
