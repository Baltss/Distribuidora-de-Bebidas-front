// src/Components/Facturacion/EnviarWhatsAppModal.jsx
// Enviar un comprobante por WhatsApp: arma el mensaje con el link al PDF
// (link público firmado, no hace falta usuario) y abre WhatsApp con el
// chat del cliente. El teléfono y el mensaje se pueden corregir antes.
import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2, MessageCircle, Copy, Info } from 'lucide-react';
import { backdropV, panelV } from '../../ui/animHelpers';
import { getCompartirFactura } from '../../api/facturacion';
import { API_BASE_URL } from '../../api/apiBase';
import { showApiErrorSwal, showSuccessToast } from '../../ui/swal';
import { telefonoWhatsApp, formatearTelefonoWhatsApp, linkWhatsApp, mensajeComprobante } from '../../utils/whatsapp';

const inputCls =
  'w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-400/40';

export default function EnviarWhatsAppModal({ open, facturaId, onClose }) {
  const [datos, setDatos] = useState(null);
  const [telefono, setTelefono] = useState('');
  const [mensaje, setMensaje] = useState('');

  const link = datos ? `${API_BASE_URL.replace(/\/$/, '')}${datos.ruta}` : '';

  useEffect(() => {
    if (!open || !facturaId) return;
    setDatos(null);
    getCompartirFactura(facturaId)
      .then((d) => {
        setDatos(d);
        setTelefono(d.telefono_cargado || '');
        setMensaje(mensajeComprobante(d, `${API_BASE_URL.replace(/\/$/, '')}${d.ruta}`));
      })
      .catch(async (err) => {
        await showApiErrorSwal(err, { title: 'No se pudo preparar el envío' });
        onClose();
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, facturaId]);

  const telefonoWa = telefonoWhatsApp(telefono);
  const telefonoInvalido = telefono.trim() !== '' && !telefonoWa;

  const abrir = () => {
    window.open(linkWhatsApp(telefonoWa, mensaje), '_blank', 'noopener');
    onClose();
  };

  const copiarLink = async () => {
    try {
      await navigator.clipboard.writeText(link);
      showSuccessToast('Link copiado');
    } catch {
      window.prompt('Copiá el link:', link);
    }
  };

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-4"
          variants={backdropV}
          initial="hidden"
          animate="visible"
          exit="exit"
          role="dialog"
          aria-modal="true"
          aria-label="Enviar por WhatsApp"
        >
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            variants={panelV}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="relative w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-2xl"
          >
            <button
              onClick={onClose}
              className="absolute z-10 top-2.5 right-2.5 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 border border-slate-200 hover:bg-slate-200"
              aria-label="Cerrar"
            >
              <X className="h-5 w-5 text-slate-500" />
            </button>

            {!datos ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-teal-500" />
              </div>
            ) : (
              <>
                <div className="p-5 sm:p-6 border-b border-slate-100 pr-14">
                  <h3 className="flex items-center gap-2 text-xl font-bold text-slate-900">
                    <MessageCircle className="h-5 w-5 text-emerald-600" /> Enviar por WhatsApp
                  </h3>
                  <p className="mt-0.5 text-sm text-slate-500">{datos.comprobante}</p>
                </div>

                <div className="p-5 sm:p-6 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1">Teléfono del cliente</label>
                    <input
                      value={telefono}
                      onChange={(e) => setTelefono(e.target.value)}
                      inputMode="tel"
                      placeholder="Ej.: 381 555-1234"
                      className={`${inputCls} ${telefonoInvalido ? 'border-rose-300' : ''}`}
                    />
                    <p className={`mt-1 text-xs ${telefonoInvalido ? 'text-rose-600' : 'text-slate-500'}`}>
                      {telefonoWa
                        ? `Se abre el chat con ${formatearTelefonoWhatsApp(telefonoWa)}.`
                        : telefonoInvalido
                          ? 'No parece un celular argentino: poné característica y número (ej.: 381 555-1234).'
                          : 'Sin teléfono: WhatsApp te va a pedir que elijas el contacto.'}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1">Mensaje</label>
                    <textarea
                      rows={6}
                      value={mensaje}
                      onChange={(e) => setMensaje(e.target.value)}
                      className={`${inputCls} resize-none`}
                    />
                  </div>

                  <p className="flex items-start gap-2 text-xs text-slate-500">
                    <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    El link abre el PDF del comprobante sin usuario ni contraseña; sólo lo tiene quien recibe el mensaje.
                  </p>
                </div>

                <div className="border-t border-slate-200 px-5 sm:px-6 py-4 flex flex-wrap justify-end gap-2">
                  <button
                    onClick={copiarLink}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    <Copy className="h-4 w-4" /> Copiar link
                  </button>
                  <button
                    onClick={abrir}
                    disabled={telefonoInvalido || !mensaje.trim()}
                    className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                  >
                    <MessageCircle className="h-4 w-4" /> Abrir WhatsApp
                  </button>
                </div>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
