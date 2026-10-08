// src/Components/Productos/ProductoFormModal.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  backdropV,
  panelV,
  formContainerV,
  fieldV
} from '../../ui/animHelpers';
import {
  X,
  Package,
  Tag,
  Barcode,
  Boxes,
  Hash,
  Ruler,
  Percent,
  StickyNote,
  Power,
  Layers,
  Plus,
  Check,
  DollarSign
} from 'lucide-react';
import { listCategorias, createCategoria } from '../../api/categorias';
import { showErrorSwal } from '../../ui/swal';
import { blockWheelChange } from '../../utils/numberInput';


const UM_OPTS = [
  { value: 'u', label: 'Unidad (u)' },
  { value: 'ml', label: 'Mililitros (ml)' },
  { value: 'l', label: 'Litros (l)' },
  { value: 'g', label: 'Gramos (g)' },
  { value: 'kg', label: 'Kilogramos (kg)' }
];

// Tratamientos de IVA que acepta ARCA. Exento y No gravado no son "0%":
// se informan en campos distintos del comprobante.
const OPCIONES_IVA = [
  { value: '21', label: '21% (general)' },
  { value: '10.5', label: '10,5%' },
  { value: '27', label: '27%' },
  { value: '5', label: '5%' },
  { value: '2.5', label: '2,5%' },
  { value: '0', label: '0%' },
  { value: 'exento', label: 'Exento' },
  { value: 'no_gravado', label: 'No gravado' }
];

const ivaInvalidoOriginal = (initial) =>
  !!initial?.id &&
  (initial.iva_condicion ?? 'gravado') === 'gravado' &&
  !OPCIONES_IVA.some((o) => o.value === String(Number(initial.iva_porcentaje)));

function ivaTratamientoInicial(initial) {
  if (!initial) return '21';
  if (initial.iva_condicion === 'exento' || initial.iva_condicion === 'no_gravado') {
    return initial.iva_condicion;
  }
  if (initial.iva_porcentaje == null) return '21';
  const v = String(Number(initial.iva_porcentaje));
  return OPCIONES_IVA.some((o) => o.value === v) ? v : '';
}

const ivaPayload = (tratamiento) =>
  tratamiento === 'exento' || tratamiento === 'no_gravado'
    ? { iva_condicion: tratamiento, iva_porcentaje: 0 }
    : { iva_condicion: 'gravado', iva_porcentaje: Number(tratamiento) };

const inputCls =
  'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-slate-800 ' +
  'placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-400/40 focus:border-transparent';
const labelCls = 'flex items-center gap-2 text-sm font-medium text-slate-700 mb-2';

