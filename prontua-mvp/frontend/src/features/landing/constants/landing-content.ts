import {
  CalendarDays,
  FileText,
  Lock,
  Shield,
  Users,
  Wallet,
} from 'lucide-react';
import agendaScreenImage from '@assets/Tela-agenda.png';
import clientsScreenImage from '@assets/Tela-clientes.png';
import dashboardScreenImage from '@assets/Tela-Dashboard.png';
import financeScreenImage from '@assets/Tela-financeiro.png';
import type {
  DepoimentoLanding,
  FuncionalidadeLanding,
  HeroSlide,
  ItemPerguntaFrequente,
  InformacoesContatoLanding,
  LinkNavegacaoHeader,
  PassoFluxo,
  PlanoLanding,
} from '../types/landing.types';

export const IDS_SECAO_LANDING = {
  FUNCIONALIDADES: 'funcionalidades',
  FEEDBACKS: 'feedbacks',
  PLANOS: 'planos',
  FAQ: 'faq',
  CONTATO: 'contato',
} as const;

export const LINKS_NAVEGACAO_HEADER: readonly LinkNavegacaoHeader[] = [
  { rotulo: 'Funcionalidades', idSecao: IDS_SECAO_LANDING.FUNCIONALIDADES },
  { rotulo: 'Feedbacks', idSecao: IDS_SECAO_LANDING.FEEDBACKS },
  { rotulo: 'Planos', idSecao: IDS_SECAO_LANDING.PLANOS },
  { rotulo: 'FAQ', idSecao: IDS_SECAO_LANDING.FAQ },
  { rotulo: 'Contato', idSecao: IDS_SECAO_LANDING.CONTATO },
] as const;

export const INFORMACOES_CONTATO: InformacoesContatoLanding = {
  telefoneExibicao: '54 9928-2014',
  telefoneUri: 'tel:+5554999282014',
  email: 'prontuasoftware@gmail.com',
  instagramUrl: 'https://www.instagram.com/prontuasoftware/',
  instagramRotulo: '@prontuasoftware',
};

export const TITULO_MARCA = 'Prontua';

export const TAGLINE_MARCA = 'Gestão de clínicas com privacidade por design';

export const HERO_CAROUSEL_INTERVAL_MS = 6000;

export const HERO_SLIDES: readonly HeroSlide[] = [
  {
    kind: 'intro',
    id: 'intro',
    eyebrow: 'Para psicólogos e clínicas de saúde mental',
    title: 'Prontuário, agenda e financeiro em um só lugar',
    description: `${TAGLINE_MARCA}. Menos burocracia, mais tempo com seus pacientes — com criptografia, LGPD e ética profissional desde o primeiro dia.`,
    footnote: '3 dias gratuitos · Sem cartão para começar',
  },
  {
    kind: 'feature',
    id: 'dashboard',
    url: dashboardScreenImage,
    title: 'Painel do dia em um só lugar',
    description:
      'Resumo da agenda, indicadores e atalhos para o que importa na clínica.',
  },
  {
    kind: 'feature',
    id: 'agenda',
    url: agendaScreenImage,
    title: 'Agenda clara e organizada',
    description:
      'Sessões, horários e confirmações sem planilhas nem ferramentas soltas.',
  },
  {
    kind: 'feature',
    id: 'clients',
    url: clientsScreenImage,
    title: 'Pacientes sempre à mão',
    description:
      'Busca rápida, histórico e acesso direto ao prontuário de cada pessoa.',
  },
  {
    kind: 'feature',
    id: 'finance',
    url: financeScreenImage,
    title: 'Financeiro integrado à rotina',
    description:
      'Receitas, pendências e gráficos para acompanhar a saúde da clínica.',
  },
] as const;

export const PASSOS_FLUXO: PassoFluxo[] = [
  {
    ordem: 1,
    titulo: 'Agende a sessão',
    descricao:
      'Organize sua agenda com lembretes e confirmações. Tudo em um só lugar, sem planilhas.',
  },
  {
    ordem: 2,
    titulo: 'Registre o atendimento',
    descricao:
      'Evoluções e anotações clínicas com histórico completo por paciente, pronto para o dia a dia.',
  },
  {
    ordem: 3,
    titulo: 'Prontuário protegido',
    descricao:
      'Dados criptografados em repouso (AES-256-GCM), auditoria de acesso e conformidade LGPD.',
  },
];

