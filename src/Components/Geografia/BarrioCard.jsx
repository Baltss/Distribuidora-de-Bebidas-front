// src/Components/Geografia/BarrioCard.jsx
import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  FaMapPin,
  FaCheckCircle,
  FaTimesCircle,
  FaEdit,
  FaTrash,
  FaEye
} from 'react-icons/fa';
import DetailViewModal from '../Common/DetailViewModal';

const StatusPill = ({ activa }) => (
  <span
    className={`inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full border transition-colors
    ${
      activa
        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
        : 'bg-zinc-100 text-zinc-700 border-zinc-300'
    }`}
  >
    {activa ? (
      <FaCheckCircle className="opacity-90" />
    ) : (
      <FaTimesCircle className="opacity-90" />
    )}
    <span className="font-medium">{activa ? 'Activa' : 'Inactiva'}</span>
  </span>
);

const Field = ({ label, children }) => (
  <div className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-2 text-sm">
    <div className="text-[10px] uppercase tracking-widest text-slate-400">
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
  view: `${buttonBase} from-indigo-500/85 to-indigo-600/90 focus:ring-indigo-300`,
  edit: `${buttonBase} from-amber-400/80 to-amber-500/90 focus:ring-amber-300`,
  toggle: `${buttonBase} from-emerald-500/80 to-emerald-600/90 focus:ring-emerald-300`,
  del: `${buttonBase} from-rose-500/85 to-rose-700/90 focus:ring-rose-300`
};

export default function BarrioCard({
  item,
  onEdit,
  onToggleEstado,
  onDelete,
  onView, // ← opcional: si viene, usa el handler externo
  color = '#10b981'
}) {
  const [viewOpen, setViewOpen] = useState(false);

  const initial = useMemo(
    () => (item?.nombre ? item.nombre[0]?.toUpperCase() : 'B'),
    [item?.nombre]
  );
  const inactiva = item?.estado !== 'activa';

  // Derivar ciudad desde item.ciudad o item.localidad.ciudad
  const ciudad = useMemo(
    () => item?.ciudad ?? item?.localidad?.ciudad ?? null,
    [item?.ciudad, item?.localidad]
  );

  // Props para el DetailViewModal (alineado a Ciudad/Localidad/Product)
  const buildViewProps = (b) => {
    const activa = (b?.estado || '').toLowerCase() === 'activa';
    return {
      title: b?.nombre || 'Barrio',
      subtitle: b?.id ? `ID ${b.id}` : undefined,
      icon: FaMapPin,
      leftAccent: color,
      status: {
        label: activa ? 'Activa' : 'Inactiva',
        tone: activa ? 'emerald' : 'zinc',
        icon: activa ? <FaCheckCircle /> : <FaTimesCircle />
      },
      data: b,
      headerMeta: b?.created_at
        ? new Date(b.created_at).toLocaleDateString()
        : undefined,
      sections: [
        {
          title: 'Identificación',
          cols: 2,
          rows: [
            { label: 'ID', value: b?.id ?? '—' },
            { label: 'Estado', value: activa ? 'Activa' : 'Inactiva' }
          ]
        },
        {
          title: 'Ubicación',
          cols: 2,
          rows: [
            { label: 'Localidad', value: b?.localidad?.nombre ?? '—' },
            { label: 'Ciudad', value: ciudad?.nombre ?? '—' },
            { label: 'Provincia', value: ciudad?.provincia ?? '—' }
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
                 ${inactiva ? 'bg-slate-100 saturate-50' : 'bg-white'}`}
      >
        {/* Banda lateral geométrica */}
        <div className="absolute left-0 top-0 h-full w-24 sm:w-28">
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(180deg, ${color} 0%, rgba(0,0,0,0) 100%)`,
              opacity: inactiva ? 0.3 : 0.95
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

        {/* Contenido */}
        <div
          className={`relative z-10 grid grid-cols-1 sm:grid-cols-[auto,1fr] gap-4 p-5 sm:p-6 ${
            inactiva ? 'opacity-70' : 'opacity-100'
          }`}
        >
          {/* Monograma / Ícono */}
          <div className="flex items-start sm:items-center gap-4">
            <div className="relative -ml-2 sm:ml-0 h-14 w-14 shrink-0 rounded-2xl ring-1 ring-slate-200 bg-slate-100 flex items-center justify-center">
              <span className="text-xl font-black text-slate-800">
                {initial}
              </span>
              <FaMapPin className="absolute -right-2 -bottom-2 text-white" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center justify-between gap-2">
                <h3 className="truncate text-lg font-extrabold tracking-tight text-slate-900">
                  {item?.nombre}
                </h3>
                <StatusPill activa={item?.estado === 'activa'} />
              </div>
              <div className="mt-1 text-xs text-slate-400">
                {item?.localidad?.nombre}
                {ciudad?.nombre ? ` • ${ciudad.nombre}` : ''}
                {ciudad?.provincia ? ` (${ciudad.provincia})` : ''} • ID{' '}
                {item?.id}
              </div>
            </div>
          </div>

          {/* Datos + Acciones */}
          <div className="min-w-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Ciudad">{ciudad?.nombre}</Field>
              <Field label="Localidad">{item?.localidad?.nombre}</Field>
            </div>

            <div className="mt-4 grid grid-cols-[repeat(auto-fit,minmax(120px,1fr))] gap-2">
              {/* Ver detalle */}
              <button
                onClick={() => (onView ? onView(item) : setViewOpen(true))}
                className={BTN.view}
                title="Ver detalle"
              >
                <FaEye className="text-sm" />
                <span className="hidden md:inline">Ver</span>
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
                {item?.estado === 'activa' ? (
                  <FaTimesCircle className="text-sm" />
                ) : (
                  <FaCheckCircle className="text-sm" />
                )}
                <span className="hidden md:inline">
                  {item?.estado === 'activa' ? 'Desactivar' : 'Activar'}
                </span>
              </button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Modal interno reutilizable (solo si NO te pasan onView) */}
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
