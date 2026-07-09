// FILE: src/Components/Ventas/DeudoresResumenModal.jsx
// - 25-02-2026 - Soporta saldo_previo_total cuando un deudor no tiene ventas pendientes
import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  X,
  AlertTriangle,
  Clock4,
  BadgeDollarSign,
  UserCircle2
} from 'lucide-react';
import { FaInstagram, FaGlobeAmericas, FaWhatsapp } from 'react-icons/fa';

import {
  backdropV,
  panelV,
  formContainerV,
  fieldV
} from '../../ui/animHelpers';

const formatMoney = (n) =>
  (Number(n) || 0).toLocaleString('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 2
  });

const formatFecha = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export default function DeudoresResumenModal({ open, onClose, deudores = [] }) {
  const [selectedId, setSelectedId] = useState(null);

  useEffect(() => {
    if (!open || !deudores.length) return;
    const mayor = [...deudores].sort(
      (a, b) =>
        (Number(b.total_pendiente) || 0) - (Number(a.total_pendiente) || 0)
    )[0];
    setSelectedId(mayor?.cliente_id ?? mayor?.id ?? null);
  }, [open, deudores]);

  const totalGlobal = useMemo(
    () =>
      deudores.reduce((acc, d) => acc + (Number(d.total_pendiente) || 0), 0),
    [deudores]
  );

  const totalVentas = useMemo(
    () =>
      deudores.reduce(
        (acc, d) => acc + ((d.ventas && d.ventas.length) || 0),
        0
      ),
    [deudores]
  );

  const selected = useMemo(
    () =>
      deudores.find(
        (d) =>
          Number(d.cliente_id) === Number(selectedId) ||
          Number(d.id) === Number(selectedId)
      ) || null,
    [deudores, selectedId]
  );

  const selectedSaldoPrevio = Number(selected?.saldo_previo_total || 0);
  const selectedVentasCount = (selected?.ventas && selected.ventas.length) || 0;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4"
          variants={backdropV}
          initial="hidden"
          animate="visible"
          exit="exit"
          role="dialog"
          aria-modal="true"
        >
          <div
            className="absolute inset-0 bg-black/75 backdrop-blur-md"
            onClick={onClose}
          />

          <motion.div
            variants={panelV}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="relative w-full max-w-[96vw] sm:max-w-4xl lg:max-w-5xl
                       max-h-[92vh] overflow-hidden rounded-3xl border border-emerald-400/30
                       bg-gradient-to-br from-slate-950/95 via-slate-900/95 to-emerald-950/90
                       shadow-[0_0_55px_rgba(16,185,129,0.55)]"
          >
            <button
              onClick={onClose}
              className="absolute z-50 top-3 right-3 inline-flex h-9 w-9 items-center justify-center rounded-xl
                         bg-white/5 border border-white/15 hover:bg-white/10 transition"
              aria-label="Cerrar"
            >
              <X className="h-5 w-5 text-emerald-50" />
            </button>

            <div className="relative z-10 p-4 sm:p-6 md:p-8">
              <motion.div
                variants={formContainerV}
                initial="hidden"
                animate="visible"
                className="mb-4 sm:mb-6"
              >
                <motion.div
                  variants={fieldV}
                  className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="inline-flex h-10 w-10 items-center justify-center rounded-2xl
                                     bg-emerald-500/20 border border-emerald-300/60"
                    >
                      <AlertTriangle className="h-5 w-5 text-emerald-300" />
                    </span>
                    <div>
                      <h3 className="titulo uppercase text-xl sm:text-2xl md:text-3xl font-bold tracking-tight text-emerald-50">
                        Deudores por ventas fiado
                      </h3>
                      <p className="text-xs sm:text-sm text-emerald-100/80">
                        Resumen rápido de quiénes deben, cuánto y desde cuándo.
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1 text-right">
                    <span className="text-[11px] uppercase tracking-[0.16em] text-emerald-200/80">
                      Total pendiente
                    </span>
                    <div className="inline-flex items-center gap-2 rounded-2xl bg-emerald-500/15 border border-emerald-400/70 px-3 py-1.5">
                      <BadgeDollarSign className="h-4 w-4 text-emerald-200" />
                      <span className="text-sm sm:text-base font-semibold text-emerald-50">
                        {formatMoney(totalGlobal)}
                      </span>
                    </div>
                    <div className="text-[11px] text-emerald-100/80">
                      {deudores.length} deudor(es) · {totalVentas} venta(s)
                    </div>
                  </div>
                </motion.div>
              </motion.div>

              <div className="grid gap-4 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1.6fr)]">
                <motion.div
                  variants={formContainerV}
                  initial="hidden"
                  animate="visible"
                  className="rounded-2xl border border-emerald-500/30 bg-slate-950/80 backdrop-blur-md p-3 sm:p-4 flex flex-col"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <div className="text-xs uppercase tracking-[0.18em] text-emerald-200/85">
                        Deudores
                      </div>
                      <div className="text-sm text-emerald-50/90">
                        Seleccioná un cliente para ver el detalle.
                      </div>
                    </div>
                  </div>

                  <div className="flex-1 min-h-[180px] max-h-[360px] overflow-y-auto space-y-2 pr-1">
                    {!deudores.length ? (
                      <div className="text-xs text-emerald-100/80 italic">
                        No hay deudores registrados por ventas fiado.
                      </div>
                    ) : (
                      deudores.map((d) => {
                        const isSelected =
                          Number(d.cliente_id ?? d.id) === Number(selectedId);
                        const inicial = (d.nombre || '?')
                          .trim()
                          .charAt(0)
                          .toUpperCase();

                        return (
                          <button
                            key={d.cliente_id ?? d.id}
                            type="button"
                            onClick={() => setSelectedId(d.cliente_id ?? d.id)}
                            className={`w-full text-left rounded-xl border px-3 py-2.5 text-xs sm:text-sm
                                        flex items-center gap-3 transition-all ${
                                          isSelected
                                            ? 'border-emerald-400 bg-emerald-500/15 shadow-lg shadow-emerald-500/20'
                                            : 'border-emerald-500/25 bg-slate-950/80 hover:bg-slate-900/80'
                                        }`}
                          >
                            <div className="flex-shrink-0">
                              <div
                                className={`h-9 w-9 sm:h-10 sm:w-10 rounded-2xl flex items-center justify-center text-sm font-semibold ${
                                  isSelected
                                    ? 'bg-emerald-500 text-slate-950'
                                    : 'bg-emerald-500/25 text-emerald-100'
                                }`}
                              >
                                {inicial}
                              </div>
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="font-semibold truncate text-emerald-50">
                                {d.nombre}
                              </div>
                              <div className="text-[11px] text-emerald-100/75 truncate">
                                {d.documento || 'Sin documento'}
                              </div>
                              <div className="mt-0.5 text-[11px] text-emerald-100/85">
                                Total:{' '}
                                <span className="font-semibold text-emerald-300">
                                  {formatMoney(d.total_pendiente)}
                                </span>
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-1 text-[11px] text-emerald-100/80">
                              <span>
                                {(d.ventas && d.ventas.length) || 0} venta(s)
                              </span>
                              {d.dias_max_atraso != null && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5">
                                  <Clock4 className="h-3 w-3" />
                                  <span>{d.dias_max_atraso} días</span>
                                </span>
                              )}
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                </motion.div>

                <motion.div
                  variants={formContainerV}
                  initial="hidden"
                  animate="visible"
                  className="rounded-2xl border border-emerald-400/40 bg-slate-950/80 backdrop-blur-md p-3 sm:p-4 flex flex-col"
                >
                  {!selected ? (
                    <div className="flex items-center justify-center flex-1 py-12 text-center text-sm text-emerald-100/80">
                      Seleccioná un cliente en la lista de la izquierda para ver
                      el detalle.
                    </div>
                  ) : (
                    <>
                      <motion.div
                        variants={fieldV}
                        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-3"
                      >
                        <div className="flex items-center gap-3">
                          <div className="hidden sm:flex h-10 w-10 rounded-2xl items-center justify-center bg-emerald-500/25 border border-emerald-400/60">
                            <UserCircle2 className="h-6 w-6 text-emerald-100" />
                          </div>
                          <div>
                            <div className="text-sm font-semibold text-emerald-50">
                              {selected.nombre}
                            </div>
                            <div className="text-[11px] text-emerald-100/80">
                              {selected.documento || 'Sin documento'}
                            </div>

                            {/*  - 25-02-2026 - Mostrar saldo previo si existe */}
                            {selectedSaldoPrevio > 0.01 && (
                              <div className="text-[11px] text-emerald-100/80 mt-1">
                                Saldo previo:{' '}
                                <span className="font-semibold text-emerald-300">
                                  {formatMoney(selectedSaldoPrevio)}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col items-end text-right gap-1">
                          <span className="text-[11px] uppercase tracking-[0.16em] text-emerald-200/80">
                            Total pendiente
                          </span>
                          <span className="text-sm sm:text-base font-semibold text-emerald-300">
                            {formatMoney(selected.total_pendiente)}
                          </span>
                          <span className="text-[11px] text-emerald-100/75">
                            {selectedVentasCount} venta(s) pendiente(s)
                          </span>
                        </div>
                      </motion.div>

                      <motion.div
                        variants={fieldV}
                        className="flex-1 min-h-[220px] max-h-[360px] overflow-y-auto rounded-xl border border-emerald-500/25 bg-slate-950/80 px-2 py-2"
                      >
                        {!selected.ventas || !selected.ventas.length ? (
                          <div className="py-10 text-center text-xs text-emerald-100/80">
                            {/*  - 25-02-2026 - Mensaje coherente si solo hay saldo previo */}
                            {selectedSaldoPrevio > 0.01
                              ? 'Este cliente no tiene ventas fiado pendientes, pero mantiene saldo previo pendiente.'
                              : 'Este cliente no tiene ventas fiado pendientes.'}
                          </div>
                        ) : (
                          <div className="space-y-2.5">
                            {selected.ventas.map((v) => (
                              <div
                                key={v.id}
                                className="rounded-xl border border-emerald-500/30 bg-slate-950/90 px-3 py-2.5 text-xs sm:text-sm text-emerald-50"
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="min-w-0">
                                    <div className="text-[11px] uppercase tracking-[0.16em] text-emerald-200/80 mb-0.5">
                                      Venta #{v.id}
                                    </div>
                                    <div className="text-[11px] text-emerald-100/80">
                                      {formatFecha(v.fecha)}
                                    </div>
                                    <div className="text-[11px] text-emerald-100/80 mt-1">
                                      Vendedor:{' '}
                                      <span className="font-semibold">
                                        {v.vendedor_nombre || '—'}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="flex flex-col items-end gap-1">
                                    <span
                                      className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em]
                                                     bg-emerald-500/15 border border-emerald-400/50"
                                    >
                                      {v.tipo || 'fiado'}
                                    </span>
                                    <span className="text-[11px] text-emerald-100/80">
                                      Estado:{' '}
                                      <span className="font-semibold capitalize">
                                        {v.estado || 'confirmada'}
                                      </span>
                                    </span>
                                    <span className="text-[11px] font-semibold text-emerald-300">
                                      {formatMoney(v.total_neto)}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </motion.div>
                    </>
                  )}

                  <div className="mt-3 flex flex-col sm:flex-row items-center justify-between gap-2">
                    <div className="text-[11px] text-emerald-100/80">
                      Consejo: usá esta vista como radar rápido para priorizar
                      cobros.
                    </div>
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-4 py-2 rounded-xl border border-emerald-500/40 text-xs sm:text-sm text-emerald-50
                                 bg-emerald-500/10 hover:bg-emerald-500/20 transition"
                    >
                      Cerrar
                    </button>
                  </div>
                </motion.div>
              </div>

              <div className="mt-4 pt-3 border-t border-emerald-500/20 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="text-[11px] text-emerald-100/80 text-center sm:text-left">
                  Módulo de Ventas &amp; Cobranza — Desarrollado por{' '}
                  <span className="font-semibold text-emerald-300">
                    SoftFusion
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href="https://www.instagram.com/softfusiontechnologies/"
                    target="_blank"
                    rel="noreferrer"
                    className="h-8 w-8 flex items-center justify-center rounded-full bg-white/5 border border-white/20
                               hover:bg-white/15 hover:scale-105 transition"
                    title="Instagram SoftFusion"
                  >
                    <FaInstagram className="text-sm text-emerald-50" />
                  </a>
                  <a
                    href="https://softfusion.com.ar/"
                    target="_blank"
                    rel="noreferrer"
                    className="h-8 w-8 flex items-center justify-center rounded-full bg-white/5 border border-white/20
                               hover:bg-white/15 hover:scale-105 transition"
                    title="Sitio web SoftFusion"
                  >
                    <FaGlobeAmericas className="text-sm text-emerald-50" />
                  </a>
                  <a
                    href="https://wa.me/5493815430503"
                    target="_blank"
                    rel="noreferrer"
                    className="h-8 w-8 flex items-center justify-center rounded-full bg-white/5 border border-white/20
                               hover:bg-white/15 hover:scale-105 transition"
                    title="WhatsApp SoftFusion"
                  >
                    <FaWhatsapp className="text-sm text-emerald-50" />
                  </a>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
