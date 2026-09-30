// src/Components/Facturacion/DatosFiscalesCompra.jsx
// Datos fiscales de la factura de un proveedor (Libro IVA Compras): tipo y número
// del comprobante, IVA por alícuota, percepciones sufridas y período en que se
// computa. Se usa al cargar una compra y al cargar un comprobante suelto (servicios,
// gastos). Controlado: `value` es el estado de utils/comprobantesRecibidos.js.
import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import useCatalogoFiscal from '../../hooks/useCatalogoFiscal';
import useEstadoEmision from '../../hooks/useEstadoEmision';
import { nombreEmisor } from '../../utils/emisores';
import { ALICUOTAS_IVA, calcularFiscal } from '../../utils/comprobantesRecibidos';
import moneyAR from '../../utils/money';

const campoCls =
  'w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-400/40 disabled:opacity-60';
const labelCls = 'block text-xs font-medium text-slate-600 mb-1';

const Campo = ({ label, children, className = '' }) => (
  <div className={className}>
    <label className={labelCls}>{label}</label>
    {children}
  </div>
);

export default function DatosFiscalesCompra({ value, onChange, conProveedor = false, disabled = false }) {
  const catalogo = useCatalogoFiscal();
  const estado = useEstadoEmision();
  const emisores = estado?.emisores || [];
  const { discrimina, ivaFilas, iva, total } = calcularFiscal(value, catalogo);

  const set = (k) => (e) => onChange({ ...value, [k]: e.target.value });
  const setFila = (lista, i, k, v) => onChange({ ...value, [lista]: value[lista].map((x, n) => (n === i ? { ...x, [k]: v } : x)) });

  const numeros = (k, label) => (
    <Campo label={label}>
      <input value={value[k]} onChange={set(k)} disabled={disabled} inputMode="decimal" placeholder="0,00" className={campoCls} />
    </Campo>
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
        {emisores.length > 1 && (
          <Campo label="CUIT propio" className="col-span-2 sm:col-span-3">
            <select value={value.emisor_id} onChange={set('emisor_id')} disabled={disabled} className={campoCls}>
              <option value="">Elegí…</option>
              {emisores.map((e) => (
                <option key={e.id} value={e.id}>
                  {nombreEmisor(e)}
                </option>
              ))}
            </select>
          </Campo>
        )}
        <Campo label="Tipo de comprobante" className={`col-span-2 ${emisores.length > 1 ? 'sm:col-span-3' : 'sm:col-span-6'}`}>
          <select value={value.tipo_comprobante} onChange={set('tipo_comprobante')} disabled={disabled} className={campoCls}>
            {(catalogo?.comprobantes || []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </select>
        </Campo>
        <Campo label="Punto de venta" className="sm:col-span-2">
          <input value={value.punto_venta} onChange={set('punto_venta')} disabled={disabled} inputMode="numeric" placeholder="00012" className={campoCls} />
        </Campo>
        <Campo label="Número" className="sm:col-span-2">
          <input value={value.numero} onChange={set('numero')} disabled={disabled} inputMode="numeric" placeholder="00000345" className={campoCls} />
        </Campo>
        <Campo label="Fecha del comprobante" className="col-span-2 sm:col-span-2">
          <input type="date" value={value.fecha_comprobante} onChange={set('fecha_comprobante')} disabled={disabled} className={campoCls} />
        </Campo>
        <Campo label="Se computa en el mes" className="col-span-1 sm:col-span-2">
          <input type="month" value={value.periodo_imputacion} onChange={set('periodo_imputacion')} disabled={disabled} min={value.fecha_comprobante?.slice(0, 7)} className={campoCls} />
        </Campo>
        <Campo label="CAE (opcional)" className="col-span-1 sm:col-span-4">
          <input value={value.cae} onChange={set('cae')} disabled={disabled} maxLength={14} inputMode="numeric" className={campoCls} />
        </Campo>
        {conProveedor && (
          <>
            <Campo label="CUIT del proveedor" className="col-span-2 sm:col-span-2">
              <input value={value.proveedor_documento} onChange={set('proveedor_documento')} disabled={disabled} inputMode="numeric" placeholder="30-12345678-9" className={campoCls} />
            </Campo>
            <Campo label="Razón social del proveedor" className="col-span-2 sm:col-span-4">
              <input value={value.proveedor_nombre} onChange={set('proveedor_nombre')} disabled={disabled} maxLength={150} className={campoCls} />
            </Campo>
          </>
        )}
      </div>

      {discrimina ? (
        <div>
          <p className={labelCls}>Neto gravado por alícuota de IVA</p>
          {value.ivaFilas.map((f, i) => (
            <div key={i} className="mb-2 grid grid-cols-12 gap-2 items-center">
              <select value={f.porcentaje} onChange={(e) => setFila('ivaFilas', i, 'porcentaje', e.target.value)} disabled={disabled} className={`${campoCls} col-span-4`} aria-label="Alícuota">
                {ALICUOTAS_IVA.map((a) => (
                  <option key={a} value={a}>
                    IVA {a.toLocaleString('es-AR')}%
                  </option>
                ))}
              </select>
              <input value={f.base} onChange={(e) => setFila('ivaFilas', i, 'base', e.target.value)} disabled={disabled} inputMode="decimal" placeholder="Neto gravado" className={`${campoCls} col-span-5`} />
              <span className="col-span-2 text-xs text-slate-500 text-right">{moneyAR(ivaFilas[i]?.iva || 0)}</span>
              <button
                type="button"
                onClick={() => onChange({ ...value, ivaFilas: value.ivaFilas.filter((_, n) => n !== i) })}
                disabled={disabled || value.ivaFilas.length === 1}
                className="col-span-1 inline-flex justify-center text-slate-400 hover:text-rose-600 disabled:opacity-30"
                aria-label="Quitar alícuota"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => onChange({ ...value, ivaFilas: [...value.ivaFilas, { porcentaje: '10.5', base: '' }] })}
            disabled={disabled}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-700 hover:text-teal-800"
          >
            <Plus className="h-3.5 w-3.5" /> Agregar alícuota
          </button>
          <div className="mt-3 grid grid-cols-2 gap-3">
            {numeros('importe_exento', 'Exento')}
            {numeros('importe_no_gravado', 'No gravado')}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {numeros('importe_total', 'Total del comprobante')}
          <p className="self-end text-[11px] text-slate-500">Este tipo de comprobante no discrimina IVA: no da crédito fiscal.</p>
        </div>
      )}

      <div>
        <p className={labelCls}>Percepciones y otros tributos incluidos en el total</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {numeros('percepcion_iva', 'Percepción de IVA')}
          {numeros('percepcion_nacional', 'Otras percep. nacionales')}
          {numeros('percepcion_municipal', 'Percep. municipal')}
          {numeros('impuestos_internos', 'Impuestos internos')}
          {numeros('otros_tributos', 'Otros tributos')}
        </div>
        {value.percepcionesIibb.map((p, i) => (
          <div key={i} className="mt-2 grid grid-cols-12 gap-2 items-center">
            <select value={p.jurisdiccion} onChange={(e) => setFila('percepcionesIibb', i, 'jurisdiccion', e.target.value)} disabled={disabled} className={`${campoCls} col-span-6`} aria-label="Jurisdicción de la percepción">
              <option value="">Percepción IIBB · jurisdicción…</option>
              {(catalogo?.jurisdicciones || []).map((j) => (
                <option key={j.id} value={j.id}>
                  {j.label}
                </option>
              ))}
            </select>
            <input value={p.importe} onChange={(e) => setFila('percepcionesIibb', i, 'importe', e.target.value)} disabled={disabled} inputMode="decimal" placeholder="Importe" className={`${campoCls} col-span-5`} />
            <button type="button" onClick={() => onChange({ ...value, percepcionesIibb: value.percepcionesIibb.filter((_, n) => n !== i) })} disabled={disabled} className="col-span-1 inline-flex justify-center text-slate-400 hover:text-rose-600" aria-label="Quitar percepción">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => onChange({ ...value, percepcionesIibb: [...value.percepcionesIibb, { jurisdiccion: '', importe: '' }] })}
          disabled={disabled}
          className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-teal-700 hover:text-teal-800"
        >
          <Plus className="h-3.5 w-3.5" /> Percepción de Ingresos Brutos
        </button>
      </div>

      <div className="flex items-center justify-between rounded-xl bg-slate-50 border border-slate-200 px-3.5 py-2.5 text-sm">
        <span className="text-slate-600">
          {discrimina ? `IVA crédito fiscal: ${moneyAR(iva)}` : 'Sin crédito fiscal'}
        </span>
        <span className="font-bold text-slate-900">Total de la factura: {moneyAR(total)}</span>
      </div>
    </div>
  );
}
