// src/Components/Facturacion/PuntoVentaFormModal.jsx
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { backdropV, panelV } from '../../ui/animHelpers';

const inputCls =
  'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-400/40';
const labelCls = 'block text-sm font-medium text-slate-600 mb-2';

export default function PuntoVentaFormModal({ open, onClose, onSubmit, locales = [] }) {
  const [numero, setNumero] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [localId, setLocalId] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setNumero('');
    setDescripcion('');
    setLocalId('');
  }, [open]);

  const submit = async (e) => {
    e.preventDefault();
    if (!numero || Number(numero) <= 0) return;
    try {
      setSaving(true);
      await onSubmit({ numero: Number(numero), descripcion: descripcion || null, local_id: localId || null });
      onClose();
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
            className="relative w-full max-w-[92vw] sm:max-w-md rounded-2xl border border-slate-200 bg-white shadow-2xl"
          >
            <button
              onClick={onClose}
              className="absolute z-50 top-2.5 right-2.5 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 border border-slate-200 text-slate-500 hover:bg-slate-200 transition"
              aria-label="Cerrar"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="relative z-10 p-5 sm:p-6">
              <h3 className="text-lg font-bold tracking-tight text-slate-900 mb-4">Nuevo Punto de Venta</h3>
              <form onSubmit={submit} className="space-y-4">
                <div>
                  <label className={labelCls}>Número (el que habilitaste en AFIP)</label>
                  <input
                    type="number"
                    min={1}
                    value={numero}
                    onChange={(e) => setNumero(e.target.value)}
                    className={inputCls}
                    required
                  />
                </div>
                <div>
                  <label className={labelCls}>Descripción (opcional)</label>
                  <input
                    value={descripcion}
                    onChange={(e) => setDescripcion(e.target.value)}
                    placeholder="Ej: Mostrador principal"
                    className={inputCls}
                  />
                </div>
                {locales.length > 0 && (
                  <div>
                    <label className={labelCls}>Local (opcional — dejalo vacío si es único para todo el negocio)</label>
                    <select value={localId} onChange={(e) => setLocalId(e.target.value)} className={inputCls}>
                      <option value="">Todos los locales</option>
                      {locales.map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.nombre}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-4 py-2 rounded-xl bg-teal-600 text-white font-semibold hover:bg-teal-700 disabled:opacity-60 transition"
                  >
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
