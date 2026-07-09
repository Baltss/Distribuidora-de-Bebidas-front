// src/Components/Compras/CompraFormModal.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  backdropV,
  panelV,
  formContainerV,
  fieldV
} from '../../ui/animHelpers';
import { X, Truck, Calendar, FileText, Wallet, Plus, Trash2 } from 'lucide-react';
import SearchableSelect from '../Common/SearchableSelect';
import { listProveedores } from '../../api/proveedores.js';
import { listProductos } from '../../api/productos.js';
import moneyAR from '../../utils/money';

const todayISO = () => new Date().toISOString().slice(0, 10);

const emptyItem = () => ({ producto_id: '', cantidad: 1, costo_unit: '' });

export default function CompraFormModal({ open, onClose, onSubmit }) {
  const [saving, setSaving] = useState(false);
  const [proveedores, setProveedores] = useState([]);
  const [productos, setProductos] = useState([]);

  const [form, setForm] = useState({
    proveedor_id: '',
    fecha: todayISO(),
    nro_factura: '',
    tipo_pago: 'cuenta_corriente',
    observaciones: ''
  });
  const [items, setItems] = useState([emptyItem()]);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!open) return;
    setForm({
      proveedor_id: '',
      fecha: todayISO(),
      nro_factura: '',
      tipo_pago: 'cuenta_corriente',
      observaciones: ''
    });
    setItems([emptyItem()]);
    setErrors({});

    (async () => {
      try {
        const [provResp, prodResp] = await Promise.all([
          listProveedores({ estado: 'activo', limit: 200 }),
          listProductos({ estado: 'activo', limit: 500 })
        ]);
        setProveedores(provResp?.data || []);
        const prodRows = Array.isArray(prodResp) ? prodResp : prodResp?.data || [];
        setProductos(prodRows);
      } catch {
        // silencioso: los selects quedan vacíos si falla
      }
    })();
  }, [open]);

  const total = useMemo(
    () =>
      items.reduce(
        (acc, it) => acc + (Number(it.cantidad) || 0) * (Number(it.costo_unit) || 0),
        0
      ),
    [items]
  );

  const setItem = (idx, patch) => {
    setItems((arr) => arr.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  };

  const addItem = () => setItems((arr) => [...arr, emptyItem()]);
  const removeItem = (idx) =>
    setItems((arr) => (arr.length > 1 ? arr.filter((_, i) => i !== idx) : arr));

  const validate = () => {
    const e = {};
    if (!form.proveedor_id) e.proveedor_id = 'Seleccioná un proveedor';
    if (!form.fecha) e.fecha = 'La fecha es obligatoria';

    const itemErrors = items.map((it) => {
      const ie = {};
      if (!it.producto_id) ie.producto_id = 'Requerido';
      if (!Number.isInteger(Number(it.cantidad)) || Number(it.cantidad) <= 0)
        ie.cantidad = 'Debe ser un entero > 0';
      if (!(Number(it.costo_unit) >= 0)) ie.costo_unit = 'Debe ser ≥ 0';
      return ie;
    });
    if (itemErrors.some((ie) => Object.keys(ie).length)) e.items = itemErrors;

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    const payload = {
      proveedor_id: Number(form.proveedor_id),
      fecha: form.fecha,
      nro_factura: form.nro_factura?.trim() || null,
      tipo_pago: form.tipo_pago,
      observaciones: form.observaciones?.trim() || null,
      items: items.map((it) => ({
        producto_id: Number(it.producto_id),
        cantidad: Number(it.cantidad),
        costo_unit: Number(it.costo_unit)
      }))
    };

    try {
      setSaving(true);
      await onSubmit(payload);
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
          <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={onClose} />

          <motion.div
            variants={panelV}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="relative w-full max-w-[95vw] sm:max-w-3xl
                       max-h-[90vh] overflow-y-auto overscroll-contain
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

            <div className="relative z-10 p-5 sm:p-6 md:p-8">
              <div className="mb-5 sm:mb-6 flex items-center gap-3">
                <Truck className="h-6 w-6 text-gray-300 shrink-0" />
                <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                  Nueva compra
                </h3>
              </div>

              <motion.form
                onSubmit={submit}
                variants={formContainerV}
                initial="hidden"
                animate="visible"
                className="space-y-5"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <motion.div variants={fieldV}>
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-200 mb-2">
                      <Truck className="h-4 w-4 text-gray-400" />
                      Proveedor <span className="text-cyan-300">*</span>
                    </label>
                    <SearchableSelect
                      items={proveedores}
                      value={form.proveedor_id}
                      onChange={(id) => setForm((f) => ({ ...f, proveedor_id: id }))}
                      getOptionLabel={(p) => p?.razon_social ?? ''}
                      getOptionValue={(p) => p?.id}
                      placeholder="Seleccionar proveedor…"
                      portal
                    />
                    {errors.proveedor_id && (
                      <p className="mt-1 text-sm text-rose-300">{errors.proveedor_id}</p>
                    )}
                  </motion.div>

                  <motion.div variants={fieldV}>
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-200 mb-2">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      Fecha <span className="text-cyan-300">*</span>
                    </label>
                    <input
                      type="date"
                      value={form.fecha}
                      onChange={(e) => setForm((f) => ({ ...f, fecha: e.target.value }))}
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-3 text-white
                                 focus:outline-none focus:ring-2 focus:ring-cyan-300/40 focus:border-transparent"
                    />
                    {errors.fecha && (
                      <p className="mt-1 text-sm text-rose-300">{errors.fecha}</p>
                    )}
                  </motion.div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <motion.div variants={fieldV}>
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-200 mb-2">
                      <FileText className="h-4 w-4 text-gray-400" />
                      N° de factura (opcional)
                    </label>
                    <input
                      value={form.nro_factura}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, nro_factura: e.target.value }))
                      }
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-3 text-white
                                 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-300/40 focus:border-transparent"
                      placeholder="0001-00001234"
                    />
                  </motion.div>

                  <motion.div variants={fieldV}>
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-200 mb-2">
                      <Wallet className="h-4 w-4 text-gray-400" />
                      Tipo de pago
                    </label>
                    <select
                      value={form.tipo_pago}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, tipo_pago: e.target.value }))
                      }
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-3 text-black
                                 focus:outline-none focus:ring-2 focus:ring-cyan-300/40 focus:border-transparent"
                    >
                      <option value="cuenta_corriente">Cuenta corriente</option>
                      <option value="contado">Contado</option>
                    </select>
                  </motion.div>
                </div>

                <motion.div variants={fieldV}>
                  <label className="flex items-center justify-between text-sm font-medium text-gray-200 mb-2">
                    <span>Ítems de la compra</span>
                    <button
                      type="button"
                      onClick={addItem}
                      className="inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border border-white/10 hover:bg-white/10 transition"
                    >
                      <Plus className="h-3.5 w-3.5" /> Agregar ítem
                    </button>
                  </label>

                  <div className="space-y-2">
                    {items.map((it, idx) => {
                      const ie = errors.items?.[idx] || {};
                      return (
                        <div
                          key={idx}
                          className="grid grid-cols-1 sm:grid-cols-[1fr,110px,130px,auto] gap-2 items-start rounded-xl border border-white/10 bg-white/5 p-3"
                        >
                          <div>
                            <SearchableSelect
                              items={productos}
                              value={it.producto_id}
                              onChange={(id) => setItem(idx, { producto_id: id })}
                              getOptionLabel={(p) => `${p?.nombre ?? ''} (${p?.codigo_sku ?? ''})`}
                              getOptionValue={(p) => p?.id}
                              placeholder="Producto…"
                              portal
                            />
                            {ie.producto_id && (
                              <p className="mt-1 text-xs text-rose-300">{ie.producto_id}</p>
                            )}
                          </div>
                          <div>
                            <input
                              type="number"
                              min="1"
                              step="1"
                              value={it.cantidad}
                              onChange={(e) => setItem(idx, { cantidad: e.target.value })}
                              placeholder="Cant."
                              className="w-full rounded-lg border border-white/10 bg-white/5 px-2.5 py-2 text-white
                                         focus:outline-none focus:ring-2 focus:ring-cyan-300/40"
                            />
                            {ie.cantidad && (
                              <p className="mt-1 text-xs text-rose-300">{ie.cantidad}</p>
                            )}
                          </div>
                          <div>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={it.costo_unit}
                              onChange={(e) => setItem(idx, { costo_unit: e.target.value })}
                              placeholder="Costo unit."
                              className="w-full rounded-lg border border-white/10 bg-white/5 px-2.5 py-2 text-white
                                         focus:outline-none focus:ring-2 focus:ring-cyan-300/40"
                            />
                            {ie.costo_unit && (
                              <p className="mt-1 text-xs text-rose-300">{ie.costo_unit}</p>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => removeItem(idx)}
                            disabled={items.length === 1}
                            className="justify-self-end sm:justify-self-auto inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 text-rose-300 hover:bg-rose-500/10 disabled:opacity-40 disabled:cursor-not-allowed transition"
                            title="Quitar ítem"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-3 flex justify-end text-white">
                    <span className="text-sm text-gray-300 mr-2">Total:</span>
                    <span className="text-lg font-extrabold">{moneyAR(total)}</span>
                  </div>
                </motion.div>

                <motion.div variants={fieldV}>
                  <label className="text-sm font-medium text-gray-200 mb-2 block">
                    Observaciones (opcional)
                  </label>
                  <textarea
                    rows={2}
                    value={form.observaciones}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, observaciones: e.target.value }))
                    }
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-3 text-white
                               placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-300/40 focus:border-transparent resize-y"
                  />
                </motion.div>

                <motion.div
                  variants={fieldV}
                  className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-1"
                >
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 rounded-xl border border-white/10 text-gray-200 hover:bg-white/10 transition"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-500 text-white font-semibold
                               hover:brightness-110 disabled:opacity-60 disabled:cursor-not-allowed transition"
                  >
                    {saving ? 'Guardando…' : 'Registrar compra'}
                  </button>
                </motion.div>
              </motion.form>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
