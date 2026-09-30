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

/** Pendientes de aprobación (rol soldi_admin) */
export async function listConfiguracionFiscalPendientes() {
  const { data } = await http.get('/facturacion/configuracion-fiscal/pendientes');
  return data;
}

/**
 * Solicita un cambio de datos fiscales (o el alta de un CUIT nuevo): genera el
 * CSR automáticamente. { emisor_id | cuit, razon_social, condicion_fiscal, ambiente? }
 */
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
 * (usa el timeout default, ya no hace falta uno largo). `puntoVentaId` elige
 * el CUIT con el que se factura; sin él sale por el que corresponde al usuario.
 */
export async function facturarVentas(ventaIds, puntoVentaId = null) {
  const { data } = await http.post('/facturacion/facturas', { venta_ids: ventaIds, punto_venta_id: puntoVentaId });
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

/**
 * Listado de comprobantes. params: { desde?, hasta?, tipo? (factura|nota_credito|nota_debito),
 * estado?, cliente_id?, q? (número, CAE o nombre), page?, limit? }.
 * Con `page` devuelve { data, meta, resumen }; sin `page`, un array.
 */
export async function listFacturas(params = {}) {
  const { data } = await http.get(`/facturacion/facturas${toQS(params)}`);
  return data;
}

export async function getFactura(id) {
  const { data } = await http.get(`/facturacion/facturas/${id}`);
  return data;
}

// ---------- Notas de Crédito / Débito sobre una factura ----------

/**
 * Lo necesario para armar una NC o ND: ítems con lo ya devuelto y lo que
 * queda, cuánto queda por acreditar (disponible_nc), deuda pendiente de las
 * ventas, saldo a favor del cliente, NC/ND emitidas y, si no se puede,
 * `bloqueo` con el motivo.
 */
export async function getAjustesFactura(id) {
  const { data } = await http.get(`/facturacion/facturas/${id}/ajustes`);
  return data;
}

/**
 * NC por devolución o bonificación. payload: { motivo: 'devolucion'|'bonificacion',
 * items?: [{ item_id, cantidad }], monto?, descripcion?,
 * destino_excedente: 'reintegro'|'saldo_a_favor', medio_pago?, observacion? }.
 * Devuelve { factura_id, estado: 'pendiente' }.
 */
export async function crearNotaCredito(facturaId, payload) {
  const { data } = await http.post(`/facturacion/facturas/${facturaId}/nota-credito`, payload);
  return data;
}

/**
 * ND. payload: { concepto, monto, iva_condicion, iva_porcentaje,
 * destino: 'cobrar_ahora'|'cuenta_corriente', medio_pago? }.
 */
export async function crearNotaDebito(facturaId, payload) {
  const { data } = await http.post(`/facturacion/facturas/${facturaId}/nota-debito`, payload);
  return data;
}

/** Descarta una NC/ND cargada a mano que ARCA rechazó. */
export async function descartarComprobante(id) {
  const { data } = await http.post(`/facturacion/facturas/${id}/descartar`);
  return data;
}

/**
 * Datos para mandar el comprobante por WhatsApp: { ruta (link público
 * firmado al PDF, relativo a la API), comprobante, total, receptor,
 * telefono (formato wa.me o ''), telefono_cargado, emisor }.
 */
export async function getCompartirFactura(id) {
  const { data } = await http.get(`/facturacion/facturas/${id}/compartir`);
  return data;
}

/** Estado liviano de un comprobante (sirve para esperar el CAE). */
export async function getFacturaEstado(id) {
  const { data } = await http.get(`/facturacion/facturas/${id}/estado`);
  return data;
}

// Pedidos binarios: el interceptor de errores no puede leer el JSON de
// error dentro de un ArrayBuffer, así que el status se valida acá.
async function getBinario(url, params = {}, { timeout = 60000 } = {}) {
  const res = await http.get(url, {
    params,
    responseType: 'arraybuffer',
    timeout,
    validateStatus: () => true
  });
  if (res.status >= 200 && res.status < 300) return res;
  let error = { mensajeError: 'No se pudo generar el comprobante.' };
  try {
    error = JSON.parse(new TextDecoder().decode(res.data));
  } catch {
    // respuesta no JSON: queda el mensaje genérico
  }
  throw error;
}

/** Bytes ESC/POS del ticket de 80 mm. */
export async function getFacturaTicket(id, { columnas = 48, sinAcentos = false } = {}) {
  const res = await getBinario(`/facturacion/facturas/${id}/ticket`, {
    columnas,
    ...(sinAcentos ? { sin_acentos: 1 } : {})
  });
  return new Uint8Array(res.data);
}

/**
 * Abre el PDF A4 del comprobante en una pestaña nueva. La pestaña se abre
 * antes de pedir el PDF para que el navegador no la bloquee como popup.
 */
export async function abrirFacturaPdf(id) {
  const ventana = window.open('', '_blank');
  try {
    const res = await getBinario(`/facturacion/facturas/${id}/pdf`);
    const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
    if (ventana) ventana.location.href = url;
    else window.location.href = url;
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  } catch (err) {
    if (ventana) ventana.close();
    throw err;
  }
}

// ---------- Reportes para el contador ----------

/**
 * Resumen de IVA Ventas del mes (periodo 'AAAA-MM'): { por_tipo, por_alicuota,
 * totales, sin_autorizar, hay_comprobantes_c, libro_iva_digital_aplica, emisor }.
 */
export async function getResumenIva(periodo, emisorId) {
  const { data } = await http.get('/facturacion/reportes/resumen', { params: { periodo, emisor_id: emisorId } });
  return data;
}

const REPORTES_CONTADOR = {
  excel: 'libro-iva-excel',
  arca: 'libro-iva-digital',
  pdfs: 'comprobantes-pdf'
};

/**
 * Descarga un reporte del mes de un CUIT: 'excel' (Libro IVA Ventas), 'arca'
 * (ZIP con los TXT del Libro IVA Digital) o 'pdfs' (ZIP con todos los
 * comprobantes). `emisorId` se puede omitir si el negocio tiene un solo CUIT.
 */
export async function descargarReporteContador(tipo, periodo, emisorId) {
  // El ZIP de PDFs de un mes con muchos comprobantes puede tardar.
  const res = await getBinario(`/facturacion/reportes/${REPORTES_CONTADOR[tipo]}`, { periodo, emisor_id: emisorId }, { timeout: 600000 });
  const disposicion = res.headers?.['content-disposition'] || '';
  const nombre = disposicion.match(/filename="([^"]+)"/)?.[1] || `reporte-${periodo}`;
  const url = URL.createObjectURL(new Blob([res.data], { type: res.headers?.['content-type'] }));
  const a = document.createElement('a');
  a.href = url;
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
  return nombre;
}

