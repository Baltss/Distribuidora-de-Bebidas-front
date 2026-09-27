// src/api/facturacion.js
// Cliente API para Facturación Electrónica (Datos Fiscales, Puntos de
// Venta, Aprobaciones y Comprobantes).

import http from './http';

const toQS = (params = {}) => {
  const entries = Object.entries(params).filter(
    ([, v]) => v !== undefined && v !== null && v !== ''
  );
  if (!entries.length) return '';
  const s = new URLSearchParams();
  for (const [k, v] of entries) s.append(k, String(v));
  return `?${s.toString()}`;
};

// ---------- Configuración Fiscal ----------

/** Historial completo (rol socio / soldi_admin) */
export async function listConfiguracionFiscal() {
  const { data } = await http.get('/facturacion/configuracion-fiscal');
  return data;
}

/** La configuración activa vigente, o null si todavía no hay ninguna aprobada */
export async function getConfiguracionFiscalActiva() {
  const { data } = await http.get('/facturacion/configuracion-fiscal/activa');
  return data;
}

/** Pendientes de aprobación (rol soldi_admin) */
export async function listConfiguracionFiscalPendientes() {
  const { data } = await http.get('/facturacion/configuracion-fiscal/pendientes');
  return data;
}

/** Solicita un cambio de datos fiscales: genera CSR automáticamente. { cuit, razon_social, condicion_fiscal, ambiente? } */
export async function solicitarConfiguracionFiscal(payload) {
  const { data } = await http.post('/facturacion/configuracion-fiscal/solicitar', payload);
  return data;
}

/** Carga el certificado (PEM en texto) que AFIP devolvió para un CSR */
export async function cargarCertificadoConfiguracionFiscal(id, certificado) {
  const { data } = await http.patch(`/facturacion/configuracion-fiscal/${id}/certificado`, {
    certificado
  });
  return data;
}

/**
 * Dispara la aprobación de una solicitud pendiente (rol soldi_admin). No
 * espera a AFIP: el backend responde al toque con estado 'verificando' y
 * la verificación real corre en background — el resultado se entera por
 * polling sobre listConfiguracionFiscalPendientes (usa el timeout default,
 * ya no hace falta uno largo).
 */
export async function aprobarConfiguracionFiscal(id) {
  const { data } = await http.post(`/facturacion/configuracion-fiscal/${id}/aprobar`);
  return data;
}

/** Cancela una verificación en curso (estado 'verificando') y la deja lista para reintentar. */
export async function cancelarVerificacionConfiguracionFiscal(id) {
  const { data } = await http.post(`/facturacion/configuracion-fiscal/${id}/cancelar-verificacion`);
  return data;
}

/** Rechaza una solicitud pendiente (rol soldi_admin) */
export async function rechazarConfiguracionFiscal(id, motivo) {
  const { data } = await http.post(`/facturacion/configuracion-fiscal/${id}/rechazar`, { motivo });
  return data;
}

// ---------- Puntos de Venta ----------

export async function listPuntosVenta() {
  const { data } = await http.get('/facturacion/puntos-venta');
  return data;
}

export async function createPuntoVenta(payload) {
  const { data } = await http.post('/facturacion/puntos-venta', payload);
  return data;
}

export async function updatePuntoVenta(id, payload) {
  const { data } = await http.put(`/facturacion/puntos-venta/${id}`, payload);
  return data;
}

export async function updatePuntoVentaEstado(id, estado) {
  const { data } = await http.patch(`/facturacion/puntos-venta/${id}/estado`, { estado });
  return data;
}

// ---------- Comprobantes (Facturas) ----------

/** Ventas confirmadas sin factura vigente todavía. params: { cliente_id? } */
export async function listVentasPendientesFacturar(params = {}) {
  const { data } = await http.get(`/facturacion/ventas-pendientes${toQS(params)}`);
  return data;
}

/**
 * Dispara la emisión de un comprobante para una o varias ventas (deben
 * ser del mismo cliente). No espera a AFIP: el backend responde al
 * toque con la factura en estado 'pendiente' y la emisión real corre en
 * background — el resultado se entera por polling sobre listFacturas
 * (usa el timeout default, ya no hace falta uno largo).
 */
export async function facturarVentas(ventaIds) {
  const { data } = await http.post('/facturacion/facturas', { venta_ids: ventaIds });
  return data;
}

/** Cancela una emisión en curso (estado 'pendiente') y la deja lista para reintentar. */
export async function cancelarFactura(id) {
  const { data } = await http.post(`/facturacion/facturas/${id}/cancelar`);
  return data;
}

/**
 * Reintenta un comprobante con error (Factura o Nota de Crédito). Si el
 * intento anterior quedó sin respuesta de ARCA, primero se verifica si
 * llegó a autorizarse (nunca se factura dos veces). Devuelve
 * { factura_id, estado: 'pendiente' } o { descartada: true, message }.
 */
export async function reintentarFactura(id) {
  const { data } = await http.post(`/facturacion/facturas/${id}/reintentar`);
  return data;
}

/** Listado de comprobantes emitidos. params: { cliente_id?, estado? } */
export async function listFacturas(params = {}) {
  const { data } = await http.get(`/facturacion/facturas${toQS(params)}`);
  return data;
}

export async function getFactura(id) {
  const { data } = await http.get(`/facturacion/facturas/${id}`);
  return data;
}

export default {
  listConfiguracionFiscal,
  getConfiguracionFiscalActiva,
  listConfiguracionFiscalPendientes,
  solicitarConfiguracionFiscal,
  cargarCertificadoConfiguracionFiscal,
  aprobarConfiguracionFiscal,
  cancelarVerificacionConfiguracionFiscal,
  rechazarConfiguracionFiscal,
  listPuntosVenta,
  createPuntoVenta,
  updatePuntoVenta,
  updatePuntoVentaEstado,
  listVentasPendientesFacturar,
  facturarVentas,
  cancelarFactura,
  reintentarFactura,
  listFacturas,
  getFactura
};
