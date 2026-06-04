import {
  CalendarDays,
  FileText,
  Lock,
  Mic,
  Users,
  Wallet,
} from 'lucide-react';
import agendaScreenImage from '@assets/Tela-agenda.png';
import clientsScreenImage from '@assets/Tela-clientes.png';
import dashboardScreenImage from '@assets/Tela-Dashboard.png';
import financeScreenImage from '@assets/Tela-financeiro.png';
import recordingScreenImage from '@assets/Tela-IA.png';
import type {
  FaqItem,
  FlowStep,
  HeaderNavLink,
  HeroSlide,
  LandingContactInfo,
  LandingFeature,
  LandingPlan,
  LandingTestimonial,
} from '../types/landing.types';
import { RECORDING_SLIDE_DESKTOP_IMAGE_MAX_WIDTH_PX } from './landing-carousel-layout.constants';

export const LANDING_SECTION_IDS = {
  FEATURES: 'funcionalidades',
  FEEDBACKS: 'feedbacks',
  PRICING: 'planos',
  FAQ: 'faq',
  CONTACT: 'contato',
} as const;

export const HEADER_NAV_LINKS: readonly HeaderNavLink[] = [
  { label: 'Funcionalidades', sectionId: LANDING_SECTION_IDS.FEATURES },
  { label: 'Feedbacks', sectionId: LANDING_SECTION_IDS.FEEDBACKS },
  { label: 'Planos', sectionId: LANDING_SECTION_IDS.PRICING },
  { label: 'FAQ', sectionId: LANDING_SECTION_IDS.FAQ },
  { label: 'Contato', sectionId: LANDING_SECTION_IDS.CONTACT },
] as const;

export const CONTACT_INFO: LandingContactInfo = {
  phoneDisplay: '54 9928-2014',
  phoneUri: 'tel:+5554999282014',
  email: 'prontuasoftware@gmail.com',
  instagramUrl: 'https://www.instagram.com/prontuasoftware/',
  instagramHandle: '@prontuasoftware',
};

export const BRAND_TITLE = 'Prontua';

export const BRAND_TAGLINE = 'Gestão de clínicas com privacidade por design';

export const LANDING_CTA_EMAIL = {
  placeholderEmail: 'Seu melhor e-mail',
  submitLabel: 'Quero ser avisado',
  launchNotice: 'Lançamento dia 08/06/2026',
  successMessage:
    'Obrigado! Entraremos em contato quando o Prontua for lançado.',
  emailLabel: 'E-mail para aviso de lançamento',
} as const;

export const HERO_CAROUSEL_INTERVAL_MS = 6000;

