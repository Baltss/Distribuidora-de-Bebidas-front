// src/Components/Reposicion/GuardarPedidoModal.jsx
// Guarda el pedido de reposición en armado en el sistema. Si tiene productos
// de varios proveedores (según su última compra), ofrece guardar un pedido
// por proveedor. Al editar un pedido existente se guarda siempre uno solo.
import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save } from 'lucide-react';
import { backdropV, panelV } from '../../ui/animHelpers';
import moneyAR from '../../utils/money';
import { agruparPorProveedor } from '../../utils/pedidoReposicionBorrador';

const inputCls =
  'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-400/40 focus:border-transparent';

const totalItems = (items) =>
  items.reduce(
    (acc, it) =>
      acc +
      (it.producto.ultimo_costo_compra != null
        ? Number(it.cantidad) * it.producto.ultimo_costo_compra
        : 0),
    0
  );

export default function GuardarPedidoModal({
  open,
  onClose,
  onGuardar,
  items,
  proveedores,
  edicion
}) {
  const grupos = useMemo(() => agruparPorProveedor(items), [items]);
  const variosProveedores = !edicion && grupos.length > 1;

  const [modo, setModo] = useState('separar'); // 'separar' | 'uno'
  const [proveedorId, setProveedorId] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (!open) return;
    setModo('separar');
    setGuardando(false);
    if (edicion) {
      setProveedorId(edicion.proveedor_id != null ? String(edicion.proveedor_id) : '');
      setObservaciones(edicion.observaciones || '');
    } else {
      const unico = grupos.length === 1 ? grupos[0].proveedor_id : null;
      setProveedorId(unico != null ? String(unico) : '');
      setObservaciones('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const submit = async (e) => {
    e.preventDefault();
    const obs = observaciones.trim() || null;
    const aPayload = (lista, provId) => ({
      proveedor_id: provId ? Number(provId) : null,
      observaciones: obs,
      items: lista.map((it) => ({
        producto_id: it.producto.id,
        cantidad: Number(it.cantidad),
        costo_unit: it.producto.ultimo_costo_compra
      }))
    });

    const pedidos =
      variosProveedores && modo === 'separar'
        ? grupos.map((g) => aPayload(g.items, g.proveedor_id))
        : [aPayload(items, proveedorId)];

    setGuardando(true);
    try {
      await onGuardar(pedidos);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4"
          variants={backdropV}
          initial="hidden"
          animate="visible"
          exit="exit"
          role="dialog"
          aria-modal="true"
        >
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            variants={panelV}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl"
          >
            <button
              onClick={onClose}
              className="absolute top-2.5 right-2.5 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 border border-slate-200 hover:bg-slate-200 transition"
              aria-label="Cerrar"
            >
              <X className="h-5 w-5 text-slate-500" />
            </button>

            <form onSubmit={submit} className="p-5 sm:p-6 space-y-4">
              <h3 className="text-xl font-bold tracking-tight text-slate-900 pr-10">
                {edicion ? `Guardar cambios del pedido #${edicion.id}` : 'Guardar pedido'}
              </h3>
              <p className="text-sm text-slate-500">
                Queda guardado en el sistema como <strong>pendiente</strong>. Cuando llegue la
                mercadería, lo abrís desde “Pedidos guardados” y tocás “Pasar a compra”.
              </p>

              {variosProveedores && (
                <div className="rounded-xl border border-slate-200 p-3 space-y-2">
                  <p className="text-sm font-semibold text-slate-700">
                    Tu pedido tiene productos de {grupos.length} proveedores:
                  </p>
                  <label className="flex items-start gap-2 text-sm text-slate-700 cursor-pointer">
                    <input
                      type="radio"
                      name="modo"
                      checked={modo === 'separar'}
                      onChange={() => setModo('separar')}
                      className="mt-0.5 text-blue-600 focus:ring-blue-400"
                    />
                    <span>
                      Un pedido por proveedor <span className="text-slate-400">(recomendado)</span>
                      <ul className="mt-1 text-xs text-slate-500 space-y-0.5">
                        {grupos.map((g) => (
                          <li key={g.key}>
                            · {g.nombre}: {g.items.length} producto
                            {g.items.length === 1 ? '' : 's'} · {moneyAR(totalItems(g.items))}
                          </li>
                        ))}
                      </ul>
                    </span>
                  </label>
                  <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                    <input
                      type="radio"
                      name="modo"
                      checked={modo === 'uno'}
                      onChange={() => setModo('uno')}
                      className="text-blue-600 focus:ring-blue-400"
                    />
                    Un solo pedido con todo
                  </label>
                </div>
              )}

              {(!variosProveedores || modo === 'uno') && (
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">
                    Proveedor
                  </label>
                  <select
                    value={proveedorId}
                    onChange={(e) => setProveedorId(e.target.value)}
                    className={inputCls}
                  >
                    <option value="">Sin definir (se elige al pasar a compra)</option>
                    {proveedores.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.razon_social}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  Nota <span className="font-normal text-slate-400">(opcional)</span>
                </label>
                <input
                  value={observaciones}
                  onChange={(e) => setObservaciones(e.target.value)}
                  maxLength={255}
                  placeholder="Ej: pedido por WhatsApp, llega el jueves"
                  className={inputCls}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardando}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                >
                  <Save className="h-4 w-4" />
                  {guardando
                    ? 'Guardando…'
                    : variosProveedores && modo === 'separar'
                      ? `Guardar ${grupos.length} pedidos`
                      : 'Guardar pedido'}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
