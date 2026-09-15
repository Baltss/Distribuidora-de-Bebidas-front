// src/Components/Ventas/EditarVentaModal.jsx
import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { backdropV, panelV, formContainerV, fieldV } from '../../ui/animHelpers';
import { X, Pencil, AlertTriangle } from 'lucide-react';
import { listClientes } from '../../api/clientes';
import { listVendedores } from '../../api/vendedores';
import SearchableSelect from '../Common/SearchableSelect';
import { MEDIOS_PAGO } from '../../utils/mediosPago';

const inputCls =
  'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-400/40 focus:border-transparent';
const labelCls = 'flex items-center gap-2 text-sm font-medium text-slate-600 mb-2';

const toFechaInput = (v) => {
  if (!v) return '';
  const s = String(v);
  return s.slice(0, 10); // 'YYYY-MM-DD' de un ISO datetime, o tal cual si ya viene así
};

// Corrección de una venta ya cargada: cliente, vendedor, fecha, tipo,
// medio de pago y observaciones. Disponible para cualquier rol (incluido
// vendedor) — el backend (PUT /ventas/:id) no restringe por rol.
// No toca ítems, canal ni estado: eso sigue por sus flujos propios
// (anular, reparto, etc.) para no pisarlos.
export default function EditarVentaModal({ open, onClose, onSubmit, venta }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [clientes, setClientes] = useState([]);
  const [vendedores, setVendedores] = useState([]);

  const [clienteId, setClienteId] = useState('');
  const [vendedorId, setVendedorId] = useState('');
  const [fecha, setFecha] = useState('');
  const [tipo, setTipo] = useState('contado');
  const [medioPago, setMedioPago] = useState('');
  const [observaciones, setObservaciones] = useState('');

  const requiereMedioPago = tipo === 'contado' || tipo === 'a_cuenta';

  useEffect(() => {
    if (!open) return;
    setError('');
    setClienteId(venta?.cliente_id ?? venta?.cliente?.id ?? '');
    setVendedorId(venta?.vendedor_id ?? venta?.vendedor?.id ?? '');
    setFecha(toFechaInput(venta?.fecha));
    setTipo(venta?.tipo || 'contado');
    setMedioPago(venta?.medio_pago || '');
    setObservaciones(venta?.observaciones || '');

    (async () => {
      try {
        const [vRes, cRes] = await Promise.all([
          listVendedores({ estado: 'activo', orderBy: 'nombre', orderDir: 'ASC', limit: 1000 }),
          listClientes({ estado: 'activo', orderBy: 'nombre', orderDir: 'ASC', limit: 2000 })
        ]);
        setVendedores(Array.isArray(vRes) ? vRes : vRes?.data || []);
        setClientes(Array.isArray(cRes) ? cRes : cRes?.data || []);
      } catch {
        // los selects quedan vacíos si falla, sin romper el modal
      }
    })();
  }, [open, venta?.id]);

  const submit = async (e) => {
    e.preventDefault();
    setError('');

    if (!clienteId || !vendedorId) {
      setError('Cliente y vendedor son obligatorios.');
      return;
    }
    if (!fecha) {
      setError('La fecha es obligatoria.');
      return;
    }
    if (requiereMedioPago && !medioPago) {
      setError('El medio de pago es obligatorio para este tipo de venta.');
      return;
    }

    try {
      setSaving(true);
      await onSubmit({
        cliente_id: Number(clienteId),
        vendedor_id: Number(vendedorId),
        fecha,
        tipo,
        medio_pago: requiereMedioPago ? medioPago : null,
        observaciones: observaciones.trim() || null
      });
      onClose();
    } catch (err) {
      setError(err?.mensajeError || 'No se pudo guardar la corrección.');
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
            className="relative w-full max-w-[92vw] sm:max-w-lg
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
                  Editar venta #{venta?.id}
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
                  <SearchableSelect
                    label="Cliente *"
                    items={clientes}
                    value={clienteId}
                    onChange={setClienteId}
                    getOptionLabel={(c) => c?.nombre ?? ''}
                    getOptionValue={(c) => c?.id}
                    placeholder="Elegí un cliente…"
                  />
                </motion.div>

                <motion.div variants={fieldV}>
                  <SearchableSelect
                    label="Vendedor *"
                    items={vendedores}
                    value={vendedorId}
                    onChange={setVendedorId}
                    getOptionLabel={(v) => v?.nombre ?? ''}
                    getOptionValue={(v) => v?.id}
                    placeholder="Elegí un vendedor…"
                  />
                </motion.div>

                <motion.div variants={fieldV} className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>
                      Fecha <span className="text-teal-600">*</span>
                    </label>
                    <input
                      type="date"
                      value={fecha}
                      onChange={(e) => setFecha(e.target.value)}
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>
                      Tipo <span className="text-teal-600">*</span>
                    </label>
                    <select value={tipo} onChange={(e) => setTipo(e.target.value)} className={inputCls}>
                      <option value="contado">Contado</option>
                      <option value="fiado">Fiado</option>
                      <option value="a_cuenta">A cuenta</option>
                    </select>
                  </div>
                </motion.div>

                {requiereMedioPago && (
                  <motion.div variants={fieldV}>
                    <label className={labelCls}>
                      Medio de pago <span className="text-teal-600">*</span>
                    </label>
                    <select
                      value={medioPago}
                      onChange={(e) => setMedioPago(e.target.value)}
                      className={inputCls}
                    >
                      <option value="">Elegí un medio…</option>
                      {MEDIOS_PAGO.map((m) => (
                        <option key={m.value} value={m.value}>
                          {m.label}
                        </option>
                      ))}
                    </select>
                  </motion.div>
                )}

                <motion.div variants={fieldV}>
                  <label className={labelCls}>Observaciones</label>
                  <textarea
                    rows={3}
                    value={observaciones}
                    onChange={(e) => setObservaciones(e.target.value)}
                    className={`${inputCls} resize-y`}
                    placeholder="Motivo de la corrección (opcional)…"
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
                    {saving ? 'Guardando…' : 'Guardar cambios'}
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
