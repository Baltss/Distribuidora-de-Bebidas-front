// src/Components/Caja/CajaDetalleModal.jsx
import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Wallet, ArrowUp, ArrowDown, Lock } from 'lucide-react';
import { backdropV, panelV } from '../../ui/animHelpers';
import { getCajaDetalle } from '../../api/caja.js';
import moneyAR from '../../utils/money';
import { medioPagoLabel } from '../../utils/mediosPago';
import { formatFechaSolo } from '../../utils/fechaAR';

const ORIGEN_LABEL = {
  cobranza: 'Cobro a cliente',
  pago_proveedor: 'Pago a proveedor',
  gasto: 'Gasto',
  venta_contado: 'Venta contado',
  compra_contado: 'Compra contado',
  ingreso_manual: 'Ingreso manual',
  egreso_manual: 'Egreso manual'
};

const ESTADO_BADGE = {
  abierta: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  pendiente_cierre: 'bg-amber-50 text-amber-700 border-amber-200',
  cerrada: 'bg-slate-100 text-slate-600 border-slate-200'
};
const ESTADO_LABEL = {
  abierta: 'Abierta',
  pendiente_cierre: 'Pendiente de cierre',
  cerrada: 'Cerrada'
};

// fecha_jornada es DATEONLY: se formatea con formatFechaSolo para no
// correr el día por la interpretación UTC de JS (ver utils/fechaAR.js).
const fmtFecha = (v) => formatFechaSolo(v);
const fmtFechaHora = (v) =>
  v ? new Date(v).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' }) : '—';

