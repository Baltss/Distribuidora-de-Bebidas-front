// ===============================
// FILE: src/Components/Repartos/RepartoClientesSlideover.jsx
// ===============================
/*
 *
 * Fecha Creación: 29 / 11 / 2025
 * Versión: 1.0
 *
 * Descripción:
 * Slideover lateral para ver los clientes asignados a un reparto,
 * con KPIs de ocupación y posibilidad de quitar asignaciones.
 *
 * Tema: Repartos - Clientes asignados
 * Capa: Frontend
 */

import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  FaTimes,
  FaUsers,
  FaUserMinus,
  FaMapMarkerAlt,
  FaHashtag,
  FaPhoneAlt,
  FaIdCard
} from 'react-icons/fa';

import {
  listClientesDeReparto,
  deleteRepartoCliente
} from '../../api/repartosClientes';
import { showErrorSwal, showSuccessSwal, showConfirmSwal } from '../../ui/swal';

const backdropV = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 }
};

const panelV = {
  hidden: { x: '100%', opacity: 0 },
  visible: { x: 0, opacity: 1 },
  exit: { x: '100%', opacity: 0 }
};

const KpiChip = ({ label, value, tone = 'emerald' }) => {
  const tones = {
    emerald: 'from-emerald-500/80 to-emerald-600/90',
    amber: 'from-amber-400/85 to-amber-500/95',
    sky: 'from-sky-400/85 to-sky-500/95',
    rose: 'from-rose-500/85 to-rose-600/95'
  };
  const grad = tones[tone] || tones.emerald;
  return (
    <div className="rounded-2xl border border-white/20 bg-white/5 backdrop-blur-md px-3.5 py-2 flex flex-col gap-0.5 text-xs text-white">
      <span className="opacity-70">{label}</span>
      <span
        className={`inline-flex items-baseline gap-1 text-sm font-semibold bg-gradient-to-r ${grad} bg-clip-text text-transparent`}
      >
        {value}
      </span>
    </div>
  );
};

