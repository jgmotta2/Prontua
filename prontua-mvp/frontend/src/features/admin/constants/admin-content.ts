export const ROTA_ADMIN_LISTA_ESPERA = '/admin/emails' as const;

export const ADMIN_LISTA_ESPERA = {
  tituloPagina: 'Lista de espera',
  subtitulo: 'E-mails cadastrados para aviso de lançamento na landing.',
  colunaEmail: 'E-mail',
  colunaData: 'Cadastrado em',
  colunaOrigem: 'Origem',
  totalInscricoes: (total: number) =>
    total === 1 ? '1 inscrição' : `${total} inscrições`,
  vazio: 'Nenhum e-mail cadastrado ainda.',
  erroCarregar: 'Não foi possível carregar a lista. Tente novamente.',
  paginaAnterior: 'Anterior',
  proximaPagina: 'Próxima',
  paginaDe: (pagina: number, totalPaginas: number) => `Página ${pagina} de ${totalPaginas}`,
  sair: 'Sair',
  marca: 'Prontua Admin',
} as const;
