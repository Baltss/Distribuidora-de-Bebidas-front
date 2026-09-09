// src/Components/Common/DateRangeFilter.jsx
//
// Filtro de rango de fechas reutilizable: un desplegable con presets
// (Hoy, Ayer, 7/14/30 días, Personalizado) + los date-pickers cuando
// se elige Personalizado. El componente es controlado: el padre es
// dueño de `desde`/`hasta` (YYYY-MM-DD), este solo calcula el rango
// cuando cambia el preset y avisa por onChange.
import React, { useMemo, useState } from 'react';

const pad = (n) => String(n).padStart(2, '0');
const toISODate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const PRESETS = [
  { value: 'hoy', label: 'Hoy' },
  { value: 'ayer', label: 'Ayer' },
  { value: '7d', label: 'Últimos 7 días' },
  { value: '14d', label: 'Últimos 14 días' },
  { value: '30d', label: 'Últimos 30 días' },
  { value: 'personalizado', label: 'Personalizado' }
];

export const DEFAULT_PRESET = '30d';

/** Calcula { desde, hasta } (YYYY-MM-DD) para un preset dado. */
export function getRangoPreset(preset) {
  const hoy = new Date();
  const desdeFecha = new Date(hoy);

  if (preset === 'ayer') {
    desdeFecha.setDate(desdeFecha.getDate() - 1);
    return { desde: toISODate(desdeFecha), hasta: toISODate(desdeFecha) };
  }
  if (preset === '7d') desdeFecha.setDate(desdeFecha.getDate() - 6);
  else if (preset === '14d') desdeFecha.setDate(desdeFecha.getDate() - 13);
  else if (preset === '30d') desdeFecha.setDate(desdeFecha.getDate() - 29);
  // 'hoy' (u otro valor no reconocido): desde queda en hoy mismo.

  return { desde: toISODate(desdeFecha), hasta: toISODate(hoy) };
}

const selectCls =
  'w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-orange-400/60 focus:border-transparent';

export default function DateRangeFilter({ desde, hasta, onChange, className = '' }) {
  // Si el desde/hasta que vino del padre coincide con algún preset
  // conocido, arrancamos con ese preset seleccionado; si no, con
  // "Personalizado" (respeta lo que el padre ya tenía cargado).
  const detectedPreset = useMemo(() => {
    const match = PRESETS.find((p) => {
      if (p.value === 'personalizado') return false;
      const r = getRangoPreset(p.value);
      return r.desde === desde && r.hasta === hasta;
    });
    return match?.value || 'personalizado';
    // Sólo nos interesa calcular esto una vez, al montar — después el
    // usuario maneja el preset con el select.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [preset, setPreset] = useState(detectedPreset);

  const handlePresetChange = (value) => {
    setPreset(value);
    if (value !== 'personalizado') {
      onChange(getRangoPreset(value));
    }
  };

  return (
    <div className={`flex flex-col sm:flex-row gap-2 ${className}`}>
      <div className="w-full sm:w-48">
        <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide">
          Fecha
        </label>
        <select value={preset} onChange={(e) => handlePresetChange(e.target.value)} className={selectCls}>
          {PRESETS.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
      </div>

      {preset === 'personalizado' && (
        <>
          <div className="flex-1">
            <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide">
              Desde
            </label>
            <input
              type="date"
              value={desde || ''}
              max={hasta || undefined}
              onChange={(e) => onChange({ desde: e.target.value, hasta })}
              className={selectCls}
            />
          </div>
          <div className="flex-1">
            <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide">
              Hasta
            </label>
            <input
              type="date"
              value={hasta || ''}
              min={desde || undefined}
              onChange={(e) => onChange({ desde, hasta: e.target.value })}
              className={selectCls}
            />
          </div>
        </>
      )}
    </div>
  );
}
