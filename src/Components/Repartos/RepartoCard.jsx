// src/Components/Repartos/RepartoCard.jsx
import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  FaTruck,
  FaCheckCircle,
  FaTimesCircle,
  FaEdit,
  FaTrash,
  FaEye,
  FaUsers,
  FaMapMarkerAlt,
  FaArrowsAltH,
  FaUserCog,
  FaCalendarAlt
} from 'react-icons/fa';
import DetailViewModal from '../Common/DetailViewModal';

const StatusPill = ({ activo }) => (
  <span
    className={`inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full border transition-colors
    ${
      activo
        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
        : 'bg-zinc-100 text-zinc-700 border-zinc-300'
    }`}
  >
    {activo ? (
      <FaCheckCircle className="opacity-90" />
    ) : (
      <FaTimesCircle className="opacity-90" />
    )}
    <span className="font-medium">{activo ? 'Activo' : 'Inactivo'}</span>
  </span>
);

const Field = ({ label, children }) => (
  <div className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-2 text-sm">
    <div className="text-[10px] uppercase tracking-widest text-slate-600">
      {label}
    </div>
    <div className="mt-0.5 truncate text-slate-700">
      {children || '—'}
    </div>
  </div>
);

const buttonBase =
  'group relative inline-flex items-center justify-center gap-2 px-3.5 py-2 min-h-[40px] text-[13px] leading-tight whitespace-nowrap font-semibold text-white rounded-xl border border-white/20 bg-gradient-to-br shadow transition-all hover:scale-[1.02] hover:brightness-110 focus:outline-none focus:ring-2';

const BTN = {
  view: `${buttonBase} from-sky-500/85 to-sky-600/90 focus:ring-sky-300`,
  edit: `${buttonBase} from-amber-400/80 to-amber-500/90 focus:ring-amber-300`,
  toggle: `${buttonBase} from-cyan-500/80 to-cyan-600/90 focus:ring-cyan-300`,
  del: `${buttonBase} from-rose-500/85 to-rose-700/90 focus:ring-rose-300`,
  assign: `${buttonBase} from-cyan-500/90 to-teal-500/95 focus:ring-cyan-300`
};

