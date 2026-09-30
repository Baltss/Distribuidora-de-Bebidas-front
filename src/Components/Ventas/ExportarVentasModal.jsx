// src/Components/Ventas/ExportarVentasModal.jsx
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { backdropV, panelV } from '../../ui/animHelpers';
import { X, FileDown } from 'lucide-react';
import Swal from 'sweetalert2';
import { abrirPdfAutenticado } from '../../api/facturacion';

const inputCls =
  'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-400/40 focus:border-transparent';
const labelCls = 'block text-sm font-medium text-slate-600 mb-2';

export default function ExportarVentasModal({ open, onClose }) {
  const [tipo, setTipo] = useState(''); // '' | contado | fiado | a_cuenta
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [estado, setEstado] = useState(''); // '' | confirmada | anulada
  const [exporting, setExporting] = useState(false);

  const exportar = async () => {
    setExporting(true);
    try {
      const params = new URLSearchParams();
      if (tipo) params.set('tipo', tipo);
      if (desde) params.set('desde', desde);
      if (hasta) params.set('hasta', hasta);
      if (estado) params.set('estado', estado);

      await abrirPdfAutenticado(`/ventas/export-pdf?${params.toString()}`);
      onClose();
    } catch (e) {
      Swal.fire({ icon: 'error', title: 'No se pudo abrir el PDF', text: e?.mensajeError || 'Ocurrió un error inesperado.' });
    } finally {
      setExporting(false);
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
                <FileDown className="h-6 w-6 text-orange-600 shrink-0" />
                <h3 className="text-xl font-bold tracking-tight text-slate-900">Exportar ventas</h3>
              </div>

              <div className="space-y-4">
                <div>
                  <label className={labelCls}>Tipo de venta</label>
                  <select
                    value={tipo}
                    onChange={(e) => setTipo(e.target.value)}
                    className={inputCls}
                  >
                    <option value="">Todas</option>
                    <option value="contado">Contado</option>
                    <option value="fiado">Fiado</option>
                    <option value="a_cuenta">A cuenta</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>Desde</label>
                    <input
                      type="date"
                      value={desde}
                      onChange={(e) => setDesde(e.target.value)}
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Hasta</label>
                    <input
                      type="date"
                      value={hasta}
                      onChange={(e) => setHasta(e.target.value)}
                      className={inputCls}
                    />
                  </div>
                </div>

                <div>
                  <label className={labelCls}>Estado</label>
                  <select
                    value={estado}
                    onChange={(e) => setEstado(e.target.value)}
                    className={inputCls}
                  >
                    <option value="">Todos</option>
                    <option value="confirmada">Confirmada</option>
                    <option value="anulada">Anulada</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-6">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={exportar}
                  disabled={exporting}
                  className="px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-semibold
                             disabled:opacity-60 disabled:cursor-not-allowed transition"
                >
                  {exporting ? 'Abriendo…' : 'Exportar PDF'}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
