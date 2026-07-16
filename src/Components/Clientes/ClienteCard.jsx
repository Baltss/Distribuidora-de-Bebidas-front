// ===============================
// FILE: src/Components/Clientes/ClienteCard.jsx
// ===============================
import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  FaUser,
  FaCheckCircle,
  FaTimesCircle,
  FaEdit,
  FaTrash,
  FaEye,
  FaIdCard,
  FaPhoneAlt,
  FaEnvelope,
  FaMapMarkerAlt,
  FaHome,
  FaStickyNote,
  FaUserTie,
  FaGlobeAmericas
} from 'react-icons/fa';
import DetailViewModal from '../Common/DetailViewModal';

const StatusPill = ({ active }) => (
  <span
    className={`inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full border transition-colors
    ${
      active
        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
        : 'bg-zinc-100 text-zinc-700 border-zinc-300'
    }`}
  >
    {active ? (
      <FaCheckCircle className="opacity-90" />
    ) : (
      <FaTimesCircle className="opacity-90" />
    )}
    <span className="font-medium">{active ? 'Activo' : 'Inactivo'}</span>
  </span>
);

const Field = ({ label, children }) => (
  <div className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-2 text-sm">
    <div className="text-[10px] uppercase tracking-widest text-slate-400">
      {label}
    </div>
    <div className="mt-0.5 truncate text-slate-700">
      {children ?? '—'}
    </div>
  </div>
);

const buttonBase =
  'group relative inline-flex items-center justify-center gap-2 px-3.5 py-2 min-h-[40px] text-[13px] leading-tight whitespace-nowrap font-semibold text-white rounded-xl border border-white/20 bg-gradient-to-br shadow transition-all hover:scale-[1.02] hover:brightness-110 focus:outline-none focus:ring-2';
const BTN = {
  view: `${buttonBase} from-indigo-500/85 to-indigo-600/90 focus:ring-indigo-300`,
  toggle: `${buttonBase} from-cyan-500/85   to-cyan-600/90   focus:ring-cyan-300`,
  edit: `${buttonBase} from-amber-400/80  to-amber-500/90  focus:ring-amber-300`,
  del: `${buttonBase} from-rose-500/85   to-rose-700/90   focus:ring-rose-300`
};

function composeDireccion(item) {
  const p1 = [item?.direccion_calle, item?.direccion_numero]
    .filter(Boolean)
    .join(' ');
  const p2 = item?.direccion_piso_dpto ? ` • ${item.direccion_piso_dpto}` : '';
  return (p1 + p2).trim() || null;
}

function composeZona(item) {
  const barrio = item?.barrio?.nombre;
  const loc = item?.barrio?.localidad?.nombre;
  const ciudad = item?.barrio?.localidad?.ciudad?.nombre;
  return [barrio, loc, ciudad].filter(Boolean).join(' • ') || null;
}

function formatAsignacion(rc) {
  const rep = rc?.reparto;
  const nombre = rep?.nombre || `Reparto #${rc?.reparto_id}`;
  const rangoMin = rep?.rango_min;
  const rangoMax = rep?.rango_max;
  const nro = rc?.numero_rango;

  const rango =
    rangoMin != null && rangoMax != null ? `${rangoMin} – ${rangoMax}` : null;

  if (rango && nro) return `${nombre} • Nº ${nro} (rango ${rango})`;
  if (rango) return `${nombre} • rango ${rango}`;
  if (nro) return `${nombre} • Nº ${nro}`;
  return nombre;
}

function getAsignaciones(item) {
  const arr = item?.asignaciones_repartos || [];
  return Array.isArray(arr) ? arr : [];
}

// Card: SOLO activo. Si no hay, "Sin asignar" (+ historicos opcional)
function composeRepartoCard(item) {
  const asignaciones = getAsignaciones(item);

  const activa = asignaciones.find((a) => String(a?.estado) === 'activo');
  if (activa) return formatAsignacion(activa);

  const historicos = asignaciones.filter((a) => String(a?.estado) !== 'activo');
  if (historicos.length) return `Sin asignar (${historicos.length} históricos)`;

  return 'Sin asignar';
}

// Detalle: activo + (opcional) historial
function composeRepartoDetalle(item) {
  const asignaciones = getAsignaciones(item);

  const activa = asignaciones.find((a) => String(a?.estado) === 'activo');
  const historicos = asignaciones.filter((a) => String(a?.estado) !== 'activo');

  const lineas = [];

  // Asignación actual
  lineas.push(
    activa ? `Actual: ${formatAsignacion(activa)}` : 'Actual: Sin asignar'
  );

  // Historial (si existe)
  if (historicos.length) {
    // si son muchas, podés limitar a 5
    const top = historicos.slice(0, 5).map((h) => `• ${formatAsignacion(h)}`);
    lineas.push(`Historial (${historicos.length}):`);
    lineas.push(...top);
    if (historicos.length > 5) lineas.push('• …');
  }

  return lineas.join('\n');
}

