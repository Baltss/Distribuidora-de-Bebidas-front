// ===========================================
// FILE: src/Components/Vendedores/VendedorBarrioCard.jsx
// ===========================================
import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  FaMapMarkerAlt,
  FaCheckCircle,
  FaTimesCircle,
  FaEye,
  FaTrash,
  FaPowerOff,
  FaRegCalendarMinus
} from 'react-icons/fa';
import DetailViewModal from '../Common/DetailViewModal';

const StatusPill = ({ vigente, estado }) => {
  const active = estado === 'activo';
  return (
    <div className="flex items-center gap-2">
      <span
        className={`inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full border transition-colors
        ${
          vigente
            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
            : 'bg-zinc-100 text-zinc-700 border-zinc-300'
        }`}
      >
        {vigente ? (
          <FaCheckCircle className="opacity-90" />
        ) : (
          <FaTimesCircle className="opacity-90" />
        )}
        <span className="font-medium">{vigente ? 'Vigente' : 'Cerrada'}</span>
      </span>
      <span
        className={`inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full border transition-colors
        ${
          active
            ? 'bg-cyan-50 text-cyan-700 border-cyan-200'
            : 'bg-zinc-100 text-zinc-700 border-zinc-300'
        }`}
      >
        {active ? (
          <FaCheckCircle className="opacity-90" />
        ) : (
          <FaTimesCircle className="opacity-90" />
        )}
        <span className="font-medium">{active ? 'Activa' : 'Inactiva'}</span>
      </span>
    </div>
  );
};

const buttonBase =
  'group relative inline-flex items-center justify-center gap-2 px-3.5 py-2 min-h-[40px] text-[13px] leading-tight whitespace-nowrap font-semibold text-white rounded-xl border border-white/20 bg-gradient-to-br shadow transition-all hover:scale-[1.02] hover:brightness-110 focus:outline-none focus:ring-2';
const BTN = {
  view: `${buttonBase} from-indigo-500/85 to-indigo-600/90 focus:ring-indigo-300`,
  close: `${buttonBase} from-amber-400/80 to-amber-500/90 focus:ring-amber-300`,
  toggle: `${buttonBase} from-cyan-500/85 to-cyan-600/90 focus:ring-cyan-300`,
  del: `${buttonBase} from-rose-500/85 to-rose-700/90 focus:ring-rose-300`
};

export default function VendedorBarrioCard({
  item, // asignación: { id, vendedor{id,nombre}, barrio{id,nombre,localidad{nombre, ciudad{nombre,provincia}}}, asignado_desde, asignado_hasta, estado }
  onView,
  onClose, // handler cerrar asignación
  onToggleEstado, // handler toggle activo/inactivo
  onDelete,
  color = '#06b6d4'
}) {
  const [viewOpen, setViewOpen] = useState(false);

  const vigente = !item?.asignado_hasta;
  const path = useMemo(() => {
    const c = item?.barrio?.localidad?.ciudad?.nombre;
    const p = item?.barrio?.localidad?.ciudad?.provincia;
    const l = item?.barrio?.localidad?.nombre;
    const b = item?.barrio?.nombre;
    return [c && `${c}${p ? ` (${p})` : ''}`, l, b].filter(Boolean).join(' → ');
  }, [item]);

  const buildViewProps = (a) => ({
    title: a?.vendedor?.nombre || 'Vendedor',
    subtitle: a?.id ? `Asignación #${a.id}` : undefined,
    icon: FaMapMarkerAlt,
    leftAccent: color,
    status: {
      label: vigente ? 'Vigente' : 'Cerrada',
      tone: vigente ? 'emerald' : 'zinc',
      icon: vigente ? <FaCheckCircle /> : <FaTimesCircle />
    },
    data: a,
    sections: [
      {
        title: 'Vendedor',
        cols: 2,
        rows: [
          { label: 'Nombre', value: a?.vendedor?.nombre },
          { label: 'Estado asignación', value: a?.estado }
        ]
      },
      {
        title: 'Zona',
        cols: 1,
        rows: [{ label: 'Ubicación', value: path }]
      },
      {
        title: 'Rango',
        cols: 2,
        rows: [
          {
            label: 'Desde',
            value: a?.asignado_desde
              ? new Date(a.asignado_desde).toLocaleString()
              : '—'
          },
          {
            label: 'Hasta',
            value: a?.asignado_hasta
              ? new Date(a.asignado_hasta).toLocaleString()
              : '—'
          }
        ]
      }
    ],
    createdAt: (d) => d?.created_at,
    updatedAt: (d) => d?.updated_at
  });

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 18, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.28 }}
        className={`relative overflow-hidden rounded-3xl border border-slate-200 shadow-sm
                   hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300
                   ${vigente ? 'bg-white' : 'bg-slate-100 saturate-50'}`}
      >
        {/* Banda lateral */}
        <div className="absolute left-0 top-0 h-full w-24 sm:w-28">
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(180deg, ${color} 0%, rgba(0,0,0,0) 100%)`,
              opacity: vigente ? 0.95 : 0.35
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
        <div className="relative z-10 p-5 sm:p-6 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-xs text-slate-400 mb-1">
                Asignación
              </div>
              <h3 className="truncate text-lg font-extrabold tracking-tight text-slate-900">
                {item?.vendedor?.nombre || '—'}
              </h3>
              <div className="mt-1 text-sm text-slate-500 truncate">
                {path || '—'}
              </div>
            </div>
            <StatusPill vigente={vigente} estado={item?.estado} />
          </div>

          {/* Acciones: Ver, Cerrar, Activar/Desactivar, Eliminar */}
          <div className="grid grid-cols-[repeat(auto-fit,minmax(130px,1fr))] gap-2 pt-1">
            <button
              onClick={() => (onView ? onView(item) : setViewOpen(true))}
              className={BTN.view}
              title="Ver detalle"
            >
              <FaEye className="text-sm" />
              <span className="hidden md:inline">Ver</span>
            </button>

            <button
              onClick={() => onClose?.(item)}
              className={BTN.close}
              title="Cerrar asignación"
              disabled={!vigente}
            >
              <FaRegCalendarMinus className="text-sm" />
              <span className="hidden md:inline">Cerrar</span>
            </button>

            <button
              onClick={() => onToggleEstado?.(item)}
              className={BTN.toggle}
              title={item?.estado === 'activo' ? 'Desactivar' : 'Activar'}
            >
              <FaPowerOff className="text-sm" />
              <span className="hidden md:inline">
                {item?.estado === 'activo' ? 'Desactivar' : 'Activar'}
              </span>
            </button>

            <button
              onClick={() => onDelete?.(item)}
              className={BTN.del}
              title="Eliminar"
            >
              <FaTrash className="text-sm" />
              <span className="hidden md:inline">Eliminar</span>
            </button>
          </div>
        </div>
      </motion.div>

      {/* Modal interno (si no pasan onView) */}
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
