import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatBRL, formatBRLCompact } from '@lib/utils/format';
import type { DashboardData } from '../hooks/useDashboard';

interface Props {
  data: DashboardData['revenueByMonth'];
}

interface TooltipPayloadItem {
  value?: number;
  payload?: { label?: string };
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: TooltipPayloadItem[] }) {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  return (
    <div className="rounded-xl border border-warm bg-white px-3 py-2 shadow-soft">
      <div className="text-xs font-medium text-muted">{item?.payload?.label}</div>
      <div className="font-display text-lg font-semibold text-ink">
        {formatBRL(item?.value ?? 0)}
      </div>
    </div>
  );
}

export function RevenueChart({ data }: Props) {
  const total = data.reduce((sum, m) => sum + m.revenue, 0);
  const hasAny = total > 0;

  return (
    <div className="rounded-2xl bg-white p-5 shadow-soft">
      <div className="flex items-end justify-between mb-4">
        <div>
          <h3 className="font-display text-lg font-semibold text-ink">Receita mensal</h3>
          <p className="text-xs text-muted mt-0.5">Últimos 6 meses</p>
        </div>
      </div>

      <div className="h-64">
        {hasAny ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 0, bottom: 0, left: -10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E8DDC8" vertical={false} />
              <XAxis
                dataKey="label"
                stroke="#7A8B85"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="#7A8B85"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v: number) => formatBRLCompact(v)}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: '#6B8E7F12' }} />
              <Bar dataKey="revenue" fill="#6B8E7F" radius={[8, 8, 0, 0]} maxBarSize={42} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center text-center">
            <div>
              <div className="text-sm text-muted">Sem pagamentos registrados ainda</div>
              <p className="mt-1 text-xs text-muted/70">
                Quando você marcar sessões como pagas, elas aparecem aqui.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
