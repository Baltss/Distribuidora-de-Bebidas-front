// src/Components/Common/MedioPagoField.jsx
// Campo de medio de pago compartido por Ventas, Nueva Venta, Compras,
// Cobros y Pagos a Proveedores: por defecto un único <select>, con la
// opción de "Dividir en varios medios de pago" (ej. parte efectivo +
// parte tarjeta) que despliega una fila por medio con su propio monto.
//
// Controlado: `value` es siempre { medio_pago, medios_pago } — exactamente
// la forma que espera el backend (uno de los dos, nunca ambos a la vez).
import React, { useState } from 'react';
import { Plus, Trash2, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { MEDIOS_PAGO } from '../../utils/mediosPago';
import { blockWheelChange } from '../../utils/numberInput';
import moneyAR from '../../utils/money';

const selectCls =
  'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-400/40 focus:border-transparent';
const inputCls = selectCls;

const emptyTramo = () => ({ medio_pago: '', monto: '' });

export default function MedioPagoField({
  value,
  onChange,
  total,
  required = true,
  label = 'Medio de pago',
  className = ''
}) {
  const splitActivo = Array.isArray(value?.medios_pago);
  const [tramosBorrador, setTramosBorrador] = useState(() =>
    splitActivo && value.medios_pago.length ? value.medios_pago : [emptyTramo(), emptyTramo()]
  );

  const toggleSplit = () => {
    if (splitActivo) {
      // Volvemos a modo simple: se pierde el detalle del split.
      onChange({ medio_pago: '', medios_pago: null });
    } else {
      const tramos = tramosBorrador.length ? tramosBorrador : [emptyTramo(), emptyTramo()];
      setTramosBorrador(tramos);
      onChange({ medio_pago: null, medios_pago: tramos });
    }
  };

  const setTramos = (tramos) => {
    setTramosBorrador(tramos);
    onChange({ medio_pago: null, medios_pago: tramos });
  };

  const updateTramo = (idx, patch) => {
    setTramos(tramosBorrador.map((tr, i) => (i === idx ? { ...tr, ...patch } : tr)));
  };

  const addTramo = () => setTramos([...tramosBorrador, emptyTramo()]);

  const removeTramo = (idx) => {
    const next = tramosBorrador.filter((_, i) => i !== idx);
    setTramos(next.length ? next : [emptyTramo()]);
  };

  const suma = splitActivo
    ? tramosBorrador.reduce((acc, t) => acc + (Number(t.monto) || 0), 0)
    : 0;
  const totalNum = Number(total) || 0;
  const cuadra = Math.abs(suma - totalNum) < 0.01;

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-2">
        <label className="text-sm font-medium text-slate-600">
          {label} {required && <span className="text-teal-600">*</span>}
        </label>
        <label className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={splitActivo}
            onChange={toggleSplit}
            className="rounded border-slate-300 text-teal-600 focus:ring-teal-400"
          />
          Dividir en varios medios de pago
        </label>
      </div>

      {!splitActivo ? (
        <select
          value={value?.medio_pago || ''}
          onChange={(e) => onChange({ medio_pago: e.target.value, medios_pago: null })}
          className={selectCls}
        >
          <option value="">Elegí un medio…</option>
          {MEDIOS_PAGO.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>
      ) : (
        <div className="space-y-2">
          {tramosBorrador.map((tr, idx) => (
            <div key={idx} className="flex flex-col sm:flex-row gap-2">
              <div className="flex gap-2">
                <select
                  value={tr.medio_pago}
                  onChange={(e) => updateTramo(idx, { medio_pago: e.target.value })}
                  className={`${selectCls} flex-1`}
                >
                  <option value="">Medio…</option>
                  {MEDIOS_PAGO.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => removeTramo(idx)}
                  className="shrink-0 inline-flex items-center justify-center h-[42px] w-[42px] rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 transition sm:hidden"
                  aria-label="Quitar medio"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <div className="flex gap-2">
                <input
                  type="number"
                  onWheel={blockWheelChange}
                  step="0.01"
                  min="0"
                  value={tr.monto}
                  onChange={(e) => updateTramo(idx, { monto: e.target.value })}
                  placeholder="Monto"
                  className={`${inputCls} flex-1`}
                />
                <button
                  type="button"
                  onClick={() => removeTramo(idx)}
                  className="hidden sm:inline-flex shrink-0 items-center justify-center h-[42px] w-[42px] rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 transition"
                  aria-label="Quitar medio"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={addTramo}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-700 hover:text-teal-800 transition"
          >
            <Plus className="h-3.5 w-3.5" /> Agregar medio
          </button>

          <p
            className={`flex items-center gap-1.5 text-xs font-medium ${
              cuadra ? 'text-emerald-600' : 'text-amber-600'
            }`}
          >
            {cuadra ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
            Suma: {moneyAR(suma)} de {moneyAR(totalNum)}
            {!cuadra && ' — tiene que coincidir con el total'}
          </p>
        </div>
      )}
    </div>
  );
}
