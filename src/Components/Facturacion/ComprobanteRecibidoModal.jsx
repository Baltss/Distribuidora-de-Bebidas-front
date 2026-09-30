// src/Components/Facturacion/ComprobanteRecibidoModal.jsx
// Alta / edición de una factura (o nota) de un proveedor que no viene de una
// compra de mercadería —servicios, gastos— para que entre al Libro IVA Compras.
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { backdropV, panelV } from '../../ui/animHelpers';
import DatosFiscalesCompra from './DatosFiscalesCompra';
import useCatalogoFiscal from '../../hooks/useCatalogoFiscal';
import useEstadoEmision from '../../hooks/useEstadoEmision';
import { errorFiscal, fiscalDesdeComprobante, fiscalVacio, payloadFiscal } from '../../utils/comprobantesRecibidos';

const hoy = () => new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString().slice(0, 10);

export default function ComprobanteRecibidoModal({ open, onClose, onSubmit, comprobante = null, emisorId = null }) {
  const catalogo = useCatalogoFiscal();
  const cantidadEmisores = useEstadoEmision()?.emisores?.length || 1;
  const [form, setForm] = useState(() => fiscalVacio(hoy()));
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setError('');
    setForm(comprobante ? fiscalDesdeComprobante(comprobante) : { ...fiscalVacio(hoy()), emisor_id: emisorId ? String(emisorId) : '' });
  }, [open, comprobante, emisorId]);

  const submit = async (e) => {
    e.preventDefault();
    const ef = errorFiscal(form, catalogo, { conProveedor: true, cantidadEmisores });
    if (ef) return setError(ef);
    setError('');
    try {
      setSaving(true);
      await onSubmit(payloadFiscal(form, catalogo, { conProveedor: true }));
      onClose();
    } catch {
      // el motivo ya se mostró: el modal queda abierto para corregirlo
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4" variants={backdropV} initial="hidden" animate="visible" exit="exit" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
          <motion.div variants={panelV} initial="hidden" animate="visible" exit="exit" className="relative w-full max-w-[92vw] sm:max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <button onClick={onClose} className="absolute z-50 top-2.5 right-2.5 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 border border-slate-200 text-slate-500 hover:bg-slate-200 transition" aria-label="Cerrar">
              <X className="h-5 w-5" />
            </button>
            <form onSubmit={submit} className="p-5 sm:p-6">
              <h3 className="text-lg font-bold tracking-tight text-slate-900 mb-1">{comprobante ? 'Editar comprobante de compra' : 'Nuevo comprobante de compra'}</h3>
              <p className="text-xs text-slate-500 mb-4">Facturas y notas de proveedores (servicios, gastos…). Las de mercadería se cargan desde la compra.</p>
              <DatosFiscalesCompra value={form} onChange={setForm} conProveedor disabled={saving} />
              {error && <p className="mt-3 text-sm text-rose-600">{error}</p>}
              <div className="flex justify-end gap-2 pt-4">
                <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition">
                  Cancelar
                </button>
                <button type="submit" disabled={saving} className="px-4 py-2 rounded-xl bg-teal-600 text-white font-semibold hover:bg-teal-700 disabled:opacity-60 transition">
                  {saving ? 'Guardando…' : 'Guardar'}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
