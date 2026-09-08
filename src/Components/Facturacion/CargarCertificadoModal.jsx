// src/Components/Facturacion/CargarCertificadoModal.jsx
//
// Carga el certificado (.crt/.pem) que AFIP devolvió para un CSR ya
// generado. Se puede pegar el texto o elegir el archivo — nunca se pide
// ni se toca la clave privada acá (ya quedó guardada cifrada del lado
// del servidor desde que se generó el CSR).
import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Upload } from 'lucide-react';
import { backdropV, panelV } from '../../ui/animHelpers';
import { cargarCertificadoConfiguracionFiscal } from '../../api/facturacion';
import { showApiErrorSwal, showSuccessSwal } from '../../ui/swal';

export default function CargarCertificadoModal({ open, onClose, configuracion, onCargado }) {
  const [certificado, setCertificado] = useState('');
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    setCertificado('');
  }, [open]);

  const handleArchivo = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setCertificado(String(reader.result || ''));
    reader.readAsText(file);
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!certificado.trim()) return;
    try {
      setSaving(true);
      await cargarCertificadoConfiguracionFiscal(configuracion.id, certificado.trim());
      await showSuccessSwal({ title: 'Certificado cargado', text: 'Queda a la espera de aprobación.' });
      onCargado?.();
      onClose();
    } catch (err) {
      await showApiErrorSwal(err, { title: 'No se pudo cargar el certificado' });
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
            className="relative w-full max-w-[92vw] sm:max-w-lg rounded-2xl border border-slate-200 bg-white shadow-2xl"
          >
            <button
              onClick={onClose}
              className="absolute z-50 top-2.5 right-2.5 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 border border-slate-200 text-slate-500 hover:bg-slate-200 transition"
              aria-label="Cerrar"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="relative z-10 p-5 sm:p-6 md:p-8">
              <h3 className="text-xl font-bold tracking-tight text-slate-900 mb-2">
                Cargar certificado de AFIP
              </h3>
              <p className="text-sm text-slate-500 mb-5">
                Pegá el contenido del certificado (.crt/.pem) que te dio AFIP, o elegí el archivo.
              </p>
              <form onSubmit={submit} className="space-y-4">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition"
                >
                  <Upload className="h-4 w-4" /> Elegir archivo
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".crt,.pem,.cer,.txt"
                  className="hidden"
                  onChange={handleArchivo}
                />
                <textarea
                  value={certificado}
                  onChange={(e) => setCertificado(e.target.value)}
                  rows={8}
                  placeholder="-----BEGIN CERTIFICATE-----&#10;...&#10;-----END CERTIFICATE-----"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-xs font-mono text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-400/40"
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
                    disabled={saving || !certificado.trim()}
                    className="px-4 py-2 rounded-xl bg-teal-600 text-white font-semibold hover:bg-teal-700 disabled:opacity-60 transition"
                  >
                    {saving ? 'Cargando…' : 'Cargar certificado'}
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
