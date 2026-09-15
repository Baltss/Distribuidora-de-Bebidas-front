// src/Components/Caja/EditarSaldoInicialModal.jsx
import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { backdropV, panelV, formContainerV, fieldV } from '../../ui/animHelpers';
import { X, Pencil, Wallet, StickyNote, AlertTriangle } from 'lucide-react';
import { blockWheelChange } from '../../utils/numberInput';
import moneyAR from '../../utils/money';
import { formatFechaCalendario } from '../../utils/fechaCalendario';

const inputCls =
  'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-400/40 focus:border-transparent';
const labelCls = 'flex items-center gap-2 text-sm font-medium text-slate-600 mb-2';

// Corrección del saldo inicial de la caja abierta de hoy: sólo
// Administrador. Exige el nuevo saldo y el motivo del cambio, ambos
// obligatorios, para dejar trazabilidad de la corrección.
export default function EditarSaldoInicialModal({ open, onClose, onSubmit, caja }) {
  const [saving, setSaving] = useState(false);
  const [saldoNuevo, setSaldoNuevo] = useState('');
  const [motivo, setMotivo] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setSaldoNuevo(caja?.saldo_inicial != null ? String(caja.saldo_inicial) : '');
      setMotivo('');
      setError('');
    }
  }, [open, caja?.id]);

  const submit = async (e) => {
    e.preventDefault();
    setError('');

    const num = Number(saldoNuevo);
    if (saldoNuevo === '' || !Number.isFinite(num) || num < 0) {
      setError('Ingresá el nuevo saldo inicial (mayor o igual a 0).');
      return;
    }
    if (!motivo.trim()) {
      setError('Contá el motivo de la corrección.');
      return;
    }

    try {
      setSaving(true);
      await onSubmit({
        saldo_inicial_nuevo: num,
        motivo: motivo.trim()
      });
      onClose();
    } catch (err) {
      setError(err?.mensajeError || 'No se pudo corregir el saldo inicial.');
    } finally {
      setSaving(false);
    }
  };

  return createPortal(
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
                <Pencil className="h-6 w-6 text-teal-600 shrink-0" />
                <h3 className="text-xl font-bold tracking-tight text-slate-900">
                  Corregir saldo inicial {caja?.fecha_jornada ? `del ${formatFechaCalendario(caja.fecha_jornada)}` : ''}
                </h3>
              </div>

              <motion.form
                onSubmit={submit}
                variants={formContainerV}
                initial="hidden"
                animate="visible"
                className="space-y-4"
              >
                <motion.div variants={fieldV}>
                  <label className={labelCls}>
                    <Wallet className="h-4 w-4 text-slate-400" />
                    Saldo inicial actual: <span className="font-semibold text-slate-800">{moneyAR(caja?.saldo_inicial)}</span>
                  </label>
                  <label className={labelCls}>
                    Nuevo saldo inicial <span className="text-teal-600">*</span>
                  </label>
                  <input
                    type="number"
                    onWheel={blockWheelChange}
                    step="0.01"
                    value={saldoNuevo}
                    onChange={(e) => setSaldoNuevo(e.target.value)}
                    className={inputCls}
                    placeholder="0.00"
                  />
                </motion.div>

                <motion.div variants={fieldV}>
                  <label className={labelCls}>
                    <StickyNote className="h-4 w-4 text-slate-400" />
                    Motivo <span className="text-teal-600">*</span>
                  </label>
                  <textarea
                    rows={3}
                    value={motivo}
                    onChange={(e) => setMotivo(e.target.value)}
                    className={`${inputCls} resize-y`}
                    placeholder="Ej: error al abrir la caja, ajuste acordado con el dueño…"
                  />
                </motion.div>

                {error && (
                  <motion.div
                    variants={fieldV}
                    className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-3 text-sm text-rose-700"
                  >
                    <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </motion.div>
                )}

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
                    className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold
                               disabled:opacity-60 disabled:cursor-not-allowed transition"
                  >
                    {saving ? 'Guardando…' : 'Guardar corrección'}
                  </button>
                </motion.div>
              </motion.form>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
