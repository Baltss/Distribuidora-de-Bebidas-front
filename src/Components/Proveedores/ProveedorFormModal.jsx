// src/Components/Proveedores/ProveedorFormModal.jsx
import React, { useEffect, useState } from 'react';
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
  IdCard,
  Phone,
  Mail,
  MapPin,
  StickyNote,
  Power
} from 'lucide-react';

const inputCls =
  'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/40 focus:border-transparent';
const labelCls = 'flex items-center gap-2 text-sm font-medium text-slate-600 mb-2';

export default function ProveedorFormModal({ open, onClose, onSubmit, initial }) {
  const [saving, setSaving] = useState(false);
  const isEdit = !!initial?.id;
  const titleId = 'proveedor-modal-title';
  const formId = 'proveedor-form';

  const [form, setForm] = useState({
    razon_social: '',
    cuit: '',
    telefono: '',
    email: '',
    direccion: '',
    estado: 'activo',
    notas: ''
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (open) {
      setForm({
        razon_social: initial?.razon_social ?? '',
        cuit: initial?.cuit ?? '',
        telefono: initial?.telefono ?? '',
        email: initial?.email ?? '',
        direccion: initial?.direccion ?? '',
        estado: initial?.estado ?? 'activo',
        notas: initial?.notas ?? ''
      });
      setErrors({});
    }
  }, [open, initial]);

  const handle = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const validate = () => {
    const e = {};
    if (!form.razon_social?.trim())
      e.razon_social = 'La razón social es obligatoria';
    if (form.email && !/^\S+@\S+\.\S+$/.test(form.email)) {
      e.email = 'Email inválido';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    const payload = {
      razon_social: form.razon_social?.trim(),
      cuit: form.cuit?.trim() || null,
      telefono: form.telefono?.trim() || null,
      email: form.email?.trim() || null,
      direccion: form.direccion?.trim() || null,
      estado: form.estado,
      notas: form.notas?.trim() || null
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
          aria-labelledby={titleId}
        >
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={onClose}
          />

          <motion.div
            variants={panelV}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="relative w-full max-w-[92vw] sm:max-w-xl md:max-w-lg
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

            <div className="relative z-10 p-5 sm:p-6 md:p-8">
              <motion.div
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 260, damping: 24 }}
                className="mb-5 sm:mb-6 flex items-center gap-3"
              >
                <Truck className="h-6 w-6 text-emerald-600 shrink-0" />
                <h3
                  id={titleId}
                  className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900"
                >
                  {isEdit ? 'Editar Proveedor' : 'Nuevo Proveedor'}
                </h3>
              </motion.div>

              <motion.form
                id={formId}
                onSubmit={submit}
                variants={formContainerV}
                initial="hidden"
                animate="visible"
                className="space-y-5 sm:space-y-6"
              >
                <motion.div variants={fieldV}>
                  <label className={labelCls}>
                    <Truck className="h-4 w-4 text-slate-400" />
                    Razón social <span className="text-emerald-600">*</span>
                  </label>
                  <input
                    name="razon_social"
                    value={form.razon_social}
                    onChange={handle}
                    className={inputCls}
                    placeholder='Ej: "Distribuidora XYZ S.A."'
                  />
                  {errors.razon_social && (
                    <p className="mt-1 text-sm text-rose-600">{errors.razon_social}</p>
                  )}
                </motion.div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <motion.div variants={fieldV}>
                    <label className={labelCls}>
                      <IdCard className="h-4 w-4 text-slate-400" />
                      CUIT (opcional)
                    </label>
                    <input
                      name="cuit"
                      value={form.cuit}
                      onChange={handle}
                      className={inputCls}
                      placeholder="20-12345678-9"
                    />
                  </motion.div>

                  <motion.div variants={fieldV}>
                    <label className={labelCls}>
                      <Phone className="h-4 w-4 text-slate-400" />
                      Teléfono
                    </label>
                    <input
                      name="telefono"
                      value={form.telefono}
                      onChange={handle}
                      className={inputCls}
                      placeholder="Ej: 381-1234567"
                    />
                  </motion.div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <motion.div variants={fieldV}>
                    <label className={labelCls}>
                      <Mail className="h-4 w-4 text-slate-400" />
                      Email
                    </label>
                    <input
                      name="email"
                      value={form.email}
                      onChange={handle}
                      className={inputCls}
                      placeholder="contacto@proveedor.com"
                    />
                    {errors.email && (
                      <p className="mt-1 text-sm text-rose-600">{errors.email}</p>
                    )}
                  </motion.div>

                  <motion.div variants={fieldV}>
                    <label className={labelCls}>
                      <MapPin className="h-4 w-4 text-slate-400" />
                      Dirección
                    </label>
                    <input
                      name="direccion"
                      value={form.direccion}
                      onChange={handle}
                      className={inputCls}
                      placeholder="Calle 123"
                    />
                  </motion.div>
                </div>

                <motion.div variants={fieldV}>
                  <label className={labelCls}>
                    <Power className="h-4 w-4 text-slate-400" />
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

                <motion.div variants={fieldV}>
                  <label className={labelCls}>
                    <StickyNote className="h-4 w-4 text-slate-400" />
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
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold
                               disabled:opacity-60 disabled:cursor-not-allowed transition"
                  >
                    {saving ? 'Guardando…' : isEdit ? 'Guardar cambios' : 'Crear'}
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