export default function RepartoClientesSlideover({ open, onClose, reparto }) {
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(false);

  const [page, setPage] = useState(1);
  const limit = 50;

  // Reset interno cuando cambia el reparto
  useEffect(() => {
    if (!open) return;
    setPage(1);
    setRows([]);
    setMeta(null);
  }, [open, reparto?.id]);

  const capacidad = useMemo(() => {
    if (!reparto) return null;
    const min = Number(reparto.rango_min ?? 0);
    const max = Number(reparto.rango_max ?? 0);
    if (!Number.isFinite(min) || !Number.isFinite(max)) return null;
    return max >= min ? max - min + 1 : null;
  }, [reparto]);

  const totalAsignados = useMemo(
    () => meta?.total ?? rows.length,
    [meta, rows.length]
  );

  const libres = useMemo(() => {
    if (!capacidad) return null;
    return Math.max(capacidad - totalAsignados, 0);
  }, [capacidad, totalAsignados]);

  const ocupacion = useMemo(() => {
    if (!capacidad || capacidad <= 0) return 0;
    return Math.round((totalAsignados / capacidad) * 100);
  }, [capacidad, totalAsignados]);

  const fetchData = async () => {
    if (!open || !reparto?.id) return;
    setLoading(true);
    try {
      const data = await listClientesDeReparto(reparto.id, {
        page,
        limit,
        estado: 'activo',
        withCliente: 1,
        orderBy: 'numero_rango',
        orderDir: 'ASC'
      });

      // backend → { data: [...], meta: {...}, reparto?, stats? }
      if (Array.isArray(data)) {
        setRows(data);
        setMeta(null);
      } else {
        setRows(data.data || []);
        setMeta(data.meta || null);
      }
    } catch (err) {
      console.error('RepartoClientesSlideover fetch error:', err);
      await showErrorSwal({
        title: 'Error',
        text: 'No se pudieron cargar los clientes del reparto.'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, reparto?.id, page]);

  const onRemove = async (asignacion) => {
    const res = await showConfirmSwal({
      title: 'Quitar del reparto',
      text: `¿Quitar a "${
        asignacion?.cliente?.nombre ?? 'cliente'
      }" del reparto?`,
      confirmText: 'Sí, quitar'
    });
    if (!res || (typeof res === 'object' && !res.isConfirmed)) return;

    try {
      await deleteRepartoCliente(asignacion.id);
      await showSuccessSwal({
        title: 'Quitado',
        text: 'El cliente fue quitado del reparto.'
      });
      await fetchData();
    } catch (err) {
      console.error('onRemove error:', err);
      const { mensajeError, tips } = err || {};
      await showErrorSwal({
        title: 'No se pudo quitar',
        text: mensajeError || 'Ocurrió un error al quitar el cliente.',
        tips
      });
    }
  };

  const nombreReparto = reparto?.nombre || 'Reparto';
  const ciudadNombre = reparto?.ciudad?.nombre || reparto?.ciudad_nombre;
  const rangoLabel =
    reparto && reparto.rango_min != null && reparto.rango_max != null
      ? `${reparto.rango_min} – ${reparto.rango_max}`
      : '—';

  const Pager =
    meta && (meta.hasPrev || meta.hasNext) ? (
      <div className="mt-3 flex items-center justify-between gap-2 text-xs text-white/80">
        <button
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={!meta.hasPrev}
          className="px-3 py-1.5 rounded-xl border border-white/20 bg-white/10 hover:bg-white/20 disabled:opacity-40"
        >
          ← Anterior
        </button>
        <span>
          Página {meta.page} / {meta.totalPages}
        </span>
        <button
          onClick={() => setPage((p) => (meta.hasNext ? p + 1 : p))}
          disabled={!meta.hasNext}
          className="px-3 py-1.5 rounded-xl border border-white/20 bg-white/10 hover:bg-white/20 disabled:opacity-40"
        >
          Siguiente →
        </button>
      </div>
    ) : null;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex"
          variants={backdropV}
          initial="hidden"
          animate="visible"
          exit="exit"
        >
          {/* Backdrop */}
          <div
            className="flex-1 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Panel derecho */}
          <motion.div
            variants={panelV}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="relative w-full max-w-xl bg-gradient-to-b from-[#001219] via-[#003049] to-[#005f73] border-l border-white/15 shadow-2xl flex flex-col"
          >
            {/* Header */}
            <div className="relative px-5 py-4 sm:px-6 sm:py-5 border-b border-white/15">
              <div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_top,_#38bdf8,_transparent_55%)]" />
              <div className="relative flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 text-xs text-teal-200/80 uppercase tracking-[0.18em]">
                    <FaUsers className="text-teal-300" />
                    Clientes del reparto
                  </div>
                  <h2 className="mt-1 text-xl sm:text-2xl font-bold text-white leading-tight">
                    {nombreReparto}
                  </h2>
                  <div className="mt-1 text-xs text-teal-100/80 flex flex-wrap items-center gap-2">
                    {ciudadNombre && (
                      <span className="inline-flex items-center gap-1">
                        <FaMapMarkerAlt className="text-[10px]" />
                        {ciudadNombre}
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1">
                      <FaHashtag className="text-[10px]" /> Rango {rangoLabel}
                    </span>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/10 border border-white/20 hover:bg-white/20 text-white transition"
                  aria-label="Cerrar"
                >
                  <FaTimes className="w-4 h-4" />
                </button>
              </div>

              {/* KPIs */}
              <div className="relative mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                <KpiChip
                  label="Asignados"
                  value={totalAsignados ?? 0}
                  tone="emerald"
                />
                <KpiChip
                  label="Capacidad"
                  value={capacidad ?? '—'}
                  tone="sky"
                />
                <KpiChip label="Libres" value={libres ?? '—'} tone="amber" />
                <KpiChip
                  label="Ocupación"
                  value={`${ocupacion || 0}%`}
                  tone="rose"
                />
              </div>
            </div>

            {/* Lista */}
            <div className="flex-1 overflow-y-auto px-4 sm:px-5 py-4 space-y-3">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="h-8 w-8 border-4 border-white/40 border-t-teal-400 rounded-full animate-spin" />
                </div>
              ) : !rows.length ? (
                <div className="text-center text-sm text-white/80 py-10">
                  Este reparto todavía no tiene clientes asignados.
                </div>
              ) : (
                rows.map((asig) => {
                  const c = asig.cliente || {};
                  const zona = [
                    c?.barrio?.nombre,
                    c?.barrio?.localidad?.nombre,
                    c?.barrio?.localidad?.ciudad?.nombre
                  ]
                    .filter(Boolean)
                    .join(' • ');

                  return (
                    <div
                      key={asig.id}
                      className="rounded-2xl border border-white/15 bg-white/5 backdrop-blur-md p-3.5 sm:p-4 flex flex-col gap-2"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-xs font-bold text-slate-900">
                              {c?.nombre?.[0]?.toUpperCase?.() || 'C'}
                            </span>
                            <div className="min-w-0">
                              <div className="truncate text-sm font-semibold text-white">
                                {c?.nombre || 'Cliente'}
                              </div>
                              <div className="text-[11px] text-teal-100/80 flex flex-wrap gap-1">
                                <span className="inline-flex items-center gap-1">
                                  <FaHashtag className="text-[9px]" />
                                  N° rango {asig.numero_rango}
                                </span>
                                {c?.documento && (
                                  <span className="inline-flex items-center gap-1 ml-2">
                                    <FaIdCard className="text-[9px]" />
                                    {c.documento}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={() => onRemove(asig)}
                          className="inline-flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-[11px] font-semibold
                                     bg-gradient-to-r from-rose-500/85 to-rose-600/95 text-white border border-white/20
                                     hover:brightness-110 hover:scale-[1.02] transition"
                        >
                          <FaUserMinus className="text-[10px]" />
                          Quitar
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-white/85">
                        <div className="inline-flex items-center gap-1.5">
                          <FaPhoneAlt className="text-[10px] opacity-80" />
                          <span>{c?.telefono || 'Sin teléfono'}</span>
                        </div>
                        {/* <div className="inline-flex items-center gap-1.5">
                          <FaMapMarkerAlt className="text-[10px] opacity-80" />
                          <span className="truncate">
                            {zona || 'Sin zona definida'}
                          </span>
                        </div> */}
                      </div>
                    </div>
                  );
                })
              )}

              {Pager}
            </div>

            {/* Footer */}
            <div className="px-4 sm:px-5 py-3 border-t border-white/10 flex items-center justify-end">
              <button
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl border border-white/20 bg-white/5 text-sm text-white hover:bg-white/10 transition"
              >
                Cerrar
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
