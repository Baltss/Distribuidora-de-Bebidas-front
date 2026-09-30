// src/Components/Facturacion/OpcionesComprobante.jsx
// Opciones especiales de la factura que se va a emitir: servicios (con el período
// prestado y el vencimiento del pago) y Factura de Crédito Electrónica MiPyME.
// Controlado: `value` es { concepto, desde, hasta, vencimiento, fce, sistema }.
import React, { useState } from 'react';
import { ChevronDown, SlidersHorizontal } from 'lucide-react';

const inputCls =
  'w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-400/40';
const labelCls = 'block text-xs font-medium text-slate-600 mb-1';

export const OPCIONES_VACIAS = { concepto: '1', desde: '', hasta: '', vencimiento: '', fce: false, sistema: 'SCA' };

/** ¿Se cambió algo respecto de una factura común? */
export const hayOpciones = (o) => o.concepto !== '1' || o.fce;

/** Cuerpo para el backend (null si es una factura común). */
export function opcionesParaEnviar(o) {
  if (!hayOpciones(o)) return null;
  return {
    concepto: Number(o.concepto),
    fecha_serv_desde: o.concepto !== '1' ? o.desde : undefined,
    fecha_serv_hasta: o.concepto !== '1' ? o.hasta : undefined,
    fecha_vto_pago: o.concepto !== '1' || o.fce ? o.vencimiento : undefined,
    fce: o.fce ? { sistema: o.sistema } : undefined
  };
}

export default function OpcionesComprobante({ value, onChange, disabled = false }) {
  const [abierto, setAbierto] = useState(false);
  const set = (k) => (e) => onChange({ ...value, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });
  const conServicios = value.concepto !== '1';

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/60">
      <button
        type="button"
        onClick={() => setAbierto((a) => !a)}
        className="flex w-full items-center justify-between gap-2 px-3.5 py-2 text-left text-sm font-medium text-slate-700"
      >
        <span className="inline-flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 text-teal-600" />
          Opciones del comprobante
          {hayOpciones(value) && <span className="rounded-full bg-teal-100 px-2 py-0.5 text-[11px] font-bold text-teal-700">{value.fce ? 'Factura de Crédito' : 'Servicios'}</span>}
        </span>
        <ChevronDown className={`h-4 w-4 text-slate-400 transition ${abierto ? 'rotate-180' : ''}`} />
      </button>
      {abierto && (
        <div className="space-y-3 border-t border-slate-200 px-3.5 py-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className={labelCls}>Concepto</label>
              <select value={value.concepto} onChange={set('concepto')} disabled={disabled} className={inputCls}>
                <option value="1">Productos</option>
                <option value="2">Servicios</option>
                <option value="3">Productos y servicios</option>
              </select>
            </div>
            {conServicios && (
              <>
                <div>
                  <label className={labelCls}>Servicio desde</label>
                  <input type="date" value={value.desde} onChange={set('desde')} disabled={disabled} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Servicio hasta</label>
                  <input type="date" value={value.hasta} onChange={set('hasta')} disabled={disabled} className={inputCls} />
                </div>
              </>
            )}
            {(conServicios || value.fce) && (
              <div>
                <label className={labelCls}>Vencimiento del pago</label>
                <input type="date" value={value.vencimiento} onChange={set('vencimiento')} disabled={disabled} className={inputCls} />
              </div>
            )}
          </div>
          <label className="flex items-start gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={value.fce} onChange={set('fce')} disabled={disabled} className="mt-0.5 rounded border-slate-300 text-teal-600 focus:ring-teal-400" />
            <span>
              Factura de Crédito Electrónica MiPyME
              <span className="block text-xs text-slate-500">Sólo para empresas con CUIT. Usa el CBU cargado en Datos Fiscales.</span>
            </span>
          </label>
          {value.fce && (
            <div className="max-w-xs">
              <label className={labelCls}>Cómo se cobra</label>
              <select value={value.sistema} onChange={set('sistema')} disabled={disabled} className={inputCls}>
                <option value="SCA">Sistema de Circulación Abierta</option>
                <option value="ADC">Agente de Depósito Colectivo</option>
              </select>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
