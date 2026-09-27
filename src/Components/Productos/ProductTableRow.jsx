// src/Components/Productos/ProductTableRow.jsx
//
// Fila de tabla para el listado de Productos (rediseño claro). Mismas
// acciones que la tarjeta anterior (ProductCard): ver detalle, stock,
// activar/desactivar, editar, eliminar — solo cambia el contenedor
// visual (fila en vez de card).
import React, { useMemo, useState } from 'react';
import {
  Eye,
  Warehouse,
  Power,
  Pencil,
  Trash2,
  AlertTriangle,
  Boxes
} from 'lucide-react';
import DetailViewModal from '../Common/DetailViewModal';
import moneyAR from '../../utils/money';
import { useAuth } from '../../AuthContext';

const AVATAR_COLORS = [
  'bg-blue-500', 'bg-teal-500', 'bg-violet-500', 'bg-amber-500',
  'bg-rose-500', 'bg-emerald-500', 'bg-cyan-500', 'bg-fuchsia-500'
];

const colorFor = (seed) => {
  const s = String(seed || '');
  let hash = 0;
  for (let i = 0; i < s.length; i++) hash = (hash * 31 + s.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
};

export default function ProductTableRow({
  item,
  onEdit,
  onToggleActivo,
  onDelete,
  onVerStock,
  stock
}) {
  const { userLevel } = useAuth();
  const esVendedor = String(userLevel || '').toLowerCase() === 'vendedor';
  const [viewOpen, setViewOpen] = useState(false);

  const initial = item?.nombre ? item.nombre[0]?.toUpperCase() : 'P';
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

  const buildViewProps = (p) => {
    const activo = (p?.estado || '').toLowerCase() === 'activo';
    return {
      title: p?.nombre || 'Producto',
      subtitle: p?.id ? `ID ${p.id}` : undefined,
      icon: Boxes,
      leftAccent: '#2563eb',
      status: { label: activo ? 'Activo' : 'Inactivo', tone: activo ? 'emerald' : 'zinc' },
      data: p,
      headerMeta: p?.created_at ? new Date(p.created_at).toLocaleDateString() : undefined,
      sections: [
        {
          title: 'Identificación',
          cols: 2,
          rows: [
            { label: 'SKU', key: 'codigo_sku' },
            { label: 'Categoría', value: p?.categoria?.nombre || 'Sin categoría' },
            { label: 'EAN', key: 'barra_ean13' },
            { label: 'Estado', value: activo ? 'Activo' : 'Inactivo' }
          ]
        },
        {
          title: 'Características',
          cols: 2,
          rows: [
            { label: 'Presentación', value: presentacionLabel },
            { label: 'UM / Contenido', value: umContenido },
            { label: 'Precio del producto', value: moneyAR(p?.pre_prod) },
            {
              label: 'Último costo de compra',
              value: p?.ultimo_costo_compra != null ? moneyAR(p.ultimo_costo_compra) : '—'
            },
            {
              label: 'IVA',
              value:
                p?.iva_condicion === 'exento'
                  ? 'Exento'
                  : p?.iva_condicion === 'no_gravado'
                    ? 'No gravado'
                    : p?.iva_porcentaje != null
                      ? `${Number(p.iva_porcentaje).toLocaleString('es-AR')}%`
                      : '—'
            },
            { label: 'Margen (%)', value: p?.margen_pct != null ? `${p.margen_pct}%` : 'Manual' }
          ]
        }
      ],
      createdAt: (d) => d?.created_at,
      updatedAt: (d) => d?.updated_at
    };
  };

  return (
    <>
      <tr className={`border-t border-slate-200 hover:bg-slate-50/80 transition ${isInactive ? 'opacity-60' : ''}`}>
        <td className="px-4 py-3 text-sm text-slate-500">{item?.id}</td>
        <td className="px-4 py-3">
          <span className={`inline-flex h-9 w-9 items-center justify-center rounded-lg text-sm font-bold text-white ${colorFor(item?.nombre)}`}>
            {initial}
          </span>
        </td>
        <td className="px-4 py-3">
          <p className="text-sm font-medium text-slate-800">{item?.nombre || 'Producto'}</p>
        </td>
        <td className="px-4 py-3 text-sm text-slate-500">
          <div className="flex items-center gap-1.5">
            <span>{item?.codigo_sku}</span>
            {!item?.barra_ean13 && !isInactive && (
              <span
                title="Sin código de barras — no se va a poder cargar por escaneo en Venta en el local"
                className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700 whitespace-nowrap"
              >
                <AlertTriangle className="h-3 w-3" />
                Sin código
              </span>
            )}
          </div>
        </td>
        <td className="px-4 py-3">
          <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-medium text-blue-700">
            {item?.categoria?.nombre || 'Sin categoría'}
          </span>
        </td>
        <td className="px-4 py-3 text-sm text-slate-600 whitespace-nowrap">{presentacionLabel}</td>
        <td className="px-4 py-3 text-sm text-slate-600 whitespace-nowrap">{umContenido}</td>
        <td className="px-4 py-3 text-sm font-semibold text-slate-800 whitespace-nowrap">
          {item?.pre_prod != null ? moneyAR(item.pre_prod) : '—'}
        </td>
        <td className="px-4 py-3 text-sm whitespace-nowrap">
          {stock ? (
            <span
              className={`inline-flex items-center gap-1 ${
                stock.stock_bajo ? 'text-rose-600 font-semibold' : 'text-slate-600'
              }`}
            >
              {stock.stock_bajo && <AlertTriangle className="h-3.5 w-3.5" />}
              {stock.stock_actual ?? '—'}
              {stock.stock_minimo != null ? ` / mín. ${stock.stock_minimo}` : ''}
            </span>
          ) : (
            <span className="text-slate-600">—</span>
          )}
        </td>
        <td className="px-4 py-3">
          <span
            className={`inline-flex items-center gap-1.5 text-[11px] font-medium ${
              isInactive ? 'text-slate-500' : 'text-emerald-600'
            }`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${isInactive ? 'bg-slate-400' : 'bg-emerald-500'}`} />
            {isInactive ? 'Inactivo' : 'Activo'}
          </span>
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center justify-end gap-1">
            <button
              onClick={() => setViewOpen(true)}
              title="Ver detalle"
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-700 transition"
            >
              <Eye className="h-4 w-4" />
            </button>
            {onVerStock && (
              <button
                onClick={() => onVerStock(item)}
                title="Ver stock y movimientos"
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 hover:text-teal-700 transition"
              >
                <Warehouse className="h-4 w-4" />
              </button>
            )}
            {!esVendedor && (
              <>
                <button
                  onClick={() => onToggleActivo?.(item)}
                  title={isInactive ? 'Activar' : 'Desactivar'}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 hover:text-cyan-700 transition"
                >
                  <Power className="h-4 w-4" />
                </button>
                <button
                  onClick={() => onEdit?.(item)}
                  title="Editar"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 hover:bg-blue-50 hover:text-blue-600 transition"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  onClick={() => onDelete?.(item)}
                  title="Eliminar"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 hover:bg-rose-50 hover:text-rose-600 transition"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </>
            )}
          </div>
        </td>
      </tr>

      <DetailViewModal open={viewOpen} onClose={() => setViewOpen(false)} {...buildViewProps(item)} />
    </>
  );
}
