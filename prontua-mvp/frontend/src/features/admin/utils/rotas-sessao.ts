import { ROTA_ADMIN_LISTA_ESPERA } from '../constants/admin-content';

export function rotaAposAutenticacao(isAdministradorPlataforma: boolean): string {
  return isAdministradorPlataforma ? ROTA_ADMIN_LISTA_ESPERA : '/painel';
}
