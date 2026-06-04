import { useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Printer } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@lib/api/client';
import { usePatient } from '@features/patients/hooks/usePatients';
import { useSession } from '@features/auth/hooks/useSession';
import { formatBRL } from '@lib/utils/format';

const HUMOR_LABELS = ['', 'Muito baixo', 'Baixo', 'Regular', 'Bem', 'Excelente'];

const STATUS_LABEL: Record<string, string> = {
  SCHEDULED: 'Agendada', CONFIRMED: 'Confirmada', COMPLETED: 'Concluída',
  CANCELED: 'Cancelada', NO_SHOW: 'Faltou',
};

interface ExportSession {
  id: string;
  scheduledAt: string;
  durationMin: number;
  mode: string;
  value: number;
  status: string;
  humor: number | null;
  evolutionNote: string;
  nextSteps: string;
}

function useExportSessions(patientId: string) {
  return useQuery<{ sessions: ExportSession[] }>({
    queryKey: ['notes-export', patientId],
    queryFn: () => api.get(`/notes/patients/${patientId}/export`),
    enabled: !!patientId,
  });
}

export function ProntuarioAllPage() {
  const { id: patientId } = useParams<{ id: string }>();
  const { data: patient } = usePatient(patientId ?? '');
  const { data: exportData, isLoading } = useExportSessions(patientId ?? '');
  const { data: sessionInfo } = useSession();

  useEffect(() => {
    if (!isLoading && exportData) {
      const timer = setTimeout(() => window.print(), 600);
      return () => clearTimeout(timer);
    }
  }, [isLoading, exportData]);

  const sessions = exportData?.sessions ?? [];
  const printedAt = new Date().toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-sage border-t-transparent" />
      </div>
    );
  }

  return (
    <>
      <div className="print:hidden flex items-center gap-3 px-6 py-3 bg-white border-b border-warm">
        <Link to={`/pacientes/${patientId}/prontuario`} className="flex items-center gap-1.5 text-sm text-muted hover:text-ink transition">
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Link>
        <span className="flex-1" />
        <p className="text-xs text-muted">{sessions.length} sessão(ões) com nota</p>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 rounded-xl bg-sage px-4 py-2 text-sm font-medium text-cream hover:bg-sage-dark transition"
        >
          <Printer className="h-4 w-4" />
          Imprimir / Salvar PDF
        </button>
      </div>

      <div className="mx-auto max-w-[720px] p-8 print:p-0 print:max-w-none font-sans text-[#1a1a1a]">
        {/* Aviso LGPD */}
        <div className="border border-[#2D3B36] rounded-lg p-3 mb-6 text-[11px] text-[#555] leading-relaxed">
          <strong>DOCUMENTO CONFIDENCIAL — PRONTUÁRIO CLÍNICO COMPLETO.</strong> Protegido pela LGPD
          (Lei nº 13.709/2018) e sigilo profissional. Vedada reprodução sem autorização.
        </div>

        {/* Cabeçalho */}
        <div className="flex items-start justify-between mb-6 pb-4 border-b border-[#ddd]">
          <div>
            <h1 className="text-xl font-bold text-[#2D3B36]">Prontua — Prontuário Completo</h1>
            <p className="text-lg font-semibold text-[#2D3B36] mt-1">{patient?.fullName ?? '—'}</p>
          </div>
          <div className="text-right text-xs text-[#888]">
            <p>Emitido em: {printedAt}</p>
            {sessionInfo?.name && <p className="mt-0.5">{sessionInfo.name}</p>}
            <p className="mt-0.5">{sessions.length} sessão(ões)</p>
          </div>
        </div>

        {/* Sessões */}
        {sessions.length === 0 ? (
          <p className="text-sm text-[#888] text-center py-8">Nenhuma sessão com nota registrada.</p>
        ) : (
          <div className="space-y-8">
            {sessions.map((s, i) => (
              <div key={s.id} className="border border-[#e0e0e0] rounded-lg overflow-hidden">
                {/* Header da sessão */}
                <div className="bg-[#f5f1e8] px-4 py-3 flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-sm capitalize">
                      {new Date(s.scheduledAt).toLocaleDateString('pt-BR', {
                        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
                      })}
                    </p>
                    <p className="text-xs text-[#666] mt-0.5">
                      {new Date(s.scheduledAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      {' · '}{s.durationMin}min
                      {' · '}{s.mode === 'ONLINE' ? 'Online' : 'Presencial'}
                      {' · '}{formatBRL(s.value)}
                      {' · '}{STATUS_LABEL[s.status] ?? s.status}
                    </p>
                  </div>
                  <span className="text-xs text-[#888]">#{i + 1}</span>
                </div>

                <div className="px-4 py-3 space-y-3">
                  {s.humor !== null && (
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-[#888] mb-0.5">Humor</p>
                      <p className="text-sm">{s.humor}/5 — {HUMOR_LABELS[s.humor]}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-[#888] mb-0.5">Evolução clínica</p>
                    <p className="text-sm whitespace-pre-wrap leading-relaxed text-[#333] min-h-[40px]">
                      {s.evolutionNote || <span className="text-[#aaa] italic">Sem registro.</span>}
                    </p>
                  </div>
                  {s.nextSteps && (
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-[#888] mb-0.5">Próximos passos</p>
                      <p className="text-sm whitespace-pre-wrap leading-relaxed text-[#333]">{s.nextSteps}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Assinatura */}
        <div className="mt-12 pt-4 border-t border-[#ddd] grid grid-cols-2 gap-8 text-xs text-[#888]">
          <div>
            <div className="border-b border-[#bbb] mb-1 h-10" />
            <p>Assinatura do profissional</p>
            {sessionInfo?.name && <p className="font-medium text-[#555]">{sessionInfo.name}</p>}
          </div>
          <div>
            <div className="border-b border-[#bbb] mb-1 h-10" />
            <p>Ciente — {patient?.fullName ?? 'Paciente'}</p>
          </div>
        </div>

        <p className="mt-6 text-[10px] text-[#aaa] text-center">
          Gerado pelo Prontua em conformidade com a LGPD (Lei nº 13.709/2018).
        </p>
      </div>
    </>
  );
}
