// FILE: src/Components/Cobranzas/SeleccionarClienteDeudaModal.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Search, Users } from 'lucide-react';
import {
  backdropV,
  panelV,
  formContainerV,
  fieldV
} from '../../ui/animHelpers';
import { listClientesConDeudaFiado } from '../../api/cobranzasClientes';

export default function SeleccionarClienteDeudaModal({
  open,
  onClose,
  onSelect
}) {
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState('');
  const [selectedId, setSelectedId] = useState(null);

  // Reset + carga solo deudores al abrir
  useEffect(() => {
    if (!open) return;
    setQ('');
    setSelectedId(null);

    (async () => {
      try {
        setLoading(true);

        const resp = await listClientesConDeudaFiado();
        // resp = array de deudores [{ cliente_id, nombre, documento, telefono, email, total_pendiente, ... }]
        const rows = (Array.isArray(resp) ? resp : []).map((d) => ({
          id: d.cliente_id, // 👈 importantísimo
          nombre: d.nombre,
          documento: d.documento,
          telefono: d.telefono,
          email: d.email,
          total_pendiente: d.total_pendiente
        }));

        setClientes(rows);
      } catch (err) {
        console.error('Error cargando clientes con deuda para CxC:', err);
        setClientes([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [open]);

  const handleClose = () => {
    if (loading) return;
    onClose?.();
  };

  // Filtro local por nombre/documento
  const filtrados = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return clientes;
    return clientes.filter((c) => {
      const nom = (c.nombre || '').toLowerCase();
      const doc = (c.documento || '').toLowerCase();
      return nom.includes(term) || doc.includes(term);
    });
  }, [clientes, q]);

  const handleConfirm = () => {
    if (!selectedId) return;
    const cli = clientes.find((c) => String(c.id) === String(selectedId));
    if (!cli) return;

    // id + objeto completo (ya con total_pendiente si lo querés usar a futuro)
    onSelect?.(cli.id, cli);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[55] flex items-center justify-center p-3 sm:p-4"
          variants={backdropV}
          initial="hidden"
          animate="visible"
          exit="exit"
          role="dialog"
          aria-modal="true"
        >
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={handleClose}
          />

          <motion.div
            variants={panelV}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="relative w-full max-w-[95vw] sm:max-w-lg md:max-w-xl
                       max-h-[90vh] overflow-y-auto overscroll-contain
                       rounded-3xl border border-slate-200 bg-white shadow-2xl"
          >
            {/* Cerrar */}
            <button
              onClick={handleClose}
              className="absolute z-50 top-2.5 right-2.5 inline-flex h-9 w-9 items-center justify-center rounded-xl
                         bg-slate-100 border border-slate-200 hover:bg-slate-200 transition disabled:opacity-50"
              aria-label="Cerrar"
              disabled={loading}
            >
              <X className="h-5 w-5 text-slate-500" />
            </button>

            <div className="relative z-10 p-5 sm:p-6 md:p-7">
              {/* Header */}
              <motion.div
                variants={formContainerV}
                initial="hidden"
                animate="visible"
                className="mb-4 sm:mb-5"
              >
                <motion.h2
                  variants={fieldV}
                  className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2"
                >
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-emerald-50 border border-emerald-200">
                    <Users className="h-5 w-5 text-emerald-600" />
                  </span>
                  Cobrar fiado a cliente
                </motion.h2>

                <motion.p
                  variants={fieldV}
                  className="mt-2 text-xs sm:text-sm text-slate-500"
                >
                  Elegí entre los clientes que hoy tienen deuda pendiente.
                </motion.p>
              </motion.div>

              {/* Buscador */}
              <motion.div
                variants={formContainerV}
                initial="hidden"
                animate="visible"
                className="space-y-4"
              >
                <motion.div variants={fieldV} className="relative">
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">
                    Cliente
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600">
                      <Search className="h-4 w-4" />
                    </span>
                    <input
                      type="text"
                      value={q}
                      onChange={(e) => setQ(e.target.value)}
                      placeholder="Buscar por nombre o DNI/CUIT…"
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-800
                                 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/40 focus:border-transparent"
                    />
                  </div>
                  <p className="mt-1 text-[11px] text-slate-600">
                    {filtrados.length} cliente(s) con deuda encontrados
                  </p>
                </motion.div>

                {/* Lista de clientes (solo con deuda) */}
                <motion.div
                  variants={fieldV}
                  className="max-h-[260px] overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50 px-2 py-2"
                >
                  {loading ? (
                    <div className="py-8 flex flex-col items-center gap-2 text-xs text-slate-500">
                      <div className="h-6 w-6 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
                      Cargando clientes con deuda…
                    </div>
                  ) : filtrados.length === 0 ? (
                    <div className="py-6 text-xs text-slate-600 text-center">
                      No hay clientes con deuda fiado pendiente. 👌
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {filtrados.map((c) => {
                        const isSelected = String(selectedId) === String(c.id);
                        return (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => setSelectedId(c.id)}
                            className={`w-full text-left rounded-xl px-3 py-2 text-xs sm:text-sm
                                        border transition-all flex flex-col gap-0.5
                                        ${
                                          isSelected
                                            ? 'border-emerald-400 bg-emerald-50 ring-1 ring-emerald-300'
                                            : 'border-slate-200 bg-white hover:border-emerald-300 hover:bg-slate-50'
                                        }`}
                          >
                            <span className="font-semibold text-slate-800 truncate">
                              {c.nombre}
                            </span>
                            <span className="text-[11px] text-slate-500 truncate">
                              {c.documento
                                ? `DNI/CUIT: ${c.documento}`
                                : 'Sin documento'}
                            </span>
                            {c.telefono && (
                              <span className="text-[11px] text-slate-600 truncate">
                                Tel: {c.telefono}
                              </span>
                            )}
                            {typeof c.total_pendiente === 'number' && (
                              <span className="text-[11px] text-emerald-600 truncate">
                                Deuda: $
                                {c.total_pendiente.toLocaleString('es-AR', {
                                  minimumFractionDigits: 2
                                })}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </motion.div>

                {/* Seleccionado */}
                <motion.div
                  variants={fieldV}
                  className="text-xs text-slate-500"
                >
                  <span className="font-semibold text-slate-600">Seleccionado: </span>
                  {selectedId
                    ? (() => {
                        const c = clientes.find(
                          (x) => String(x.id) === String(selectedId)
                        );
                        return c ? `${c.nombre} · ${c.documento || '—'}` : '—';
                      })()
                    : 'Ninguno'}
                </motion.div>

                {/* Botones */}
                <motion.div
                  variants={fieldV}
                  className="flex flex-col sm:flex-row justify-end gap-2 pt-1"
                >
                  <button
                    type="button"
                    onClick={handleClose}
                    className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-sm hover:bg-slate-50 transition"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    disabled={!selectedId || loading}
                    onClick={handleConfirm}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold
                               disabled:opacity-60 disabled:cursor-not-allowed transition"
                  >
                    Ver deuda y cobrar
                  </button>
                </motion.div>
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
