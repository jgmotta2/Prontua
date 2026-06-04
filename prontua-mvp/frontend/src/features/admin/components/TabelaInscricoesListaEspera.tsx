import type { InscricaoListaEsperaItem } from '../hooks/useListaEsperaEmails';
import { ADMIN_LISTA_ESPERA } from '../constants/admin-content';

interface TabelaInscricoesListaEsperaProps {
  inscricoes: InscricaoListaEsperaItem[];
}

function formatarData(iso: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(iso));
}

export function TabelaInscricoesListaEspera({ inscricoes }: TabelaInscricoesListaEsperaProps) {
  return (
    <div className="overflow-x-auto rounded-xl border border-warm bg-white">
      <table className="w-full min-w-[32rem] text-left text-sm">
        <thead>
          <tr className="border-b border-warm bg-cream/60">
            <th className="px-4 py-3 font-medium text-ink">{ADMIN_LISTA_ESPERA.colunaEmail}</th>
            <th className="px-4 py-3 font-medium text-ink">{ADMIN_LISTA_ESPERA.colunaData}</th>
            <th className="px-4 py-3 font-medium text-ink">{ADMIN_LISTA_ESPERA.colunaOrigem}</th>
          </tr>
        </thead>
        <tbody>
          {inscricoes.map((inscricao) => (
            <tr key={inscricao.id} className="border-b border-warm last:border-0">
              <td className="px-4 py-3 text-ink">{inscricao.email}</td>
              <td className="px-4 py-3 text-muted">{formatarData(inscricao.criadoEm)}</td>
              <td className="px-4 py-3 text-muted">{inscricao.origem}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
