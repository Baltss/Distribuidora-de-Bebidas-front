// src/Components/Facturacion/IibbEmisorCard.jsx
// Cómo tributa Ingresos Brutos un CUIT: régimen (local o Convenio Multilateral),
// inscripción, sede y, en Convenio Multilateral, las jurisdicciones con su
// coeficiente. Lo ven el dueño y Soldi; lo edita el dueño.
import React, { useEffect, useState } from 'react';
import { MapPinned, Plus, Trash2 } from 'lucide-react';
import { getIibbEmisor, guardarIibbEmisor } from '../../api/facturacion';
import { showApiErrorSwal, showSuccessToast } from '../../ui/swal';
import useCatalogoFiscal from '../../hooks/useCatalogoFiscal';
import { useAuth } from '../../AuthContext';

const inputCls =
  'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-400/40 disabled:bg-slate-50 disabled:text-slate-500';
const labelCls = 'block text-sm font-medium text-slate-600 mb-1.5';

const numero = (v) => (v === '' || v == null ? null : Number(String(v).replace(',', '.')));

export default function IibbEmisorCard({ emisorId }) {
  const { userLevel } = useAuth();
  const puedeEditar = String(userLevel || '').toLowerCase() === 'socio';
  const catalogo = useCatalogoFiscal();
  const [form, setForm] = useState(null);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    let vivo = true;
    setForm(null);
    getIibbEmisor(emisorId)
      .then((d) => {
        if (!vivo) return;
        setForm({
          regimen: d.regimen,
          nro_inscripcion: d.nro_inscripcion || '',
          jurisdiccion_sede: d.jurisdiccion_sede ? String(d.jurisdiccion_sede) : '',
          jurisdicciones: d.jurisdicciones.map((j) => ({
            jurisdiccion: String(j.jurisdiccion),
            nro_inscripcion: j.nro_inscripcion || '',
            coeficiente: j.coeficiente == null ? '' : String(j.coeficiente)
          }))
        });
      })
      .catch((err) => showApiErrorSwal(err, { title: 'No se pudo cargar Ingresos Brutos' }));
    return () => {
      vivo = false;
    };
  }, [emisorId]);

  if (!form) return null;

  const cm = form.regimen === 'convenio_multilateral';
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const setFila = (i, k, v) =>
    setForm((f) => ({ ...f, jurisdicciones: f.jurisdicciones.map((j, n) => (n === i ? { ...j, [k]: v } : j)) }));
  const suma = form.jurisdicciones.reduce((acc, j) => acc + (numero(j.coeficiente) || 0), 0);

  const guardar = async (e) => {
    e.preventDefault();
    try {
      setGuardando(true);
      await guardarIibbEmisor(emisorId, {
        regimen: form.regimen,
        nro_inscripcion: form.nro_inscripcion.trim() || null,
        jurisdiccion_sede: form.jurisdiccion_sede ? Number(form.jurisdiccion_sede) : null,
        jurisdicciones: cm
          ? form.jurisdicciones.map((j) => ({
              jurisdiccion: Number(j.jurisdiccion),
              nro_inscripcion: j.nro_inscripcion.trim() || null,
              coeficiente: numero(j.coeficiente)
            }))
          : []
      });
      showSuccessToast('Ingresos Brutos guardado');
    } catch (err) {
      await showApiErrorSwal(err, { title: 'No se pudo guardar Ingresos Brutos' });
    } finally {
      setGuardando(false);
    }
  };

  const jurisdicciones = catalogo?.jurisdicciones || [];

  return (
    <div className="mt-6 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-200">
        <h2 className="font-semibold text-slate-800 flex items-center gap-2">
          <MapPinned className="h-4 w-4 text-teal-600" /> Ingresos Brutos
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          La sede es la jurisdicción de las ventas de mostrador; cada cliente puede tener la suya. Con eso el reporte del contador reparte
          las ventas por jurisdicción.
        </p>
      </div>
      <form onSubmit={guardar} className="p-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className={labelCls}>Régimen</label>
            <select value={form.regimen} onChange={set('regimen')} disabled={!puedeEditar} className={inputCls}>
              {(catalogo?.regimenes_iibb || []).map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>N° de inscripción</label>
            <input value={form.nro_inscripcion} onChange={set('nro_inscripcion')} maxLength={30} disabled={!puedeEditar} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Jurisdicción de la sede</label>
            <select value={form.jurisdiccion_sede} onChange={set('jurisdiccion_sede')} disabled={!puedeEditar} className={inputCls}>
              <option value="">Sin definir</option>
              {jurisdicciones.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {cm && (
          <div>
            <label className={labelCls}>Jurisdicciones en las que está inscripto</label>
            <div className="space-y-2">
              {form.jurisdicciones.map((j, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-center">
                  <select
                    value={j.jurisdiccion}
                    onChange={(e) => setFila(i, 'jurisdiccion', e.target.value)}
                    disabled={!puedeEditar}
                    className={`${inputCls} col-span-12 sm:col-span-5`}
                    aria-label="Jurisdicción"
                  >
                    <option value="">Elegí…</option>
                    {jurisdicciones.map((x) => (
                      <option key={x.id} value={x.id}>
                        {x.label}
                      </option>
                    ))}
                  </select>
                  <input
                    value={j.nro_inscripcion}
                    onChange={(e) => setFila(i, 'nro_inscripcion', e.target.value)}
                    maxLength={30}
                    placeholder="N° de inscripción"
                    disabled={!puedeEditar}
                    className={`${inputCls} col-span-7 sm:col-span-4`}
                  />
                  <input
                    value={j.coeficiente}
                    onChange={(e) => setFila(i, 'coeficiente', e.target.value)}
                    inputMode="decimal"
                    placeholder="Coef. (0,4525)"
                    disabled={!puedeEditar}
                    className={`${inputCls} col-span-4 sm:col-span-2`}
                  />
                  {puedeEditar && (
                    <button
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, jurisdicciones: f.jurisdicciones.filter((_, n) => n !== i) }))}
                      className="col-span-1 inline-flex justify-center text-slate-400 hover:text-rose-600"
                      aria-label="Quitar jurisdicción"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between mt-2">
              {puedeEditar ? (
                <button
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, jurisdicciones: [...f.jurisdicciones, { jurisdiccion: '', nro_inscripcion: '', coeficiente: '' }] }))}
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-teal-700 hover:text-teal-800"
                >
                  <Plus className="h-4 w-4" /> Agregar jurisdicción
                </button>
              ) : (
                <span />
              )}
              <span className={`text-xs ${suma > 1.000001 ? 'text-rose-600 font-semibold' : 'text-slate-500'}`}>
                Suma de coeficientes: {suma.toLocaleString('es-AR', { maximumFractionDigits: 6 })}
              </span>
            </div>
          </div>
        )}

        {puedeEditar && (
          <div className="flex justify-end">
            <button type="submit" disabled={guardando} className="px-4 py-2 rounded-xl bg-teal-600 text-white font-semibold hover:bg-teal-700 disabled:opacity-60 transition">
              {guardando ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
        )}
      </form>
    </div>
  );
}
