// src/utils/comprobantesRecibidos.js
// Datos fiscales de una factura de proveedor (comprobante recibido, Libro IVA
// Compras): estado del formulario, importes calculados y cuerpo para el backend.

const num = (v) => Number(String(v ?? '').replace(',', '.'));
const monto = (v) => (Number.isFinite(num(v)) && num(v) > 0 ? num(v) : 0);
const r2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

export const fiscalVacio = (fecha = '') => ({
  emisor_id: '',
  tipo_comprobante: '1',
  punto_venta: '',
  numero: '',
  fecha_comprobante: fecha,
  periodo_imputacion: '',
  cae: '',
  proveedor_documento: '',
  proveedor_nombre: '',
  ivaFilas: [{ porcentaje: '21', base: '' }],
  importe_exento: '',
  importe_no_gravado: '',
  importe_total: '',
  percepcion_iva: '',
  percepcion_nacional: '',
  percepcion_municipal: '',
  impuestos_internos: '',
  otros_tributos: '',
  percepcionesIibb: []
});

/** Los comprobantes A y M discriminan IVA (y dan crédito fiscal). */
export const discriminaIva = (catalogo, tipo) => Boolean(catalogo?.comprobantes?.find((c) => c.id === Number(tipo))?.discrimina_iva);

/** Importes que salen de lo cargado: neto, IVA por fila, tributos y total. */
export function calcularFiscal(f, catalogo) {
  const discrimina = discriminaIva(catalogo, f.tipo_comprobante);
  const ivaFilas = f.ivaFilas.map((x) => ({ base: monto(x.base), iva: r2((monto(x.base) * num(x.porcentaje)) / 100) }));
  const percepcionesIibb = r2(f.percepcionesIibb.reduce((acc, p) => acc + monto(p.importe), 0));
  const tributos = r2(monto(f.percepcion_iva) + monto(f.percepcion_nacional) + monto(f.percepcion_municipal) + monto(f.impuestos_internos) + monto(f.otros_tributos) + percepcionesIibb);
  const neto = r2(ivaFilas.reduce((acc, x) => acc + x.base, 0));
  const iva = r2(ivaFilas.reduce((acc, x) => acc + x.iva, 0));
  const total = discrimina ? r2(neto + iva + monto(f.importe_exento) + monto(f.importe_no_gravado) + tributos) : monto(f.importe_total);
  return { discrimina, ivaFilas, neto, iva, tributos, total };
}

/** Motivo por el que faltan datos, o null. (El backend valida el resto.) */
export function errorFiscal(f, catalogo, { conProveedor, cantidadEmisores = 1 }) {
  if (cantidadEmisores > 1 && !f.emisor_id) return 'Elegí a qué CUIT propio corresponde la factura.';
  if (!f.punto_venta || !f.numero) return 'Cargá el punto de venta y el número del comprobante.';
  if (!f.fecha_comprobante) return 'Cargá la fecha del comprobante.';
  if (conProveedor && !f.proveedor_nombre.trim()) return 'Cargá la razón social del proveedor.';
  if (!(calcularFiscal(f, catalogo).total > 0)) return 'El total del comprobante tiene que ser mayor a cero.';
  return null;
}

/** Cuerpo para el backend (POST /compras → fiscal, o POST /facturacion/comprobantes-recibidos). */
export function payloadFiscal(f, catalogo, { conProveedor }) {
  const { discrimina, total } = calcularFiscal(f, catalogo);
  return {
    emisor_id: f.emisor_id ? Number(f.emisor_id) : undefined,
    tipo_comprobante: Number(f.tipo_comprobante),
    punto_venta: Number(f.punto_venta),
    numero: Number(f.numero),
    fecha_comprobante: f.fecha_comprobante,
    periodo_imputacion: f.periodo_imputacion || undefined,
    cae: f.cae?.trim() || null,
    ...(conProveedor ? { proveedor_documento_tipo: f.proveedor_documento.trim() ? 80 : 99, proveedor_documento: f.proveedor_documento, proveedor_nombre: f.proveedor_nombre.trim() } : {}),
    ...(discrimina
      ? {
          iva_detalle: f.ivaFilas.filter((x) => monto(x.base) > 0).map((x) => ({ porcentaje: num(x.porcentaje), base: monto(x.base) })),
          importe_exento: monto(f.importe_exento),
          importe_no_gravado: monto(f.importe_no_gravado)
        }
      : {}),
    importe_total: total,
    percepcion_iva: monto(f.percepcion_iva),
    percepcion_nacional: monto(f.percepcion_nacional),
    percepcion_municipal: monto(f.percepcion_municipal),
    impuestos_internos: monto(f.impuestos_internos),
    otros_tributos: monto(f.otros_tributos),
    percepciones_iibb: f.percepcionesIibb.filter((p) => p.jurisdiccion && monto(p.importe) > 0).map((p) => ({ jurisdiccion: Number(p.jurisdiccion), importe: monto(p.importe) }))
  };
}

/** Un comprobante guardado → estado del formulario (para editarlo). */
export function fiscalDesdeComprobante(c) {
  const nz = (v) => (Number(v) > 0 ? String(v) : '');
  return {
    emisor_id: String(c.emisor_id),
    tipo_comprobante: String(c.tipo_comprobante),
    punto_venta: String(c.punto_venta),
    numero: String(c.numero),
    fecha_comprobante: c.fecha_comprobante,
    periodo_imputacion: c.periodo_imputacion,
    cae: c.cae || '',
    proveedor_documento: c.proveedor_documento === '0' ? '' : c.proveedor_documento,
    proveedor_nombre: c.proveedor_nombre,
    ivaFilas: (c.iva_detalle || []).length ? c.iva_detalle.map((a) => ({ porcentaje: String(a.porcentaje), base: String(a.base) })) : [{ porcentaje: '21', base: '' }],
    importe_exento: nz(c.importe_exento),
    importe_no_gravado: nz(c.importe_no_gravado),
    importe_total: nz(c.importe_total),
    percepcion_iva: nz(c.percepcion_iva),
    percepcion_nacional: nz(c.percepcion_nacional),
    percepcion_municipal: nz(c.percepcion_municipal),
    impuestos_internos: nz(c.impuestos_internos),
    otros_tributos: nz(c.otros_tributos),
    percepcionesIibb: (c.percepciones_iibb_detalle || []).map((p) => ({ jurisdiccion: String(p.jurisdiccion), importe: String(p.importe) }))
  };
}

export const ALICUOTAS_IVA = [0, 2.5, 5, 10.5, 21, 27];