export const HERO_SLIDES: readonly HeroSlide[] = [
  {
    kind: 'intro',
    id: 'intro',
    eyebrow: 'Para psicólogos e clínicas de saúde mental',
    title: 'Prontuário, agenda e financeiro em um só lugar',
    description: `${BRAND_TAGLINE}. Menos burocracia, mais tempo com seus pacientes — com criptografia, LGPD e ética profissional desde o primeiro dia.`,
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
  {
    kind: 'feature',
    id: 'recording',
    url: recordingScreenImage,
    imageMaxWidthPx: RECORDING_SLIDE_DESKTOP_IMAGE_MAX_WIDTH_PX,
    title: 'Gravação e transcrição com IA',
    description:
      'Grave a sessão no consultório, transcreva automaticamente e transforme o áudio em prontuário estruturado — com consentimento do paciente antes de gravar.',
  },
] as const;

export const FLOW_STEPS: FlowStep[] = [
  {
    order: 1,
    title: 'Agende a sessão',
    description:
      'Organize sua agenda com lembretes e confirmações. Tudo em um só lugar, sem planilhas.',
  },
  {
    order: 2,
    title: 'Registre o atendimento',
    description:
      'Evoluções e anotações clínicas com histórico completo por paciente, pronto para o dia a dia.',
  },
  {
    order: 3,
    title: 'Prontuário protegido',
    description:
      'Dados criptografados em repouso (AES-256-GCM), auditoria de acesso e conformidade LGPD.',
  },
];

export const FEATURES: LandingFeature[] = [
  {
    title: 'Prontuário criptografado',
    description:
      'Conteúdo clínico protegido em repouso. Mesmo em vazamento de banco, os dados permanecem ilegíveis.',
    icon: Lock,
  },
  {
    title: 'Agenda inteligente',
    description:
      'Sessões, status e lembretes. Notificações administrativas via WhatsApp, sem expor dados sensíveis.',
    icon: CalendarDays,
  },
  {
    title: 'Gestão de pacientes',
    description:
      'Cadastro, busca rápida e linha do tempo clínica. Histórico organizado para cada paciente.',
    icon: Users,
  },
  {
    title: 'Controle financeiro',
    description:
      'Pagamentos, pendências e visão de receita. Acompanhe o financeiro da clínica com clareza.',
    icon: Wallet,
  },
  {
    title: 'Exportação e compartilhamento',
    description:
      'Exporte prontuários em PDF e compartilhe com segurança quando necessário.',
    icon: FileText,
  },
  {
    title: 'Gravação e transcrição de áudio',
    description:
      'Grave a sessão, transcreva com IA e revise o prontuário antes de finalizar. Fluxo com consentimento explícito e exportação em PDF.',
    icon: Mic,
  },
];

export const TESTIMONIALS: LandingTestimonial[] = [
  {
    text:
      'Finalmente um sistema que entende a rotina do consultório. Prontuário, agenda e financeiro sem ficar pulando entre ferramentas.',
    author: 'Dra. Ana Ribeiro',
    location: 'São Paulo/SP',
  },
  {
    text:
      'A criptografia e o registro de acesso me dão tranquilidade com dados sensíveis. Atendo com mais foco no paciente.',
    author: 'Dr. Marcos Oliveira',
    location: 'Belo Horizonte/MG',
  },
  {
    text:
      'Configurar a clínica foi rápido. Em poucos dias já estava com agenda e prontuários organizados.',
    author: 'Dra. Juliana Costa',
    location: 'Curitiba/PR',
  },
];

export const PRICING_PLANS: LandingPlan[] = [
  {
    id: 'trial',
    name: 'Teste gratuito',
    subtitle: '3 dias para conhecer',
    price: 'R$ 0',
    period: 'por 3 dias',
    highlighted: true,
    available: true,
    features: [
      'Pacientes e sessões ilimitados',
      'Prontuário criptografado',
      'Agenda e financeiro',
      'Suporte por e-mail',
    ],
  },
  {
    id: 'pro',
    name: 'Prontua Pro',
    subtitle: 'Para consultórios em crescimento',
    price: 'Sob consulta',
    period: '/mês',
    highlighted: false,
    available: true,
    features: [
      'Tudo do período de teste',
      'Multi-profissional na clínica',
      'Relatórios e exportação PDF',
      'Notificações WhatsApp',
      'Suporte prioritário',
    ],
  },
];

export const FAQ_ITEMS: FaqItem[] = [
  {
    question: 'Meus dados e dos pacientes ficam seguros?',
    answer:
      'Sim. Prontuários são criptografados em repouso (AES-256-GCM), sessões usam cookies HttpOnly e há auditoria de acesso. Seguimos LGPD e o Código de Ética do CFP.',
  },
  {
    question: 'É difícil de usar?',
    answer:
      'O Prontua foi pensado para o dia a dia do consultório: agenda, pacientes e prontuário em fluxos simples, sem telas genéricas de hospital.',
  },
  {
    question: 'Posso testar antes de assinar?',
    answer:
      'Sim. Você tem 3 dias gratuitos para explorar todas as funcionalidades. Depois, assine quando fizer sentido para sua clínica.',
  },
  {
    question: 'Funciona no celular?',
    answer:
      'Sim. A interface é responsiva e o menu inferior no mobile facilita agenda, pacientes e financeiro em qualquer lugar.',
  },
  {
    question: 'Preciso instalar algo?',
    answer:
      'Não. Basta o navegador. Acesse pelo computador ou celular com sua conta.',
  },
];

export const POSITIVE_AUDIENCE_ITEMS = [
  'Você é psicólogo(a), fisioterapeuta, fonoaudiólogo(a) ou profissional de saúde mental',
  'Atende em consultório ou clínica',
  'Quer prontuário, agenda e financeiro integrados',
  'Valoriza sigilo, LGPD e registro ético',
];

export const NEGATIVE_AUDIENCE_ITEMS = [
  'Busca apenas um sistema genérico de hospital',
  'Não precisa de prontuário clínico digital',
];
