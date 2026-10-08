// src/Components/Stock/NuevaTransferenciaModal.jsx
// Alta de una transferencia de stock: sale de la sucursal activa hacia otra. El servidor controla que haya
// stock en el origen y que el destino sea otra sucursal activa.
import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowLeftRight, Plus, Trash2, Search } from 'lucide-react';
import { backdropV, panelV } from '../../ui/animHelpers';
import { listProductos } from '../../api/productos.js';
import { getStockResumen, createTransferencia } from '../../api/stock.js';
import { showErrorSwal, showSuccessSwal, showWarnSwal } from '../../ui/swal';
import { blockWheelChange } from '../../utils/numberInput';
import useDebouncedValue from '../../hooks/useDebouncedValue';

const inputCls =
  'w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-400/40';

export default function NuevaTransferenciaModal({ open, destinos, onClose, onCreada }) {
  const [destinoId, setDestinoId] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [items, setItems] = useState([]); // { producto_id, nombre, cantidad, disponible }
  const [q, setQ] = useState('');
  const qDebounced = useDebouncedValue(q, 300);
  const [resultados, setResultados] = useState([]);
  const [stockPorProducto, setStockPorProducto] = useState({});
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (!open) return;
    setDestinoId('');
    setObservaciones('');
    setItems([]);
    setQ('');
    setResultados([]);
  }, [open]);

  // Stock de la sucursal de origen (la activa), para mostrar cuánto hay de cada producto.
  useEffect(() => {
    if (!open) return;
    (async () => {
      try {
        const r = await getStockResumen({ limit: 1000 });
        const mapa = {};
        (r?.data || []).forEach((x) => {
          mapa[x.producto_id] = Number(x.stock_actual);
        });
        setStockPorProducto(mapa);
      } catch {
        setStockPorProducto({});
      }
    })();
  }, [open]);

  useEffect(() => {
    if (!open || qDebounced.trim().length < 2) {
      setResultados([]);
      return;
    }
    let vivo = true;
    (async () => {
      try {
        const r = await listProductos({ q: qDebounced.trim(), estado: 'activo', limit: 8 });
        if (vivo) setResultados(Array.isArray(r) ? r : r?.data || []);
      } catch {
        if (vivo) setResultados([]);
      }
    })();
    return () => {
      vivo = false;
    };
  }, [qDebounced, open]);

  const yaAgregados = useMemo(() => new Set(items.map((i) => i.producto_id)), [items]);

  const agregar = (p) => {
    if (yaAgregados.has(p.id)) return;
    setItems((is) => [...is, { producto_id: p.id, nombre: p.nombre, cantidad: '' }]);
    setQ('');
    setResultados([]);
  };

  const cambiarCantidad = (id, cantidad) => setItems((is) => is.map((i) => (i.producto_id === id ? { ...i, cantidad } : i)));
  const quitar = (id) => setItems((is) => is.filter((i) => i.producto_id !== id));

  const enviar = async (e) => {
    e.preventDefault();
    if (!destinoId) return showWarnSwal({ title: 'Falta el destino', text: 'Elegí a qué sucursal enviás el stock.' });
    if (!items.length) return showWarnSwal({ title: 'Sin productos', text: 'Agregá al menos un producto.' });
    const invalido = items.find((i) => !(Number(i.cantidad) > 0));
    if (invalido) return showWarnSwal({ title: 'Cantidad inválida', text: `Revisá la cantidad de "${invalido.nombre}".` });
    setGuardando(true);
    try {
      const t = await createTransferencia({
        destino_local_id: Number(destinoId),
        observaciones: observaciones.trim() || undefined,
        items: items.map((i) => ({ producto_id: i.producto_id, cantidad: Number(i.cantidad) }))
      });
      await showSuccessSwal({ title: 'Transferencia registrada', text: `Salió el stock hacia ${t?.destino_nombre || 'la otra sucursal'}.` });
      onCreada?.(t);
    } catch (err) {
      await showErrorSwal({ title: 'No se pudo transferir', text: err?.mensajeError || 'Ocurrió un error inesperado', tips: err?.tips });
    } finally {
      setGuardando(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div variants={backdropV} initial="hidden" animate="visible" exit="exit" className="fixed inset-0 z-[70] flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
          <motion.form
            onSubmit={enviar}
            variants={panelV}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="relative w-full max-w-[92vw] sm:max-w-2xl max-h-[88vh] overflow-y-auto overscroll-contain rounded-2xl border border-slate-200 bg-white shadow-2xl"
          >
            <button type="button" onClick={onClose} className="absolute z-50 top-2.5 right-2.5 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 border border-slate-200 text-slate-500 hover:bg-slate-200 transition" aria-label="Cerrar">
              <X className="h-5 w-5" />
            </button>
            <div className="p-5 sm:p-6 space-y-4">
              <div className="flex items-center gap-3">
                <ArrowLeftRight className="h-6 w-6 text-teal-600 shrink-0" />
                <h3 className="text-xl font-bold tracking-tight text-slate-900">Nueva transferencia de stock</h3>
              </div>

              <label className="block text-sm">
                <span className="mb-1 block font-medium text-slate-700">Enviar a</span>
                <select value={destinoId} onChange={(e) => setDestinoId(e.target.value)} className={inputCls}>
                  <option value="">Elegí la sucursal de destino</option>
                  {destinos.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.nombre}
                    </option>
                  ))}
                </select>
              </label>

              <div>
                <span className="mb-1 block text-sm font-medium text-slate-700">Productos</span>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                  <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar producto por nombre o código…" className={`${inputCls} pl-8`} />
                  {resultados.length > 0 && (
                    <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
                      {resultados.map((p) => (
                        <li key={p.id}>
                          <button type="button" onClick={() => agregar(p)} disabled={yaAgregados.has(p.id)} className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50 disabled:opacity-50">
                            <span className="truncate">{p.nombre}</span>
                            <span className="flex shrink-0 items-center gap-2 text-xs text-slate-500">
                              hay {stockPorProducto[p.id] ?? '—'}
                              <Plus className="h-3.5 w-3.5" />
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {items.length === 0 ? (
                  <p className="mt-3 text-sm text-slate-500">Todavía no agregaste productos.</p>
                ) : (
                  <ul className="mt-3 space-y-2">
                    {items.map((i) => {
                      const hay = stockPorProducto[i.producto_id];
                      const excede = hay != null && Number(i.cantidad) > hay;
                      return (
                        <li key={i.producto_id} className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 p-2.5">
                          <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-800">{i.nombre}</span>
                          <span className={`text-xs ${excede ? 'text-rose-600' : 'text-slate-500'}`}>hay {hay ?? '—'}</span>
                          <input
                            type="number"
                            min="0"
                            step="0.001"
                            onWheel={blockWheelChange}
                            value={i.cantidad}
                            onChange={(e) => cambiarCantidad(i.producto_id, e.target.value)}
                            placeholder="Cantidad"
                            aria-label={`Cantidad de ${i.nombre}`}
                            className={`${inputCls} w-28 ${excede ? 'border-rose-300' : ''}`}
                          />
                          <button type="button" onClick={() => quitar(i.producto_id)} className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-rose-50 hover:text-rose-600" aria-label={`Quitar ${i.nombre}`}>
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              <label className="block text-sm">
                <span className="mb-1 block font-medium text-slate-700">Observaciones (opcional)</span>
                <input value={observaciones} onChange={(e) => setObservaciones(e.target.value)} maxLength={255} className={inputCls} />
              </label>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                  Cancelar
                </button>
                <button type="submit" disabled={guardando} className="rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60">
                  {guardando ? 'Transfiriendo…' : 'Transferir'}
                </button>
              </div>
            </div>
          </motion.form>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
