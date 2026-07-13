// src/Components/Productos/ProductCard.jsx
import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  FaBoxOpen,
  FaCheckCircle,
  FaTimesCircle,
  FaEye,
  FaEdit,
  FaTrash,
  FaBarcode,
  FaCubes,
  FaPercent,
  FaRuler,
  FaTags,
  FaMoneyBill,
  FaWarehouse,
  FaExclamationTriangle,
  FaLayerGroup
} from 'react-icons/fa';
import DetailViewModal from '../Common/DetailViewModal';
import moneyAR from '../../utils/money';
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
  <div className="rounded-lg bg-zinc-50/70 dark:bg-zinc-900/40 border border-zinc-200/60 dark:border-white/10 px-3 py-2 text-sm">
    <div className="text-[10px] uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
      {label}
    </div>
    <div className="mt-0.5 truncate text-zinc-800 dark:text-zinc-100">
      {children ?? '—'}
    </div>
  </div>
);

const buttonBase =
  'group relative inline-flex items-center justify-center gap-2 px-3.5 py-2 min-h-[40px] text-[13px] leading-tight whitespace-nowrap font-semibold text-white rounded-xl border border-white/20 bg-gradient-to-br shadow transition-all hover:scale-[1.02] hover:brightness-110 focus:outline-none focus:ring-2';
const BTN = {
  view: `${buttonBase} from-indigo-500/85 to-indigo-600/90 focus:ring-indigo-300`,
  stock: `${buttonBase} from-teal-500/85 to-teal-600/90 focus:ring-teal-300`,
  edit: `${buttonBase} from-amber-400/80 to-amber-500/90 focus:ring-amber-300`,
  toggle: `${buttonBase} from-cyan-500/85 to-cyan-600/90 focus:ring-cyan-300`,
  del: `${buttonBase} from-rose-500/85 to-rose-700/90 focus:ring-rose-300`
};

