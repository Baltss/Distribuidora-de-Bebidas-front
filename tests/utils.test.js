import test from 'node:test';
import assert from 'node:assert/strict';
import { errorRetenciones, retencionesParaEnviar, totalRetenciones } from '../src/utils/retenciones.js';
import { calcularFiscal, errorFiscal, fiscalVacio, payloadFiscal } from '../src/utils/comprobantesRecibidos.js';
import { moverMes, nombreMes } from '../src/utils/periodo.js';

const catalogo = {
  comprobantes: [
    { id: 1, nombre: 'Factura A', discrimina_iva: true },
    { id: 11, nombre: 'Factura C', discrimina_iva: false }
  ],
  impuestos_retencion: [
    { id: 'iibb', label: 'Ingresos Brutos', con_jurisdiccion: true },
    { id: 'ganancias', label: 'Ganancias', con_jurisdiccion: false }
  ]
};

test('retenciones: total y cuerpo para el backend ignoran filas vacías', () => {
  const filas = [
    { emisor_id: '1', impuesto: 'iibb', jurisdiccion: '924', importe: '150,50', nro_certificado: ' A1 ', regimen: '' },
    { emisor_id: '', impuesto: 'ganancias', jurisdiccion: '', importe: '', nro_certificado: '', regimen: '' }
  ];
  assert.equal(totalRetenciones(filas), 150.5);
  assert.deepEqual(retencionesParaEnviar(filas), [{ emisor_id: 1, impuesto: 'iibb', jurisdiccion: 924, importe: 150.5, nro_certificado: 'A1', regimen: null }]);
});

test('retenciones: Ingresos Brutos exige jurisdicción y con varios CUIT hay que elegir uno', () => {
  const sinJurisdiccion = [{ emisor_id: '1', impuesto: 'iibb', jurisdiccion: '', importe: '10' }];
  assert.match(errorRetenciones(sinJurisdiccion, catalogo), /jurisdicción/);
  assert.match(errorRetenciones([{ emisor_id: '', impuesto: 'ganancias', importe: '10' }], catalogo, 2), /CUIT propio/);
  assert.equal(errorRetenciones([{ emisor_id: '', impuesto: 'ganancias', importe: '10' }], catalogo, 1), null);
});

test('comprobante recibido: Factura A suma neto, IVA y percepciones', () => {
  const f = { ...fiscalVacio('2026-09-10'), tipo_comprobante: '1', ivaFilas: [{ porcentaje: '21', base: '1000' }], importe_exento: '100', percepcion_iva: '15', percepcionesIibb: [{ jurisdiccion: '924', importe: '30' }] };
  const c = calcularFiscal(f, catalogo);
  assert.deepEqual([c.discrimina, c.neto, c.iva, c.tributos, c.total], [true, 1000, 210, 45, 1355]);
});

test('comprobante recibido: Factura C lleva el total cargado', () => {
  const f = { ...fiscalVacio('2026-09-10'), tipo_comprobante: '11', importe_total: '500' };
  assert.deepEqual([calcularFiscal(f, catalogo).discrimina, calcularFiscal(f, catalogo).total], [false, 500]);
});

test('comprobante recibido: cuerpo para el backend y validaciones previas', () => {
  const f = { ...fiscalVacio('2026-09-10'), punto_venta: '12', numero: '345', proveedor_documento: '30-71234567-1', proveedor_nombre: ' Andina ', ivaFilas: [{ porcentaje: '10.5', base: '200' }] };
  const p = payloadFiscal(f, catalogo, { conProveedor: true });
  assert.equal(p.tipo_comprobante, 1);
  assert.equal(p.numero, 345);
  assert.deepEqual(p.iva_detalle, [{ porcentaje: 10.5, base: 200 }]);
  assert.equal(p.proveedor_nombre, 'Andina');
  assert.equal(errorFiscal({ ...f, punto_venta: '' }, catalogo, { conProveedor: true }), 'Cargá el punto de venta y el número del comprobante.');
  assert.match(errorFiscal(f, catalogo, { conProveedor: true, cantidadEmisores: 2 }), /CUIT propio/);
  assert.equal(errorFiscal(f, catalogo, { conProveedor: true }), null);
});

test('períodos mensuales', () => {
  assert.equal(moverMes('2026-12', 1), '2027-01');
  assert.equal(moverMes('2026-01', -1), '2025-12');
  assert.equal(nombreMes('2026-09'), 'Septiembre de 2026');
});
