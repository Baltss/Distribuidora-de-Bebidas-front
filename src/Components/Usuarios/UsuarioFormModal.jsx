// src/Components/Usuarios/UsuarioFormModal.jsx
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import {
  backdropV,
  panelV,
  formContainerV,
  fieldV
} from '../../ui/animHelpers';
import PasswordEditor from '../../Security/PasswordEditor';
import { getUserId } from '../../utils/authUtils';
import { showWarnSwal, showErrorSwal } from '../../ui/swal';

const inputCls =
  'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-400/40 focus:border-transparent';
const labelCls = 'block text-sm font-medium text-slate-600 mb-2';

const ALLOWED_ROLES = ['socio', 'administrativo', 'vendedor', 'contador'];

// misma política de contraseñas que en el original: mínimo 8 caracteres y
// al menos 3 de los 4 tipos (mayúscula, minúscula, número, símbolo).
const passPolicyOk = (pwd) => {
  if (!pwd || pwd.length < 8) return false;
  const hasUpper = /[A-Z]/.test(pwd);
  const hasLower = /[a-z]/.test(pwd);
  const hasNum = /\d/.test(pwd);
  const hasSym = /[^A-Za-z0-9]/.test(pwd);
  const score = [hasUpper, hasLower, hasNum, hasSym].filter(Boolean).length;
  return score >= 3;
};

const emptyForm = {
  nombre: '',
  email: '',
  password: '',
  rol: 'socio',
  local_id: '',
  es_reemplazante: false
};

export default function UsuarioFormModal({
  open,
  onClose,
  onSubmit,
  initial,
  locales = []
}) {
  const [formData, setFormData] = useState(emptyForm);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordValid, setPasswordValid] = useState(true);
  const [saving, setSaving] = useState(false);
  const isEdit = !!initial?.id;

  useEffect(() => {
    if (!open) return;
    if (initial) {
      setFormData({
        nombre: initial.nombre || '',
        email: initial.email || '',
        password: '',
        rol: initial.rol || 'socio',
        local_id: initial.local_id || '',
        es_reemplazante: !!initial.es_reemplazante
      });
    } else {
      setFormData(emptyForm);
    }
    setConfirmPassword('');
    setPasswordValid(true);
  }, [open, initial]);

  const handleField = (field) => (e) =>
    setFormData((f) => ({ ...f, [field]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();

    // Saneo rol por si acaso
    let rol = formData.rol;
    if (!ALLOWED_ROLES.includes(rol)) rol = 'socio';

    const payload = {
      ...formData,
      rol,
      usuario_log_id: getUserId(),
      local_id: formData.local_id ? Number(formData.local_id) : null,
      es_reemplazante: !!formData.es_reemplazante
    };

    // Validaciones (idénticas a las del formulario original)
    if (!formData.nombre.trim()) {
      await showWarnSwal({
        title: 'FALTAN DATOS',
        text: 'El nombre es obligatorio.'
      });
      return;
    }
    if (!formData.email.trim()) {
      await showWarnSwal({
        title: 'FALTAN DATOS',
        text: 'El email es obligatorio.'
      });
      return;
    }

    if (isEdit) {
      if (!payload.password) {
        delete payload.password; // no tocar pass
      } else if (!passPolicyOk(payload.password)) {
        await showErrorSwal({
          title: 'CONTRASEÑA DÉBIL',
          text: 'Usá al menos 8 caracteres y combina mayúsculas, minúsculas, números y símbolos.'
        });
        return;
      }
    } else {
      if (!payload.password) {
        await showWarnSwal({
          title: 'FALTAN DATOS',
          text: 'La contraseña es obligatoria para crear el usuario.'
        });
        return;
      }
      if (!passwordValid || payload.password !== confirmPassword) {
        await showErrorSwal({
          title: 'REVISÁ LA CONTRASEÑA',
          text: 'Las contraseñas no coinciden.'
        });
        return;
      }
      if (!passPolicyOk(payload.password)) {
        await showErrorSwal({
          title: 'CONTRASEÑA DÉBIl',
          text: 'Usá al menos 8 caracteres y combina mayúsculas, minúsculas, números y símbolos.'
        });
        return;
      }
    }

    try {
      setSaving(true);
      await onSubmit(payload, { isEdit, id: initial?.id });
      setConfirmPassword('');
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

            <div className="relative z-10 p-5 sm:p-6 md:p-8">
              <motion.h3
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 260, damping: 24 }}
                className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 mb-5"
              >
                {isEdit ? 'Editar Usuario' : 'Nuevo Usuario'}
              </motion.h3>

              <motion.form
                onSubmit={submit}
                variants={formContainerV}
                initial="hidden"
                animate="visible"
                className="space-y-5"
              >
                {/* Nombre */}
                <motion.div variants={fieldV}>
                  <label className={labelCls}>
                    Nombre <span className="text-teal-600">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Nombre"
                    value={formData.nombre}
                    onChange={handleField('nombre')}
                    required
                    className={inputCls}
                  />
                </motion.div>

                {/* Email */}
                <motion.div variants={fieldV}>
                  <label className={labelCls}>
                    Email <span className="text-teal-600">*</span>
                  </label>
                  <input
                    type="email"
                    placeholder="Email"
                    value={formData.email}
                    onChange={handleField('email')}
                    required
                    className={inputCls}
                  />
                </motion.div>

                {/* Contraseña */}
                <motion.div variants={fieldV}>
                  <PasswordEditor
                    value={formData.password}
                    onChange={(val) =>
                      setFormData((f) => ({ ...f, password: val }))
                    }
                    showConfirm={!isEdit} // confirma SOLO en alta
                    confirmValue={confirmPassword}
                    onConfirmChange={setConfirmPassword}
                    onValidityChange={setPasswordValid}
                  />
                </motion.div>

                {/* Rol */}
                <motion.div variants={fieldV}>
                  <label className={labelCls}>
                    Rol <span className="text-teal-600">*</span>
                  </label>
                  <select
                    value={formData.rol}
                    onChange={handleField('rol')}
                    required
                    className={inputCls}
                  >
                    <option value="socio">Socio</option>
                    <option value="administrativo">Administrativo</option>
                    <option value="vendedor">Vendedor</option>
                    <option value="contador">Contador</option>
                  </select>
                </motion.div>

                {/* Local */}
                <motion.div variants={fieldV}>
                  <label className={labelCls}>
                    Local <span className="text-teal-600">*</span>
                  </label>
                  <select
                    value={formData.local_id || ''}
                    onChange={handleField('local_id')}
                    required
                    className={inputCls}
                  >
                    <option value="">Seleccione Local</option>
                    {locales.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.nombre}
                      </option>
                    ))}
                  </select>
                </motion.div>

                {/* Es reemplazante */}
                <motion.div variants={fieldV}>
                  <label className="inline-flex items-center gap-3 select-none cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!formData.es_reemplazante}
                      onChange={(e) =>
                        setFormData((f) => ({
                          ...f,
                          es_reemplazante: e.target.checked
                        }))
                      }
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
                      Es reemplazante
                    </span>
                  </label>
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
                    className="px-4 py-2 rounded-xl bg-teal-600 text-white font-semibold
                               hover:bg-teal-700 disabled:opacity-60 disabled:cursor-not-allowed transition"
                  >
                    {saving
                      ? 'Guardando…'
                      : isEdit
                      ? 'Actualizar'
                      : 'Guardar'}
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