export const FUNCIONALIDADES: FuncionalidadeLanding[] = [
  {
    titulo: 'Prontuário criptografado',
    descricao:
      'Conteúdo clínico protegido em repouso. Mesmo em vazamento de banco, os dados permanecem ilegíveis.',
    icone: Lock,
  },
  {
    titulo: 'Agenda inteligente',
    descricao:
      'Sessões, status e lembretes. Notificações administrativas via WhatsApp, sem expor dados sensíveis.',
    icone: CalendarDays,
  },
  {
    titulo: 'Gestão de pacientes',
    descricao:
      'Cadastro, busca rápida e linha do tempo clínica. Histórico organizado para cada paciente.',
    icone: Users,
  },
  {
    titulo: 'Controle financeiro',
    descricao:
      'Pagamentos, pendências e visão de receita. Acompanhe o financeiro da clínica com clareza.',
    icone: Wallet,
  },
  {
    titulo: 'Exportação e compartilhamento',
    descricao:
      'Exporte prontuários em PDF e compartilhe com segurança quando necessário.',
    icone: FileText,
  },
  {
    titulo: 'LGPD e ética profissional',
    descricao:
      'Auditoria de acesso, sigilo profissional e diretrizes do CFP. Privacidade desde o desenho.',
    icone: Shield,
  },
];

export const DEPOIMENTOS: DepoimentoLanding[] = [
  {
    texto:
      'Finalmente um sistema que entende a rotina do consultório. Prontuário, agenda e financeiro sem ficar pulando entre ferramentas.',
    autor: 'Dra. Ana Ribeiro',
    local: 'São Paulo/SP',
  },
  {
    texto:
      'A criptografia e o registro de acesso me dão tranquilidade com dados sensíveis. Atendo com mais foco no paciente.',
    autor: 'Dr. Marcos Oliveira',
    local: 'Belo Horizonte/MG',
  },
  {
    texto:
      'Configurar a clínica foi rápido. Em poucos dias já estava com agenda e prontuários organizados.',
    autor: 'Dra. Juliana Costa',
    local: 'Curitiba/PR',
  },
];

export const PLANOS: PlanoLanding[] = [
  {
    id: 'trial',
    nome: 'Teste gratuito',
    subtitulo: '3 dias para conhecer',
    preco: 'R$ 0',
    periodo: 'por 3 dias',
    destaque: true,
    disponivel: true,
    recursos: [
      'Pacientes e sessões ilimitados',
      'Prontuário criptografado',
      'Agenda e financeiro',
      'Suporte por e-mail',
    ],
  },
  {
    id: 'pro',
    nome: 'Prontua Pro',
    subtitulo: 'Para consultórios em crescimento',
    preco: 'Sob consulta',
    periodo: '/mês',
    destaque: false,
    disponivel: true,
    recursos: [
      'Tudo do período de teste',
      'Multi-profissional na clínica',
      'Relatórios e exportação PDF',
      'Notificações WhatsApp',
      'Suporte prioritário',
    ],
  },
];

export const PERGUNTAS_FREQUENTES: ItemPerguntaFrequente[] = [
  {
    pergunta: 'Meus dados e dos pacientes ficam seguros?',
    resposta:
      'Sim. Prontuários são criptografados em repouso (AES-256-GCM), sessões usam cookies HttpOnly e há auditoria de acesso. Seguimos LGPD e o Código de Ética do CFP.',
  },
  {
    pergunta: 'É difícil de usar?',
    resposta:
      'O Prontua foi pensado para o dia a dia do consultório: agenda, pacientes e prontuário em fluxos simples, sem telas genéricas de hospital.',
  },
  {
    pergunta: 'Posso testar antes de assinar?',
    resposta:
      'Sim. Você tem 3 dias gratuitos para explorar todas as funcionalidades. Depois, assine quando fizer sentido para sua clínica.',
  },
  {
    pergunta: 'Funciona no celular?',
    resposta:
      'Sim. A interface é responsiva e o menu inferior no mobile facilita agenda, pacientes e financeiro em qualquer lugar.',
  },
  {
    pergunta: 'Preciso instalar algo?',
    resposta:
      'Não. Basta o navegador. Acesse pelo computador ou celular com sua conta.',
  },
];

export const ITENS_PUBLICO_POSITIVO = [
  'Você é psicólogo(a), fisioterapeuta, fonoaudiólogo(a) ou profissional de saúde mental',
  'Atende em consultório ou clínica',
  'Quer prontuário, agenda e financeiro integrados',
  'Valoriza sigilo, LGPD e registro ético',
];

export const ITENS_PUBLICO_NEGATIVO = [
  'Busca apenas um sistema genérico de hospital',
  'Não precisa de prontuário clínico digital',
];
