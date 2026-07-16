// ===============================
// FILE: src/Components/Repartos/RepartoDiasModal.jsx
// ===============================
/*
 * Modal para configurar días y turnos de un reparto.
 * Diseño en tarjetas:
 * - Primera sección: Lunes a Viernes (cards más grandes).
 * - Segunda sección: Sábado y Domingo.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { FaCalendarAlt, FaSun, FaCloudSun, FaMoon } from 'react-icons/fa';

import {
  listDiasDeReparto,
  createRepartoDia,
  deleteRepartoDia
} from '../../api/repartosDias';
import { showErrorSwal } from '../../ui/swal';

const backdropV = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 }
};

const panelV = {
  hidden: { opacity: 0, scale: 0.96, y: 12 },
  visible: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 0.96, y: 12 }
};

const DIAS = [
  { value: 1, label: 'Lunes', short: 'Lu' },
  { value: 2, label: 'Martes', short: 'Ma' },
  { value: 3, label: 'Miércoles', short: 'Mi' },
  { value: 4, label: 'Jueves', short: 'Ju' },
  { value: 5, label: 'Viernes', short: 'Vi' },
  { value: 6, label: 'Sábado', short: 'Sa' },
  { value: 7, label: 'Domingo', short: 'Do' }
];

const TURNOS = [
  { value: 'maniana', label: 'Mañana', icon: <FaSun className="text-xs" /> },
  { value: 'tarde', label: 'Tarde', icon: <FaCloudSun className="text-xs" /> },
  { value: 'noche', label: 'Noche', icon: <FaMoon className="text-xs" /> }
];

export default function RepartoDiasModal({ open, onClose, reparto }) {
  const repartoId = reparto?.id || null;
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  // Mapa "dia-turno" -> row
  const mapa = useMemo(() => {
    const m = {};
    for (const r of rows || []) {
      if (!r?.dia_semana || !r?.turno) continue;
      const key = `${r.dia_semana}-${r.turno}`;
      m[key] = r;
    }
    return m;
  }, [rows]);

  const titulo = reparto?.nombre || 'Reparto';

  // ===============================
  // Fetch datos
  // ===============================
  const fetchData = async () => {
    if (!repartoId) return;
    setLoading(true);
    try {
      const data = await listDiasDeReparto(repartoId, {
        page: 1,
        limit: 50,
        pageSize: 50,
        orderBy: 'dia_semana',
        orderDir: 'ASC'
      });
      setRows(data.data || data || []);
    } catch (err) {
      console.error('RepartoDiasModal fetchData error:', err);
      await showErrorSwal({
        title: 'Error',
        text: 'No se pudieron cargar los días de este reparto.'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && repartoId) {
      fetchData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, repartoId]);

  // ===============================
  // Toggle optimista día+turno
  // ===============================
  const toggle = async (dia, turno) => {
    if (!repartoId) return;

    const key = `${dia}-${turno}`;
    const existente = mapa[key];

    // Si ya existe → quitar (optimista)
    if (existente) {
      const backup = existente;
      setRows((prev) => prev.filter((r) => r.id !== backup.id));

      try {
        await deleteRepartoDia(backup.id);
      } catch (err) {
        console.error('RepartoDiasModal toggle delete error:', err);
        // rollback
        setRows((prev) => [...prev, backup]);
        await showErrorSwal({
          title: 'No se pudo quitar',
          text: 'Ocurrió un error al quitar el turno.'
        });
      }
      return;
    }

    // Si no existe → crear (optimista con fila temporal)
    const tempId = `tmp-${key}-${Date.now()}`;
    const tempRow = {
      id: tempId,
      reparto_id: repartoId,
      dia_semana: dia,
      turno
    };

    setRows((prev) => [...prev, tempRow]);

    try {
      const nuevo = await createRepartoDia({
        reparto_id: repartoId,
        dia_semana: dia,
        turno
      });
      const rowReal = nuevo?.data ?? nuevo;

      setRows((prev) => prev.map((r) => (r.id === tempId ? rowReal : r)));
      fetchData();
    } catch (err) {
      console.error('RepartoDiasModal toggle create error:', err);
      // rollback
      setRows((prev) => prev.filter((r) => r.id !== tempId));
      await showErrorSwal({
        title: 'No se pudo agregar',
        text: 'Ocurrió un error al agregar el turno.'
      });
    }
  };

  const isActive = (dia, turno) => !!mapa[`${dia}-${turno}`];

  const diasSemana = DIAS.slice(0, 5); // Lunes a Viernes
  const diasFinDeSemana = DIAS.slice(5); // Sábado y Domingo

  // Render de una tarjeta de día
  const renderCardDia = (d) => (
    <div
      key={d.value}
      className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4
                 flex flex-col gap-3 shadow-sm hover:shadow-md hover:border-amber-200 transition
                 min-h-[130px]"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
          {d.label}
        </span>
        <span className="text-[11px] px-2 py-0.5 rounded-full bg-white text-slate-500 border border-slate-200">
          {d.short}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {TURNOS.map((t) => {
          const activo = isActive(d.value, t.value);
          return (
            <button
              key={t.value}
              type="button"
              onClick={() => toggle(d.value, t.value)}
              className={`inline-flex flex-col items-center justify-center gap-0.5 px-2 py-1.5 rounded-xl border text-[10px] sm:text-[11px] transition
                ${
                  activo
                    ? 'bg-emerald-600 border-emerald-500 text-white shadow-sm'
                    : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-100'
                }`}
            >
              {t.icon}
              <span className="leading-tight text-[10px] sm:text-[11px] text-center">
                {t.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );

  // ===============================
  // Render
  // ===============================
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4"
          variants={backdropV}
          initial="hidden"
          animate="visible"
          exit="exit"
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => onClose?.()}
          />

          {/* Panel */}
          <motion.div
            variants={panelV}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-200
                       bg-white shadow-2xl"
          >
            {/* Cerrar */}
            <button
              onClick={() => onClose?.()}
              className="z-10 absolute top-3 right-3 inline-flex h-9 w-9 items-center justify-center rounded-full
                         bg-slate-100 border border-slate-200 hover:bg-slate-200 text-slate-500 transition"
              aria-label="Cerrar"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Header */}
            <div className="px-5 sm:px-7 pt-5 sm:pt-6 pb-4 border-b border-slate-200">
              <div className="text-[11px] uppercase tracking-[0.2em] text-amber-600 flex items-center gap-2">
                <FaCalendarAlt className="text-xs" />
                Días y turnos del reparto
              </div>
              <h2 className="mt-1 text-xl sm:text-2xl font-bold text-slate-900 leading-tight">
                {titulo}
              </h2>
              {reparto?.ciudad_nombre && (
                <p className="mt-1 text-xs text-slate-500">
                  Ciudad: {reparto.ciudad_nombre}
                </p>
              )}
            </div>

            {/* Body */}
            <div className="px-5 sm:px-7 py-4 space-y-4">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="h-8 w-8 border-4 border-slate-200 border-t-amber-500 rounded-full animate-spin" />
                </div>
              ) : (
                <>
                  <p className="text-xs text-slate-500">
                    Activá los turnos en los que este reparto realiza entregas.
                    Cada combinación día + turno.
                  </p>

                  {/* Lunes a Viernes — ahora cards más grandes y menos apretadas */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {diasSemana.map(renderCardDia)}
                  </div>

                  {/* Sábado y Domingo */}
                  <div className="grid grid-cols-2 gap-4">
                    {diasFinDeSemana.map(renderCardDia)}
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            <div className="px-5 sm:px-7 py-3 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => onClose?.()}
                className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-sm text-slate-600 hover:bg-slate-50 transition"
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