/**
 * ¿Se puede facturar? { habilitada, motivo, punto_venta_por_defecto_id,
 * emisores: [{ id, cuit, alias, razon_social, condicion_fiscal, ambiente,
 * certificado, habilitado, motivo, puntos_venta }] }
 */
export async function getEstadoEmision() {
  const { data } = await http.get('/facturacion/estado-emision');
  return data;
}

/**
 * Catálogos y reglas fiscales del backend: { documentos, condiciones_iva,
 * condiciones_emisor, condiciones_por_clase, tope_identificacion }.
 */
export async function getCatalogoFiscal() {
  const { data } = await http.get('/facturacion/catalogo-fiscal');
  return data;
}

/**
 * Datos de un CUIT según el padrón de ARCA: { razon_social, domicilio_fiscal,
 * condicion_iva_id (puede ser null), provincia, ... }. Falla con el motivo en
 * `mensajeError` (por ejemplo si el certificado no tiene habilitado el padrón).
 */
export async function consultarPadron(cuit) {
  const { data } = await http.get(`/facturacion/padron/${encodeURIComponent(String(cuit).replace(/\D/g, ''))}`);
  return data;
}

// ---------- Emisores (cada CUIT con el que se factura) ----------

/** Cada CUIT con su estado para facturar (mismo formato que `emisores` de getEstadoEmision). */
export async function listEmisores() {
  const { data } = await http.get('/facturacion/emisores');
  return data;
}

/** Nombre interno y estado ('activo' | 'inactivo') de un CUIT. */
export async function updateEmisor(id, payload) {
  const { data } = await http.put(`/facturacion/emisores/${id}`, payload);
  return data;
}

/** Datos del negocio que se imprimen en el comprobante de un CUIT. */
export async function getDatosEmisor(emisorId) {
  const { data } = await http.get(`/facturacion/emisores/${emisorId}/datos-comprobante`);
  return data;
}

export async function updateDatosEmisor(emisorId, payload) {
  const { data } = await http.put(`/facturacion/emisores/${emisorId}/datos-comprobante`, payload);
  return data;
}

// ---------- Parámetros de la norma y auditoría ----------

/** { parametros: [{ clave, valor, vigente_desde, vigente_hasta, norma, vigente, ... }], conocidos } */
export async function listParametrosFiscales() {
  const { data } = await http.get('/facturacion/parametros-fiscales');
  return data;
}

/** Carga una vigencia nueva de un parámetro (rol soldi_admin). { clave, valor, vigente_desde, norma? } */
export async function crearParametroFiscal(payload) {
  const { data } = await http.post('/facturacion/parametros-fiscales', payload);
  return data;
}

/** Registro de cambios fiscales: { data, meta }. params: { entidad?, page?, limit? } */
export async function listAuditoriaFiscal(params = {}) {
  const { data } = await http.get(`/facturacion/auditoria${toQS(params)}`);
  return data;
}

export default {
  listConfiguracionFiscal,
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
  getFactura,
  getAjustesFactura,
  crearNotaCredito,
  crearNotaDebito,
  descartarComprobante,
  getFacturaEstado,
  getCompartirFactura,
  getFacturaTicket,
  abrirFacturaPdf,
  getEstadoEmision,
  getCatalogoFiscal,
  consultarPadron,
  getResumenIva,
  descargarReporteContador,
  listEmisores,
  updateEmisor,
  getDatosEmisor,
  updateDatosEmisor,
  listParametrosFiscales,
  crearParametroFiscal,
  listAuditoriaFiscal
};
