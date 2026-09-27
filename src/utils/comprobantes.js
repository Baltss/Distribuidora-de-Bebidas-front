// src/utils/comprobantes.js
// Helpers compartidos para mostrar e imprimir comprobantes electrónicos.

import { getFacturaTicket } from '../api/facturacion';
import { imprimirBytes, leerConfigImpresora, impresoraConfigurada } from './impresoraTicket';

export const TIPO_LETRA = { 1: 'A', 3: 'A', 6: 'B', 8: 'B', 11: 'C', 13: 'C' };
const TIPOS_NC = new Set([3, 8, 13]);

export const esNotaCredito = (f) => TIPOS_NC.has(Number(f?.tipo_comprobante));

export const nombreCorto = (f) => `${esNotaCredito(f) ? 'NC' : 'Fact.'} ${TIPO_LETRA[f?.tipo_comprobante] || '?'}`;

export const nombreLargo = (f) =>
  `${esNotaCredito(f) ? 'Nota de Crédito' : 'Factura'} ${TIPO_LETRA[f?.tipo_comprobante] || '?'}`;

/** 0001-00000123, o null si todavía no tiene número. */
export const numeroComprobante = (f) =>
  f?.numero
    ? `${String(f.punto_venta?.numero ?? '').padStart(4, '0')}-${String(f.numero).padStart(8, '0')}`
    : null;

export const ESTADO_COMPROBANTE = {
  autorizada: { label: 'Autorizada', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  pendiente: { label: 'Emitiendo…', cls: 'bg-sky-50 text-sky-700 border-sky-200' },
  error: { label: 'Error', cls: 'bg-rose-50 text-rose-700 border-rose-200' },
  anulada_por_nc: { label: 'Anulada por NC', cls: 'bg-slate-100 text-slate-500 border-slate-200' }
};

/** Se puede imprimir: tiene CAE. */
export const esImprimible = (f) => ['autorizada', 'anulada_por_nc'].includes(f?.estado);

/**
 * Imprime el ticket ESC/POS del comprobante en la impresora configurada.
 * Tira { amigable, message } o el error del backend ({ mensajeError }).
 */
export async function imprimirTicketComprobante(facturaId) {
  const config = leerConfigImpresora();
  if (!impresoraConfigurada(config)) {
    throw Object.assign(new Error('Todavía no configuraste la impresora de tickets.'), {
      amigable: true,
      sinConfigurar: true
    });
  }
  const bytes = await getFacturaTicket(facturaId, {
    columnas: config.columnas,
    sinAcentos: config.sinAcentos
  });
  await imprimirBytes(bytes, config);
}

export const mensajeDeError = (err, fallback = 'Ocurrió un error inesperado.') =>
  err?.mensajeError || err?.message || fallback;

/** CUIT/CUIL válido (11 dígitos + dígito verificador). */
export function esCuitValido(valor) {
  const s = String(valor ?? '').replace(/\D/g, '');
  if (s.length !== 11) return false;
  const pesos = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  const suma = pesos.reduce((acc, p, i) => acc + p * Number(s[i]), 0);
  const resto = 11 - (suma % 11);
  const dv = resto === 11 ? 0 : resto === 10 ? 9 : resto;
  return dv === Number(s[10]);
}

const CONDICION_IVA_CORTA = {
  1: 'Responsable Inscripto',
  4: 'Exento',
  5: 'Consumidor Final',
  6: 'Monotributo',
  7: 'No Categorizado',
  13: 'Monotributo Social',
  15: 'IVA No Alcanzado',
  16: 'Monotributo Promovido'
};

/**
 * Qué comprobante va a salir para un cliente (misma regla que el backend):
 * { letra, texto, advertencia } o null si no se puede facturar.
 */
export function comprobantePrevisto(estadoEmision, cliente) {
  if (!estadoEmision?.habilitada || !cliente) return null;
  const condicion = Number(cliente.condicion_iva_id ?? 5);
  const receptor = CONDICION_IVA_CORTA[condicion] || 'Consumidor Final';
  if (estadoEmision.condicion_fiscal === 'monotributista') {
    return { letra: 'C', texto: `Factura C · ${receptor}`, advertencia: null };
  }
  if (condicion === 1) {
    const cuitOk = Number(cliente.documento_tipo) === 80 && esCuitValido(cliente.documento);
    return {
      letra: 'A',
      texto: `Factura A · ${receptor}`,
      advertencia: cuitOk ? null : 'El cliente necesita un CUIT válido cargado para emitir Factura A.'
    };
  }
  return { letra: 'B', texto: `Factura B · ${receptor}`, advertencia: null };
}