export default function ProductoFormModal({
  open,
  onClose,
  onSubmit,
  initial
}) {
  const [saving, setSaving] = useState(false);
  const isEdit = !!initial?.id;
  const titleId = 'producto-modal-title';
  const formId = 'producto-form';

  const [form, setForm] = useState({
    nombre: '',
    categoria_id: '',
    codigo_sku: '',
    presentacion: 'unidad', // unidad | pack
    pack_cantidad: 1,
    stock_minimo: '',
    unidad_medida: 'u',
    contenido: '',
    barra_ean13: '',
    pre_prod: '',
    ultimo_costo_compra: '',
    margen_pct: '',
    iva_tratamiento: '21', // ver OPCIONES_IVA
    impuesto_interno_pct: '',
    estado: 'activo', // activo | inactivo
    notas: ''
  });

  //   - 16/07/2026 - Precio manual o calculado por % de margen sobre el costo
  const [modoPrecio, setModoPrecio] = useState('manual'); // 'manual' | 'margen'

  const [errors, setErrors] = useState({});

  // Categorías (dinámicas) + alta rápida sin salir del modal
  const [categorias, setCategorias] = useState([]);
  const [catNuevaOpen, setCatNuevaOpen] = useState(false);
  const [catNuevaNombre, setCatNuevaNombre] = useState('');
  const [catSaving, setCatSaving] = useState(false);

  const cargarCategorias = async () => {
    try {
      const resp = await listCategorias({ estado: 'activo' });
      setCategorias(resp?.data || []);
    } catch {
      // si falla, el select queda vacío pero no rompe el form
    }
  };

  const crearCategoriaRapida = async () => {
    const nombre = catNuevaNombre.trim();
    if (!nombre) return;
    try {
      setCatSaving(true);
      const resp = await createCategoria({ nombre });
      const nueva = resp?.categoria;
      await cargarCategorias();
      if (nueva?.id) {
        setForm((f) => ({ ...f, categoria_id: String(nueva.id) }));
      }
      setCatNuevaNombre('');
      setCatNuevaOpen(false);
    } catch (err) {
      const { code, mensajeError, tips } = err || {};
      await showErrorSwal({
        title: code === 'DUPLICATE' ? 'Categoría existente' : 'No se pudo crear',
        text: mensajeError || 'No se pudo crear la categoría',
        tips
      });
    } finally {
      setCatSaving(false);
    }
  };

  // Cargar/limpiar cuando abre
  useEffect(() => {
    if (open) {
      cargarCategorias();
      setCatNuevaOpen(false);
      setCatNuevaNombre('');
      setForm({
        nombre: initial?.nombre ?? '',
        categoria_id:
          initial?.categoria_id != null ? String(initial.categoria_id) : '',
        codigo_sku: initial?.codigo_sku ?? '',
        presentacion: initial?.presentacion ?? 'unidad',
        pack_cantidad:
          initial?.pack_cantidad ?? (initial?.presentacion === 'pack' ? 12 : 1),
        stock_minimo: initial?.stock_minimo ?? '',
        unidad_medida: initial?.unidad_medida ?? 'u',
        contenido: initial?.contenido ?? '',
        barra_ean13: initial?.barra_ean13 ?? '',
        pre_prod: initial?.pre_prod ?? '',
        ultimo_costo_compra: initial?.ultimo_costo_compra ?? '',
        margen_pct: initial?.margen_pct ?? '',
        iva_tratamiento: ivaTratamientoInicial(initial),
        impuesto_interno_pct: Number(initial?.impuesto_interno_pct) ? String(Number(initial.impuesto_interno_pct)) : '',
        estado: initial?.estado ?? 'activo',
        notas: initial?.notas ?? ''
      });
      setModoPrecio(initial?.margen_pct != null ? 'margen' : 'manual');
      setErrors({});
    }
  }, [open, initial]);

  //   - 16/07/2026 - En modo "por margen", el precio se recalcula solo
  // cuando cambia el costo o el %. El input de precio queda de solo lectura.
  useEffect(() => {
    if (modoPrecio !== 'margen') return;
    const costo = Number(form.ultimo_costo_compra);
    const margen = Number(form.margen_pct);
    if (!Number.isFinite(costo) || costo <= 0 || !Number.isFinite(margen)) {
      return;
    }
    const precio = Math.round(costo * (1 + margen / 100) * 100) / 100;
    setForm((f) => (Number(f.pre_prod) === precio ? f : { ...f, pre_prod: precio }));
  }, [modoPrecio, form.ultimo_costo_compra, form.margen_pct]);

  // Helpers
  const handle = (e) => {
    const { name, value, type } = e.target;
    setForm((f) => {
      let v = value;
      if (
        ['pack_cantidad', 'stock_minimo', 'contenido', 'margen_pct'].includes(
          name
        )
      ) {
        // normalizamos número
        v =
          v === ''
            ? ''
            : name === 'pack_cantidad' || name === 'stock_minimo'
            ? parseInt(v, 10) || ''
            : parseFloat(v);
      }
      // normalizar SKU a uppercase
      if (name === 'codigo_sku') v = String(v).trim().toUpperCase();
      return { ...f, [name]: v };
    });
  };

  //   - 16/07/2026 - Al volver a modo manual, limpiamos el % (para que
  // el submit mande margen_pct: null y el precio quede 100% editable).
  const setModoPrecioSafe = (modo) => {
    setModoPrecio(modo);
    if (modo === 'manual') {
      setForm((f) => ({ ...f, margen_pct: '' }));
    }
  };

  const setPresentacion = (pres) => {
    setForm((f) => {
      const next = { ...f, presentacion: pres };
      if (pres === 'unidad') next.pack_cantidad = 1;
      if (pres === 'pack' && (!f.pack_cantidad || f.pack_cantidad <= 1))
        next.pack_cantidad = 12;
      return next;
    });
  };

  const validate = () => {
    const e = {};
    if (!form.nombre?.trim()) e.nombre = 'El nombre es obligatorio';
    if (!form.codigo_sku?.trim()) e.codigo_sku = 'El código SKU es obligatorio';
    if (form.presentacion === 'unidad' && Number(form.pack_cantidad) !== 1) {
      e.pack_cantidad = 'Para "unidad", el pack debe ser 1';
    }
    if (form.presentacion === 'pack' && !(Number(form.pack_cantidad) > 1)) {
      e.pack_cantidad = 'Para "pack", el pack debe ser mayor a 1';
    }
    if (!OPCIONES_IVA.some((o) => o.value === form.iva_tratamiento)) {
      e.iva_tratamiento = 'Elegí el IVA del producto';
    }
    if (form.barra_ean13 && !/^[0-9]{8,13}$/.test(String(form.barra_ean13))) {
      e.barra_ean13 = 'EAN debe ser numérico (8 a 13 dígitos)';
    }
    if (form.pre_prod && Number(form.pre_prod) < 0) {
      e.pre_prod = 'El precio no puede ser negativo';
    }
    if (modoPrecio === 'margen') {
      const m = Number(form.margen_pct);
      if (form.margen_pct === '' || !Number.isFinite(m) || m < 0 || m > 1000) {
        e.margen_pct = 'El margen debe ser un número entre 0 y 1000';
      }
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    const payload = {
      nombre: form.nombre?.trim(),
      categoria_id: form.categoria_id === '' ? null : Number(form.categoria_id),
      codigo_sku: form.codigo_sku?.trim().toUpperCase(),
      presentacion: form.presentacion,
      pack_cantidad: Number(form.pack_cantidad) || 1,
      stock_minimo: form.stock_minimo === '' ? null : Number(form.stock_minimo),
      unidad_medida: form.unidad_medida || 'u',
      contenido: form.contenido === '' ? null : Number(form.contenido),
      barra_ean13: form.barra_ean13?.trim() || null,
      pre_prod:
        form.pre_prod === ''
          ? null
          : Math.round(Number(form.pre_prod) * 100) / 100,
      ultimo_costo_compra:
        form.ultimo_costo_compra === ''
          ? null
          : Math.round(Number(form.ultimo_costo_compra) * 100) / 100,
      margen_pct:
        modoPrecio === 'margen' && form.margen_pct !== ''
          ? Math.round(Number(form.margen_pct) * 100) / 100
          : null,
      ...ivaPayload(form.iva_tratamiento),
      impuesto_interno_pct: form.impuesto_interno_pct === '' ? 0 : Number(form.impuesto_interno_pct),
      estado: form.estado,
      notas: form.notas?.trim() || null
    };

    try {
      setSaving(true);
      await onSubmit(payload); // el padre decide POST/PUT según isEdit
      onClose();
    } finally {
      setSaving(false);
    }
  };

  // Etiquetas dinámicas para UX
  const presentacionLabel = useMemo(
    () =>
      form.presentacion === 'unidad'
        ? 'Unidad'
        : `Pack de ${form.pack_cantidad || 0}`,
    [form.presentacion, form.pack_cantidad]
  );

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
          aria-labelledby={titleId}
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            variants={panelV}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="relative w-full max-w-[92vw] sm:max-w-xl md:max-w-lg
                       max-h-[85vh] overflow-y-auto overscroll-contain
                       rounded-2xl border border-slate-200 bg-white shadow-2xl"
          >
            {/* Close */}
            <button
              onClick={onClose}
              className="absolute z-50 top-2.5 right-2.5 inline-flex h-9 w-9 items-center justify-center rounded-lg
                         bg-slate-100 border border-slate-200 text-slate-500 hover:bg-slate-200 transition"
              aria-label="Cerrar"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="relative z-10 p-5 sm:p-6 md:p-8">
              {/* Header */}
              <motion.div
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 260, damping: 24 }}
                className="mb-5 sm:mb-6 flex items-center gap-3"
              >
                <Package className="h-6 w-6 text-blue-600 shrink-0" />
                <h3
                  id={titleId}
                  className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900"
                >
                  {isEdit ? 'Editar Producto' : 'Nuevo Producto'}
                </h3>
              </motion.div>

              {/* Form */}
              <motion.form
                id={formId}
                onSubmit={submit}
                variants={formContainerV}
                initial="hidden"
                animate="visible"
                className="space-y-5 sm:space-y-6"
              >
                {/* Nombre */}
                <motion.div variants={fieldV}>
                  <label className={labelCls}>
                    <Package className="h-4 w-4 text-slate-600" />
                    Nombre <span className="text-blue-600">*</span>
                  </label>
                  <input
                    name="nombre"
                    value={form.nombre}
                    onChange={handle}
                    className={inputCls}
                    placeholder='Ej: "Soda"'
                  />
                  {errors.nombre && (
                    <p className="mt-1 text-sm text-rose-600">
                      {errors.nombre}
                    </p>
                  )}
                </motion.div>

                {/* Categoría (dinámica) con alta rápida */}
                <motion.div variants={fieldV}>
                  <label className={labelCls}>
                    <Layers className="h-4 w-4 text-slate-600" />
                    Categoría (opcional)
                  </label>
                  <div className="flex gap-2">
                    <select
                      name="categoria_id"
                      value={form.categoria_id}
                      onChange={handle}
                      className={`${inputCls} text-slate-800`}
                    >
                      <option value="">Sin categoría</option>
                      {categorias.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nombre}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => setCatNuevaOpen((v) => !v)}
                      className="shrink-0 inline-flex items-center gap-1 px-3 rounded-xl border border-blue-200 bg-blue-50 text-blue-700 text-sm hover:bg-blue-100 transition"
                      title="Agregar nueva categoría"
                    >
                      <Plus className="h-4 w-4" /> Nueva
                    </button>
                  </div>

                  {catNuevaOpen && (
                    <div className="mt-2 flex gap-2">
                      <input
                        value={catNuevaNombre}
                        onChange={(e) => setCatNuevaNombre(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            crearCategoriaRapida();
                          }
                        }}
                        placeholder="Nombre de la nueva categoría"
                        className={`${inputCls} py-2.5`}
                      />
                      <button
                        type="button"
                        onClick={crearCategoriaRapida}
                        disabled={catSaving || !catNuevaNombre.trim()}
                        className="shrink-0 inline-flex items-center gap-1 px-3 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                      >
                        <Check className="h-4 w-4" /> {catSaving ? 'Guardando…' : 'Crear'}
                      </button>
                    </div>
                  )}
                </motion.div>

                {/* SKU + EAN */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <motion.div variants={fieldV}>
                    <label className={labelCls}>
                      <Tag className="h-4 w-4 text-slate-600" />
                      Código SKU <span className="text-blue-600">*</span>
                    </label>
                    <input
                      name="codigo_sku"
                      value={form.codigo_sku}
                      onChange={handle}
                      className={`${inputCls} uppercase`}
                      placeholder="SODA-UNI / AGUA-P12"
                    />
                    {errors.codigo_sku && (
                      <p className="mt-1 text-sm text-rose-600">
                        {errors.codigo_sku}
                      </p>
                    )}
                  </motion.div>

                  <motion.div variants={fieldV}>
                    <label className={labelCls}>
                      <Barcode className="h-4 w-4 text-slate-600" />
                      EAN (opcional)
                    </label>
                    <input
                      name="barra_ean13"
                      value={form.barra_ean13}
                      onChange={handle}
                      inputMode="numeric"
                      className={inputCls}
                      placeholder="8 a 13 dígitos"
                    />
                    {errors.barra_ean13 && (
                      <p className="mt-1 text-sm text-rose-600">
                        {errors.barra_ean13}
                      </p>
                    )}
                  </motion.div>
                </div>

                {/* Presentación + Pack */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <motion.div variants={fieldV}>
                    <label className={labelCls}>
                      <Boxes className="h-4 w-4 text-slate-600" />
                      Presentación
                    </label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setPresentacion('unidad')}
                        className={`px-3 py-2 rounded-lg border ${
                          form.presentacion === 'unidad'
                            ? 'border-blue-400 bg-blue-50 text-blue-700'
                            : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                        } transition`}
                      >
                        Unidad
                      </button>
                      <button
                        type="button"
                        onClick={() => setPresentacion('pack')}
                        className={`px-3 py-2 rounded-lg border ${
                          form.presentacion === 'pack'
                            ? 'border-blue-400 bg-blue-50 text-blue-700'
                            : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                        } transition`}
                      >
                        Pack
                      </button>
                    </div>
                    <p className="mt-2 text-xs text-slate-500">
                      Seleccionado:{' '}
                      <span className="font-medium">{presentacionLabel}</span>
                    </p>
                  </motion.div>

                  <motion.div variants={fieldV}>
                    <label className={labelCls}>
                      <Hash className="h-4 w-4 text-slate-600" />
                      Cantidad por pack
                    </label>
                    <input
                      name="pack_cantidad"
                      type="number"
                      onWheel={blockWheelChange}
                      min={form.presentacion === 'pack' ? 2 : 1}
                      value={form.pack_cantidad}
                      onChange={handle}
                      disabled={form.presentacion === 'unidad'}
                      className={`w-full rounded-xl border px-3.5 py-3 text-slate-800 placeholder-slate-400
                                 focus:outline-none focus:ring-2 focus:ring-blue-400/40 focus:border-transparent
                                 ${
                                   form.presentacion === 'unidad'
                                     ? 'bg-slate-100 border-slate-200 opacity-60 cursor-not-allowed'
                                     : 'bg-white border-slate-200'
                                 }`}
                      placeholder="Ej: 12, 24…"
                    />
                    {errors.pack_cantidad && (
                      <p className="mt-1 text-sm text-rose-600">
                        {errors.pack_cantidad}
                      </p>
                    )}
                  </motion.div>
                </div>

                {/* Unidad de medida + Contenido */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <motion.div variants={fieldV}>
                    <label className={labelCls}>
                      <Ruler className="h-4 w-4 text-slate-600" />
                      Unidad de medida
                    </label>
                    <select
                      name="unidad_medida"
                      value={form.unidad_medida}
                      onChange={handle}
                      className={inputCls}
                    >
                      {UM_OPTS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </motion.div>

                  <motion.div variants={fieldV}>
                    <label className={labelCls}>
                      <Ruler className="h-4 w-4 text-slate-600" />
                      Contenido (opcional)
                    </label>
                    <input
                      name="contenido"
                      type="number"
                      onWheel={blockWheelChange}
                      step="0.01"
                      value={form.contenido}
                      onChange={handle}
                      className={inputCls}
                      placeholder="Ej: 2.25 (si UM=l)"
                    />
                  </motion.div>
                </div>

                {/* Stock mínimo */}
                <motion.div variants={fieldV}>
                  <label className={labelCls}>
                    <Boxes className="h-4 w-4 text-slate-600" />
                    Stock mínimo (opcional)
                  </label>
                  <input
                    name="stock_minimo"
                    type="number"
                    onWheel={blockWheelChange}
                    min="0"
                    step="1"
                    value={form.stock_minimo}
                    onChange={handle}
                    className={inputCls}
                    placeholder="Alerta de stock bajo a partir de…"
                  />
                </motion.div>

                {/* IVA + Estado */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <motion.div variants={fieldV}>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                        Precio base (catálogo)
                      </label>
                      <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 gap-0.5">
                        <button
                          type="button"
                          onClick={() => setModoPrecioSafe('manual')}
                          className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition ${
                            modoPrecio === 'manual'
                              ? 'bg-blue-600 text-white'
                              : 'text-slate-500 hover:bg-slate-100'
                          }`}
                        >
                          Manual
                        </button>
                        <button
                          type="button"
                          onClick={() => setModoPrecioSafe('margen')}
                          className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition ${
                            modoPrecio === 'margen'
                              ? 'bg-blue-600 text-white'
                              : 'text-slate-500 hover:bg-slate-100'
                          }`}
                        >
                          Por margen (%)
                        </button>
                      </div>
                    </div>

                    {modoPrecio === 'margen' && (
                      <div className="mb-2 flex items-center gap-2">
                        <input
                          name="margen_pct"
                          type="number"
                          onWheel={blockWheelChange}
                          step="0.01"
                          min="0"
                          value={form.margen_pct}
                          onChange={handle}
                          className={`w-24 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800
                                     placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-400/40 focus:border-transparent`}
                          placeholder="Ej: 30"
                        />
                        <span className="text-xs text-slate-500">
                          % sobre el costo
                        </span>
                      </div>
                    )}
                    {errors.margen_pct && (
                      <p className="mb-2 text-sm text-rose-600">
                        {errors.margen_pct}
                      </p>
                    )}

                    <input
                      name="pre_prod"
                      type="number"
                      onWheel={blockWheelChange}
                      step="0.01"
                      value={form.pre_prod}
                      onChange={handle}
                      readOnly={modoPrecio === 'margen'}
                      disabled={modoPrecio === 'margen'}
                      className={`w-full rounded-xl border px-3.5 py-3 text-slate-800
                                 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-400/40 focus:border-transparent ${
                                   modoPrecio === 'margen'
                                     ? 'border-slate-200 bg-slate-50 text-slate-500 cursor-not-allowed'
                                     : 'border-slate-200 bg-white'
                                 }`}
                      placeholder="ingrese el precio"
                    />
                    {modoPrecio === 'margen' && (
                      <p className="mt-1 text-[11px] text-slate-500">
                        Calculado a partir del costo. Se recalcula solo cada
                        vez que entra un costo nuevo por una compra.
                      </p>
                    )}
                    {errors.pre_prod && (
                      <p className="mt-1 text-sm text-rose-600">
                        {errors.pre_prod}
                      </p>
                    )}
                  </motion.div>
                  <motion.div variants={fieldV}>
                    <label className={labelCls}>
                      <Percent className="h-4 w-4 text-slate-600" />
                      IVA
                    </label>
                    <select
                      name="iva_tratamiento"
                      value={form.iva_tratamiento}
                      onChange={handle}
                      className={inputCls}
                    >
                      {form.iva_tratamiento === '' && (
                        <option value="">Elegí el IVA…</option>
                      )}
                      {OPCIONES_IVA.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                    {ivaInvalidoOriginal(initial) && form.iva_tratamiento === '' && (
                      <p className="mt-1 text-[11px] text-amber-600">
                        Tenía {Number(initial.iva_porcentaje)}%, que ARCA no acepta. Elegí la
                        alícuota correcta para poder facturarlo.
                      </p>
                    )}
                    {errors.iva_tratamiento && (
                      <p className="mt-1 text-sm text-rose-600">
                        {errors.iva_tratamiento}
                      </p>
                    )}
                  </motion.div>
                </div>

                {/* Impuesto interno (sólo informativo, para el comprobante) */}
                <motion.div variants={fieldV}>
                  <label className={labelCls}>
                    <Percent className="h-4 w-4 text-slate-600" />
                    Impuesto interno incluido en el precio (%, opcional)
                  </label>
                  <input
                    name="impuesto_interno_pct"
                    type="number"
                    onWheel={blockWheelChange}
                    step="0.01"
                    min="0"
                    max="100"
                    value={form.impuesto_interno_pct}
                    onChange={handle}
                    className={inputCls}
                    placeholder="Ej. 14 para cerveza (según tu contador)"
                  />
                  <p className="mt-1 text-[11px] text-slate-400">
                    Sólo para el «Otros Impuestos Nacionales Indirectos» que se informa en las facturas B. No cambia el precio.
                  </p>
                </motion.div>

                {/* Último costo de compra */}
                <motion.div variants={fieldV}>
                  <label className={labelCls}>
                    <DollarSign className="h-4 w-4 text-slate-600" />
                    Último costo de compra (opcional)
                  </label>
                  <input
                    name="ultimo_costo_compra"
                    type="number"
                    onWheel={blockWheelChange}
                    step="0.01"
                    value={form.ultimo_costo_compra}
                    onChange={handle}
                    className={inputCls}
                    placeholder="Se precarga en las compras y se actualiza al comprar"
                  />
                </motion.div>

                <motion.div variants={fieldV}>
                  <label className={labelCls}>
                    <Power className="h-4 w-4 text-slate-600" />
                    Estado
                  </label>
                  <select
                    name="estado"
                    value={form.estado}
                    onChange={handle}
                    className={inputCls}
                  >
                    <option value="activo">Activo</option>
                    <option value="inactivo">Inactivo</option>
                  </select>
                </motion.div>

                {/* Notas */}
                <motion.div variants={fieldV}>
                  <label className={labelCls}>
                    <StickyNote className="h-4 w-4 text-slate-600" />
                    Notas (opcional)
                  </label>
                  <textarea
                    name="notas"
                    rows={3}
                    value={form.notas}
                    onChange={handle}
                    className={`${inputCls} resize-y`}
                    placeholder="Observaciones internas…"
                  />
                </motion.div>

                {/* Acciones */}
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
                    className="px-4 py-2 rounded-xl bg-blue-600 text-white font-semibold
                               hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition"
                  >
                    {saving
                      ? 'Guardando…'
                      : isEdit
                      ? 'Guardar cambios'
                      : 'Crear'}
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
