/**
 * Máscara dinâmica para WhatsApp brasileiro.
 * Aceita os formatos:  (11) 9 8765-4321  |  (11) 8765-4321
 * Retorna apenas dígitos quando for enviar para o backend.
 */

export function maskWhatsappBr(input: string): string {
  const d = input.replace(/\D/g, '').slice(0, 11);
  if (d.length === 0) return '';
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

export function unmaskWhatsapp(masked: string): string {
  return masked.replace(/\D/g, '');
}
