// src/Components/Caja/MovimientoManualFormModal.jsx
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  backdropV,
  panelV,
  formContainerV,
  fieldV
} from '../../ui/animHelpers';
import { X, TrendingUp, TrendingDown, Calendar, Wallet, CreditCard, StickyNote } from 'lucide-react';
import { blockWheelChange } from '../../utils/numberInput';
import { MEDIOS_PAGO } from '../../utils/mediosPago';

const inputCls =
  'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/40 focus:border-transparent';
const labelCls = 'flex items-center gap-2 text-sm font-medium text-slate-600 mb-2';

const todayISO = () => new Date().toISOString().slice(0, 10);

// Movimiento de caja manual, ajeno a ventas/cobros/gastos/pagos (ej: un
// aporte, un retiro, un reintegro). Sirve tanto para alta (POST) como
// para edición (PUT) si se pasa `initialData`.
export default function MovimientoManualFormModal({
  open,
  onClose,
  onSubmit,
  tipo = 'ingreso', // 'ingreso' | 'egreso'
  initialData = null
}) {
  const isEdit = !!initialData;
  const esIngreso = tipo === 'ingreso';
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
      setForm(
        initialData
          ? {
              fecha: initialData.fecha ? String(initialData.fecha).slice(0, 10) : todayISO(),
              monto: initialData.monto ?? '',
              descripcion: initialData.descripcion || '',
              medio_pago: initialData.medio_pago || ''
            }
          : { fecha: todayISO(), monto: '', descripcion: '', medio_pago: '' }
      );
      setErrors({});
    }
  }, [open, initialData]);

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
    if (!form.descripcion?.trim()) e.descripcion = `Contá de qué es este ${esIngreso ? 'ingreso' : 'egreso'}`;
    if (!form.medio_pago) e.medio_pago = 'El medio de pago es obligatorio';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    const payload = isEdit
      ? {
          fecha: form.fecha,
          monto: Number(form.monto),
          descripcion: form.descripcion.trim(),
          medio_pago: form.medio_pago
        }
      : {
          tipo,
          fecha: form.fecha,
          monto: Number(form.monto),
          descripcion: form.descripcion.trim(),
          medio_pago: form.medio_pago
        };

    try {
      setSaving(true);
      await onSubmit(payload);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const accentText = esIngreso ? 'text-emerald-600' : 'text-rose-600';
  const accentIcon = esIngreso ? 'text-emerald-600' : 'text-rose-600';
  const accentBtn = esIngreso
    ? 'bg-emerald-600 hover:bg-emerald-700'
    : 'bg-rose-600 hover:bg-rose-700';

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
            className="relative w-full max-w-[92vw] sm:max-w-md
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

            <div className="relative z-10 p-5 sm:p-6">
              <div className="mb-5 flex items-center gap-3">
                {esIngreso ? (
                  <TrendingUp className={`h-6 w-6 ${accentIcon} shrink-0`} />
                ) : (
                  <TrendingDown className={`h-6 w-6 ${accentIcon} shrink-0`} />
                )}
                <h3 className="text-xl font-bold tracking-tight text-slate-900">
                  {isEdit ? 'Editar movimiento' : esIngreso ? 'Nuevo ingreso' : 'Nuevo egreso'}
                </h3>
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
                    <label className={labelCls}>
                      <Wallet className="h-4 w-4 text-slate-400" />
                      Monto <span className={accentText}>*</span>
                    </label>
                    <input
                      name="monto"
                      type="number"
                      onWheel={blockWheelChange}
                      step="0.01"
                      value={form.monto}
                      onChange={handle}
                      className={inputCls}
                      placeholder="0.00"
                    />
                    {errors.monto && (
                      <p className="mt-1 text-sm text-rose-600">{errors.monto}</p>
                    )}
                  </motion.div>

                  <motion.div variants={fieldV}>
                    <label className={labelCls}>
                      <Calendar className="h-4 w-4 text-slate-400" />
                      Fecha <span className={accentText}>*</span>
                    </label>
                    <input
                      name="fecha"
                      type="date"
                      value={form.fecha}
                      onChange={handle}
                      className={inputCls}
                    />
                    {errors.fecha && (
                      <p className="mt-1 text-sm text-rose-600">{errors.fecha}</p>
                    )}
                  </motion.div>
                </div>

                <motion.div variants={fieldV}>
                  <label className={labelCls}>
                    <CreditCard className="h-4 w-4 text-slate-400" />
                    Medio de pago <span className={accentText}>*</span>
                  </label>
                  <select
                    name="medio_pago"
                    value={form.medio_pago}
                    onChange={handle}
                    className={inputCls}
                  >
                    <option value="">Seleccionar…</option>
                    {MEDIOS_PAGO.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                  {errors.medio_pago && (
                    <p className="mt-1 text-sm text-rose-600">{errors.medio_pago}</p>
                  )}
                </motion.div>

                <motion.div variants={fieldV}>
                  <label className={labelCls}>
                    <StickyNote className="h-4 w-4 text-slate-400" />
                    Descripción <span className={accentText}>*</span>
                  </label>
                  <textarea
                    name="descripcion"
                    rows={2}
                    value={form.descripcion}
                    onChange={handle}
                    className={`${inputCls} resize-y`}
                    placeholder={esIngreso ? 'Ej: reintegro, aporte de capital…' : 'Ej: retiro, ajuste…'}
                  />
                  {errors.descripcion && (
                    <p className="mt-1 text-sm text-rose-600">{errors.descripcion}</p>
                  )}
                </motion.div>

                <motion.div
                  variants={fieldV}
                  className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-1"
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
                    className={`px-4 py-2 rounded-xl ${accentBtn} text-white font-semibold
                               disabled:opacity-60 disabled:cursor-not-allowed transition`}
                  >
                    {saving ? 'Guardando…' : isEdit ? 'Guardar cambios' : esIngreso ? 'Registrar ingreso' : 'Registrar egreso'}
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
