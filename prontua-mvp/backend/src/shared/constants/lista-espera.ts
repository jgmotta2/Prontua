export const OrigemListaEspera = {
  LANDING_CTA: 'landing_cta',
} as const;

export type OrigemListaEspera =
  (typeof OrigemListaEspera)[keyof typeof OrigemListaEspera];
