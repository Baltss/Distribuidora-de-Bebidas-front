// src/Components/Facturacion/RetencionesEditor.jsx
// Filas de retenciones (impuesto, jurisdicción, importe…) para cargar al cobrar a
// un cliente (sufridas) o al pagar a un proveedor (practicadas).
import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import useCatalogoFiscal from '../../hooks/useCatalogoFiscal';
import useEstadoEmision from '../../hooks/useEstadoEmision';
import { nombreEmisor } from '../../utils/emisores';
import { retencionVacia } from '../../utils/retenciones';

const campoCls =
  'w-full rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-400/40 disabled:opacity-60';

export default function RetencionesEditor({ value, onChange, tipo = 'sufridas', disabled = false }) {
  const catalogo = useCatalogoFiscal();
  const estado = useEstadoEmision();
  const emisores = estado?.emisores || [];
  const sufridas = tipo === 'sufridas';

  const cambiar = (i, k, v) => onChange(value.map((f, n) => (n === i ? { ...f, [k]: v } : f)));
  const agregar = () => onChange([...value, { ...retencionVacia(), emisor_id: emisores.length === 1 ? String(emisores[0].id) : '' }]);

  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-[11px] sm:text-xs font-medium text-slate-600">
            {sufridas ? 'Retenciones que te practicó el cliente' : 'Retenciones que le practicás al proveedor'}
          </p>
          <p className="text-[11px] text-slate-500">
            {sufridas
              ? 'Cancelan deuda del cliente pero no entran a la caja: se descuentan de lo que cobrás.'
              : 'Cancelan deuda con el proveedor pero no salen de la caja. Cada una genera un certificado.'}
          </p>
        </div>
        <button
          type="button"
          onClick={agregar}
          disabled={disabled}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-700 hover:text-teal-800 disabled:opacity-50 shrink-0"
        >
          <Plus className="h-3.5 w-3.5" /> Agregar
        </button>
      </div>

      {value.map((f, i) => {
        const impuesto = catalogo?.impuestos_retencion?.find((x) => x.id === f.impuesto);
        return (
          <div key={i} className="mt-2 grid grid-cols-12 gap-2 items-center">
            {emisores.length > 1 && (
              <select
                value={f.emisor_id}
                onChange={(e) => cambiar(i, 'emisor_id', e.target.value)}
                disabled={disabled}
                className={`${campoCls} col-span-12 sm:col-span-3`}
                aria-label="CUIT propio"
              >
                <option value="">CUIT…</option>
                {emisores.map((e) => (
                  <option key={e.id} value={e.id}>
                    {nombreEmisor(e)}
                  </option>
                ))}
              </select>
            )}
            <select
              value={f.impuesto}
              onChange={(e) => cambiar(i, 'impuesto', e.target.value)}
              disabled={disabled}
              className={`${campoCls} col-span-6 ${emisores.length > 1 ? 'sm:col-span-2' : 'sm:col-span-3'}`}
              aria-label="Impuesto"
            >
              {(catalogo?.impuestos_retencion || []).map((x) => (
                <option key={x.id} value={x.id}>
                  {x.label}
                </option>
              ))}
            </select>
            {impuesto?.con_jurisdiccion ? (
              <select
                value={f.jurisdiccion}
                onChange={(e) => cambiar(i, 'jurisdiccion', e.target.value)}
                disabled={disabled}
                className={`${campoCls} col-span-6 sm:col-span-3`}
                aria-label="Jurisdicción"
              >
                <option value="">Jurisdicción…</option>
                {(catalogo?.jurisdicciones || []).map((j) => (
                  <option key={j.id} value={j.id}>
                    {j.label}
                  </option>
                ))}
              </select>
            ) : (
              <input
                value={f.regimen}
                onChange={(e) => cambiar(i, 'regimen', e.target.value)}
                disabled={disabled}
                placeholder="Régimen (opcional)"
                maxLength={100}
                className={`${campoCls} col-span-6 sm:col-span-3`}
              />
            )}
            <input
              value={f.importe}
              onChange={(e) => cambiar(i, 'importe', e.target.value)}
              disabled={disabled}
              inputMode="decimal"
              placeholder="Importe"
              className={`${campoCls} col-span-5 sm:col-span-2`}
              aria-label="Importe de la retención"
            />
            {sufridas && (
              <input
                value={f.nro_certificado}
                onChange={(e) => cambiar(i, 'nro_certificado', e.target.value)}
                disabled={disabled}
                placeholder="N° certificado"
                maxLength={40}
                className={`${campoCls} col-span-6 sm:col-span-2`}
              />
            )}
            <button
              type="button"
              onClick={() => onChange(value.filter((_, n) => n !== i))}
              disabled={disabled}
              className="col-span-1 inline-flex justify-center text-slate-400 hover:text-rose-600"
              aria-label="Quitar retención"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
