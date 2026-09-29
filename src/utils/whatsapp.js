// src/utils/whatsapp.js
// Mandar un comprobante por WhatsApp con un link (wa.me): se abre WhatsApp
// (web o app) con el mensaje escrito y el cliente elegido; el usuario sólo
// toca "Enviar".

/**
 * Teléfono argentino → formato wa.me (549 + característica + número, sin
 * 0 ni 15). Misma regla que el backend. Devuelve '' si no se puede
 * interpretar con seguridad.
 */
export function telefonoWhatsApp(telefono) {
  let d = String(telefono || '').replace(/\D/g, '');
  if (!d) return '';
  if (d.startsWith('00')) d = d.slice(2);
  if (d.startsWith('54')) {
    d = d.slice(2);
    if (d.startsWith('9')) d = d.slice(1);
  }
  if (d.startsWith('0')) d = d.slice(1);
  if (d.length === 12) {
    for (const largo of [2, 3, 4]) {
      if (d.slice(largo, largo + 2) === '15') {
        d = d.slice(0, largo) + d.slice(largo + 2);
        break;
      }
    }
  }
  return d.length === 10 ? `549${d}` : '';
}

/** 5493815551234 → "+54 9 381 555-1234" (aproximado, para mostrar). */
export function formatearTelefonoWhatsApp(wa) {
  const m = String(wa || '').match(/^549(\d{10})$/);
  if (!m) return wa || '';
  const n = m[1];
  const area = n.startsWith('11') ? 2 : 3;
  const resto = n.slice(area);
  return `+54 9 ${n.slice(0, area)} ${resto.slice(0, resto.length - 4)}-${resto.slice(-4)}`;
}

/** Link de WhatsApp: con teléfono abre ese chat; sin teléfono, WhatsApp pide elegir el contacto. */
export const linkWhatsApp = (telefonoWa, mensaje) =>
  `https://wa.me/${telefonoWa || ''}?text=${encodeURIComponent(mensaje || '')}`;

const money = (n) =>
  `$ ${Number(n || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** Mensaje sugerido para mandar un comprobante. */
export function mensajeComprobante({ receptor, comprobante, total, emisor }, link) {
  const saludo = receptor ? `¡Hola ${receptor}!` : '¡Hola!';
  return [
    `${saludo} Te enviamos tu ${comprobante} por ${money(total)}.`,
    `Podés verla y descargarla acá: ${link}`,
    ...(emisor ? ['', `Gracias por tu compra. ${emisor}`] : [])
  ].join('\n');
}
