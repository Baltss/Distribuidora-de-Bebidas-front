// src/Components/Compras/CompraDetalleModal.jsx
import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Truck } from 'lucide-react';
import { backdropV, panelV } from '../../ui/animHelpers';
import { getCompra } from '../../api/compras.js';
import moneyAR from '../../utils/money';
import { medioPagoLabel } from '../../utils/mediosPago';

export default function CompraDetalleModal({ open, onClose, compraId }) {
  const [compra, setCompra] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!open || !compraId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setCompra(null);

    (async () => {
      try {
        const data = await getCompra(compraId);
        if (!cancelled) setCompra(data);
      } catch (err) {
        if (!cancelled) {
          setError(
            err?.mensajeError || 'No se pudo obtener el detalle de la compra.'
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, compraId]);

  return createPortal(
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
            className="relative w-full max-w-[92vw] sm:max-w-2xl md:max-w-3xl
                       max-h-[88vh] overflow-y-auto overscroll-contain
                       rounded-2xl border border-slate-200 bg-white shadow-2xl"
          >
            <button
              onClick={onClose}
              className="absolute z-50 top-2.5 right-2.5 inline-flex h-9 w-9 items-center justify-center rounded-lg
                         bg-slate-100 border border-slate-200 hover:bg-slate-200 transition"
              aria-label="Cerrar"
            >
              <X className="h-5 w-5 text-slate-500" />
            </button>

            <div className="relative z-10 p-5 sm:p-6 md:p-8">
              <div className="mb-5 flex items-center gap-3">
                <Truck className="h-6 w-6 text-slate-500 shrink-0" />
                <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                  Compra #{compraId}
                </h3>
                {compra?.estado && (
                  <span
                    className={`px-2 py-1 rounded-full text-xs border ${
                      compra.estado === 'anulada'
                        ? 'bg-rose-50 text-rose-700 border-rose-200'
                        : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    }`}
                  >
                    {compra.estado === 'anulada' ? 'Anulada' : 'Confirmada'}
                  </span>
                )}
              </div>

              {loading && (
                <div className="text-center text-slate-500 py-10">Cargando…</div>
              )}
              {!loading && error && (
                <div className="text-center text-rose-600 py-10">{error}</div>
              )}

              {!loading && !error && compra && (
                <div className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3">
                      <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-1">
                        Proveedor
                      </p>
                      <p className="text-sm font-medium text-slate-800">
                        {compra.proveedor?.razon_social || '—'}
                      </p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3">
                      <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-1">
                        Fecha
                      </p>
                      <p className="text-sm font-medium text-slate-800">
                        {compra.fecha
                          ? new Date(compra.fecha).toLocaleDateString('es-AR')
                          : '—'}
                      </p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3">
                      <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-1">
                        N° de factura
                      </p>
                      <p className="text-sm font-medium text-slate-800">
                        {compra.nro_factura || '—'}
                      </p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3">
                      <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-1">
                        Pago
                      </p>
                      <p className="text-sm font-medium text-slate-800">
                        {compra.tipo_pago === 'contado' ? 'Contado' : 'Cuenta corriente'}
                        {compra.tipo_pago === 'contado' && compra.medio_pago
                          ? ` · ${medioPagoLabel(compra.medio_pago)}`
                          : ''}
                      </p>
                    </div>
                    {compra.observaciones && (
                      <div className="sm:col-span-2 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3">
                        <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-1">
                          Observaciones
                        </p>
                        <p className="text-sm text-slate-700 whitespace-pre-line">
                          {compra.observaciones}
                        </p>
                      </div>
                    )}
                  </div>

                  <div>
                    <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500 mb-2">
                      Ítems de la compra
                    </p>
                    <div className="overflow-x-auto rounded-xl border border-slate-200">
                      <table className="w-full text-sm text-left text-slate-700">
                        <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                          <tr>
                            <th className="px-3 py-2">Producto</th>
                            <th className="px-3 py-2 text-right">Cantidad</th>
                            <th className="px-3 py-2 text-right">Costo unit.</th>
                            <th className="px-3 py-2 text-right">Subtotal</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(compra.items || []).map((it) => (
                            <tr key={it.id} className="border-t border-slate-200">
                              <td className="px-3 py-2">
                                {it.producto?.nombre || `Producto #${it.producto_id}`}
                                {it.producto?.codigo_sku && (
                                  <span className="text-slate-500">
                                    {' '}
                                    ({it.producto.codigo_sku})
                                  </span>
                                )}
                              </td>
                              <td className="px-3 py-2 text-right">{it.cantidad}</td>
                              <td className="px-3 py-2 text-right">{moneyAR(it.costo_unit)}</td>
                              <td className="px-3 py-2 text-right font-medium">
                                {moneyAR(it.subtotal ?? it.cantidad * it.costo_unit)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="mt-3 flex justify-end items-center gap-2 text-slate-900">
                      <span className="text-sm text-slate-500">Total:</span>
                      <span className="text-lg font-extrabold">{moneyAR(compra.total)}</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-6 flex justify-end">
                <button
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
