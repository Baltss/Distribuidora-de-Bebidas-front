// src/Components/Locales/LocalCard.jsx
import React from 'react';
import { motion } from 'framer-motion';
import {
  FaBuilding,
  FaEdit,
  FaTrash,
  FaMapMarkerAlt,
  FaPhoneAlt,
  FaEnvelope,
  FaClock,
  FaPrint,
  FaUserTie,
  FaCheckCircle,
  FaTimesCircle
} from 'react-icons/fa';

const StatusPill = ({ active }) => (
  <span
    className={`inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full border shrink-0
    ${
      active
        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
        : 'bg-zinc-100 text-zinc-700 border-zinc-300'
    }`}
  >
    {active ? <FaCheckCircle /> : <FaTimesCircle />}
    <span className="font-medium">{active ? 'Activo' : 'Inactivo'}</span>
  </span>
);

const Field = ({ label, icon, children }) => (
  <div className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-2">
    <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-slate-500">
      {icon}
      {label}
    </div>
    <div className="mt-0.5 truncate text-slate-700">{children || '—'}</div>
  </div>
);

export default function LocalCard({ item, onEdit, onDelete, onToggleEstado }) {
  const isInactive = (item?.estado || '').toLowerCase() !== 'activo';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={`rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 p-5 sm:p-6 ${
        isInactive ? 'bg-slate-100 saturate-50' : 'bg-white'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3 min-w-0">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-teal-50 text-teal-600">
            <FaBuilding />
          </div>
          <div className="min-w-0">
            <h3 className="truncate text-lg font-extrabold tracking-tight text-slate-900">
              {item?.nombre || 'Local'}
            </h3>
            <p className="truncate text-xs text-slate-500">
              ID {item?.id}
              {item?.codigo ? ` · Código ${item.codigo}` : ''}
            </p>
          </div>
        </div>
        <StatusPill active={!isInactive} />
      </div>

      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
        <Field label="Dirección" icon={<FaMapMarkerAlt />}>
          {item?.direccion}
        </Field>
        <Field label="Ciudad / Provincia">
          {[item?.ciudad, item?.provincia].filter(Boolean).join(', ')}
        </Field>
        <Field label="Teléfono" icon={<FaPhoneAlt />}>
          {item?.telefono}
        </Field>
        <Field label="Email" icon={<FaEnvelope />}>
          {item?.email}
        </Field>
        <Field label="Responsable" icon={<FaUserTie />}>
          {item?.responsable_nombre}
          {item?.responsable_dni ? ` (${item.responsable_dni})` : ''}
        </Field>
        <Field label="Horario" icon={<FaClock />}>
          {item?.horario_apertura && item?.horario_cierre
            ? `${item.horario_apertura} - ${item.horario_cierre}`
            : ''}
        </Field>
        <Field label="Impresora" icon={<FaPrint />}>
          {item?.printer_nombre}
        </Field>
      </div>

      <div className="mt-4 flex justify-end gap-2">
        <button
          onClick={() => onEdit?.(item)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[13px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 hover:bg-amber-100 transition"
        >
          <FaEdit /> Editar
        </button>
        <button
          onClick={() => onToggleEstado?.(item)}
          className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[13px] font-semibold border transition ${
            isInactive
              ? 'text-emerald-700 bg-emerald-50 border-emerald-200 hover:bg-emerald-100'
              : 'text-zinc-700 bg-zinc-50 border-zinc-200 hover:bg-zinc-100'
          }`}
        >
          {isInactive ? <FaCheckCircle /> : <FaTimesCircle />}
          {isInactive ? 'Activar' : 'Desactivar'}
        </button>
        <button
          onClick={() => onDelete?.(item)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[13px] font-semibold text-rose-700 bg-rose-50 border border-rose-200 hover:bg-rose-100 transition"
        >
          <FaTrash /> Eliminar
        </button>
      </div>
    </motion.div>
  );
}