export default function ClienteCard({
  item,
  onEdit,
  onToggleEstado,
  onDelete,
  onView, // opcional; si no viene, se usa modal interno
  color = '#06b6d4', // cyan-500 banda lateral
  compact = false
}) {
  const [viewOpen, setViewOpen] = useState(false);

  const initial = useMemo(
    () => (item?.nombre ? item.nombre[0]?.toUpperCase() : 'C'),
    [item?.nombre]
  );

  const isInactive = (item?.estado || '').toLowerCase() !== 'activo';

  const vendedorPref = item?.vendedor_preferido
    ? item.vendedor_preferido.nombre
    : item?.vendedor_preferido_id
    ? `#${item.vendedor_preferido_id}`
    : null;

  // Props para DetailViewModal (cuando usamos modal interno)
  const buildViewProps = (v) => {
    const activo = (v?.estado || '').toLowerCase() === 'activo';
    return {
      title: v?.nombre || 'Cliente',
      subtitle: v?.id ? `ID ${v.id}` : undefined,
      headerMeta: v?.created_at
        ? new Date(v.created_at).toLocaleDateString()
        : undefined,
      icon: FaUser,
      leftAccent: '#06b6d4',
      status: {
        label: activo ? 'Activo' : 'Inactivo',
        tone: activo ? 'emerald' : 'zinc',
        icon: activo ? <FaCheckCircle /> : <FaTimesCircle />
      },
      data: v,
      sections: [
        {
          title: 'Datos de contacto',
          cols: 2,
          rows: [
            { label: 'Documento', icon: <FaIdCard />, key: 'documento' },
            { label: 'Teléfono', icon: <FaPhoneAlt />, key: 'telefono' },
            { label: 'Email', icon: <FaEnvelope />, key: 'email' },
            { label: 'Estado', value: activo ? 'Activo' : 'Inactivo' }
          ]
        },
        {
          title: 'Domicilio',
          cols: 2,
          rows: [
            {
              label: 'Dirección',
              icon: <FaHome />,
              value: composeDireccion(v)
            },
            { label: 'Referencia', icon: <FaStickyNote />, key: 'referencia' }
          ]
        },
        {
          title: 'Zona',
          cols: 2,
          rows: [
            {
              label: 'Barrio / Localidad / Ciudad',
              icon: <FaMapMarkerAlt />,
              value: composeZona(v)
            }
          ]
        },
        {
          title: 'Reparto y rango',
          cols: 1,
          rows: [
            {
              label: 'Asignaciones de reparto',
              icon: <FaGlobeAmericas />,
              value: composeRepartoDetalle(v) || 'Actual: Sin asignar'
            }
          ]
        },
        {
          title: 'Vendedor preferido (Asignado)',
          cols: 1,
          rows: [
            {
              label: 'Vendedor',
              icon: <FaUserTie />,
              value: v?.vendedor_preferido?.nombre || vendedorPref || '—'
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
                   ${isInactive ? 'bg-slate-100 saturate-50' : 'bg-white'}`}
      >
        {/* Banda lateral cromática */}
        <div className="absolute left-0 top-0 h-full w-24 sm:w-28">
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(180deg, ${color} 0%, rgba(0,0,0,0) 100%)`,
              opacity: isInactive ? 0.28 : 0.95
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
        <div className="relative z-10 grid grid-cols-1 sm:grid-cols-[auto,1fr] gap-4 p-5 sm:p-6">
          {/* Monograma */}
          <div className="flex items-start sm:items-center gap-4">
            <div className="relative -ml-2 sm:ml-0 h-14 w-14 shrink-0 rounded-2xl ring-1 ring-slate-200 bg-slate-100 flex items-center justify-center">
              <span className="text-xl font-black text-slate-800">
                {initial}
              </span>
              <FaUser className="absolute -right-2 -bottom-2 text-white" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center justify-between gap-2">
                <h3 className="truncate text-lg font-extrabold tracking-tight text-slate-900">
                  {item?.nombre || 'Cliente'}
                </h3>
                <StatusPill active={!isInactive} />
              </div>
              <div className="mt-1 text-xs text-slate-400">
                ID {item?.id} • {item?.tipo === 'local' ? 'Local' : 'Reparto'} •{' '}
                {item?.created_at
                  ? new Date(item.created_at).toLocaleDateString()
                  : ''}
              </div>
            </div>
          </div>

          {/* Datos + Acciones */}
          <div className="min-w-0">
            <div
              className={`grid ${
                compact ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2'
              } gap-3`}
            >
              <Field label="Documento">{item?.documento}</Field>
              <Field label="Teléfono">{item?.telefono}</Field>
              <Field label="Email">{item?.email}</Field>
              <Field label="Vendedor preferido">{vendedorPref}</Field>

              <Field label="Barrio / Localidad / Ciudad">
                {composeZona(item)}
              </Field>
              <Field label="Dirección">{composeDireccion(item)}</Field>

              {/* NUEVO: Reparto / rango */}
              <Field label="Reparto / Rango">{composeRepartoCard(item)}</Field>
            </div>

            {/* Orden de acciones: Ver, Des/Activar, Editar, Eliminar */}
            <div className="mt-4 grid grid-cols-[repeat(auto-fit,minmax(120px,1fr))] gap-2">
              <button
                onClick={() => (onView ? onView(item) : setViewOpen(true))}
                className={BTN.view}
                title="Ver detalle"
              >
                <FaEye className="text-sm" />
                <span className="hidden md:inline">Ver</span>
              </button>

              <button
                onClick={() => onToggleEstado?.(item)}
                className={BTN.toggle}
                title={isInactive ? 'Activar' : 'Desactivar'}
              >
                {isInactive ? (
                  <FaCheckCircle className="text-sm" />
                ) : (
                  <FaTimesCircle className="text-sm" />
                )}
                <span className="hidden md:inline">
                  {isInactive ? 'Activar' : 'Desactivar'}
                </span>
              </button>

              <button onClick={() => onEdit?.(item)} className={BTN.edit}>
                <FaEdit className="text-sm" />
                <span className="hidden md:inline">Editar</span>
              </button>

              <button onClick={() => onDelete?.(item)} className={BTN.del}>
                <FaTrash className="text-sm" />
                <span className="hidden md:inline">Eliminar</span>
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
