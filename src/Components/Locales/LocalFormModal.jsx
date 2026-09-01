// src/Components/Locales/LocalFormModal.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import {
  backdropV,
  panelV,
  formContainerV,
  fieldV
} from '../../ui/animHelpers';

const inputCls =
  'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-400/40 focus:border-transparent';
const labelCls = 'block text-sm font-medium text-slate-600 mb-2';

export const defaultFormValues = {
  nombre: '',
  codigo: '',
  direccion: '',
  ciudad: '',
  provincia: 'Tucumán',
  telefono: '',
  email: '',
  responsable_nombre: '',
  responsable_dni: '',
  horario_apertura: '09:00',
  horario_cierre: '18:00',
  printer_nombre: '',
  estado: 'activo'
};

export default function LocalFormModal({ open, onClose, onSubmit, initial }) {
  const [form, setForm] = useState(defaultFormValues);
  const [saving, setSaving] = useState(false);
  const isEdit = !!initial?.id;

  useEffect(() => {
    if (!open) return;
    setForm({ ...defaultFormValues, ...(initial || {}) });
  }, [open, initial]);

  const handle = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const submit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      await onSubmit(form);
    } finally {
      setSaving(false);
    }
  };

  const fields = useMemo(() => Object.keys(defaultFormValues), []);

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
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            variants={panelV}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="relative w-full max-w-[92vw] sm:max-w-xl md:max-w-2xl
                       max-h-[85vh] overflow-y-auto overscroll-contain
                       rounded-2xl border border-slate-200 bg-white shadow-2xl"
          >
            <button
              onClick={onClose}
              className="absolute z-50 top-2.5 right-2.5 inline-flex h-9 w-9 items-center justify-center rounded-lg
                         bg-slate-100 border border-slate-200 text-slate-500 hover:bg-slate-200 transition"
              aria-label="Cerrar"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="relative z-10 p-5 sm:p-6 md:p-8">
              <motion.h3
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 260, damping: 24 }}
                className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 mb-5"
              >
                {isEdit ? 'Editar Local' : 'Nuevo Local'}
              </motion.h3>

              <motion.form
                onSubmit={submit}
                variants={formContainerV}
                initial="hidden"
                animate="visible"
                className="grid grid-cols-1 md:grid-cols-2 gap-4"
              >
                {fields.map((key) => {
                  const label = key
                    .replace(/_/g, ' ')
                    .replace(/\b\w/g, (c) => c.toUpperCase());

                  if (key === 'estado') {
                    return (
                      <motion.div
                        key={key}
                        variants={fieldV}
                        className="md:col-span-2"
                      >
                        <label className={labelCls}>{label}</label>
                        <select
                          name={key}
                          value={form[key]}
                          onChange={handle}
                          className={inputCls}
                        >
                          <option value="activo">Activo</option>
                          <option value="inactivo">Inactivo</option>
                        </select>
                      </motion.div>
                    );
                  }

                  return (
                    <motion.div key={key} variants={fieldV}>
                      <label className={labelCls}>{label}</label>
                      <input
                        type={
                          key.includes('email')
                            ? 'email'
                            : key.includes('horario')
                            ? 'time'
                            : 'text'
                        }
                        name={key}
                        value={form[key] ?? ''}
                        onChange={handle}
                        placeholder={label}
                        className={inputCls}
                      />
                    </motion.div>
                  );
                })}

                <motion.div
                  variants={fieldV}
                  className="md:col-span-2 flex flex-col-reverse sm:flex-row justify-end gap-2 pt-1"
                >
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
                    className="px-4 py-2 rounded-xl bg-teal-600 text-white font-semibold
                               hover:bg-teal-700 disabled:opacity-60 disabled:cursor-not-allowed transition"
                  >
                    {saving
                      ? 'Guardando…'
                      : isEdit
                      ? 'Actualizar'
                      : 'Guardar'}
                  </button>
                </motion.div>
              </motion.form>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
