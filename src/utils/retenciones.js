// src/utils/retenciones.js
// Retenciones que el cliente le practica al negocio al pagarle (sufridas) o que
// el negocio le practica a un proveedor (practicadas): armado y totales.

export const retencionVacia = () => ({
  emisor_id: '',
  impuesto: 'iibb',
  jurisdiccion: '',
  importe: '',
  nro_certificado: '',
  regimen: ''
});

const numero = (v) => Number(String(v ?? '').replace(',', '.'));

/** Suma de los importes cargados (ignora filas vacías o inválidas). */
export const totalRetenciones = (filas = []) =>
  Math.round(filas.reduce((acc, f) => acc + (numero(f.importe) > 0 ? numero(f.importe) : 0), 0) * 100) / 100;

/** Filas con importe → cuerpo para el backend. */
export const retencionesParaEnviar = (filas = []) =>
  filas
    .filter((f) => numero(f.importe) > 0)
    .map((f) => ({
      emisor_id: f.emisor_id ? Number(f.emisor_id) : undefined,
      impuesto: f.impuesto,
      jurisdiccion: f.jurisdiccion ? Number(f.jurisdiccion) : null,
      importe: numero(f.importe),
      nro_certificado: f.nro_certificado?.trim() || null,
      regimen: f.regimen?.trim() || null
    }));

/**
 * Motivo por el que las filas no se pueden enviar, o null si están bien.
 * `cantidadEmisores`: con más de un CUIT propio hay que elegir cuál.
 */
export function errorRetenciones(filas = [], catalogo, cantidadEmisores = 1) {
  for (const f of filas.filter((x) => numero(x.importe) > 0)) {
    if (cantidadEmisores > 1 && !f.emisor_id) return 'Elegí a qué CUIT propio corresponde cada retención.';
    const impuesto = catalogo?.impuestos_retencion?.find((i) => i.id === f.impuesto);
    if (impuesto?.con_jurisdiccion && !f.jurisdiccion) return `Elegí la jurisdicción de la retención de ${impuesto.label}.`;
  }
  return null;
}
