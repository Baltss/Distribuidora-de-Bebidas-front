// src/Components/Facturacion/SelectorMes.jsx
// Elegir un mes ('AAAA-MM') con flechas; no deja pasar del mes en curso.
import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { mesAR, moverMes } from '../../utils/periodo';

export default function SelectorMes({ periodo, onChange }) {
  return (
    <div className="inline-flex items-center rounded-xl border border-slate-200 bg-white shadow-sm">
      <button onClick={() => onChange(moverMes(periodo, -1))} className="px-3 py-2 text-slate-500 hover:text-slate-800" aria-label="Mes anterior">
        <ChevronLeft className="h-4 w-4" />
      </button>
      <input
        type="month"
        value={periodo}
        max={mesAR(0)}
        onChange={(e) => e.target.value && onChange(e.target.value)}
        className="border-x border-slate-200 px-3 py-2 text-sm text-slate-700 focus:outline-none"
        aria-label="Período"
      />
      <button
        onClick={() => onChange(moverMes(periodo, 1))}
        disabled={periodo === mesAR(0)}
        className="px-3 py-2 text-slate-500 hover:text-slate-800 disabled:opacity-30"
        aria-label="Mes siguiente"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}
