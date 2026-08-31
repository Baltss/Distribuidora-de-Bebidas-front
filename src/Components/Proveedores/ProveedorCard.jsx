// src/Components/Proveedores/ProveedorCard.jsx
import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  FaTruck,
  FaCheckCircle,
  FaTimesCircle,
  FaEye,
  FaEdit,
  FaTrash,
  FaIdCard,
  FaPhone,
  FaEnvelope,
  FaMapMarkerAlt,
  FaFileInvoiceDollar
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
    <div className="text-[10px] uppercase tracking-widest text-slate-600">
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
  cuenta: `${buttonBase} from-emerald-500/85 to-emerald-600/90 focus:ring-emerald-300`,
  edit: `${buttonBase} from-amber-400/80 to-amber-500/90 focus:ring-amber-300`,
  toggle: `${buttonBase} from-cyan-500/85 to-cyan-600/90 focus:ring-cyan-300`,
  del: `${buttonBase} from-rose-500/85 to-rose-700/90 focus:ring-rose-300`
};

export default function ProveedorCard({
  item,
  onEdit,
  onToggleActivo,
  onDelete,
  onVerCuenta,
  color = '#10b981', // emerald-500
  compact = false
}) {
  const [viewOpen, setViewOpen] = useState(false);

  const initial = useMemo(
    () => (item?.razon_social ? item.razon_social[0]?.toUpperCase() : 'P'),
    [item?.razon_social]
  );

  const isInactive = (item?.estado || '').toLowerCase() !== 'activo';

  const buildViewProps = (p) => {
    const activo = (p?.estado || '').toLowerCase() === 'activo';
    return {
      title: p?.razon_social || 'Proveedor',
      subtitle: p?.id ? `ID ${p.id}` : undefined,
      icon: FaTruck,
      leftAccent: color,
      status: {
        label: activo ? 'Activo' : 'Inactivo',
        tone: activo ? 'emerald' : 'zinc',
        icon: activo ? <FaCheckCircle /> : <FaTimesCircle />
      },
      data: p,
      headerMeta: p?.created_at
        ? new Date(p.created_at).toLocaleDateString()
        : undefined,
      sections: [
        {
          title: 'Identificación',
          cols: 2,
          rows: [
            { label: 'CUIT', icon: <FaIdCard />, key: 'cuit' },
            { label: 'Estado', value: activo ? 'Activo' : 'Inactivo' }
          ]
        },
        {
          title: 'Contacto',
          cols: 2,
          rows: [
            { label: 'Teléfono', icon: <FaPhone />, key: 'telefono' },
            { label: 'Email', icon: <FaEnvelope />, key: 'email' },
            { label: 'Dirección', icon: <FaMapMarkerAlt />, key: 'direccion' }
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

        <div
          className={`relative z-10 grid grid-cols-1 sm:grid-cols-[auto,1fr] gap-4 p-5 sm:p-6 ${
            isInactive ? 'opacity-70' : 'opacity-100'
          }`}
        >
          <div className="flex items-start sm:items-center gap-4">
            <div className="relative -ml-2 sm:ml-0 h-14 w-14 shrink-0 rounded-2xl ring-1 ring-slate-200 bg-slate-100 flex items-center justify-center">
              <span className="text-xl font-black text-slate-800">
                {initial}
              </span>
              <FaTruck className="absolute -right-2 -bottom-2 text-white" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center justify-between gap-2">
                <h3 className="truncate text-lg font-extrabold tracking-tight text-slate-900">
                  {item?.razon_social || 'Proveedor'}
                </h3>
                <StatusPill active={!isInactive} />
              </div>
              <div className="mt-1 text-xs text-slate-600">
                ID {item?.id}
              </div>
            </div>
          </div>

          <div className="min-w-0">
            <div
              className={`grid ${
                compact ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2'
              } gap-3`}
            >
              <Field label="CUIT">
                <span className="inline-flex items-center gap-1">
                  <FaIdCard className="opacity-70" />
                  {item?.cuit || '—'}
                </span>
              </Field>
              <Field label="Teléfono">
                <span className="inline-flex items-center gap-1">
                  <FaPhone className="opacity-70" />
                  {item?.telefono || '—'}
                </span>
              </Field>
              <Field label="Email">
                <span className="inline-flex items-center gap-1">
                  <FaEnvelope className="opacity-70" />
                  {item?.email || '—'}
                </span>
              </Field>
              <Field label="Dirección">
                <span className="inline-flex items-center gap-1">
                  <FaMapMarkerAlt className="opacity-70" />
                  {item?.direccion || '—'}
                </span>
              </Field>
            </div>

            <div className="mt-4 grid grid-cols-[repeat(auto-fit,minmax(120px,1fr))] gap-2">
              <button
                onClick={() => setViewOpen(true)}
                className={BTN.view}
                title="Ver detalle"
              >
                <FaEye className="text-sm" />
                <span className="hidden md:inline">Ver</span>
              </button>

              {onVerCuenta && (
                <button
                  onClick={() => onVerCuenta(item)}
                  className={BTN.cuenta}
                  title="Ver cuenta corriente"
                >
                  <FaFileInvoiceDollar className="text-sm" />
                  <span className="hidden md:inline">Cuenta cte.</span>
                </button>
              )}

              <button
                onClick={() => onToggleActivo?.(item)}
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

      <DetailViewModal
        open={viewOpen}
        onClose={() => setViewOpen(false)}
        {...buildViewProps(item)}
      />
    </>
  );
}
