// src/Components/Proveedores/DeudaProveedorModal.jsx
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { backdropV, panelV } from '../../ui/animHelpers';
import { X } from 'lucide-react';
import { FaFileInvoiceDollar, FaWallet } from 'react-icons/fa';
import { getCcpDeudaProveedor } from '../../api/ccpProveedores.js';
import { showErrorSwal } from '../../ui/swal';
import moneyAR from '../../utils/money';
import PagoProveedorFormModal from './PagoProveedorFormModal';

export default function DeudaProveedorModal({
  open,
  proveedor,
  onClose,
  onPagoRegistrado
}) {
  const [loading, setLoading] = useState(false);
  const [deuda, setDeuda] = useState(null);
  const [pagoOpen, setPagoOpen] = useState(false);

  const fetchDeuda = async () => {
    if (!proveedor?.id) return;
    setLoading(true);
    try {
      const data = await getCcpDeudaProveedor(proveedor.id);
      setDeuda(data);
    } catch (err) {
      const { mensajeError, tips } = err || {};
      await showErrorSwal({
        title: 'No se pudo obtener la deuda',
        text: mensajeError || 'Ocurrió un error inesperado',
        tips
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) fetchDeuda();
    // eslint-disable-next-line
  }, [open, proveedor?.id]);

  const handlePagoRegistrado = async () => {
    await fetchDeuda();
    onPagoRegistrado?.();
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
            className="relative w-full max-w-[92vw] sm:max-w-2xl
                       max-h-[85vh] overflow-y-auto overscroll-contain
                       rounded-2xl border border-slate-200 bg-white shadow-2xl"
          >
            <button
              onClick={onClose}
              className="absolute z-50 top-2.5 right-2.5 inline-flex h-9 w-9 items-center justify-center rounded-lg
                         bg-slate-100 border border-slate-200 text-slate-500 hover:bg-slate-200 transition"
              aria-label="Cerrar"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="relative z-10 p-5 sm:p-6 md:p-8">
              <div className="mb-5 flex items-center gap-3">
                <FaFileInvoiceDollar className="h-6 w-6 text-emerald-600 shrink-0" />
                <div>
                  <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                    Cuenta corriente
                  </h3>
                  <p className="text-sm text-slate-500">{proveedor?.razon_social}</p>
                </div>
              </div>

              {loading ? (
                <div className="text-center text-slate-600 py-10">Cargando…</div>
              ) : (
                <>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 mb-5 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-slate-600">
                      <FaWallet className="opacity-70" />
                      <span className="text-sm">Deuda total</span>
                    </div>
                    <span className="text-2xl font-extrabold text-slate-900">
                      {moneyAR(deuda?.total_deuda ?? 0)}
                    </span>
                  </div>

                  <div className="space-y-2 mb-5">
                    <h4 className="text-sm font-semibold text-slate-600 uppercase tracking-wide">
                      Compras pendientes
                    </h4>
                    {!deuda?.compras_pendientes?.length ? (
                      <p className="text-sm text-slate-600">
                        No hay compras pendientes de pago.
                      </p>
                    ) : (
                      <div className="overflow-x-auto rounded-xl border border-slate-200">
                        <table className="w-full text-sm text-left text-slate-700">
                          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                            <tr>
                              <th className="px-3 py-2">Compra</th>
                              <th className="px-3 py-2">Fecha</th>
                              <th className="px-3 py-2">Factura</th>
                              <th className="px-3 py-2 text-right">Total</th>
                              <th className="px-3 py-2 text-right">Pagado</th>
                              <th className="px-3 py-2 text-right">Saldo</th>
                              <th className="px-3 py-2 text-right">Días</th>
                            </tr>
                          </thead>
                          <tbody>
                            {deuda.compras_pendientes.map((c) => (
                              <tr key={c.id} className="border-t border-slate-200">
                                <td className="px-3 py-2">#{c.id}</td>
                                <td className="px-3 py-2">
                                  {c.fecha ? new Date(c.fecha).toLocaleDateString() : '—'}
                                </td>
                                <td className="px-3 py-2">{c.nro_factura || '—'}</td>
                                <td className="px-3 py-2 text-right">{moneyAR(c.total_compra)}</td>
                                <td className="px-3 py-2 text-right">{moneyAR(c.pagado)}</td>
                                <td className="px-3 py-2 text-right font-semibold">
                                  {moneyAR(c.saldo)}
                                </td>
                                <td className="px-3 py-2 text-right">{c.dias_atraso}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end gap-2">
                    <button
                      onClick={onClose}
                      className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition"
                    >
                      Cerrar
                    </button>
                    <button
                      onClick={() => setPagoOpen(true)}
                      disabled={!deuda?.total_deuda}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold
                                 disabled:opacity-50 disabled:cursor-not-allowed transition"
                    >
                      Registrar pago
                    </button>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}

      <PagoProveedorFormModal
        open={pagoOpen}
        onClose={() => setPagoOpen(false)}
        proveedor={proveedor}
        totalDeuda={deuda?.total_deuda}
        onPagoRegistrado={handlePagoRegistrado}
      />
    </AnimatePresence>
  );
}
