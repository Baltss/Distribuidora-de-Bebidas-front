// src/Components/Ventas/ExportarVentasModal.jsx
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { backdropV, panelV } from '../../ui/animHelpers';
import { X, FileDown } from 'lucide-react';
import { listVentas } from '../../api/ventas';
import { moneyAR } from '../../utils/money';
import { showErrorSwal } from '../../ui/swal';

const csvEscape = (v) => {
  const s = v === null || v === undefined ? '' : String(v);
  if (/[",\n;]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
};

const fmtFechaCsv = (v) => {
  if (!v) return '';
  const d = new Date(v);
  if (isNaN(d.getTime())) return String(v);
  return d.toLocaleDateString('es-AR');
};

export default function ExportarVentasModal({ open, onClose }) {
  const [tipo, setTipo] = useState(''); // '' | contado | fiado | a_cuenta
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [estado, setEstado] = useState(''); // '' | confirmada | anulada
  const [exporting, setExporting] = useState(false);

  const exportar = async () => {
    setExporting(true);
    try {
      const params = { page: 1, limit: 5000, orderBy: 'fecha', orderDir: 'DESC' };
      if (tipo) params.tipo = tipo;
      if (desde) params.desde = desde;
      if (hasta) params.hasta = hasta;
      if (estado) params.estado = estado;

      const resp = await listVentas(params);
      const rows = resp?.data || [];

      if (!rows.length) {
        await showErrorSwal({
          title: 'Sin resultados',
          text: 'No hay ventas que coincidan con esos filtros.'
        });
        return;
      }

      const headers = [
        'ID',
        'Fecha',
        'Cliente',
        'Documento',
        'Vendedor',
        'Tipo',
        'Estado',
        'Total neto',
        'Monto a cuenta',
        'Saldo pendiente'
      ];

      const lines = [headers.map(csvEscape).join(';')];

      for (const v of rows) {
        const total = Number(v.total_neto || 0);
        const aCuenta = Number(v.monto_a_cuenta || 0);
        const saldo = Math.max(0, total - aCuenta);
        lines.push(
          [
            v.id,
            fmtFechaCsv(v.fecha),
            v.cliente?.nombre || '',
            v.cliente?.documento || '',
            v.vendedor?.nombre || '',
            v.tipo,
            v.estado,
            moneyAR(total),
            moneyAR(aCuenta),
            moneyAR(saldo)
          ]
            .map(csvEscape)
            .join(';')
        );
      }

      const csvContent = '﻿' + lines.join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const fecha = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = `ventas_${fecha}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      onClose();
    } catch (err) {
      const { mensajeError, tips } = err || {};
      await showErrorSwal({
        title: 'No se pudo exportar',
        text: mensajeError || 'Ocurrió un error inesperado',
        tips
      });
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
                <FileDown className="h-6 w-6 text-gray-300 shrink-0" />
                <h3 className="text-xl font-bold tracking-tight text-white">Exportar ventas</h3>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-200 mb-2">
                    Tipo de venta
                  </label>
                  <select
                    value={tipo}
                    onChange={(e) => setTipo(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-3 text-black
                               focus:outline-none focus:ring-2 focus:ring-cyan-300/40 focus:border-transparent"
                  >
                    <option value="" className="text-black">Todas</option>
                    <option value="contado" className="text-black">Contado</option>
                    <option value="fiado" className="text-black">Fiado</option>
                    <option value="a_cuenta" className="text-black">A cuenta</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-200 mb-2">Desde</label>
                    <input
                      type="date"
                      value={desde}
                      onChange={(e) => setDesde(e.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-3 text-white
                                 focus:outline-none focus:ring-2 focus:ring-cyan-300/40 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-200 mb-2">Hasta</label>
                    <input
                      type="date"
                      value={hasta}
                      onChange={(e) => setHasta(e.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-3 text-white
                                 focus:outline-none focus:ring-2 focus:ring-cyan-300/40 focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-200 mb-2">Estado</label>
                  <select
                    value={estado}
                    onChange={(e) => setEstado(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-3 text-black
                               focus:outline-none focus:ring-2 focus:ring-cyan-300/40 focus:border-transparent"
                  >
                    <option value="" className="text-black">Todos</option>
                    <option value="confirmada" className="text-black">Confirmada</option>
                    <option value="anulada" className="text-black">Anulada</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-6">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl border border-white/10 text-gray-200 hover:bg-white/10 transition"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={exportar}
                  disabled={exporting}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-500 text-white font-semibold
                             hover:brightness-110 disabled:opacity-60 disabled:cursor-not-allowed transition"
                >
                  {exporting ? 'Exportando…' : 'Exportar CSV'}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
