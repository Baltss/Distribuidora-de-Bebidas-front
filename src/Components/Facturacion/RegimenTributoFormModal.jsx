// src/Components/Facturacion/RegimenTributoFormModal.jsx
//
// Alta / edición de un régimen de percepción (o de otro tributo) de un CUIT:
// qué se percibe, cuánto, sobre qué importe, desde qué monto y a quién.
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { backdropV, panelV } from '../../ui/animHelpers';
import useCatalogoFiscal from '../../hooks/useCatalogoFiscal';

const inputCls =
  'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-400/40';
const labelCls = 'block text-sm font-medium text-slate-600 mb-1.5';

const VACIO = {
  nombre: '',
  tributo_arca_id: '',
  jurisdiccion: '',
  usa_padron: false,
  solo_destino: false,
  alicuota: '',
  base: 'neto_gravado',
  minimo_base: '',
  condiciones_receptor: [],
  clases: ['A', 'B'],
  vigente_desde: '',
  vigente_hasta: '',
  notas: ''
};

const alternar = (lista, valor) => (lista.includes(valor) ? lista.filter((x) => x !== valor) : [...lista, valor]);

export default function RegimenTributoFormModal({ open, onClose, onSubmit, regimen = null }) {
  const catalogo = useCatalogoFiscal();
  const [form, setForm] = useState(VACIO);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm(
      regimen
        ? {
            nombre: regimen.nombre,
            tributo_arca_id: String(regimen.tributo_arca_id),
            jurisdiccion: regimen.jurisdiccion ? String(regimen.jurisdiccion) : '',
            usa_padron: Boolean(regimen.usa_padron),
            solo_destino: Boolean(regimen.solo_destino),
            alicuota: String(regimen.alicuota),
            base: regimen.base,
            minimo_base: Number(regimen.minimo_base) ? String(regimen.minimo_base) : '',
            condiciones_receptor: (regimen.condiciones_receptor || []).map(Number),
            clases: regimen.clases || [],
            vigente_desde: regimen.vigente_desde || '',
            vigente_hasta: regimen.vigente_hasta || '',
            notas: regimen.notas || ''
          }
        : VACIO
    );
  }, [open, regimen]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      await onSubmit({
        nombre: form.nombre.trim(),
        tributo_arca_id: Number(form.tributo_arca_id),
        jurisdiccion: form.jurisdiccion ? Number(form.jurisdiccion) : null,
        usa_padron: Boolean(form.jurisdiccion) && form.usa_padron,
        solo_destino: Boolean(form.jurisdiccion) && form.solo_destino,
        alicuota: Number(form.alicuota),
        base: form.base,
        minimo_base: form.minimo_base === '' ? 0 : Number(form.minimo_base),
        condiciones_receptor: form.condiciones_receptor,
        clases: form.clases,
        vigente_desde: form.vigente_desde,
        vigente_hasta: form.vigente_hasta || null,
        notas: form.notas.trim() || null
      });
      onClose();
    } catch {
      // el motivo ya se mostró: el modal queda abierto para corregirlo
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4"
          variants={backdropV}
          initial="hidden"
          animate="visible"
          exit="exit"
          role="dialog"
          aria-modal="true"
        >
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            variants={panelV}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="relative w-full max-w-[92vw] sm:max-w-2xl max-h-[88vh] overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl"
          >
            <button
              onClick={onClose}
              className="absolute z-50 top-2.5 right-2.5 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 border border-slate-200 text-slate-500 hover:bg-slate-200 transition"
              aria-label="Cerrar"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="relative z-10 p-5 sm:p-6">
              <h3 className="text-lg font-bold tracking-tight text-slate-900 mb-1">
                {regimen ? 'Editar régimen de percepción' : 'Nuevo régimen de percepción'}
              </h3>
              <p className="text-xs text-slate-500 mb-4">
                Cargalo con tu contador. Al facturar, se aplica a los clientes que corresponden y queda como deuda del cliente.
              </p>
              <form onSubmit={submit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className={labelCls}>Nombre en el comprobante</label>
                    <input value={form.nombre} onChange={set('nombre')} maxLength={80} placeholder="Ej. Perc. IIBB Tucumán" className={inputCls} required />
                  </div>
                  <div>
                    <label className={labelCls}>Tipo de tributo (ARCA)</label>
                    <select value={form.tributo_arca_id} onChange={set('tributo_arca_id')} className={inputCls} required>
                      <option value="">Elegí…</option>
                      {(catalogo?.tipos_tributo || []).map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.descripcion}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Jurisdicción</label>
                    <select value={form.jurisdiccion} onChange={set('jurisdiccion')} className={inputCls}>
                      <option value="">Nacional (ninguna)</option>
                      {(catalogo?.jurisdicciones || []).map((j) => (
                        <option key={j.id} value={j.id}>
                          {j.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  {form.jurisdiccion && (
                    <div className="sm:col-span-2 space-y-1.5 rounded-xl bg-slate-50 border border-slate-200 px-3.5 py-3">
                      <label className="flex items-start gap-2 text-sm text-slate-600">
                        <input
                          type="checkbox"
                          checked={form.solo_destino}
                          onChange={(e) => setForm((f) => ({ ...f, solo_destino: e.target.checked }))}
                          className="mt-0.5 rounded border-slate-300 text-teal-600 focus:ring-teal-400"
                        />
                        <span>
                          Sólo a clientes de esta jurisdicción
                          <span className="block text-[11px] text-slate-500">
                            Según la jurisdicción del cliente o, si no la tiene, la provincia de su ciudad (y si tampoco, la sede del CUIT).
                          </span>
                        </span>
                      </label>
                      <label className="flex items-start gap-2 text-sm text-slate-600">
                        <input
                          type="checkbox"
                          checked={form.usa_padron}
                          onChange={(e) => setForm((f) => ({ ...f, usa_padron: e.target.checked }))}
                          className="mt-0.5 rounded border-slate-300 text-teal-600 focus:ring-teal-400"
                        />
                        <span>
                          La alícuota sale del padrón de la jurisdicción
                          <span className="block text-[11px] text-slate-500">
                            Se usa la del padrón cargado para el CUIT del cliente; la alícuota de abajo rige para los que no figuran.
                          </span>
                        </span>
                      </label>
                    </div>
                  )}
                  <div>
                    <label className={labelCls}>{form.usa_padron ? 'Alícuota para quienes no figuran en el padrón (%)' : 'Alícuota (%)'}</label>
                    <input type="number" step="0.0001" min="0" max="100" value={form.alicuota} onChange={set('alicuota')} className={inputCls} required />
                  </div>
                  <div>
                    <label className={labelCls}>Se calcula sobre</label>
                    <select value={form.base} onChange={set('base')} className={inputCls}>
                      {(catalogo?.bases_tributo || [{ id: 'neto_gravado', label: 'Neto gravado' }]).map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Mínimo (no se percibe por debajo)</label>
                    <input type="number" step="0.01" min="0" value={form.minimo_base} onChange={set('minimo_base')} placeholder="0" className={inputCls} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelCls}>Rige desde</label>
                      <input type="date" value={form.vigente_desde} onChange={set('vigente_desde')} className={inputCls} required />
                    </div>
                    <div>
                      <label className={labelCls}>Hasta (opcional)</label>
                      <input type="date" value={form.vigente_hasta} onChange={set('vigente_hasta')} className={inputCls} />
                    </div>
                  </div>
                </div>

                <div>
                  <label className={labelCls}>Se percibe a estos clientes (si no marcás ninguno, a todos)</label>
                  <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                    {(catalogo?.condiciones_iva || []).map((c) => (
                      <label key={c.id} className="inline-flex items-center gap-1.5 text-sm text-slate-600">
                        <input
                          type="checkbox"
                          checked={form.condiciones_receptor.includes(c.id)}
                          onChange={() => setForm((f) => ({ ...f, condiciones_receptor: alternar(f.condiciones_receptor, c.id) }))}
                          className="rounded border-slate-300 text-teal-600 focus:ring-teal-400"
                        />
                        {c.label}
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className={labelCls}>En estas clases de comprobante (si no marcás ninguna, en todas)</label>
                  <div className="flex gap-4">
                    {['A', 'B', 'C'].map((clase) => (
                      <label key={clase} className="inline-flex items-center gap-1.5 text-sm text-slate-600">
                        <input
                          type="checkbox"
                          checked={form.clases.includes(clase)}
                          onChange={() => setForm((f) => ({ ...f, clases: alternar(f.clases, clase) }))}
                          className="rounded border-slate-300 text-teal-600 focus:ring-teal-400"
                        />
                        Factura {clase}
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className={labelCls}>Notas (opcional)</label>
                  <input value={form.notas} onChange={set('notas')} maxLength={255} placeholder="Ej. RG 86/00 DGR Tucumán" className={inputCls} />
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition">
                    Cancelar
                  </button>
                  <button type="submit" disabled={saving} className="px-4 py-2 rounded-xl bg-teal-600 text-white font-semibold hover:bg-teal-700 disabled:opacity-60 transition">
                    {saving ? 'Guardando…' : 'Guardar'}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
