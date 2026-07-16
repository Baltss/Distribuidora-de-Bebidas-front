// src/Components/Proveedores/PagoProveedorFormModal.jsx
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  backdropV,
  panelV,
  formContainerV,
  fieldV
} from '../../ui/animHelpers';
import { X, Wallet, Calendar, CreditCard, StickyNote } from 'lucide-react';
import { createPagoProveedor } from '../../api/pagosProveedores.js';
import { showErrorSwal, showSuccessSwal, showWarnSwal } from '../../ui/swal';
import { blockWheelChange } from '../../utils/numberInput';

const todayISO = () => new Date().toISOString().slice(0, 10);

export default function PagoProveedorFormModal({
  open,
  onClose,
  proveedor,
  totalDeuda,
  onPagoRegistrado
}) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    monto: '',
    fecha: todayISO(),
    medio_pago: '',
    observaciones: ''
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (open) {
      setForm({
        monto: totalDeuda ? String(totalDeuda) : '',
        fecha: todayISO(),
        medio_pago: '',
        observaciones: ''
      });
      setErrors({});
    }
  }, [open, totalDeuda]);

  const handle = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const validate = () => {
    const e = {};
    const monto = Number(form.monto);
    if (!Number.isFinite(monto) || monto <= 0) {
      e.monto = 'El monto debe ser mayor a 0';
    }
    if (!form.fecha) e.fecha = 'La fecha es obligatoria';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      setSaving(true);
      await createPagoProveedor({
        proveedor_id: proveedor.id,
        fecha: form.fecha,
        total_pagado: Number(form.monto),
        medio_pago: form.medio_pago?.trim() || null,
        observaciones: form.observaciones?.trim() || null
      });
      await showSuccessSwal({ title: 'Pago registrado', text: 'El pago se aplicó correctamente.' });
      onPagoRegistrado?.();
      onClose();
    } catch (err) {
      const { code, mensajeError, tips } = err || {};
      if (code === 'BAD_REQUEST') {
        return showWarnSwal({ title: 'Datos inválidos', text: mensajeError, tips });
      }
      return showErrorSwal({
        title: 'No se pudo registrar el pago',
        text: mensajeError || 'Ocurrió un error inesperado',
        tips
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4"
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
              <motion.div
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-5 flex items-center gap-3"
              >
                <Wallet className="h-6 w-6 text-gray-300 shrink-0" />
                <h3 className="text-xl font-bold tracking-tight text-white">
                  Registrar pago
                </h3>
              </motion.div>

              <p className="text-sm text-gray-300 mb-4">
                Proveedor: <strong>{proveedor?.razon_social}</strong>
              </p>

              <motion.form
                onSubmit={submit}
                variants={formContainerV}
                initial="hidden"
                animate="visible"
                className="space-y-4"
              >
                <motion.div variants={fieldV}>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-200 mb-2">
                    <Wallet className="h-4 w-4 text-gray-400" />
                    Monto a pagar <span className="text-cyan-300">*</span>
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
                    Fecha <span className="text-cyan-300">*</span>
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

                <motion.div variants={fieldV}>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-200 mb-2">
                    <CreditCard className="h-4 w-4 text-gray-400" />
                    Medio de pago (opcional)
                  </label>
                  <input
                    name="medio_pago"
                    value={form.medio_pago}
                    onChange={handle}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-3 text-white
                               placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-300/40 focus:border-transparent"
                    placeholder="Efectivo, transferencia…"
                  />
                </motion.div>

                <motion.div variants={fieldV}>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-200 mb-2">
                    <StickyNote className="h-4 w-4 text-gray-400" />
                    Observaciones (opcional)
                  </label>
                  <textarea
                    name="observaciones"
                    rows={2}
                    value={form.observaciones}
                    onChange={handle}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-3 text-white
                               placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-300/40 focus:border-transparent resize-y"
                  />
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
                    {saving ? 'Guardando…' : 'Registrar pago'}
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
