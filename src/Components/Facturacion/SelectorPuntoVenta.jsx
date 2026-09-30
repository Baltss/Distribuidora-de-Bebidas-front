// src/Components/Facturacion/SelectorPuntoVenta.jsx
// Elegir con qué CUIT (punto de venta) se factura. Si el negocio tiene un solo
// punto de venta disponible no hay nada que elegir y no muestra nada.
import React from 'react';
import { opcionesPuntoVenta, etiquetaPuntoVenta } from '../../utils/emisores';

export default function SelectorPuntoVenta({ estadoEmision, value, onChange, className = '', label = 'Facturar con' }) {
  const opciones = opcionesPuntoVenta(estadoEmision);
  if (opciones.length < 2) return null;

  return (
    <label className={`flex flex-wrap items-center gap-2 text-sm text-slate-600 ${className}`}>
      <span className="font-medium">{label}</span>
      <select
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-400/40"
      >
        {opciones.map((o) => (
          <option key={o.id} value={o.id}>
            {etiquetaPuntoVenta(o)}
          </option>
        ))}
      </select>
    </label>
  );
}
