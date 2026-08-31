// src/Components/Common/DetailViewModal.jsx
import React from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import {
  backdropV,
  panelV,
  formContainerV,
  fieldV
} from '../../ui/animHelpers';

// Util: obtener valor por path "a.b.c"
const getByPath = (obj, path) => {
  if (!obj || !path) return undefined;
  return String(path)
    .split('.')
    .reduce(
      (acc, k) => (acc && acc[k] !== undefined ? acc[k] : undefined),
      obj
    );
};

// Util: formatear fecha (flexible)
const fmtDate = (v) => {
  if (!v) return '—';
  try {
    const d = v instanceof Date ? v : new Date(v);
    return isNaN(d.getTime()) ? String(v) : d.toLocaleString();
  } catch {
    return String(v);
  }
};

// ====== UI atoms ======
const StatusPill = ({ tone = 'emerald', icon, children }) => {
  const classes =
    {
      emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      cyan: 'bg-cyan-50 text-cyan-700 border-cyan-200',
      indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      rose: 'bg-rose-50 text-rose-700 border-rose-200',
      zinc: 'bg-zinc-100 text-zinc-700 border-zinc-300'
    }[tone] || 'bg-zinc-100 text-zinc-700 border-zinc-300';

  return (
    <span
      className={`inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full border ${classes}`}
    >
      {icon || null}
      {children}
    </span>
  );
};

/**
 * Fila "inline" (label izquierda, valor derecha) — ideal para 1 columna.
 * Mantiene un ancho fijo de etiqueta para alinear todas las filas.
 */
const RowInline = ({ label, children, Icon, multiline }) => (
  <motion.div
    variants={fieldV}
    className="grid grid-cols-1 sm:grid-cols-[220px,1fr] gap-2 sm:gap-5"
  >
    <div className="text-[11px] uppercase tracking-widest text-slate-600 pt-[2px] sm:text-right">
      {label}
    </div>
    <div
      className={`text-slate-700 flex items-start gap-2 leading-6 ${
        multiline ? 'whitespace-pre-line' : 'truncate'
      }`}
    >
      {Icon ? (
        <span className="opacity-70 shrink-0 mt-[2px]">{Icon}</span>
      ) : null}
      <span className={multiline ? '' : 'truncate'}>{children ?? '—'}</span>
    </div>
  </motion.div>
);

/**
 * Celda "card" (label arriba, valor abajo) — ideal para 2 o 3 columnas.
 * Evita desalineaciones cuando hay valores multilínea con alturas distintas.
 */
const FieldCard = ({ label, children, Icon, multiline }) => (
  <motion.div
    variants={fieldV}
    className="rounded-lg bg-slate-50 border border-slate-200 px-3.5 py-3"
  >
    <div className="text-[10px] uppercase tracking-widest text-slate-600 mb-1.5">
      {label}
    </div>
    <div
      className={`text-slate-700 flex items-start gap-2 ${
        multiline ? 'whitespace-pre-line' : 'truncate'
      }`}
      title={typeof children === 'string' ? children : undefined}
    >
      {Icon ? (
        <span className="opacity-70 shrink-0 mt-[2px]">{Icon}</span>
      ) : null}
      <span className={multiline ? '' : 'truncate'}>{children ?? '—'}</span>
    </div>
  </motion.div>
);

// ====== Componente principal ======
/**
 * DetailViewModal (reutilizable)
 *
 * Props:
 * - open, onClose
 * - title, subtitle, headerMeta
 * - icon: Componente o ReactNode
 * - leftAccent: string color (banda lateral)
 * - status: { label?:string, tone?:'emerald'|'zinc'|'rose'|'indigo'|'cyan'|..., icon?:ReactNode }
 * - data: objeto
 * - sections: Array<{ title?:string, cols?:number, rows: Row[] }>
 *   Row: { label, icon?, key?, value?, formatter?, multiline? }
 * - createdAt, updatedAt (Date|string|fn(data))
 * - footer?: ReactNode
 */