export default function CajaDetalleModal({ open, onClose, cajaId, esAdmin, onCerrar }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!open || !cajaId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setData(null);

    (async () => {
      try {
        const resp = await getCajaDetalle(cajaId);
        if (!cancelled) setData(resp);
      } catch (err) {
        if (!cancelled) setError(err?.mensajeError || 'No se pudo obtener el detalle de la caja.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, cajaId]);

  const caja = data?.caja;
  const movimientos = data?.movimientos || [];

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
              <div className="mb-5 flex items-center gap-3 flex-wrap">
                <Wallet className="h-6 w-6 text-slate-500 shrink-0" />
                <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                  Caja del {fmtFecha(caja?.fecha_jornada)}
                </h3>
                {caja?.estado && (
                  <span className={`px-2 py-1 rounded-full text-xs border ${ESTADO_BADGE[caja.estado] || ''}`}>
                    {ESTADO_LABEL[caja.estado] || caja.estado}
                  </span>
                )}
                {esAdmin && caja?.estado && caja.estado !== 'cerrada' && (
                  <button
                    onClick={() => onCerrar?.(caja)}
                    className="ml-auto inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold transition"
                  >
                    <Lock className="h-3.5 w-3.5" /> Cerrar esta caja
                  </button>
                )}
              </div>

              {loading && <div className="text-center text-slate-500 py-10">Cargando…</div>}
              {!loading && error && <div className="text-center text-rose-600 py-10">{error}</div>}

              {!loading && !error && caja && (
                <div className="space-y-5">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3">
                      <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-1">Saldo inicial</p>
                      <p className="text-sm font-medium text-slate-800">{moneyAR(caja.saldo_inicial)}</p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3">
                      <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-1">Ingresos</p>
                      <p className="text-sm font-medium text-emerald-600">{moneyAR(caja.ingresos)}</p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3">
                      <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-1">Egresos</p>
                      <p className="text-sm font-medium text-rose-600">{moneyAR(caja.egresos)}</p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3">
                      <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-1">Saldo esperado</p>
                      <p className="text-sm font-semibold text-slate-900">{moneyAR(caja.saldo_esperado)}</p>
                    </div>
                  </div>

                  {caja.estado === 'cerrada' && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3">
                        <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-1">Efectivo esperado</p>
                        <p className="text-sm font-medium text-slate-800">{moneyAR(caja.efectivo_esperado)}</p>
                      </div>
                      <div className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3">
                        <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-1">Efectivo contado</p>
                        <p className="text-sm font-medium text-slate-800">{moneyAR(caja.efectivo_contado)}</p>
                      </div>
                      <div className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3">
                        <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-1">Diferencia</p>
                        <p
                          className={`text-sm font-semibold ${
                            Number(caja.diferencia) === 0
                              ? 'text-slate-800'
                              : Number(caja.diferencia) > 0
                              ? 'text-emerald-600'
                              : 'text-rose-600'
                          }`}
                        >
                          {moneyAR(caja.diferencia)}
                        </p>
                      </div>
                      <div className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3">
                        <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-1">Cerrada por</p>
                        <p className="text-sm font-medium text-slate-800">
                          {caja.administrador_cierre?.nombre || '—'}
                        </p>
                      </div>
                      {caja.observaciones_cierre && (
                        <div className="col-span-2 sm:col-span-4 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3">
                          <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-1">Observaciones del cierre</p>
                          <p className="text-sm text-slate-700 whitespace-pre-line">{caja.observaciones_cierre}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {caja.por_medio_pago && Object.keys(caja.por_medio_pago).length > 0 && (
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500 mb-2">
                        Discriminado por medio de pago (no efectivo)
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border border-teal-200 bg-teal-50 text-teal-700">
                          Efectivo: {moneyAR(caja.efectivo_esperado_actual)}
                        </span>
                        {Object.entries(caja.por_medio_pago).map(([medio, v]) => (
                          <span
                            key={medio}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border border-slate-200 bg-slate-50 text-slate-700"
                          >
                            {medioPagoLabel(medio)}: {moneyAR(v.total)} ({v.cantidad})
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500 mb-2">
                      Movimientos ({movimientos.length})
                    </p>
                    <div className="overflow-x-auto rounded-xl border border-slate-200">
                      <table className="w-full text-sm text-left text-slate-700">
                        <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                          <tr>
                            <th className="px-3 py-2">Fecha</th>
                            <th className="px-3 py-2">Origen</th>
                            <th className="px-3 py-2">Medio</th>
                            <th className="px-3 py-2">Descripción</th>
                            <th className="px-3 py-2 text-right">Monto</th>
                          </tr>
                        </thead>
                        <tbody>
                          {movimientos.map((m) => {
                            const esIngreso = Number(m.signo) === 1;
                            return (
                              <tr
                                key={m.id}
                                className={`border-t border-slate-200 ${m.anulado ? 'opacity-50' : ''}`}
                              >
                                <td className="px-3 py-2 whitespace-nowrap">{fmtFechaHora(m.fecha)}</td>
                                <td className="px-3 py-2">
                                  {ORIGEN_LABEL[m.origen_tipo] || m.origen_tipo}
                                  {m.anulado && (
                                    <span className="ml-1.5 text-[10px] uppercase text-rose-600 font-semibold">
                                      Anulado
                                    </span>
                                  )}
                                </td>
                                <td className="px-3 py-2">{medioPagoLabel(m.medio_pago)}</td>
                                <td className="px-3 py-2">{m.descripcion || '—'}</td>
                                <td
                                  className={`px-3 py-2 text-right font-medium whitespace-nowrap ${
                                    esIngreso ? 'text-emerald-600' : 'text-rose-600'
                                  }`}
                                >
                                  {esIngreso ? (
                                    <ArrowUp className="inline h-3 w-3 mb-0.5" />
                                  ) : (
                                    <ArrowDown className="inline h-3 w-3 mb-0.5" />
                                  )}{' '}
                                  {moneyAR(m.monto)}
                                </td>
                              </tr>
                            );
                          })}
                          {movimientos.length === 0 && (
                            <tr>
                              <td colSpan={5} className="px-3 py-6 text-center text-slate-400">
                                Sin movimientos en esta jornada.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
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
