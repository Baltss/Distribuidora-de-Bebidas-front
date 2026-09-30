// src/hooks/useCatalogoFiscal.js
import { useEffect, useState } from 'react';
import { getCatalogoFiscal } from '../api/facturacion';

// Los catálogos fiscales (condiciones de IVA, tipos de documento, reglas por
// clase de comprobante) los define el backend; se piden una sola vez y se
// comparten entre todas las pantallas.
let pendiente = null;
let cache = null;

function cargar() {
  if (cache) return Promise.resolve(cache);
  if (!pendiente) {
    pendiente = getCatalogoFiscal()
      .then((data) => {
        cache = data;
        return data;
      })
      .finally(() => {
        pendiente = null;
      });
  }
  return pendiente;
}

/** Catálogo fiscal del backend, o null mientras carga (o si no se pudo leer). */
export default function useCatalogoFiscal() {
  const [catalogo, setCatalogo] = useState(cache);

  useEffect(() => {
    if (cache) return undefined;
    let vivo = true;
    cargar()
      .then((data) => vivo && setCatalogo(data))
      .catch(() => {});
    return () => {
      vivo = false;
    };
  }, []);

  return catalogo;
}

/** Etiqueta de una condición frente al IVA (id numérico) según el catálogo. */
export const etiquetaCondicionIva = (catalogo, id) =>
  catalogo?.condiciones_iva.find((c) => c.id === Number(id))?.label || '';

/** Etiqueta de la condición del emisor ('responsable_inscripto', 'exento', …). */
export const etiquetaCondicionEmisor = (catalogo, id) =>
  catalogo?.condiciones_emisor.find((c) => c.id === id)?.label || String(id || '').replace(/_/g, ' ');
