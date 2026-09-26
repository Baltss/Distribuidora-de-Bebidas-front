// src/utils/pedidoReposicionBorrador.js
// Pedido de reposición en armado: { [producto_id]: { producto, cantidad } }.
// Se guarda en el navegador (localStorage) para que no se pierda al cambiar
// filtros, salir de la página o cerrar la pestaña. Cuando se está editando
// un pedido ya guardado, se recuerda cuál es ({ id, proveedor_id, observaciones }).

const KEY = 'reposicion:pedido:v1';
const KEY_EDICION = 'reposicion:edicion:v1';

const leer = (key, fallback) => {
  try {
    const raw = window.localStorage.getItem(key);
    const data = raw ? JSON.parse(raw) : fallback;
    return data && typeof data === 'object' && !Array.isArray(data) ? data : fallback;
  } catch {
    return fallback;
  }
};

const escribir = (key, valor) => {
  try {
    if (!valor || !Object.keys(valor).length) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, JSON.stringify(valor));
  } catch {
    // sin storage (modo privado, bloqueado): vive sólo en memoria
  }
};

export const leerBorrador = () => leer(KEY, {});
export const guardarBorrador = (pedido) => escribir(KEY, pedido);

export const leerEdicion = () => leer(KEY_EDICION, null);
export const guardarEdicion = (edicion) => escribir(KEY_EDICION, edicion);

/** Saca del borrador los productos que ya se cargaron en una compra */
export function quitarDelBorrador(productoIds = []) {
  const pedido = leerBorrador();
  for (const id of productoIds) delete pedido[id];
  guardarBorrador(pedido);
}

/** Agrupa los ítems por proveedor habitual: [{ key, proveedor_id, nombre, items }] */
export const agruparPorProveedor = (items) => {
  const grupos = new Map();
  for (const it of items) {
    const key = it.producto.proveedor_id ?? 'sin';
    if (!grupos.has(key))
      grupos.set(key, {
        key,
        proveedor_id: it.producto.proveedor_id ?? null,
        nombre: it.producto.proveedor || 'Sin proveedor (nunca comprados)',
        items: []
      });
    grupos.get(key).items.push(it);
  }
  return [...grupos.values()];
};
