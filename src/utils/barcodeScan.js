// src/utils/barcodeScan.js
// Helpers compartidos para el escaneo de código de barras (Venta en el
// local, Compras a proveedores, etc.)

// Normaliza un código escaneado para comparar EAN-13 vs UPC-A (12 dígitos)
// que a veces llegan con o sin el 0 inicial según la configuración del lector.
export const normalizeScanCode = (raw) => String(raw || '').trim();

export const scanVariants = (code) => {
  const c = normalizeScanCode(code);
  const variants = new Set([c]);
  if (/^\d+$/.test(c)) {
    if (c.length === 12) variants.add(`0${c}`);
    if (c.length === 13 && c.startsWith('0')) variants.add(c.slice(1));
  }
  return Array.from(variants);
};

// Busca un producto en `productos` que coincida con el código escaneado,
// primero por EAN, después por SKU (respaldo).
export const findProductoByScan = (productos, code) => {
  const variants = scanVariants(code).map((v) => v.toUpperCase());
  return (
    (productos || []).find(
      (p) =>
        p?.barra_ean13 && variants.includes(String(p.barra_ean13).toUpperCase())
    ) ||
    (productos || []).find(
      (p) =>
        p?.codigo_sku && variants.includes(String(p.codigo_sku).toUpperCase())
    ) ||
    null
  );
};