export default function ProductCard({
  item,
  onEdit,
  onToggleActivo,
  onDelete,
  onView, // ← opcional: si viene, usa el handler externo
  onVerStock, // ← opcional: si viene, muestra botón "Stock"
  stock, // ← opcional: { stock_actual, stock_minimo, stock_bajo }
  color = '#06b6d4', // cyan-500
  compact = false
}) {
  const [viewOpen, setViewOpen] = useState(false);

  const initial = useMemo(
    () => (item?.nombre ? item.nombre[0]?.toUpperCase() : 'P'),
    [item?.nombre]
  );

  const isInactive = (item?.estado || '').toLowerCase() !== 'activo';

  const presentacionLabel = useMemo(() => {
    const pres = (item?.presentacion || '').toLowerCase();
    if (pres === 'pack') return `Pack x${item?.pack_cantidad ?? '—'}`;
    return 'Unidad';
  }, [item?.presentacion, item?.pack_cantidad]);

  const umContenido = useMemo(() => {
    const um = item?.unidad_medida || 'u';
    const cont = item?.contenido;
    if (cont === null || cont === undefined || cont === '') return um;
    return `${cont} ${um}`;
  }, [item?.unidad_medida, item?.contenido]);

  // Props para el DetailViewModal estándar
  const buildViewProps = (p) => {
    const activo = (p?.estado || '').toLowerCase() === 'activo';
    return {
      title: p?.nombre || 'Producto',
      subtitle: p?.id ? `ID ${p.id}` : undefined,
      icon: FaBoxOpen,
      leftAccent: '#06b6d4',
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
            { label: 'SKU', icon: <FaTags />, key: 'codigo_sku' },
            {
              label: 'Categoría',
              icon: <FaLayerGroup />,
              value: p?.categoria?.nombre || 'Sin categoría'
            },
            { label: 'EAN', icon: <FaBarcode />, key: 'barra_ean13' },
            { label: 'Estado', value: activo ? 'Activo' : 'Inactivo' }
          ]
        },
        {
          title: 'Características',
          cols: 2,
          rows: [
            {
              label: 'Presentación',
              value: presentacionLabel,
              icon: <FaCubes />
            },
            { label: 'UM / Contenido', value: umContenido, icon: <FaRuler /> },
            {
              label: 'PRECIO DEL PRODUCTO',
              value: moneyAR(p?.pre_prod),
              icon: <FaMoneyBill />
            },
            {
              label: 'ÚLTIMO COSTO DE COMPRA',
              value:
                p?.ultimo_costo_compra != null
                  ? moneyAR(p.ultimo_costo_compra)
                  : '—',
              icon: <FaMoneyBill />
            },
            {
              label: 'IVA (%)',
              value: p?.iva_porcentaje ?? '—',
              icon: <FaPercent />
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
        className={`relative overflow-hidden rounded-3xl border border-white/20 shadow-lg backdrop-blur-xl dark:border-white/10
                 hover:shadow-cyan-600/50 hover:scale-[1.02] transition-all duration-300
                 ${
                   isInactive
                     ? 'bg-zinc-200/50 dark:bg-zinc-800/60 saturate-50'
                     : 'bg-white/80 dark:bg-zinc-900/70'
                 }`}
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
        <div
          className={`relative z-10 grid grid-cols-1 sm:grid-cols-[auto,1fr] gap-4 p-5 sm:p-6 ${
            isInactive ? 'opacity-70' : 'opacity-100'
          }`}
        >
          {/* Monograma / Ícono */}
          <div className="flex items-start sm:items-center gap-4">
            <div className="relative -ml-2 sm:ml-0 h-14 w-14 shrink-0 rounded-2xl ring-1 ring-white/30 bg-white/90 dark:bg-zinc-800/80 flex items-center justify-center">
              <span className="text-xl font-black text-zinc-900 dark:text-white">
                {initial}
              </span>
              <FaBoxOpen className="absolute -right-2 -bottom-2 text-white" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center justify-between gap-2">
                <h3 className="truncate text-lg font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">
                  {item?.nombre || 'Producto'}
                </h3>
                <StatusPill active={!isInactive} />
              </div>
              <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                ID {item?.id} •{' '}
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
              <Field label="SKU">
                <span className="inline-flex items-center gap-1">
                  <FaTags className="opacity-70" />
                  {item?.codigo_sku}
                </span>
              </Field>
              <Field label="Categoría">
                <span className="inline-flex items-center gap-1">
                  <FaLayerGroup className="opacity-70" />
                  {item?.categoria?.nombre || 'Sin categoría'}
                </span>
              </Field>
              <Field label="Presentación">
                <span className="inline-flex items-center gap-1">
                  <FaCubes className="opacity-70" />
                  {presentacionLabel}
                </span>
              </Field>
              <Field label="UM / Contenido">
                <span className="inline-flex items-center gap-1">
                  <FaRuler className="opacity-70" />
                  {umContenido}
                </span>
              </Field>
              <Field label="PRECIO PRODUCTO">
                <span className="inline-flex items-center gap-1">
                  <FaMoneyBill className="opacity-70" />
                  {item?.pre_prod != null ? moneyAR(item?.pre_prod) : '—'}
                </span>
              </Field>
              <Field label="IVA (%)">
                <span className="inline-flex items-center gap-1">
                  <FaPercent className="opacity-70" />
                  {item?.iva_porcentaje ?? '—'}
                </span>
              </Field>
              <Field label="EAN">
                <span className="inline-flex items-center gap-1">
                  <FaBarcode className="opacity-70" />
                  {item?.barra_ean13 || '—'}
                </span>
              </Field>
              {stock && (
                <Field label="Stock">
                  <span
                    className={`inline-flex items-center gap-1 ${
                      stock.stock_bajo ? 'text-rose-600 dark:text-rose-300 font-semibold' : ''
                    }`}
                  >
                    {stock.stock_bajo ? (
                      <FaExclamationTriangle className="opacity-80" />
                    ) : (
                      <FaWarehouse className="opacity-70" />
                    )}
                    {stock.stock_actual ?? '—'}
                    {stock.stock_minimo != null ? ` / mín. ${stock.stock_minimo}` : ''}
                  </span>
                </Field>
              )}
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

              {onVerStock && (
                <button
                  onClick={() => onVerStock(item)}
                  className={BTN.stock}
                  title="Ver stock y movimientos"
                >
                  <FaWarehouse className="text-sm" />
                  <span className="hidden md:inline">Stock</span>
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
