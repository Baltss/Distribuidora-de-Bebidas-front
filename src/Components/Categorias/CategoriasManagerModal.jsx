// src/Components/Categorias/CategoriasManagerModal.jsx
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { backdropV, panelV } from '../../ui/animHelpers';
import { X, Layers, Plus, Check, Trash2 } from 'lucide-react';
import {
  listCategorias,
  createCategoria,
  deleteCategoria
} from '../../api/categorias.js';
import { showErrorSwal, showSuccessSwal, showConfirmSwal } from '../../ui/swal';

export default function CategoriasManagerModal({ open, onClose, onChanged }) {
  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading] = useState(false);
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [saving, setSaving] = useState(false);

  const cargar = async () => {
    setLoading(true);
    try {
      const resp = await listCategorias();
      setCategorias(resp?.data || []);
    } catch (err) {
      const { mensajeError } = err || {};
      await showErrorSwal({
        title: 'Error',
        text: mensajeError || 'No se pudieron cargar las categorías'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      cargar();
      setNuevoNombre('');
    }
    // eslint-disable-next-line
  }, [open]);

  const crear = async () => {
    const nombre = nuevoNombre.trim();
    if (!nombre) return;
    try {
      setSaving(true);
      await createCategoria({ nombre });
      setNuevoNombre('');
      await cargar();
      onChanged?.();
    } catch (err) {
      const { code, mensajeError, tips } = err || {};
      await showErrorSwal({
        title: code === 'DUPLICATE' ? 'Categoría existente' : 'No se pudo crear',
        text: mensajeError || 'No se pudo crear la categoría',
        tips
      });
    } finally {
      setSaving(false);
    }
  };

  const eliminar = async (cat) => {
    const ok = await showConfirmSwal({
      title: 'Eliminar categoría',
      text: `¿Eliminar la categoría "${cat.nombre}"?`
    });
    if (!ok) return;
    try {
      await deleteCategoria(cat.id);
      await showSuccessSwal({ title: 'Eliminada' });
      await cargar();
      onChanged?.();
    } catch (err) {
      const { code, mensajeError, tips } = err || {};
      if (code === 'CATEGORY_HAS_PRODUCTS') {
        return showErrorSwal({ title: 'No se puede eliminar', text: mensajeError, tips });
      }
      return showErrorSwal({
        title: 'No se pudo eliminar',
        text: mensajeError || 'Ocurrió un error inesperado',
        tips
      });
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
                <Layers className="h-6 w-6 text-gray-300 shrink-0" />
                <h3 className="text-xl font-bold tracking-tight text-white">Categorías</h3>
              </div>

              {/* Alta */}
              <div className="flex gap-2 mb-5">
                <input
                  value={nuevoNombre}
                  onChange={(e) => setNuevoNombre(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      crear();
                    }
                  }}
                  placeholder="Nombre de la nueva categoría"
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-white
                             placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-300/40 focus:border-transparent"
                />
                <button
                  type="button"
                  onClick={crear}
                  disabled={saving || !nuevoNombre.trim()}
                  className="shrink-0 inline-flex items-center gap-1 px-3 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-500 text-white text-sm font-semibold hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  <Check className="h-4 w-4" /> {saving ? 'Guardando…' : 'Crear'}
                </button>
              </div>

              {/* Listado */}
              {loading ? (
                <div className="text-center text-white/70 py-6">Cargando…</div>
              ) : categorias.length === 0 ? (
                <div className="text-center text-white/70 py-6">Todavía no hay categorías.</div>
              ) : (
                <ul className="space-y-2">
                  {categorias.map((c) => (
                    <li
                      key={c.id}
                      className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2"
                    >
                      <span className="text-gray-100 inline-flex items-center gap-2">
                        <Layers className="h-4 w-4 text-gray-400" />
                        {c.nombre}
                        {c.estado === 'inactivo' && (
                          <span className="text-[10px] uppercase text-amber-300/80">(inactiva)</span>
                        )}
                      </span>
                      <button
                        type="button"
                        onClick={() => eliminar(c)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 text-rose-300 hover:bg-rose-500/10 transition"
                        title="Eliminar"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
