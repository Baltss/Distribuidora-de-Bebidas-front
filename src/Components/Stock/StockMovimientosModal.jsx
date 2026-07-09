// src/Components/Stock/StockMovimientosModal.jsx
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { backdropV, panelV } from '../../ui/animHelpers';
import { X, Warehouse, Plus } from 'lucide-react';
import {
  listStockMovimientos,
  getStockProducto,
  createStockAjuste
} from '../../api/stock.js';
import { showErrorSwal, showSuccessSwal, showWarnSwal } from '../../ui/swal';

const TIPO_LABEL = {
  compra: 'Compra',
  venta: 'Venta',
  ajuste: 'Ajuste',
  merma: 'Merma',
  devolucion: 'Devolución'
};

export default function StockMovimientosModal({ open, producto, onClose, onChanged }) {
  const [loading, setLoading] = useState(false);
  const [movimientos, setMovimientos] = useState([]);
  const [stockActual, setStockActual] = useState(null);

  const [ajusteOpen, setAjusteOpen] = useState(false);
  const [ajusteCantidad, setAjusteCantidad] = useState('');
  const [ajusteTipo, setAjusteTipo] = useState('ajuste');
  const [ajusteDescripcion, setAjusteDescripcion] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchAll = async () => {
    if (!producto?.id) return;
    setLoading(true);
    try {
      const [movResp, stockResp] = await Promise.all([
        listStockMovimientos({ producto_id: producto.id, limit: 30 }),
        getStockProducto(producto.id)
      ]);
      setMovimientos(movResp?.data || []);
      setStockActual(stockResp);
    } catch (err) {
      const { mensajeError, tips } = err || {};
      await showErrorSwal({
        title: 'No se pudo obtener el stock',
        text: mensajeError || 'Ocurrió un error inesperado',
        tips
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchAll();
      setAjusteOpen(false);
      setAjusteCantidad('');
      setAjusteTipo('ajuste');
      setAjusteDescripcion('');
    }
    // eslint-disable-next-line
  }, [open, producto?.id]);

  const submitAjuste = async (e) => {
    e.preventDefault();
    const cantidad = Number(ajusteCantidad);
    if (!Number.isInteger(cantidad) || cantidad === 0) {
      return showWarnSwal({
        title: 'Cantidad inválida',
        text: 'Ingresá un entero distinto de 0 (positivo suma, negativo resta).'
      });
    }

    try {
      setSaving(true);
      await createStockAjuste({
        producto_id: producto.id,
        cantidad,
        tipo: ajusteTipo,
        descripcion: ajusteDescripcion?.trim() || null
      });
      await showSuccessSwal({ title: 'Ajuste registrado', text: 'El stock fue actualizado.' });
      setAjusteOpen(false);
      setAjusteCantidad('');
      setAjusteDescripcion('');
      await fetchAll();
      onChanged?.();
    } catch (err) {
      const { mensajeError, tips } = err || {};
      await showErrorSwal({
        title: 'No se pudo registrar el ajuste',
        text: mensajeError || 'Ocurrió un error inesperado',
        tips
      });
    } finally {
      setSaving(false);
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
          <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={onClose} />

          <motion.div
            variants={panelV}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="relative w-full max-w-[92vw] sm:max-w-2xl
                       max-h-[85vh] overflow-y-auto overscroll-contain
                       rounded-2xl border border-white/10 bg-white/[0.06] backdrop-blur-xl"
          >
            <button
              onClick={onClose}
              className="absolute z-50 top-2.5 right-2.5 inline-flex h-9 w-9 items-center justify-center rounded-lg
                         bg-white/5 border border-white/10 hover:bg-white/10 transition"
              aria-label="Cerrar"
            >
              <X className="h-5 w-5 text-gray-200" />
            </button>

            <div className="relative z-10 p-5 sm:p-6 md:p-8">
              <div className="mb-5 flex items-center gap-3">
                <Warehouse className="h-6 w-6 text-gray-300 shrink-0" />
                <div>
                  <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                    Stock del producto
                  </h3>
                  <p className="text-sm text-gray-300">{producto?.nombre}</p>
                </div>
              </div>

              {loading ? (
                <div className="text-center text-white/80 py-10">Cargando…</div>
              ) : (
                <>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4 mb-5 flex items-center justify-between">
                    <span className="text-sm text-gray-200">Stock actual</span>
                    <span
                      className={`text-2xl font-extrabold ${
                        stockActual?.stock_bajo ? 'text-rose-300' : 'text-white'
                      }`}
                    >
                      {stockActual?.stock_actual ?? '—'}
                      {stockActual?.stock_minimo != null && (
                        <span className="text-sm font-normal text-gray-400 ml-2">
                          (mín. {stockActual.stock_minimo})
                        </span>
                      )}
                    </span>
                  </div>

                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-semibold text-gray-200 uppercase tracking-wide">
                      Últimos movimientos
                    </h4>
                    <button
                      type="button"
                      onClick={() => setAjusteOpen((v) => !v)}
                      className="inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border border-white/10 hover:bg-white/10 transition"
                    >
                      <Plus className="h-3.5 w-3.5" /> Ajuste manual
                    </button>
                  </div>

                  {ajusteOpen && (
                    <form
                      onSubmit={submitAjuste}
                      className="mb-4 grid grid-cols-1 sm:grid-cols-[110px,140px,1fr,auto] gap-2 items-start rounded-xl border border-white/10 bg-white/5 p-3"
                    >
                      <input
                        type="number"
                        step="1"
                        value={ajusteCantidad}
                        onChange={(e) => setAjusteCantidad(e.target.value)}
                        placeholder="± cantidad"
                        className="w-full rounded-lg border border-white/10 bg-white/5 px-2.5 py-2 text-white
                                   focus:outline-none focus:ring-2 focus:ring-teal-300/40"
                      />
                      <select
                        value={ajusteTipo}
                        onChange={(e) => setAjusteTipo(e.target.value)}
                        className="w-full rounded-lg border border-white/10 bg-white/5 px-2.5 py-2 text-black
                                   focus:outline-none focus:ring-2 focus:ring-teal-300/40"
                      >
                        <option value="ajuste">Ajuste</option>
                        <option value="merma">Merma</option>
                        <option value="devolucion">Devolución</option>
                      </select>
                      <input
                        value={ajusteDescripcion}
                        onChange={(e) => setAjusteDescripcion(e.target.value)}
                        placeholder="Motivo (opcional)"
                        className="w-full rounded-lg border border-white/10 bg-white/5 px-2.5 py-2 text-white
                                   placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-300/40"
                      />
                      <button
                        type="submit"
                        disabled={saving}
                        className="px-3 py-2 rounded-lg bg-gradient-to-r from-teal-500 to-cyan-500 text-white text-sm font-semibold hover:brightness-110 disabled:opacity-60 transition"
                      >
                        {saving ? 'Guardando…' : 'Aplicar'}
                      </button>
                    </form>
                  )}

                  {!movimientos.length ? (
                    <p className="text-sm text-gray-400">Sin movimientos registrados.</p>
                  ) : (
                    <div className="overflow-x-auto rounded-xl border border-white/10">
                      <table className="w-full text-sm text-left text-gray-200">
                        <thead className="bg-white/10 text-xs uppercase text-gray-300">
                          <tr>
                            <th className="px-3 py-2">Fecha</th>
                            <th className="px-3 py-2">Tipo</th>
                            <th className="px-3 py-2 text-right">Cantidad</th>
                            <th className="px-3 py-2">Descripción</th>
                          </tr>
                        </thead>
                        <tbody>
                          {movimientos.map((m) => (
                            <tr key={m.id} className="border-t border-white/10">
                              <td className="px-3 py-2">
                                {m.fecha ? new Date(m.fecha).toLocaleDateString() : '—'}
                              </td>
                              <td className="px-3 py-2">{TIPO_LABEL[m.tipo] || m.tipo}</td>
                              <td
                                className={`px-3 py-2 text-right font-semibold ${
                                  Number(m.cantidad) < 0 ? 'text-rose-300' : 'text-emerald-300'
                                }`}
                              >
                                {Number(m.cantidad) > 0 ? '+' : ''}
                                {m.cantidad}
                              </td>
                              <td className="px-3 py-2">{m.descripcion || '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
