// src/Components/Compras/CompraFormModal.jsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  backdropV,
  panelV,
  formContainerV,
  fieldV
} from '../../ui/animHelpers';
import {
  X,
  Truck,
  Calendar,
  FileText,
  Wallet,
  Plus,
  Trash2,
  UserPlus,
  PackagePlus,
  ScanLine
} from 'lucide-react';
import SearchableSelect from '../Common/SearchableSelect';
import { listProveedores, createProveedor } from '../../api/proveedores.js';
import { listProductos, createProducto } from '../../api/productos.js';
import moneyAR from '../../utils/money';
import ProveedorFormModal from '../Proveedores/ProveedorFormModal';
import ProductoFormModal from '../Productos/ProductoFormModal';
import { showErrorSwal } from '../../ui/swal';
import { blockWheelChange } from '../../utils/numberInput';
import { MEDIOS_PAGO } from '../../utils/mediosPago';
import {
  normalizeScanCode,
  findProductoByScan,
  fetchProductoByScan
} from '../../utils/barcodeScan';

const todayISO = () => new Date().toISOString().slice(0, 10);

// Key estable por ítem (no el índice del array): evita que, al insertar un
// ítem nuevo arriba de la lista, React "recicle" el DOM/estado interno de
// un SearchableSelect que en realidad pertenece a otra fila.
let itemKeySeq = 0;
const emptyItem = () => ({
  _key: ++itemKeySeq,
  producto_id: '',
  cantidad: 1,
  costo_unit: ''
});

