// src/utils/comprobantes.js
// Helpers compartidos para mostrar e imprimir comprobantes electrónicos.

import { getFacturaTicket } from '../api/facturacion';
import { imprimirBytes, leerConfigImpresora, impresoraConfigurada } from './impresoraTicket';

// Los que emite el sistema: A, B y C, y sus equivalentes de Factura de Crédito Electrónica MiPyME (2xx).
export const TIPO_LETRA = { 1: 'A', 2: 'A', 3: 'A', 6: 'B', 7: 'B', 8: 'B', 11: 'C', 12: 'C', 13: 'C', 201: 'A', 202: 'A', 203: 'A', 206: 'B', 207: 'B', 208: 'B', 211: 'C', 212: 'C', 213: 'C' };
const TIPOS_FACTURA = new Set([1, 6, 11, 201, 206, 211]);
const TIPOS_NC = new Set([3, 8, 13, 203, 208, 213]);
const TIPOS_ND = new Set([2, 7, 12, 202, 207, 212]);
const TIPOS_FCE = new Set([201, 202, 203, 206, 207, 208, 211, 212, 213]);
export const esFce = (f) => TIPOS_FCE.has(Number(f?.tipo_comprobante));

export const esFactura = (f) => TIPOS_FACTURA.has(Number(f?.tipo_comprobante));
export const esNotaCredito = (f) => TIPOS_NC.has(Number(f?.tipo_comprobante));
export const esNotaDebito = (f) => TIPOS_ND.has(Number(f?.tipo_comprobante));

export const nombreCorto = (f) =>
  `${esNotaCredito(f) ? 'NC' : esNotaDebito(f) ? 'ND' : 'Fact.'}${esFce(f) ? ' FCE' : ''} ${TIPO_LETRA[f?.tipo_comprobante] || '?'}`;

export const nombreLargo = (f) =>
  `${esNotaCredito(f) ? 'Nota de Crédito' : esNotaDebito(f) ? 'Nota de Débito' : 'Factura'}${esFce(f) ? (esNotaCredito(f) || esNotaDebito(f) ? ' MiPyME' : ' de Crédito MiPyME') : ''} ${
    TIPO_LETRA[f?.tipo_comprobante] || '?'
  }`;

/** Por qué se emitió una NC / ND. */
export const MOTIVO_COMPROBANTE = {
  anulacion_venta: 'Anulación de la venta',
  devolucion: 'Devolución de productos',
  bonificacion: 'Bonificación',
  nota_debito: 'Nota de débito'
};

/** NC por devolución / bonificación o ND, cargadas a mano (tienen efectos en stock, cta. cte. y caja). */
export const esAjusteManual = (f) => ['devolucion', 'bonificacion', 'nota_debito'].includes(f?.motivo);


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

/**
 * Qué comprobante va a salir para un cliente facturando con un emisor (misma
 * regla que el backend, a partir del catálogo fiscal que este informa):
 * { letra, texto, advertencia } o null si todavía no se puede saber.
 */
export function comprobantePrevisto(emisor, cliente, catalogo, total = 0) {
  if (!emisor || !cliente || !catalogo) return null;

  const condicion = Number(cliente.condicion_iva_id ?? 5);
  const receptor = catalogo.condiciones_iva.find((c) => c.id === condicion);
  const condicionEmisor = catalogo.condiciones_emisor.find((c) => c.id === emisor.condicion_fiscal);
  const clase = !condicionEmisor?.discrimina_iva ? 'C' : catalogo.condiciones_por_clase.A.includes(condicion) ? 'A' : 'B';
  if (!receptor) {
    return { letra: clase, texto: `Factura ${clase}`, advertencia: 'La condición frente al IVA del cliente no es válida. Corregila en Clientes.' };
  }

  const tipoDoc = Number(cliente.documento_tipo);
  const cuitOk = tipoDoc === 80 && esCuitValido(cliente.documento);
  const identificado = tipoDoc !== 99 && !!cliente.documento;
  let advertencia = null;
  if (!catalogo.condiciones_por_clase[clase].includes(condicion)) {
    advertencia = `La condición "${receptor.label}" no admite Factura ${clase}. Corregila en Clientes.`;
  } else if ((clase === 'A' || receptor.requiere_cuit) && !cuitOk) {
    advertencia = 'El cliente necesita un CUIT válido cargado para emitir este comprobante.';
  } else if (condicion === 5 && catalogo.tope_identificacion != null && Number(total) >= catalogo.tope_identificacion && !identificado) {
    advertencia = 'Este importe requiere identificar al cliente (DNI o CUIT). Cargalo en Clientes.';
  }
  return { letra: clase, texto: `Factura ${clase} · ${receptor.label}`, advertencia };
}
