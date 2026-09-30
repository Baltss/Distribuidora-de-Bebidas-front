// src/Components/Facturacion/ParametrosFiscalesCard.jsx
// Parámetros de la norma que cambian con el tiempo (por ejemplo el tope desde
// el cual hay que identificar al Consumidor Final), con su período de
// vigencia. Todos los ven; sólo Soldi carga una vigencia nueva.
import React, { useEffect, useState } from 'react';
import { Scale, Plus } from 'lucide-react';
import { listParametrosFiscales, crearParametroFiscal } from '../../api/facturacion';
import { showApiErrorSwal, showSuccessToast } from '../../ui/swal';
import { formatFechaCalendario } from '../../utils/fechaCalendario';
import { useAuth } from '../../AuthContext';

const inputCls =
  'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-400/40';

const VACIO = { clave: '', valor: '', vigente_desde: '', norma: '' };

const valorConUnidad = (p) =>
  p.unidad === '$' ? `$ ${Number(p.valor).toLocaleString('es-AR')}` : Number(p.valor).toLocaleString('es-AR');

export default function ParametrosFiscalesCard() {
  const { userLevel } = useAuth();
  const puedeCargar = String(userLevel || '').toLowerCase() === 'soldi_admin';
  const [datos, setDatos] = useState({ parametros: [], conocidos: [] });
  const [cargando, setCargando] = useState(true);
  const [form, setForm] = useState(null); // null = cerrado
  const [guardando, setGuardando] = useState(false);

  const cargar = () =>
    listParametrosFiscales()
      .then(setDatos)
      .catch((err) => showApiErrorSwal(err, { title: 'No se pudieron cargar los parámetros fiscales' }))
      .finally(() => setCargando(false));

  useEffect(() => {
    cargar();
  }, []);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const guardar = async (e) => {
    e.preventDefault();
    try {
      setGuardando(true);
      await crearParametroFiscal(form);
      showSuccessToast('Parámetro cargado');
      setForm(null);
      await cargar();
    } catch (err) {
      await showApiErrorSwal(err, { title: 'No se pudo cargar el parámetro' });
    } finally {
      setGuardando(false);
    }
  };

  const descripcion = (clave) => datos.conocidos.find((c) => c.clave === clave)?.descripcion || clave;

  return (
    <div className="mt-6 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold text-slate-800 flex items-center gap-2">
            <Scale className="h-4 w-4 text-teal-600" /> Parámetros de la norma
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Topes y valores que fija ARCA y cambian con el tiempo. Cada cambio rige desde una fecha y queda el historial.
          </p>
        </div>
        {puedeCargar && !form && (
          <button
            onClick={() => setForm({ ...VACIO, clave: datos.conocidos[0]?.clave || '' })}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-teal-600 text-white text-sm font-semibold hover:bg-teal-700 transition"
          >
            <Plus className="h-4 w-4" /> Nueva vigencia
          </button>
        )}
      </div>

      {form && (
        <form onSubmit={guardar} className="px-5 py-4 border-b border-slate-200 bg-slate-50/60 grid grid-cols-1 sm:grid-cols-4 gap-3">
          <select value={form.clave} onChange={set('clave')} className={`${inputCls} sm:col-span-2`} aria-label="Parámetro">
            {datos.conocidos.map((c) => (
              <option key={c.clave} value={c.clave}>
                {c.descripcion}
              </option>
            ))}
          </select>
          <input type="number" min="0" step="any" value={form.valor} onChange={set('valor')} placeholder="Nuevo valor" className={inputCls} required />
          <input type="date" value={form.vigente_desde} onChange={set('vigente_desde')} className={inputCls} required aria-label="Rige desde" />
          <input value={form.norma} onChange={set('norma')} placeholder="Norma (ej. RG 5866/2026)" maxLength={120} className={`${inputCls} sm:col-span-2`} />
          <div className="sm:col-span-2 flex justify-end gap-2">
            <button type="button" onClick={() => setForm(null)} className="px-4 py-2 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-white transition">
              Cancelar
            </button>
            <button type="submit" disabled={guardando} className="px-4 py-2 rounded-xl bg-teal-600 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60 transition">
              {guardando ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
        </form>
      )}

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50/90 border-b border-gray-200">
            <tr>
              <th className="px-4 py-2 text-left font-semibold text-gray-600">Parámetro</th>
              <th className="px-4 py-2 text-right font-semibold text-gray-600">Valor</th>
              <th className="px-4 py-2 text-left font-semibold text-gray-600">Desde</th>
              <th className="px-4 py-2 text-left font-semibold text-gray-600">Hasta</th>
              <th className="px-4 py-2 text-left font-semibold text-gray-600">Norma</th>
              <th className="px-4 py-2 text-left font-semibold text-gray-600">Estado</th>
            </tr>
          </thead>
          <tbody>
            {!cargando && datos.parametros.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-gray-500">
                  No hay parámetros cargados.
                </td>
              </tr>
            )}
            {datos.parametros.map((p) => (
              <tr key={p.id} className="border-b border-gray-100">
                <td className="px-4 py-2 text-gray-800">{descripcion(p.clave)}</td>
                <td className="px-4 py-2 text-right font-medium text-gray-800">{valorConUnidad(p)}</td>
                <td className="px-4 py-2 text-gray-700">{formatFechaCalendario(p.vigente_desde)}</td>
                <td className="px-4 py-2 text-gray-700">{p.vigente_hasta ? formatFechaCalendario(p.vigente_hasta) : '—'}</td>
                <td className="px-4 py-2 text-gray-600">{p.norma || '—'}</td>
                <td className="px-4 py-2">
                  <span
                    className={`inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-full border ${
                      p.vigente ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'
                    }`}
                  >
                    {p.vigente ? 'Vigente' : new Date(`${p.vigente_desde}T12:00:00`) > new Date() ? 'Futura' : 'Anterior'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