export default function CompraFormModal({ open, onClose, onSubmit }) {
  const [saving, setSaving] = useState(false);
  const [proveedores, setProveedores] = useState([]);
  const [productos, setProductos] = useState([]);

  const [form, setForm] = useState({
    proveedor_id: '',
    fecha: todayISO(),
    nro_factura: '',
    tipo_pago: 'cuenta_corriente',
    medio_pago: '',
    monto_abonado: '',
    observaciones: ''
  });
  const [items, setItems] = useState([emptyItem()]);
  const [errors, setErrors] = useState({});

  // Escaneo de código de barras
  const [scanValue, setScanValue] = useState('');
  const [scanError, setScanError] = useState('');
  const scanInputRef = useRef(null);

  // Alta rápida desde los selectores
  const [provModalOpen, setProvModalOpen] = useState(false);
  const [prodModalItemIdx, setProdModalItemIdx] = useState(null);

  const cargarProveedores = async () => {
    const resp = await listProveedores({ estado: 'activo', limit: 200 });
    const rows = resp?.data || [];
    setProveedores(rows);
    return rows;
  };

  const cargarProductos = async () => {
    const resp = await listProductos({ estado: 'activo', limit: 500 });
    const rows = Array.isArray(resp) ? resp : resp?.data || [];
    setProductos(rows);
    return rows;
  };

  useEffect(() => {
    if (!open) return;
    setForm({
      proveedor_id: '',
      fecha: todayISO(),
      nro_factura: '',
      tipo_pago: 'cuenta_corriente',
      medio_pago: '',
      monto_abonado: '',
      observaciones: ''
    });
    setItems([emptyItem()]);
    setErrors({});
    setScanValue('');
    setScanError('');

    (async () => {
      try {
        await Promise.all([cargarProveedores(), cargarProductos()]);
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

  const esCuentaCorriente = form.tipo_pago === 'cuenta_corriente';
  const abonado = Number(form.monto_abonado) || 0;
  const saldoPendiente = Math.max(0, total - abonado);

  const setItem = (idx, patch) => {
    setItems((arr) => arr.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  };

  // Al elegir un producto, precargamos el costo con su último costo de compra.
  const onSelectProducto = (idx, productoId, lista = productos) => {
    const prod = lista.find((p) => String(p.id) === String(productoId));
    const patch = { producto_id: productoId };
    if (prod && prod.ultimo_costo_compra != null) {
      patch.costo_unit = String(prod.ultimo_costo_compra);
    }
    setItem(idx, patch);
  };

  // Ítems nuevos arriba del listado
  const addItem = () => setItems((arr) => [emptyItem(), ...arr]);
  const removeItem = (idx) =>
    setItems((arr) => (arr.length > 1 ? arr.filter((_, i) => i !== idx) : arr));

  // ======================================================
  // Escaneo de código de barras: busca el producto por EAN (o SKU como
  // respaldo) y suma 1 unidad — si ya está en el carrito, incrementa esa
  // línea; si no, la agrega arriba precargando el último costo conocido.
  // ======================================================
  const handleScan = async () => {
    const code = normalizeScanCode(scanValue);
    setScanValue('');
    if (!code) return;

    let prod = findProductoByScan(productos, code);
    if (!prod) prod = await fetchProductoByScan(code);
    if (!prod) {
      setScanError(`Producto no encontrado (código: ${code})`);
      scanInputRef.current?.focus();
      return;
    }
    setScanError('');
    setProductos((prev) =>
      prev.some((p) => String(p.id) === String(prod.id)) ? prev : [prod, ...prev]
    );

    setItems((prev) => {
      const idx = prev.findIndex((it) => String(it.producto_id) === String(prod.id));
      if (idx >= 0) {
        const actual = Number(prev[idx].cantidad) || 0;
        return prev.map((it, i) =>
          i === idx ? { ...it, cantidad: actual + 1 } : it
        );
      }

      const nuevaLinea = {
        ...emptyItem(),
        producto_id: prod.id,
        cantidad: 1,
        costo_unit: prod.ultimo_costo_compra != null ? String(prod.ultimo_costo_compra) : ''
      };

      // Reutilizamos la primera fila vacía si existe, si no la agregamos arriba
      const emptyIdx = prev.findIndex((it) => !it.producto_id);
      if (emptyIdx >= 0) {
        return prev.map((it, i) =>
          i === emptyIdx ? { ...nuevaLinea, _key: it._key } : it
        );
      }
      return [nuevaLinea, ...prev];
    });

    scanInputRef.current?.focus();
  };

  const validate = () => {
    const e = {};
    if (!form.proveedor_id) e.proveedor_id = 'Seleccioná un proveedor';
    if (!form.fecha) e.fecha = 'La fecha es obligatoria';
    if (form.tipo_pago === 'contado' && !form.medio_pago) {
      e.medio_pago = 'El medio de pago es obligatorio en compras al contado.';
    }

    const itemErrors = items.map((it) => {
      const ie = {};
      if (!it.producto_id) ie.producto_id = 'Requerido';
      if (!Number.isFinite(Number(it.cantidad)) || Number(it.cantidad) <= 0)
        ie.cantidad = 'Debe ser mayor a 0';
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
      medio_pago: form.tipo_pago === 'contado' ? form.medio_pago : null,
      monto_abonado: esCuentaCorriente ? abonado : 0,
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

  // Alta rápida de proveedor: crea y autoselecciona
  const onCrearProveedor = async (payload) => {
    try {
      const resp = await createProveedor(payload);
      const nuevo = resp?.proveedor;
      await cargarProveedores();
      if (nuevo?.id) setForm((f) => ({ ...f, proveedor_id: String(nuevo.id) }));
    } catch (err) {
      const { mensajeError, tips } = err || {};
      await showErrorSwal({
        title: 'No se pudo crear el proveedor',
        text: mensajeError || 'Ocurrió un error inesperado',
        tips
      });
      throw err; // que el modal no cierre si falló
    }
  };

  // Alta rápida de producto: crea, recarga y lo selecciona en el ítem que lo pidió
  const onCrearProducto = async (payload) => {
    try {
      const resp = await createProducto(payload);
      const nuevo = resp?.producto;
      const lista = await cargarProductos();
      if (nuevo?.id && prodModalItemIdx != null) {
        onSelectProducto(prodModalItemIdx, String(nuevo.id), lista);
      }
    } catch (err) {
      const { mensajeError, tips } = err || {};
      await showErrorSwal({
        title: 'No se pudo crear el producto',
        text: mensajeError || 'Ocurrió un error inesperado',
        tips
      });
      throw err;
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
            className="relative w-full max-w-[95vw] sm:max-w-3xl
                       max-h-[90vh] flex flex-col overscroll-contain
                       rounded-2xl border border-slate-200 bg-white shadow-2xl"
          >
            <button
              onClick={onClose}
              className="absolute z-50 top-2.5 right-2.5 inline-flex h-9 w-9 items-center justify-center rounded-lg
                         bg-slate-100 border border-slate-200 hover:bg-slate-200 transition"
              aria-label="Cerrar"
            >
              <X className="h-5 w-5 text-slate-500" />
            </button>

            <div className="relative z-10 flex flex-col flex-1 min-h-0">
              <div className="shrink-0 px-5 sm:px-6 md:px-8 pt-5 sm:pt-6 md:pt-8 mb-5 sm:mb-6 flex items-center gap-3">
                <Truck className="h-6 w-6 text-slate-500 shrink-0" />
                <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                  Nueva compra
                </h3>
              </div>

              <motion.form
                onSubmit={submit}
                variants={formContainerV}
                initial="hidden"
                animate="visible"
                className="flex flex-col flex-1 min-h-0"
              >
                <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-5 sm:px-6 md:px-8 space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <motion.div variants={fieldV}>
                    <label className="flex items-center justify-between gap-2 text-sm font-medium text-slate-600 mb-2">
                      <span className="flex items-center gap-2">
                        <Truck className="h-4 w-4 text-slate-500" />
                        Proveedor <span className="text-teal-600">*</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setProvModalOpen(true)}
                        className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-lg border border-teal-200 bg-teal-50 text-teal-700 hover:bg-teal-100 transition"
                      >
                        <UserPlus className="h-3.5 w-3.5" /> Nuevo
                      </button>
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
                      <p className="mt-1 text-sm text-rose-600">{errors.proveedor_id}</p>
                    )}
                  </motion.div>

                  <motion.div variants={fieldV}>
                    <label className="flex items-center gap-2 text-sm font-medium text-slate-600 mb-2">
                      <Calendar className="h-4 w-4 text-slate-500" />
                      Fecha <span className="text-teal-600">*</span>
                    </label>
                    <input
                      type="date"
                      value={form.fecha}
                      onChange={(e) => setForm((f) => ({ ...f, fecha: e.target.value }))}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-slate-800
                                 focus:outline-none focus:ring-2 focus:ring-teal-400/40 focus:border-transparent"
                    />
                    {errors.fecha && (
                      <p className="mt-1 text-sm text-rose-600">{errors.fecha}</p>
                    )}
                  </motion.div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <motion.div variants={fieldV}>
                    <label className="flex items-center gap-2 text-sm font-medium text-slate-600 mb-2">
                      <FileText className="h-4 w-4 text-slate-500" />
                      N° de factura (opcional)
                    </label>
                    <input
                      value={form.nro_factura}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, nro_factura: e.target.value }))
                      }
                      className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-slate-800
                                 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-400/40 focus:border-transparent"
                      placeholder="0001-00001234"
                    />
                  </motion.div>

                  <motion.div variants={fieldV}>
                    <label className="flex items-center gap-2 text-sm font-medium text-slate-600 mb-2">
                      <Wallet className="h-4 w-4 text-slate-500" />
                      Tipo de pago
                    </label>
                    <select
                      value={form.tipo_pago}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          tipo_pago: e.target.value,
                          ...(e.target.value === 'contado' ? {} : { medio_pago: '' })
                        }))
                      }
                      className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-slate-800
                                 focus:outline-none focus:ring-2 focus:ring-teal-400/40 focus:border-transparent"
                    >
                      <option value="cuenta_corriente">Cuenta corriente</option>
                      <option value="contado">Contado</option>
                    </select>
                  </motion.div>
                </div>

                {/* Medio de pago (solo compras al contado: mueven caja ahora) */}
                {form.tipo_pago === 'contado' && (
                  <motion.div variants={fieldV}>
                    <label className="flex items-center gap-2 text-sm font-medium text-slate-600 mb-2">
                      <Wallet className="h-4 w-4 text-slate-500" />
                      Medio de pago <span className="text-teal-600">*</span>
                    </label>
                    <select
                      value={form.medio_pago}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, medio_pago: e.target.value }))
                      }
                      className={`w-full rounded-xl border bg-white px-3.5 py-3 text-slate-800
                                 focus:outline-none focus:ring-2 focus:ring-teal-400/40 focus:border-transparent
                                 ${errors.medio_pago ? 'border-rose-300' : 'border-slate-200'}`}
                    >
                      <option value="">Seleccionar…</option>
                      {MEDIOS_PAGO.map((m) => (
                        <option key={m.value} value={m.value}>
                          {m.label}
                        </option>
                      ))}
                    </select>
                    {errors.medio_pago && (
                      <p className="mt-1 text-sm text-rose-600">{errors.medio_pago}</p>
                    )}
                  </motion.div>
                )}

                {/* Monto abonado (solo cuenta corriente) */}
                {esCuentaCorriente && (
                  <motion.div variants={fieldV}>
                    <label className="flex items-center gap-2 text-sm font-medium text-slate-600 mb-2">
                      <Wallet className="h-4 w-4 text-slate-500" />
                      Monto abonado ahora (opcional)
                    </label>
                    <input
                      type="number"
                      onWheel={blockWheelChange}
                      min="0"
                      step="1"
                      value={form.monto_abonado}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, monto_abonado: e.target.value }))
                      }
                      className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-slate-800
                                 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-400/40 focus:border-transparent"
                      placeholder="0.00"
                    />
                    <p className="mt-1 text-xs text-slate-500">
                      Saldo que quedará en cuenta corriente:{' '}
                      <span className="font-semibold text-slate-900">
                        {moneyAR(saldoPendiente)}
                      </span>
                    </p>
                  </motion.div>
                )}

                {/* Escaneo de código de barras */}
                <motion.div variants={fieldV}>
                  <label className="block text-sm font-medium text-slate-600 mb-2">
                    Escanear producto
                  </label>
                  <div className="relative">
                    <ScanLine className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-600" />
                    <input
                      ref={scanInputRef}
                      value={scanValue}
                      onChange={(e) => {
                        setScanValue(e.target.value);
                        if (scanError) setScanError('');
                      }}
                      onKeyDown={(e) => {
                        if (e.key !== 'Enter') return;
                        e.preventDefault();
                        e.stopPropagation();
                        handleScan();
                      }}
                      placeholder="Pasá el producto por el lector, o tipeá el código y Enter…"
                      className="w-full pl-9 pr-3.5 py-3 rounded-xl border border-slate-200 bg-white text-slate-800
                                 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-400/40 focus:border-transparent"
                    />
                  </div>
                  {scanError && (
                    <p className="mt-1 text-sm text-rose-600">{scanError}</p>
                  )}
                </motion.div>

                <motion.div variants={fieldV}>
                  <label className="flex items-center justify-between text-sm font-medium text-slate-600 mb-2">
                    <span>Ítems de la compra</span>
                    <button
                      type="button"
                      onClick={addItem}
                      className="inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition"
                    >
                      <Plus className="h-3.5 w-3.5" /> Agregar ítem
                    </button>
                  </label>

                  <div className="space-y-2">
                    {items.map((it, idx) => {
                      const ie = errors.items?.[idx] || {};
                      return (
                        <div
                          key={it._key}
                          className="grid grid-cols-1 sm:grid-cols-[1fr,110px,140px,auto] gap-2 items-start rounded-xl border border-slate-200 bg-slate-50 p-3"
                        >
                          <div>
                            <label className="block text-[10px] uppercase tracking-wide text-slate-500 mb-1">
                              Producto
                            </label>
                            <SearchableSelect
                              items={productos}
                              value={it.producto_id}
                              onChange={(id) => onSelectProducto(idx, id)}
                              getOptionLabel={(p) => `${p?.nombre ?? ''} (${p?.codigo_sku ?? ''})`}
                              getOptionValue={(p) => p?.id}
                              placeholder="Producto…"
                              portal
                            />
                            <button
                              type="button"
                              onClick={() => setProdModalItemIdx(idx)}
                              className="mt-1 inline-flex items-center gap-1 text-[11px] text-teal-600 hover:text-teal-700 transition"
                            >
                              <PackagePlus className="h-3.5 w-3.5" /> Nuevo producto
                            </button>
                            {ie.producto_id && (
                              <p className="mt-1 text-xs text-rose-600">{ie.producto_id}</p>
                            )}
                          </div>
                          <div>
                            <label className="block text-[10px] uppercase tracking-wide text-slate-500 mb-1">
                              Cantidad
                            </label>
                            <input
                              type="number"
                              onWheel={blockWheelChange}
                              min="0.001"
                              step="0.001"
                              value={it.cantidad}
                              onChange={(e) => setItem(idx, { cantidad: e.target.value })}
                              className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-slate-800
                                         focus:outline-none focus:ring-2 focus:ring-teal-400/40"
                            />
                            {ie.cantidad && (
                              <p className="mt-1 text-xs text-rose-600">{ie.cantidad}</p>
                            )}
                          </div>
                          <div>
                            <label className="block text-[10px] uppercase tracking-wide text-slate-500 mb-1">
                              Costo unitario
                            </label>
                            <input
                              type="number"
                              onWheel={blockWheelChange}
                              min="0"
                              step="1"
                              value={it.costo_unit}
                              onChange={(e) => setItem(idx, { costo_unit: e.target.value })}
                              className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-slate-800
                                         focus:outline-none focus:ring-2 focus:ring-teal-400/40"
                            />
                            {ie.costo_unit && (
                              <p className="mt-1 text-xs text-rose-600">{ie.costo_unit}</p>
                            )}
                          </div>
                          <div className="flex items-end h-full">
                            <button
                              type="button"
                              onClick={() => removeItem(idx)}
                              disabled={items.length === 1}
                              className="justify-self-end sm:justify-self-auto inline-flex h-9 w-9 items-center justify-center rounded-lg border border-rose-200 text-rose-500 hover:bg-rose-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
                              title="Quitar ítem"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>

                <motion.div variants={fieldV}>
                  <label className="text-sm font-medium text-slate-600 mb-2 block">
                    Observaciones (opcional)
                  </label>
                  <textarea
                    rows={2}
                    value={form.observaciones}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, observaciones: e.target.value }))
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-slate-800
                               placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-400/40 focus:border-transparent resize-y"
                  />
                </motion.div>
                </div>

                {/* Total + Acciones: fijo y siempre visible, no se pierde
                    abajo del todo cuando la compra tiene muchos ítems. */}
                <div className="shrink-0 border-t border-slate-200 bg-white px-5 sm:px-6 md:px-8 py-4
                                 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex items-center gap-2 text-slate-900">
                    <span className="text-sm text-slate-500">Total:</span>
                    <span className="text-lg font-extrabold">{moneyAR(total)}</span>
                  </div>
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
                      disabled={saving}
                      className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold
                                 hover:brightness-110 disabled:opacity-60 disabled:cursor-not-allowed transition"
                    >
                      {saving ? 'Guardando…' : 'Registrar compra'}
                    </button>
                  </div>
                </div>
              </motion.form>
            </div>
          </motion.div>

          {/* Alta rápida de proveedor */}
          <ProveedorFormModal
            open={provModalOpen}
            onClose={() => setProvModalOpen(false)}
            onSubmit={onCrearProveedor}
            initial={null}
          />

          {/* Alta rápida de producto */}
          <ProductoFormModal
            open={prodModalItemIdx != null}
            onClose={() => setProdModalItemIdx(null)}
            onSubmit={onCrearProducto}
            initial={null}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
