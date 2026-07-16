// src/Components/Caja/IngresoManualFormModal.jsx
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  backdropV,
  panelV,
  formContainerV,
  fieldV
} from '../../ui/animHelpers';
import { X, TrendingUp, Calendar, Wallet, CreditCard, StickyNote } from 'lucide-react';
import { blockWheelChange } from '../../utils/numberInput';

const todayISO = () => new Date().toISOString().slice(0, 10);

// Ingreso de caja ajeno a las ventas (ej: un aporte, un reintegro, etc.)
export default function IngresoManualFormModal({ open, onClose, onSubmit }) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    fecha: todayISO(),
    monto: '',
    descripcion: '',
    medio_pago: ''
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (open) {
      setForm({ fecha: todayISO(), monto: '', descripcion: '', medio_pago: '' });
      setErrors({});
    }
  }, [open]);

  const handle = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const validate = () => {
    const e = {};
    if (!Number.isFinite(Number(form.monto)) || Number(form.monto) <= 0) {
      e.monto = 'El monto debe ser mayor a 0';
    }
    if (!form.fecha) e.fecha = 'La fecha es obligatoria';
    if (!form.descripcion?.trim()) e.descripcion = 'Contá de qué es este ingreso';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    const payload = {
      tipo: 'ingreso',
      fecha: form.fecha,
      monto: Number(form.monto),
      descripcion: form.descripcion.trim(),
      medio_pago: form.medio_pago?.trim() || null
    };

    try {
      setSaving(true);
      await onSubmit(payload);
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
          <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={onClose} />

          <motion.div
            variants={panelV}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="relative w-full max-w-[92vw] sm:max-w-md
                       max-h-[85vh] overflow-y-auto overscroll-contain
                       rounded-2xl border border-white/10 bg-white/[0.06] backdrop-blur-xl"
          >
            <button
              onClick={onClose}
              className="absolute z-50 top-2.5 right-2.5 inline-flex h-9 w-9 items-center justify-center rounded-lg
                         bg-white/5 border border-white/10 hover:bg-white/10 transition"
              aria-label="Cerrar"
            >
              <X className="h-5 w-5 text-gray-200" />
            </button>

            <div className="relative z-10 p-5 sm:p-6">
              <div className="mb-5 flex items-center gap-3">
                <TrendingUp className="h-6 w-6 text-emerald-300 shrink-0" />
                <h3 className="text-xl font-bold tracking-tight text-white">Nuevo ingreso</h3>
              </div>

              <motion.form
                onSubmit={submit}
                variants={formContainerV}
                initial="hidden"
                animate="visible"
                className="space-y-4"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <motion.div variants={fieldV}>
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-200 mb-2">
                      <Wallet className="h-4 w-4 text-gray-400" />
                      Monto <span className="text-emerald-300">*</span>
                    </label>
                    <input
                      name="monto"
                      type="number"
                      onWheel={blockWheelChange}
                      step="0.01"
                      value={form.monto}
                      onChange={handle}
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-3 text-white
                                 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-300/40 focus:border-transparent"
                      placeholder="0.00"
                    />
                    {errors.monto && (
                      <p className="mt-1 text-sm text-rose-300">{errors.monto}</p>
                    )}
                  </motion.div>

                  <motion.div variants={fieldV}>
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-200 mb-2">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      Fecha <span className="text-emerald-300">*</span>
                    </label>
                    <input
                      name="fecha"
                      type="date"
                      value={form.fecha}
                      onChange={handle}
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-3 text-white
                                 focus:outline-none focus:ring-2 focus:ring-emerald-300/40 focus:border-transparent"
                    />
                    {errors.fecha && (
                      <p className="mt-1 text-sm text-rose-300">{errors.fecha}</p>
                    )}
                  </motion.div>
                </div>

                <motion.div variants={fieldV}>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-200 mb-2">
                    <CreditCard className="h-4 w-4 text-gray-400" />
                    Medio de pago (opcional)
                  </label>
                  <select
                    name="medio_pago"
                    value={form.medio_pago}
                    onChange={handle}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-3 text-black
                               focus:outline-none focus:ring-2 focus:ring-emerald-300/40 focus:border-transparent"
                  >
                    <option value="" className="text-black">Seleccionar…</option>
                    <option value="Efectivo" className="text-black">Efectivo</option>
                    <option value="Transferencia" className="text-black">Transferencia</option>
                    <option value="Débito" className="text-black">Débito</option>
                  </select>
                </motion.div>

                <motion.div variants={fieldV}>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-200 mb-2">
                    <StickyNote className="h-4 w-4 text-gray-400" />
                    Descripción <span className="text-emerald-300">*</span>
                  </label>
                  <textarea
                    name="descripcion"
                    rows={2}
                    value={form.descripcion}
                    onChange={handle}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-3 text-white
                               placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-300/40 focus:border-transparent resize-y"
                    placeholder="Ej: reintegro, aporte de capital…"
                  />
                  {errors.descripcion && (
                    <p className="mt-1 text-sm text-rose-300">{errors.descripcion}</p>
                  )}
                </motion.div>

                <motion.div
                  variants={fieldV}
                  className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-1"
                >
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 rounded-xl border border-white/10 text-gray-200 hover:bg-white/10 transition"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-semibold
                               hover:brightness-110 disabled:opacity-60 disabled:cursor-not-allowed transition"
                  >
                    {saving ? 'Guardando…' : 'Registrar ingreso'}
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
