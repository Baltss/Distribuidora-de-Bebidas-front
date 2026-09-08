// src/Components/Facturacion/SolicitarConfiguracionFiscalModal.jsx
//
// Formulario para pedir un alta/cambio de Datos Fiscales. Al enviar, el
// backend genera automáticamente el par de claves + CSR (el socio nunca
// maneja la clave privada) y la solicitud queda pendiente de aprobación
// de Soldi. Este modal muestra el CSR resultante para que se descargue
// y lo suba a AFIP.
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Download, Copy } from 'lucide-react';
import { backdropV, panelV, formContainerV, fieldV } from '../../ui/animHelpers';
import { solicitarConfiguracionFiscal } from '../../api/facturacion';
import { showErrorSwal, showSuccessSwal, showApiErrorSwal } from '../../ui/swal';

const inputCls =
  'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-400/40 focus:border-transparent';
const labelCls = 'block text-sm font-medium text-slate-600 mb-2';

const defaultForm = {
  cuit: '',
  razon_social: '',
  condicion_fiscal: 'responsable_inscripto',
  ambiente: 'homologacion'
};

export default function SolicitarConfiguracionFiscalModal({ open, onClose, onSolicitado }) {
  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);
  const [csrResultado, setCsrResultado] = useState(null); // { id, csr }

  useEffect(() => {
    if (!open) return;
    setForm(defaultForm);
    setCsrResultado(null);
  }, [open]);

  const handle = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const submit = async (e) => {
    e.preventDefault();
    const cuitLimpio = form.cuit.replace(/\D/g, '');
    if (cuitLimpio.length !== 11) {
      await showErrorSwal({ title: 'CUIT inválido', text: 'El CUIT debe tener 11 dígitos (sin guiones).' });
      return;
    }
    try {
      setSaving(true);
      const resp = await solicitarConfiguracionFiscal({ ...form, cuit: cuitLimpio });
      setCsrResultado({ id: resp.id, csr: resp.csr });
      onSolicitado?.();
    } catch (err) {
      await showApiErrorSwal(err, { title: 'No se pudo enviar la solicitud' });
    } finally {
      setSaving(false);
    }
  };

  const descargarCsr = () => {
    const blob = new Blob([csrResultado.csr], { type: 'application/x-pem-file' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `solicitud-certificado-${csrResultado.id}.csr`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const copiarCsr = async () => {
    try {
      await navigator.clipboard.writeText(csrResultado.csr);
      await showSuccessSwal({ title: 'Copiado', text: 'El CSR se copió al portapapeles.' });
    } catch {
      await showErrorSwal({ title: 'No se pudo copiar', text: 'Copiá el texto manualmente.' });
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
            className="relative w-full max-w-[92vw] sm:max-w-xl max-h-[85vh] overflow-y-auto overscroll-contain rounded-2xl border border-slate-200 bg-white shadow-2xl"
          >
            <button
              onClick={onClose}
              className="absolute z-50 top-2.5 right-2.5 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 border border-slate-200 text-slate-500 hover:bg-slate-200 transition"
              aria-label="Cerrar"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="relative z-10 p-5 sm:p-6 md:p-8">
              <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 mb-2">
                {csrResultado ? 'Solicitud enviada' : 'Solicitar cambio de Datos Fiscales'}
              </h3>

              {!csrResultado && (
                <>
                  <p className="text-sm text-slate-500 mb-5">
                    Completá los datos de tu negocio. El sistema va a generar automáticamente el
                    certificado a pedir a AFIP — no necesitás usar openssl ni manejar ninguna clave.
                    La solicitud queda pendiente hasta que Soldi la apruebe.
                  </p>
                  <motion.form
                    onSubmit={submit}
                    variants={formContainerV}
                    initial="hidden"
                    animate="visible"
                    className="grid grid-cols-1 gap-4"
                  >
                    <motion.div variants={fieldV}>
                      <label className={labelCls}>CUIT</label>
                      <input
                        name="cuit"
                        value={form.cuit}
                        onChange={handle}
                        placeholder="20123456786"
                        className={inputCls}
                        required
                      />
                    </motion.div>
                    <motion.div variants={fieldV}>
                      <label className={labelCls}>Razón social</label>
                      <input
                        name="razon_social"
                        value={form.razon_social}
                        onChange={handle}
                        placeholder="Nombre del negocio"
                        className={inputCls}
                      />
                    </motion.div>
                    <motion.div variants={fieldV}>
                      <label className={labelCls}>Condición frente al IVA</label>
                      <select name="condicion_fiscal" value={form.condicion_fiscal} onChange={handle} className={inputCls}>
                        <option value="responsable_inscripto">Responsable Inscripto</option>
                        <option value="monotributista">Monotributista</option>
                      </select>
                    </motion.div>
                    <motion.div variants={fieldV}>
                      <label className={labelCls}>Ambiente</label>
                      <select name="ambiente" value={form.ambiente} onChange={handle} className={inputCls}>
                        <option value="homologacion">Homologación (pruebas)</option>
                        <option value="produccion">Producción</option>
                      </select>
                    </motion.div>
                    <motion.div variants={fieldV} className="flex justify-end gap-2 pt-1">
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
                        {saving ? 'Generando…' : 'Solicitar'}
                      </button>
                    </motion.div>
                  </motion.form>
                </>
              )}

              {csrResultado && (
                <div className="space-y-4">
                  <p className="text-sm text-slate-600">
                    Descargá este archivo (o copialo) y subilo en el portal de AFIP para pedir tu
                    certificado de Facturación Electrónica. Cuando AFIP te devuelva el certificado
                    (.crt), volvé acá y cargalo desde la fila de esta solicitud.
                  </p>
                  <textarea
                    readOnly
                    value={csrResultado.csr}
                    rows={8}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-xs font-mono text-slate-700"
                  />
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={descargarCsr}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-600 text-white font-semibold hover:bg-teal-700 transition"
                    >
                      <Download className="h-4 w-4" /> Descargar CSR
                    </button>
                    <button
                      type="button"
                      onClick={copiarCsr}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition"
                    >
                      <Copy className="h-4 w-4" /> Copiar
                    </button>
                    <button
                      type="button"
                      onClick={onClose}
                      className="ml-auto px-4 py-2 rounded-xl bg-slate-800 text-white font-semibold hover:bg-slate-900 transition"
                    >
                      Listo
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
