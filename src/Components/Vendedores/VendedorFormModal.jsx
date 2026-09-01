// src/Components/Vendedores/VendedorFormModal.jsx
import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import {
  backdropV,
  panelV,
  formContainerV,
  fieldV
} from '../../ui/animHelpers';
import SearchableSelect from '../Common/SearchableSelect';
import { listUsuarios } from '../../api/usuarios';

const inputCls =
  'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-400/40 focus:border-transparent';
const labelCls = 'block text-sm font-medium text-slate-600 mb-2';

export default function VendedorFormModal({
  open,
  onClose,
  onSubmit,
  initial
}) {
  const [form, setForm] = useState({
    nombre: '',
    documento: '',
    email: '',
    telefono: '',
    estado: 'activo',
    notas: ''
  });
  const [saving, setSaving] = useState(false);
  const isEdit = !!initial?.id;

  const [usuariosOptions, setUsuariosOptions] = useState([]);
  const [loadingUsuarios, setLoadingUsuarios] = useState(false);
  const [selectedUsuario, setSelectedUsuario] = useState(null);

  useEffect(() => {
    if (!open) return;
    setForm({
      nombre: initial?.nombre || '',
      documento: initial?.documento || '',
      email: initial?.email || '',
      telefono: initial?.telefono || '',
      estado: initial?.estado || 'activo',
      notas: initial?.notas || ''
    });
    setSelectedUsuario(null);
  }, [open, initial]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      setLoadingUsuarios(true);
      try {
        const data = await listUsuarios({
          page: 1,
          limit: 200,
          pageSize: 200,
          estado: 'activo',
          orderBy: 'nombre',
          orderDir: 'ASC'
        });
        if (cancelled) return;
        const list = data?.data || data || [];
        setUsuariosOptions(list);
        if (initial?.usuario_id) {
          const match = list.find(
            (u) => String(u.id) === String(initial.usuario_id)
          );
          if (match) setSelectedUsuario(match);
        }
      } catch (err) {
        console.error('VendedorFormModal listUsuarios error:', err);
      } finally {
        if (!cancelled) setLoadingUsuarios(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, initial]);

  const canSave = useMemo(() => form.nombre.trim().length > 1, [form.nombre]);

  const handle = (e) => {
    const { name, value, type, checked } = e.target;
    if (name === 'estado' && type === 'checkbox') {
      setForm((f) => ({ ...f, estado: checked ? 'activo' : 'inactivo' }));
    } else {
      setForm((f) => ({ ...f, [name]: value }));
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!canSave) return;
    try {
      setSaving(true);
      await onSubmit({
        nombre: form.nombre.trim(),
        documento: form.documento?.trim() || null,
        email: form.email?.trim() || null,
        telefono: form.telefono?.trim() || null,
        estado: form.estado,
        notas: form.notas?.trim() || null,
        usuario_id: selectedUsuario?.id || null
      });
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
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            variants={panelV}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="relative w-full max-w-[92vw] sm:max-w-xl md:max-w-2xl
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
              <motion.h3
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 260, damping: 24 }}
                className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 mb-5"
              >
                {isEdit ? 'Editar Vendedor' : 'Nuevo Vendedor'}
              </motion.h3>

              <motion.form
                onSubmit={submit}
                variants={formContainerV}
                initial="hidden"
                animate="visible"
                className="space-y-5 sm:space-y-6"
              >
                {/* Nombre */}
                <motion.div variants={fieldV}>
                  <label className={labelCls}>
                    Nombre <span className="text-teal-600">*</span>
                  </label>
                  <input
                    name="nombre"
                    value={form.nombre}
                    onChange={handle}
                    className={inputCls}
                    placeholder="Nombre y apellido"
                  />
                </motion.div>

                {/* Usuario vinculado */}
                <motion.div variants={fieldV}>
                  <label className={labelCls}>Usuario vinculado</label>
                  <SearchableSelect
                    items={usuariosOptions}
                    value={selectedUsuario?.id ?? ''}
                    onChange={(_id, opt) => setSelectedUsuario(opt || null)}
                    placeholder={
                      loadingUsuarios
                        ? 'Cargando usuarios…'
                        : 'Buscar por nombre, email… (opcional)'
                    }
                    disabled={loadingUsuarios}
                    getOptionLabel={(u) =>
                      `${u.nombre || 'Usuario'}${
                        u.email ? ` • ${u.email}` : ''
                      }`
                    }
                    getOptionValue={(u) => u.id}
                    portal
                    portalZIndex={2300}
                  />
                  <p className="mt-1.5 text-xs text-slate-400">
                    Si se vincula, este vendedor se preselecciona
                    automáticamente al iniciar sesión con ese usuario en
                    Nueva Venta.
                  </p>
                </motion.div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Documento */}
                  <motion.div variants={fieldV}>
                    <label className={labelCls}>Documento</label>
                    <input
                      name="documento"
                      value={form.documento}
                      onChange={handle}
                      className={inputCls}
                      placeholder="CUIT/CUIL o DNI"
                    />
                  </motion.div>

                  {/* Teléfono */}
                  <motion.div variants={fieldV}>
                    <label className={labelCls}>Teléfono</label>
                    <input
                      name="telefono"
                      value={form.telefono}
                      onChange={handle}
                      className={inputCls}
                      placeholder="+54 9 ..."
                    />
                  </motion.div>

                  {/* Email */}
                  <motion.div variants={fieldV}>
                    <label className={labelCls}>Email</label>
                    <input
                      type="email"
                      name="email"
                      value={form.email}
                      onChange={handle}
                      className={inputCls}
                      placeholder="correo@dominio.com"
                    />
                  </motion.div>

                  {/* Estado (toggle) */}
                  <motion.div variants={fieldV} className="flex items-end">
                    <label className="inline-flex items-center gap-3 select-none cursor-pointer">
                      <input
                        type="checkbox"
                        name="estado"
                        checked={form.estado === 'activo'}
                        onChange={handle}
                        className="peer sr-only"
                      />
                      <span
                        className="relative inline-flex h-6 w-11 items-center rounded-full
                                   bg-slate-200 peer-checked:bg-teal-600 transition-colors duration-200"
                        aria-hidden
                      >
                        <span
                          className="absolute left-0.5 h-5 w-5 rounded-full bg-white shadow
                                     peer-checked:translate-x-5 transition-transform duration-200"
                        />
                      </span>
                      <span className="text-sm text-slate-600">
                        {form.estado === 'activo' ? 'Activo' : 'Inactivo'}
                      </span>
                    </label>
                  </motion.div>
                </div>

                {/* Notas */}
                <motion.div variants={fieldV}>
                  <label className={labelCls}>Notas</label>
                  <textarea
                    name="notas"
                    value={form.notas}
                    onChange={handle}
                    rows={3}
                    className={inputCls}
                    placeholder="Observaciones internas"
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
                    disabled={!canSave || saving}
                    className="px-4 py-2 rounded-xl bg-teal-600 text-white font-semibold
                               hover:bg-teal-700 disabled:opacity-60 disabled:cursor-not-allowed transition"
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