export default function DetailViewModal({
  open,
  onClose,
  title = 'Detalle',
  subtitle,
  headerMeta,
  icon: HeaderIcon,
  leftAccent = '#22c55e',
  status,
  data,
  sections = [],
  createdAt,
  updatedAt,
  footer
}) {
  const computeValue = (r) => {
    if (r.value !== undefined) return r.value;
    const raw = r.key ? getByPath(data, r.key) : undefined;
    return r.formatter ? r.formatter(raw, data) : raw ?? '—';
  };

  const computeStamp = (v) => (typeof v === 'function' ? v(data) : v);
  const created = computeStamp(createdAt);
  const updated = computeStamp(updatedAt);

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
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            variants={panelV}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="relative w-full max-w-[92vw] sm:max-w-4xl max-h-[88vh] overflow-y-auto overscroll-contain
                       rounded-2xl border border-slate-200 bg-white shadow-2xl"
          >
            {/* Cierre */}
            <button
              onClick={onClose}
              className="absolute z-50 top-2.5 right-2.5 inline-flex h-9 w-9 items-center justify-center rounded-lg
                         bg-slate-100 border border-slate-200 text-slate-500 hover:bg-slate-200 transition"
              aria-label="Cerrar"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Banda lateral */}
            <div
              className="absolute left-0 top-0 h-full w-1 rounded-l-2xl"
              style={{ background: leftAccent, opacity: 0.9 }}
            />

            {/* Contenido */}
            <div className="relative z-10 p-5 sm:p-6 md:p-8">
              {/* Header */}
              <div className="flex flex-wrap items-center gap-4">
                {HeaderIcon ? (
                  <div className="h-14 w-14 rounded-2xl bg-slate-100 ring-1 ring-slate-200 flex items-center justify-center shrink-0">
                    {typeof HeaderIcon === 'function' ? (
                      <HeaderIcon className="text-slate-700" />
                    ) : (
                      HeaderIcon
                    )}
                  </div>
                ) : null}

                <div className="min-w-0 flex-1">
                  <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 truncate">
                    {title}
                  </h3>
                  {subtitle ? (
                    <div className="mt-1 text-xs text-slate-500 truncate">
                      {subtitle}
                    </div>
                  ) : null}
                </div>

                <div className="ml-auto flex items-center gap-2">
                  {headerMeta ? (
                    <div className="text-[11px] text-slate-500 hidden sm:block">
                      {headerMeta}
                    </div>
                  ) : null}
                  {status?.label ? (
                    <StatusPill tone={status?.tone} icon={status?.icon}>
                      {status.label}
                    </StatusPill>
                  ) : null}
                </div>
              </div>

              {/* Body */}
              <motion.div
                variants={formContainerV}
                initial="hidden"
                animate="visible"
                className="mt-6 space-y-8"
              >
                {sections.map((sec, i) => {
                  const cols = Math.min(Math.max(Number(sec.cols || 2), 1), 3);
                  const useInlineRows = cols === 1;

                  return (
                    <section key={i} className="space-y-4">
                      {sec.title ? (
                        <div className="text-[11px] uppercase tracking-[0.2em] text-slate-600">
                          {sec.title}
                        </div>
                      ) : null}

                      {/* Para 1 columna: filas alineadas (label izquierda, valor derecha) */}
                      {useInlineRows ? (
                        <div className="grid gap-3">
                          {sec.rows.map((r, idx) => (
                            <RowInline
                              key={idx}
                              label={r.label}
                              Icon={r.icon}
                              multiline={r.multiline}
                            >
                              {computeValue(r)}
                            </RowInline>
                          ))}
                        </div>
                      ) : (
                        // Para 2/3 columnas: tarjetas con label arriba (evita desalineación)
                        <div
                          className={`grid gap-3 ${
                            cols === 2
                              ? 'grid-cols-1 sm:grid-cols-2'
                              : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
                          }`}
                        >
                          {sec.rows.map((r, idx) => (
                            <FieldCard
                              key={idx}
                              label={r.label}
                              Icon={r.icon}
                              multiline={r.multiline}
                            >
                              {computeValue(r)}
                            </FieldCard>
                          ))}
                        </div>
                      )}
                    </section>
                  );
                })}

                {(created || updated) && (
                  <div className="pt-4 border-t border-slate-200 text-[13px] text-slate-500 grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>Creado: {fmtDate(created)}</div>
                    <div>Actualizado: {fmtDate(updated)}</div>
                  </div>
                )}
              </motion.div>

              {/* Footer */}
              <div className="mt-8 flex flex-wrap justify-end gap-2">
                {footer}
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
