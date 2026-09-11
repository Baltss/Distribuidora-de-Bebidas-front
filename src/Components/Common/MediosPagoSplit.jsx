// src/Components/Common/MediosPagoSplit.jsx
// Repeatable "medios_pago" split rows: usado en Ventas, Cobranzas, Compras y
// Pagos a proveedores para permitir dividir un pago en varios medios
// (ej: parte efectivo + parte tarjeta) en lugar de un único medio_pago.
import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { MEDIOS_PAGO } from '../../utils/mediosPago';
import { blockWheelChange } from '../../utils/numberInput';
import { makeSplitRow, sumSplitRows, splitMatchesTotal } from '../../utils/mediosPagoSplit';

const defaultFormatMoney = (n) =>
  Number(n || 0).toLocaleString('es-AR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

export default function MediosPagoSplit({
  rows,
  onChange,
  total,
  formatMoney = defaultFormatMoney,
  disabled = false
}) {
  const addRow = () => onChange([...(rows || []), makeSplitRow()]);

  const removeRow = (idx) =>
    onChange((rows || []).length <= 1 ? rows : rows.filter((_, i) => i !== idx));

  const updateRow = (idx, field, value) =>
    onChange(
      (rows || []).map((r, i) => (i === idx ? { ...r, [field]: value } : r))
    );

  const sum = sumSplitRows(rows);
  const diff = Math.round((sum - Number(total || 0)) * 100) / 100;
  const matches = splitMatchesTotal(rows, total);

  return (
    <div className="space-y-2">
      <div className="space-y-2">
        {(rows || []).map((row, idx) => (
          <div
            key={row._key}
            className="flex flex-col sm:flex-row gap-2 sm:items-center bg-slate-50 rounded-xl border border-slate-200 p-2.5"
          >
            <select
              value={row.medio_pago}
              disabled={disabled}
              onChange={(e) => updateRow(idx, 'medio_pago', e.target.value)}
              className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-800 text-sm
                         focus:outline-none focus:ring-2 focus:ring-slate-400/40 focus:border-transparent
                         disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <option value="">Medio de pago…</option>
              {MEDIOS_PAGO.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
            <input
              type="number"
              onWheel={blockWheelChange}
              min="0"
              step="0.01"
              value={row.monto}
              disabled={disabled}
              onChange={(e) => updateRow(idx, 'monto', e.target.value)}
              placeholder="Monto"
              className="w-full sm:w-32 rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-800 text-sm
                         placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-slate-400/40 focus:border-transparent
                         disabled:opacity-60 disabled:cursor-not-allowed"
            />
            <button
              type="button"
              onClick={() => removeRow(idx)}
              disabled={disabled || (rows || []).length <= 1}
              className="self-end sm:self-auto inline-flex items-center justify-center rounded-full p-2
                         border border-rose-300 text-rose-500 hover:bg-rose-50
                         disabled:opacity-40 disabled:cursor-not-allowed transition shrink-0"
              title="Quitar medio de pago"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={addRow}
        disabled={disabled}
        className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-slate-200
                   text-slate-600 hover:bg-slate-50 transition disabled:opacity-60 disabled:cursor-not-allowed"
      >
        <Plus className="h-3.5 w-3.5" /> Agregar medio de pago
      </button>

      <p
        className={`text-xs font-medium ${
          matches ? 'text-emerald-600' : 'text-rose-600'
        }`}
      >
        Suma: {formatMoney(sum)} / Total: {formatMoney(total)}
        {!matches &&
          ` — la suma debe coincidir con el total (diferencia: ${formatMoney(
            Math.abs(diff)
          )})`}
      </p>
    </div>
  );
}