export default function RepartoCard({
  item,
  onEdit,
  onToggleEstado,
  onDelete,
  onView,
  onAssign,
  onVerClientes,
  onAsignarUsuarios,
  onConfigDias,
  color = '#0ea5e9'
}) {
  const [viewOpen, setViewOpen] = useState(false);

  const initial = useMemo(
    () => (item?.nombre ? item.nombre[0]?.toUpperCase() : 'R'),
    [item?.nombre]
  );
  const inactivo = item?.estado !== 'activo';

  const ciudadNombre =
    item?.ciudad?.nombre || item?.ciudad_nombre || `ID ${item?.ciudad_id}`;
  const provincia = item?.ciudad?.provincia || 'Tucumán';

  const rangoLabel =
    item?.rango_min != null && item?.rango_max != null
      ? `${item.rango_min} – ${item.rango_max}`
      : 'Sin rango';

  const buildViewProps = (r) => {
    const activo = (r?.estado || '').toLowerCase() === 'activo';
    return {
      title: r?.nombre || 'Reparto',
      subtitle: r?.id ? `ID ${r.id}` : undefined,
      icon: FaTruck,
      leftAccent: color,
      status: {
        label: activo ? 'Activo' : 'Inactivo',
        tone: activo ? 'emerald' : 'zinc',
        icon: activo ? <FaCheckCircle /> : <FaTimesCircle />
      },
      data: r,
      headerMeta: r?.created_at
        ? new Date(r.created_at).toLocaleDateString()
        : undefined,
      sections: [
        {
          title: 'Identificación',
          cols: 2,
          rows: [
            { label: 'ID', value: r?.id ?? '—' },
            { label: 'Estado', value: activo ? 'Activo' : 'Inactivo' }
          ]
        },
        {
          title: 'Cobertura',
          cols: 2,
          rows: [
            {
              label: 'Ciudad',
              value: ciudadNombre,
              icon: <FaMapMarkerAlt />
            },
            {
              label: 'Provincia',
              value: provincia
            },
            {
              label: 'Rango de clientes',
              value: rangoLabel,
              icon: <FaArrowsAltH />
            }
          ]
        },
        {
          title: 'Notas',
          cols: 1,
          rows: [
            {
              label: 'Observaciones',
              value: r?.observaciones || '—'
            }
          ]
        }
      ],
      createdAt: (d) => d?.created_at,
      updatedAt: (d) => d?.updated_at
    };
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 18, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.28 }}
        className={`relative overflow-hidden rounded-3xl border border-slate-200 shadow-sm
                 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300
                 ${inactivo ? 'bg-slate-100 saturate-50' : 'bg-white'}`}
      >
        {/* Banda lateral como "franja de reparto" */}
        <div className="absolute left-0 top-0 h-full w-24 sm:w-28">
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(180deg, ${color} 0%, rgba(0,0,0,0) 100%)`,
              opacity: inactivo ? 0.3 : 0.95
            }}
          />
          <div
            className="absolute inset-0 opacity-25 mix-blend-overlay"
            style={{
              backgroundImage:
                'repeating-linear-gradient(135deg, rgba(255,255,255,0.5) 0 2px, transparent 2px 12px)'
            }}
          />
        </div>

        <div
          className={`relative z-10 grid grid-cols-1 sm:grid-cols-[auto,1fr] gap-4 p-5 sm:p-6 ${
            inactivo ? 'opacity-75' : 'opacity-100'
          }`}
        >
          {/* Monograma + cabecera */}
          <div className="flex items-start sm:items-center gap-4">
            <div className="relative -ml-2 sm:ml-0 h-14 w-14 shrink-0 rounded-2xl ring-1 ring-slate-200 bg-slate-100 flex items-center justify-center">
              <span className="text-xl font-black text-slate-800">
                {initial}
              </span>
              <FaTruck className="absolute -right-2 -bottom-2 text-cyan-500" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center justify-between gap-2">
                <h3 className="truncate text-lg font-extrabold tracking-tight text-slate-900">
                  {item?.nombre}
                </h3>
                <StatusPill activo={item?.estado === 'activo'} />
              </div>
              <div className="mt-1 text-xs text-slate-600">
                {ciudadNombre} • Rango {rangoLabel}
              </div>
            </div>
          </div>

          {/* Datos + acciones */}
          <div className="min-w-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Ciudad">{ciudadNombre}</Field>
              <Field label="Rango de clientes">{rangoLabel}</Field>
            </div>

            <div className="mt-4 grid grid-cols-[repeat(auto-fit,minmax(130px,1fr))] gap-2">
              <button
                onClick={() => (onView ? onView(item) : setViewOpen(true))}
                className={BTN.view}
                title="Ver detalle"
              >
                <FaEye className="text-sm" />
                <span className="hidden md:inline">Ver detalle</span>
              </button>

              <button
                onClick={() => onVerClientes?.(item)}
                className={BTN.viewAlt || BTN.view} // si no tenés otro, reusá BTN.view
              >
                <FaUsers className="text-sm" />
                <span className="hidden md:inline">Ver clientes</span>
              </button>

              <button onClick={() => onAssign?.(item)} className={BTN.assign}>
                <FaMapMarkerAlt className="text-sm" />
                <span className="hidden md:inline">Asignar clientes</span>
              </button>

              {/* ✅ Nuevo: Asignar usuarios */}
              <button
                onClick={() => onAsignarUsuarios?.(item)}
                className={BTN.assign || BTN.view}
              >
                <FaUserCog className="text-sm" />
                <span className="hidden md:inline">Asignar usuarios</span>
              </button>

              {/* ✅ Nuevo: Días y turnos */}
              <button
                onClick={() => onConfigDias?.(item)}
                className={BTN.viewAlt || BTN.view}
              >
                <FaCalendarAlt className="text-sm" />
                <span className="hidden md:inline">Días / turnos</span>
              </button>

              <button onClick={() => onEdit?.(item)} className={BTN.edit}>
                <FaEdit className="text-sm" />
                <span className="hidden md:inline">Editar</span>
              </button>

              <button onClick={() => onDelete?.(item)} className={BTN.del}>
                <FaTrash className="text-sm" />
                <span className="hidden md:inline">Eliminar</span>
              </button>

              <button
                onClick={() => onToggleEstado?.(item)}
                className={BTN.toggle}
              >
                {item?.estado === 'activo' ? (
                  <FaTimesCircle className="text-sm" />
                ) : (
                  <FaCheckCircle className="text-sm" />
                )}
                <span className="hidden md:inline">
                  {item?.estado === 'activo' ? 'Desactivar' : 'Activar'}
                </span>
              </button>
            </div>
          </div>
        </div>
      </motion.div>

      {!onView && (
        <DetailViewModal
          open={viewOpen}
          onClose={() => setViewOpen(false)}
          {...buildViewProps(item)}
        />
      )}
    </>
  );
}
