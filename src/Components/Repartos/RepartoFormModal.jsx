// src/Components/Repartos/RepartoFormModal.jsx
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import {
  backdropV,
  panelV,
  formContainerV,
  fieldV
} from '../../ui/animHelpers';
import { listCiudades } from '../../api/ciudades';
import { blockWheelChange } from '../../utils/numberInput';

const inputCls =
  'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-400/40 focus:border-transparent';
const labelCls = 'block text-sm font-medium text-slate-600 mb-2';

export default function RepartoFormModal({ open, onClose, onSubmit, initial }) {
  const [form, setForm] = useState({
    ciudad_id: '',
    nombre: '',
    rango_min: '',
    rango_max: '',
    estado: 'activo', // 'activo' | 'inactivo'
    observaciones: ''
  });
  const [ciudades, setCiudades] = useState([]);
  const [loadingCiudades, setLoadingCiudades] = useState(false);
  const [saving, setSaving] = useState(false);
  const isEdit = !!initial?.id;

  // Carga de ciudades activas
  const fetchCiudades = async () => {
    try {
      setLoadingCiudades(true);
      const data = await listCiudades({
        estado: 'activa',
        limit: 200,
        orderBy: 'nombre',
        orderDir: 'ASC'
      });
      const rows = Array.isArray(data) ? data : data.data || [];
      setCiudades(rows);
    } catch (e) {
      console.error('Error al cargar ciudades para repartos:', e);
    } finally {
      setLoadingCiudades(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchCiudades();
      setForm({
        ciudad_id: initial?.ciudad_id || initial?.ciudad?.id || '', // se completa al elegir o con la primera ciudad luego
        nombre: initial?.nombre || '',
        rango_min:
          initial?.rango_min !== undefined ? String(initial.rango_min) : '',
        rango_max:
          initial?.rango_max !== undefined ? String(initial.rango_max) : '',
        estado: initial?.estado || 'activo',
        observaciones: initial?.observaciones || ''
      });
    }
  }, [open, initial]);

  // Si no había ciudad_id y ya tengo ciudades, asigno la primera por defecto
  useEffect(() => {
    if (open && ciudades.length > 0 && !form.ciudad_id) {
      setForm((f) => ({ ...f, ciudad_id: f.ciudad_id || ciudades[0].id }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ciudades, open]);

  const handle = (e) => {
    const { name, value, type, checked } = e.target;
    if (name === 'estado' && type === 'checkbox') {
      setForm((f) => ({ ...f, estado: checked ? 'activo' : 'inactivo' }));
    } else {
      setForm((f) => ({ ...f, [name]: value }));
    }
  };

  const validate = () => {
    if (!String(form.nombre || '').trim()) {
      alert('El nombre del reparto es obligatorio');
      return false;
    }
    if (!form.ciudad_id) {
      alert('Debés seleccionar una ciudad');
      return false;
    }
    const min = Number(form.rango_min);
    const max = Number(form.rango_max);
    if (!Number.isFinite(min) || !Number.isFinite(max)) {
      alert('Los rangos deben ser numéricos');
      return false;
    }
    if (min < 0 || max < 0) {
      alert('Los rangos no pueden ser negativos');
      return false;
    }
    if (max < min) {
      alert('rango_max debe ser mayor o igual a rango_min');
      return false;
    }
    return true;
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    try {
      setSaving(true);
      const payload = {
        ...form,
        ciudad_id: Number(form.ciudad_id) || null,
        rango_min: Number(form.rango_min) || 0,
        rango_max: Number(form.rango_max) || 0
      };
      await onSubmit(payload);
      // onClose(); para evitar que se cierre - comentamos
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
              <motion.h3
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 260, damping: 24 }}
                className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 mb-5"
              >
                {isEdit ? 'Editar Reparto' : 'Nuevo Reparto'}
              </motion.h3>

              <motion.form
                onSubmit={submit}
                variants={formContainerV}
                initial="hidden"
                animate="visible"
                className="space-y-5 sm:space-y-6"
              >
                {/* Ciudad */}
                <motion.div variants={fieldV}>
                  <label className={labelCls}>
                    Ciudad <span className="text-teal-600">*</span>
                  </label>
                  <select
                    name="ciudad_id"
                    value={form.ciudad_id || ''}
                    onChange={handle}
                    disabled={loadingCiudades}
                    className={inputCls}
                  >
                    {loadingCiudades && (
                      <option value="">Cargando ciudades…</option>
                    )}
                    {!loadingCiudades && ciudades.length === 0 && (
                      <option value="">
                        No hay ciudades cargadas (o están inactivas)
                      </option>
                    )}
                    {!loadingCiudades &&
                      ciudades.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nombre} ({c.provincia})
                        </option>
                      ))}
                  </select>
                </motion.div>

                {/* Nombre */}
                <motion.div variants={fieldV}>
                  <label className={labelCls}>
                    Nombre del reparto <span className="text-teal-600">*</span>
                  </label>
                  <input
                    name="nombre"
                    value={form.nombre}
                    onChange={handle}
                    className={inputCls}
                    placeholder="Concep 1, Monteros 2, etc."
                  />
                </motion.div>

                {/* Rangos */}
                <motion.div
                  variants={fieldV}
                  className="grid grid-cols-1 sm:grid-cols-2 gap-4"
                >
                  <div>
                    <label className={labelCls}>
                      Rango mínimo <span className="text-teal-600">*</span>
                    </label>
                    <input
                      type="number"
                      onWheel={blockWheelChange}
                      name="rango_min"
                      value={form.rango_min}
                      onChange={handle}
                      className={inputCls}
                      placeholder="0"
                      min="0"
                    />
                  </div>
                  <div>
                    <label className={labelCls}>
                      Rango máximo <span className="text-teal-600">*</span>
                    </label>
                    <input
                      type="number"
                      onWheel={blockWheelChange}
                      name="rango_max"
                      value={form.rango_max}
                      onChange={handle}
                      className={inputCls}
                      placeholder="300"
                      min="0"
                    />
                  </div>
                </motion.div>

                {/* Observaciones */}
                <motion.div variants={fieldV}>
                  <label className={labelCls}>Observaciones</label>
                  <textarea
                    name="observaciones"
                    value={form.observaciones}
                    onChange={handle}
                    rows={3}
                    className={`${inputCls} text-sm resize-y`}
                    placeholder="Notas internas sobre este reparto (zona, referencias, etc.)"
                  />
                </motion.div>

                {/* Estado */}
                <motion.label
                  variants={fieldV}
                  className="inline-flex items-center gap-3 select-none cursor-pointer"
                >
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
                </motion.label>

                {/* Botones */}
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
                    {saving
                      ? 'Guardando…'
                      : isEdit
                      ? 'Guardar cambios'
                      : 'Crear reparto'}
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
