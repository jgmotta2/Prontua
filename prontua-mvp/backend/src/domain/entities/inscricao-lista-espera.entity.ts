import type { OrigemListaEspera } from '@shared/constants/lista-espera';

export interface InscricaoListaEspera {
  id: string;
  email: string;
  origem: OrigemListaEspera;
  ipHash: string | null;
  criadoEm: Date;
}
