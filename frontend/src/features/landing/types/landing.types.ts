import type { LucideIcon } from 'lucide-react';

export interface PassoFluxo {
  titulo: string;
  descricao: string;
  ordem: number;
}

export interface FuncionalidadeLanding {
  titulo: string;
  descricao: string;
  icone: LucideIcon;
}

export interface DepoimentoLanding {
  texto: string;
  autor: string;
  local: string;
}

export interface PlanoLanding {
  id: string;
  nome: string;
  subtitulo: string;
  preco: string;
  periodo: string;
  destaque: boolean;
  disponivel: boolean;
  recursos: string[];
}

export interface ItemPerguntaFrequente {
  pergunta: string;
  resposta: string;
}

export interface HeroIntroSlide {
  kind: 'intro';
  id: 'intro';
  eyebrow: string;
  title: string;
  description: string;
  footnote: string;
}

export interface HeroFeatureSlide {
  kind: 'feature';
  id: string;
  url: string;
  title: string;
  description: string;
}

export type HeroSlide = HeroIntroSlide | HeroFeatureSlide;

export interface LinkNavegacaoHeader {
  rotulo: string;
  idSecao: string;
}

export interface InformacoesContatoLanding {
  telefoneExibicao: string;
  telefoneUri: string;
  email: string;
  instagramUrl: string;
  instagramRotulo: string;
}
