// src/Components/Facturacion/MotivoModal.jsx
//
// Modal chico para pedir un motivo de texto libre (usado al rechazar
// una solicitud de Datos Fiscales).
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { backdropV, panelV } from '../../ui/animHelpers';

export default function MotivoModal({ open, onClose, title, onConfirm, confirmText = 'Confirmar' }) {
  const [motivo, setMotivo] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setMotivo('');
  }, [open]);

  const submit = async (e) => {
    e.preventDefault();
    if (!motivo.trim()) return;
    try {
      setSaving(true);
      await onConfirm(motivo.trim());
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
              <h3 className="text-lg font-bold tracking-tight text-slate-900 mb-4">{title}</h3>
              <form onSubmit={submit} className="space-y-4">
                <textarea
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  rows={3}
                  autoFocus
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-400/40"
                  required
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={saving || !motivo.trim()}
                    className="px-4 py-2 rounded-xl bg-rose-600 text-white font-semibold hover:bg-rose-700 disabled:opacity-60 transition"
                  >
                    {saving ? 'Enviando…' : confirmText}
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
