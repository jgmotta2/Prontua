import { useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Printer } from 'lucide-react';
import { usePatient } from '@features/patients/hooks/usePatients';
import { useSessionNote } from '../hooks/useNotes';
import { useSession } from '@features/auth/hooks/useSession';
import { formatBRL } from '@lib/utils/format';

const HUMOR_LABELS = ['', 'Muito baixo', 'Baixo', 'Regular', 'Bem', 'Excelente'];

const STATUS_LABEL: Record<string, string> = {
  SCHEDULED: 'Agendada',
  CONFIRMED: 'Confirmada',
  COMPLETED: 'Concluída',
  CANCELED: 'Cancelada',
  NO_SHOW: 'Faltou',
};

function formatSessionDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
}

function formatSessionTime(iso: string) {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

export function ProntuarioPrintPage() {
  const { id: patientId, sessionId } = useParams<{ id: string; sessionId: string }>();
  const { data: patient } = usePatient(patientId ?? '');
  const { data: note, isLoading } = useSessionNote(sessionId ?? null);
  const { data: session } = useSession();

  useEffect(() => {
    if (!isLoading && note) {
      const timer = setTimeout(() => window.print(), 600);
      return () => clearTimeout(timer);
    }
  }, [isLoading, note]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-sage border-t-transparent" />
      </div>
    );
  }

  if (!note) return null;

  const printedAt = new Date().toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

  return (
    <>
      {/* Barra de ações — some na impressão */}
      <div className="print:hidden flex items-center gap-3 px-6 py-3 bg-white border-b border-warm">
        <Link
          to={`/pacientes/${patientId}/prontuario`}
          className="flex items-center gap-1.5 text-sm text-muted hover:text-ink transition"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Link>
        <span className="flex-1" />
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 rounded-xl bg-sage px-4 py-2 text-sm font-medium text-cream hover:bg-sage-dark transition"
        >
          <Printer className="h-4 w-4" />
          Imprimir / Salvar PDF
        </button>
      </div>

      {/* Conteúdo imprimível */}
      <div className="mx-auto max-w-[720px] p-8 print:p-0 print:max-w-none font-sans text-[#1a1a1a]">

        {/* Aviso de confidencialidade */}
        <div className="border border-[#2D3B36] rounded-lg p-3 mb-6 text-[11px] text-[#555] leading-relaxed">
          <strong>DOCUMENTO CONFIDENCIAL — PRONTUÁRIO CLÍNICO.</strong> Este documento contém
          informações de saúde protegidas pela LGPD (Lei nº 13.709/2018) e pelo sigilo profissional.
          É vedada a reprodução ou divulgação sem autorização expressa do paciente e do profissional
          responsável.
        </div>

        {/* Cabeçalho */}
        <div className="flex items-start justify-between mb-6 pb-4 border-b border-[#ddd]">
          <div>
            <h1 className="text-xl font-bold text-[#2D3B36] mb-0.5">Prontua</h1>
            <p className="text-sm text-[#666]">Prontuário Clínico</p>
          </div>
          <div className="text-right text-xs text-[#888]">
            <p>Emitido em: {printedAt}</p>
            {session?.name && <p className="mt-0.5">Profissional: {session.name}</p>}
          </div>
        </div>

        {/* Dados do paciente */}
        <section className="mb-6">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-[#888] mb-2">Paciente</h2>
          <p className="text-lg font-semibold text-[#2D3B36]">{patient?.fullName ?? '—'}</p>
          {patient?.birthDate && (
            <p className="text-sm text-[#666]">
              Data de nascimento: {new Date(patient.birthDate).toLocaleDateString('pt-BR')}
            </p>
          )}
        </section>

        {/* Dados da sessão */}
        <section className="mb-6 p-4 bg-[#F5F1E8] rounded-lg">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-[#888] mb-3">Sessão</h2>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-[#888]">Data: </span>
              <span className="capitalize">{formatSessionDate(note.scheduledAt)}</span>
            </div>
            <div>
              <span className="text-[#888]">Horário: </span>
              <span>{formatSessionTime(note.scheduledAt)}</span>
            </div>
            <div>
              <span className="text-[#888]">Duração: </span>
              <span>{note.durationMin} minutos</span>
            </div>
            <div>
              <span className="text-[#888]">Modalidade: </span>
              <span>{note.mode === 'ONLINE' ? 'Online' : 'Presencial'}</span>
            </div>
            <div>
              <span className="text-[#888]">Status: </span>
              <span>{STATUS_LABEL[note.status] ?? note.status}</span>
            </div>
            <div>
              <span className="text-[#888]">Valor: </span>
              <span>{formatBRL(note.value)}</span>
            </div>
          </div>
        </section>

        {/* Humor */}
        {note.humor !== null && (
          <section className="mb-6">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-[#888] mb-2">Humor do paciente</h2>
            <p className="text-sm">
              {note.humor}/5 — {HUMOR_LABELS[note.humor] ?? '—'}
            </p>
          </section>
        )}

        {/* Evolução clínica */}
        <section className="mb-6">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-[#888] mb-2">Evolução clínica</h2>
          <div className="text-sm whitespace-pre-wrap leading-relaxed text-[#333] min-h-[80px]">
            {note.evolutionNote || <span className="text-[#aaa]">Nenhuma nota registrada.</span>}
          </div>
        </section>

        {/* Próximos passos */}
        <section className="mb-8">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-[#888] mb-2">Próximos passos</h2>
          <div className="text-sm whitespace-pre-wrap leading-relaxed text-[#333] min-h-[60px]">
            {note.nextSteps || <span className="text-[#aaa]">Nenhum próximo passo registrado.</span>}
          </div>
        </section>

        {/* Assinatura */}
        <div className="mt-12 pt-4 border-t border-[#ddd] grid grid-cols-2 gap-8 text-xs text-[#888]">
          <div>
            <div className="border-b border-[#bbb] mb-1 h-10" />
            <p>Assinatura do profissional</p>
            {session?.name && <p className="mt-0.5 font-medium text-[#555]">{session.name}</p>}
          </div>
          <div>
            <div className="border-b border-[#bbb] mb-1 h-10" />
            <p>Ciente — {patient?.fullName ?? 'Paciente'}</p>
          </div>
        </div>

        {/* Rodapé LGPD */}
        <p className="mt-8 text-[10px] text-[#aaa] text-center leading-relaxed">
          Documento gerado pelo sistema Prontua em conformidade com a LGPD (Lei nº 13.709/2018).
          Informações de saúde são tratadas com base no legítimo interesse de cuidado clínico (Art. 11, II, f).
        </p>
      </div>
    </>
  );
}
