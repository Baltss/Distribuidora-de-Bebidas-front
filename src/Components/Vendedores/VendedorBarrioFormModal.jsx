// ===============================================
// FILE: src/Components/Vendedores/VendedorBarrioFormModal.jsx
// ===============================================
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import {
  backdropV,
  panelV,
  formContainerV,
  fieldV
} from '../../ui/animHelpers';
import { listVendedores } from '../../api/vendedores';
import { listCiudades } from '../../api/ciudades';
import { listLocalidades } from '../../api/localidades';
import { listBarrios } from '../../api/barrios';
import {
  bulkAssignVendedorBarrios,
  bulkAssignPorFiltros
} from '../../api/vendedores_barrios';
import { showErrorSwal, showSuccessSwal } from '../../ui/swal';
import { FaSearch, FaCheck } from 'react-icons/fa';

const inputCls =
  'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-400/40 focus:border-transparent';
const labelCls = 'block text-sm font-medium text-slate-600 mb-2';

export default function VendedorBarrioFormModal({
  open,
  onClose,
  onSubmit, // single-create: async ({ vendedor_id, barrio_id, asignado_desde, asignado_hasta, estado })
  initial, // opcional
  fetchData
}) {
  const [saving, setSaving] = useState(false);
  const [multiple, setMultiple] = useState(false);

  const [form, setForm] = useState({
    vendedor_id: '',
    ciudad_id: '',
    localidad_id: '',
    barrio_id: '',
    asignado_desde: '',
    asignado_hasta: '',
    estado: 'activo'
  });

  // MULTI state
  const [selVendedores, setSelVendedores] = useState([]); // ids []
  const [selBarrioIds, setSelBarrioIds] = useState([]); // ids []
  const [allLocalidadBarrios, setAllLocalidadBarrios] = useState(false);

  const isEdit = !!initial?.id;

  const [vendedores, setVendedores] = useState([]);
  const [ciudades, setCiudades] = useState([]);
  const [localidades, setLocalidades] = useState([]);
  const [barrios, setBarrios] = useState([]);

  // estado de búsqueda
  const [qVend, setQVend] = useState('');
  // Helpers
  const todayStr = useMemo(() => {
    const hoy = new Date();
    const yyyy = hoy.getFullYear();
    const mm = String(hoy.getMonth() + 1).padStart(2, '0');
    const dd = String(hoy.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }, []);

  // Cargar catálogos al abrir
  useEffect(() => {
    if (!open) return;
    (async () => {
      try {
        const [vs, cs] = await Promise.all([
          listVendedores({
            estado: 'activo',
            page: 1,
            limit: 1000,
            orderBy: 'nombre',
            orderDir: 'ASC'
          }),
          listCiudades({
            estado: 'activa',
            page: 1,
            limit: 1000,
            orderBy: 'nombre',
            orderDir: 'ASC'
          })
        ]);
        setVendedores(Array.isArray(vs) ? vs : vs?.data || []);
        setCiudades(Array.isArray(cs) ? cs : cs?.data || []);
      } catch (e) {
        await showErrorSwal({
          title: 'Error',
          text: 'No se pudieron cargar catálogos'
        });
      }
    })();
  }, [open]);

  // Localidades por ciudad
  useEffect(() => {
    if (!open) return;
    (async () => {
      if (!form.ciudad_id) {
        setLocalidades([]);
        setBarrios([]);
        setForm((f) => ({ ...f, localidad_id: '', barrio_id: '' }));
        setSelBarrioIds([]);
        setAllLocalidadBarrios(false);
        return;
      }
      try {
        const ls = await listLocalidades({
          ciudad_id: form.ciudad_id,
          estado: 'activa',
          page: 1,
          limit: 2000,
          orderBy: 'nombre',
          orderDir: 'ASC'
        });
        const larr = Array.isArray(ls) ? ls : ls?.data || [];
        setLocalidades(larr);
        setForm((f) =>
          larr.some((x) => String(x.id) === String(f.localidad_id))
            ? f
            : { ...f, localidad_id: '', barrio_id: '' }
        );
        setSelBarrioIds([]);
        setAllLocalidadBarrios(false);
      } catch {
        setLocalidades([]);
        setBarrios([]);
        setForm((f) => ({ ...f, localidad_id: '', barrio_id: '' }));
        setSelBarrioIds([]);
        setAllLocalidadBarrios(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.ciudad_id, open]);

  // Barrios por localidad
  useEffect(() => {
    if (!open) return;
    (async () => {
      if (!form.localidad_id) {
        setBarrios([]);
        setForm((f) => ({ ...f, barrio_id: '' }));
        setSelBarrioIds([]);
        setAllLocalidadBarrios(false);
        return;
      }
      try {
        const bs = await listBarrios({
          localidad_id: form.localidad_id,
          estado: 'activa',
          page: 1,
          limit: 5000,
          orderBy: 'nombre',
          orderDir: 'ASC'
        });
        const barr = Array.isArray(bs) ? bs : bs?.data || [];
        setBarrios(barr);
        setForm((f) =>
          barr.some((x) => String(x.id) === String(f.barrio_id))
            ? f
            : { ...f, barrio_id: '' }
        );
        setSelBarrioIds([]);
        setAllLocalidadBarrios(false);
      } catch {
        setBarrios([]);
        setForm((f) => ({ ...f, barrio_id: '' }));
        setSelBarrioIds([]);
        setAllLocalidadBarrios(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.localidad_id, open]);

  // Inicializar/Editar
  useEffect(() => {
    if (!open) return;
    setMultiple(false);
    setSelVendedores([]);
    setSelBarrioIds([]);
    setAllLocalidadBarrios(false);

    setForm({
      vendedor_id: initial?.vendedor_id ?? initial?.vendedor?.id ?? '',
      ciudad_id: '',
      localidad_id: '',
      barrio_id: initial?.barrio_id ?? initial?.barrio?.id ?? '',
      asignado_desde: initial?.asignado_desde
        ? String(initial.asignado_desde).slice(0, 10)
        : todayStr,
      asignado_hasta: initial?.asignado_hasta
        ? String(initial.asignado_hasta).slice(0, 10)
        : '',
      estado: initial?.estado ?? 'activo'
    });
  }, [open, initial, todayStr]);

  const handle = (e) => {
    const { name, value, type, checked } = e.target;
    if (name === 'estado' && type === 'checkbox') {
      setForm((f) => ({ ...f, estado: checked ? 'activo' : 'inactivo' }));
    } else {
      setForm((f) => ({ ...f, [name]: value }));
    }
  };

  // MULTI handlers
  const toggleSelVendedor = useCallback((id) => {
    setSelVendedores((arr) =>
      arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id]
    );
  }, []);

  const toggleSelBarrio = useCallback((id) => {
    setSelBarrioIds((arr) =>
      arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id]
    );
  }, []);

  const toggleSelectAllBarrios = useCallback(() => {
    if (allLocalidadBarrios) {
      setAllLocalidadBarrios(false);
    } else {
      setAllLocalidadBarrios(true);
      setSelBarrioIds([]); // no mezclar ambas modalidades
    }
  }, [allLocalidadBarrios]);

  const submit = async (e) => {
    e.preventDefault();

    // Validaciones comunes
    if (!String(form.asignado_desde).trim())
      return alert('La fecha Desde es obligatoria');

    try {
      setSaving(true);

      if (!multiple) {
        // === SINGLE MODE (idéntico a antes) ===
        if (!String(form.vendedor_id).trim())
          return alert('El vendedor es obligatorio');
        if (!String(form.barrio_id).trim())
          return alert('El barrio es obligatorio');

        await onSubmit?.({
          vendedor_id: Number(form.vendedor_id),
          barrio_id: Number(form.barrio_id),
          asignado_desde: form.asignado_desde, // yyyy-mm-dd
          asignado_hasta: form.asignado_hasta || null,
          estado: form.estado
        });
        onClose?.();
        return;
      }

      // === MULTI MODE ===
      const vIds = selVendedores.map(Number).filter(Number.isFinite);
      if (vIds.length === 0) {
        return alert('Seleccioná al menos un vendedor');
      }

      // por filtros: usar todos los barrios de la localidad
      if (allLocalidadBarrios) {
        if (
          !String(form.ciudad_id).trim() ||
          !String(form.localidad_id).trim()
        ) {
          return alert(
            'Seleccioná Ciudad y Localidad para aplicar a todos sus barrios'
          );
        }
        const resp = await bulkAssignPorFiltros({
          vendedor_ids: vIds,
          ciudad_id: Number(form.ciudad_id),
          localidad_id: Number(form.localidad_id),
          asignado_desde: form.asignado_desde,
          asignado_hasta: null,
          estado_asignacion: form.estado
        });
        await showSuccessSwal({
          title: 'Asignaciones creadas',
          text: `Se procesaron ${
            resp?.summary?.inserted ?? 'varias'
          } asignaciones`
        });
        fetchData();
        onClose?.();
        return;
      }

      // barrios específicos (multi check)
      const bIds = selBarrioIds.map(Number).filter(Number.isFinite);
      if (bIds.length === 0 && !String(form.barrio_id).trim()) {
        return alert('Elegí al menos un barrio');
      }

      const payload = {
        vendedor_ids: vIds,
        asignado_desde: form.asignado_desde,
        asignado_hasta: null,
        estado: form.estado
      };

      // Si el usuario eligió barrios por check → barrio_ids
      // Si no tildó ninguno pero seleccionó un barrio simple → barrio_id
      if (bIds.length > 0) payload.barrio_ids = bIds;
      else payload.barrio_id = Number(form.barrio_id);

      const resp = await bulkAssignVendedorBarrios(payload);
      await showSuccessSwal({
        title: 'Asignaciones creadas',
        text: `Se procesaron ${
          resp?.summary?.inserted ?? 'varias'
        } asignaciones`
      });
      onClose?.();
    } catch (err) {
      const msg =
        err?.mensajeError ||
        err?.message ||
        'No se pudo crear la(s) asignación(es).';
      await showErrorSwal({ title: 'Error', text: msg });
    } finally {
      setSaving(false);
    }
  };

  // lista filtrada por nombre o documento
  const filteredVendedores = useMemo(() => {
    const q = qVend.trim().toLowerCase();
    if (!q) return vendedores;
    return vendedores.filter((v) => {
      const nom = (v?.nombre || '').toLowerCase();
      const doc = (v?.documento || '').toLowerCase();
      return nom.includes(q) || doc.includes(q);
    });
  }, [vendedores, qVend]);

  // helpers para seleccionar por filtro actual
  const allFilteredIds = useMemo(
    () => filteredVendedores.map((v) => v.id),
    [filteredVendedores]
  );
  const allFilteredSelected =
    allFilteredIds.length > 0 &&
    allFilteredIds.every((id) => selVendedores.includes(id));

  const toggleSelectAllFiltered = () => {
    setSelVendedores((prev) => {
      const s = new Set(prev);
      if (allFilteredSelected) {
        allFilteredIds.forEach((id) => s.delete(id));
      } else {
        allFilteredIds.forEach((id) => s.add(id));
      }
      return [...s];
    });
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
            className="relative w-full max-w-[92vw] sm:max-w-xl md:max-w-3xl
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
                {isEdit
                  ? 'Editar Asignación'
                  : 'Nueva Asignación Vendedor ↔ Barrio'}
              </motion.h3>

              {/* Switch Múltiple */}
              <motion.div variants={fieldV} className="mb-4">
                <label className="inline-flex items-center gap-3 select-none cursor-pointer">
                  <input
                    type="checkbox"
                    checked={multiple}
                    onChange={() => setMultiple((v) => !v)}
                    className="peer sr-only"
                  />
                  <span className="relative inline-flex h-6 w-11 items-center rounded-full bg-slate-200 peer-checked:bg-teal-600 transition-colors duration-200">
                    <span className="absolute left-0.5 h-5 w-5 rounded-full bg-white shadow peer-checked:translate-x-5 transition-transform duration-200" />
                  </span>
                  <span className="text-sm text-slate-600">
                    Asignación múltiple
                  </span>
                </label>
              </motion.div>

              <motion.form
                onSubmit={submit}
                variants={formContainerV}
                initial="hidden"
                animate="visible"
                className="space-y-5 sm:space-y-6"
              >
                {/* Vendedor(es) */}
                {!multiple ? (
                  <motion.div variants={fieldV}>
                    <label className={labelCls}>
                      Vendedor <span className="text-teal-600">*</span>
                    </label>
                    <select
                      name="vendedor_id"
                      value={form.vendedor_id}
                      onChange={handle}
                      className={inputCls}
                    >
                      <option value="">Seleccionar…</option>
                      {vendedores.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.nombre}{' '}
                          {v.estado === 'inactivo' ? '(inactivo)' : ''}
                        </option>
                      ))}
                    </select>
                  </motion.div>
                ) : (
                  <motion.div variants={fieldV}>
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <label className="block text-sm font-medium text-slate-600">
                        Vendedores <span className="text-teal-600">*</span>
                      </label>
                      <span className="text-xs px-2 py-1 rounded-lg bg-slate-100 text-slate-500 border border-slate-200">
                        {selVendedores.length} seleccionados
                      </span>
                    </div>

                    {/* Toolbar: búsqueda + acciones rápidas */}
                    <div className="flex flex-col sm:flex-row gap-2 mb-2">
                      <div className="relative flex-1">
                        <input
                          value={qVend}
                          onChange={(e) => setQVend(e.target.value)}
                          className={`${inputCls} py-2.5 pr-9`}
                          placeholder="Buscar por nombre o documento…"
                        />
                        <FaSearch className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={toggleSelectAllFiltered}
                          className="px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition"
                          title={
                            allFilteredSelected
                              ? 'Quitar selección del filtro'
                              : 'Seleccionar todos (según filtro)'
                          }
                        >
                          {allFilteredSelected
                            ? 'Quitar filtro'
                            : 'Seleccionar filtro'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelVendedores([])}
                          className="px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition"
                          title="Limpiar todo"
                        >
                          Limpiar
                        </button>
                      </div>
                    </div>

                    {/* Lista */}
                    <div className="max-h-56 overflow-auto rounded-xl border border-slate-200 bg-slate-50 p-2.5">
                      {filteredVendedores.length === 0 ? (
                        <div className="text-sm text-slate-400 px-1 py-1.5">
                          Sin resultados para “{qVend}”.
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                          {filteredVendedores.map((v) => {
                            const checked = selVendedores.includes(v.id);
                            return (
                              <label
                                key={v.id}
                                className={`group flex items-center gap-3 rounded-lg px-2.5 py-2 border transition
                          ${
                            checked
                              ? 'bg-teal-50 border-teal-300 ring-1 ring-teal-300'
                              : 'bg-white border-slate-200 hover:bg-slate-100'
                          }`}
                              >
                                {/* checkbox custom */}
                                <input
                                  type="checkbox"
                                  className="sr-only"
                                  checked={checked}
                                  onChange={() => toggleSelVendedor(v.id)}
                                />
                                <span
                                  className={`flex h-4 w-4 items-center justify-center rounded-md border text-[10px]
                            ${
                              checked
                                ? 'bg-teal-600 border-teal-600 text-white'
                                : 'bg-white border-slate-300 text-transparent group-hover:text-slate-300'
                            }`}
                                  aria-hidden
                                >
                                  <FaCheck />
                                </span>

                                <div className="min-w-0">
                                  <div className="truncate text-sm text-slate-700">
                                    {v.nombre}
                                  </div>
                                  {v.documento ? (
                                    <div className="truncate text-[11px] text-slate-400">
                                      {v.documento}
                                    </div>
                                  ) : null}
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}

                {/* Cascada Geo: Ciudad → Localidad */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <motion.div variants={fieldV}>
                    <label className={labelCls}>Ciudad</label>
                    <select
                      name="ciudad_id"
                      value={form.ciudad_id}
                      onChange={handle}
                      className={inputCls}
                    >
                      <option value="">Seleccionar…</option>
                      {ciudades.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nombre} {c.provincia ? `(${c.provincia})` : ''}
                        </option>
                      ))}
                    </select>
                  </motion.div>
                  <motion.div variants={fieldV}>
                    <label className={labelCls}>Localidad</label>
                    <select
                      name="localidad_id"
                      value={form.localidad_id}
                      onChange={handle}
                      disabled={!form.ciudad_id}
                      className={`${inputCls} disabled:opacity-60`}
                    >
                      <option value="">
                        {form.ciudad_id ? 'Seleccionar…' : 'Elegí ciudad'}
                      </option>
                      {localidades.map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.nombre}
                        </option>
                      ))}
                    </select>
                  </motion.div>
                </div>

                {/* Barrios: single vs multi */}
                {!multiple ? (
                  <motion.div variants={fieldV}>
                    <label className={labelCls}>
                      Barrio <span className="text-teal-600">*</span>
                    </label>
                    <select
                      name="barrio_id"
                      value={form.barrio_id}
                      onChange={handle}
                      disabled={!form.localidad_id}
                      className={`${inputCls} disabled:opacity-60`}
                    >
                      <option value="">
                        {form.localidad_id ? 'Seleccionar…' : 'Elegí localidad'}
                      </option>
                      {barrios.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.nombre}
                        </option>
                      ))}
                    </select>
                  </motion.div>
                ) : (
                  <motion.div variants={fieldV}>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium text-slate-600">
                        Barrios (selección múltiple)
                      </label>
                      <label className="inline-flex items-center gap-2 text-sm text-slate-600">
                        <input
                          type="checkbox"
                          checked={allLocalidadBarrios}
                          onChange={toggleSelectAllBarrios}
                          disabled={!form.localidad_id}
                        />
                        <span>Todos los barrios de la localidad</span>
                      </label>
                    </div>

                    <div
                      className={`grid ${
                        allLocalidadBarrios
                          ? 'opacity-50 pointer-events-none'
                          : ''
                      } grid-cols-1 sm:grid-cols-2 gap-2 max-h-44 overflow-auto rounded-xl border border-slate-200 bg-slate-50 p-3`}
                    >
                      {barrios.map((b) => (
                        <label
                          key={b.id}
                          className="inline-flex items-center gap-2 text-sm text-slate-700"
                        >
                          <input
                            type="checkbox"
                            disabled={!form.localidad_id}
                            checked={selBarrioIds.includes(b.id)}
                            onChange={() => toggleSelBarrio(b.id)}
                          />
                          <span>{b.nombre}</span>
                        </label>
                      ))}
                    </div>

                    {/* Fallback: si no tildás ninguno, podés seguir usando el select simple */}
                    <div className="mt-3">
                      <label className="block text-xs font-medium text-slate-500 mb-1">
                        (Opcional) Barrio único vía select
                      </label>
                      <select
                        name="barrio_id"
                        value={form.barrio_id}
                        onChange={handle}
                        disabled={!form.localidad_id || allLocalidadBarrios}
                        className={`${inputCls} py-2.5 disabled:opacity-60`}
                      >
                        <option value="">—</option>
                        {barrios.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.nombre}
                          </option>
                        ))}
                      </select>
                    </div>
                  </motion.div>
                )}

                {/* Fechas */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <motion.div variants={fieldV}>
                    <label className={labelCls}>
                      Asignado desde <span className="text-teal-600">*</span>
                    </label>
                    <input
                      type="date"
                      name="asignado_desde"
                      value={form.asignado_desde}
                      onChange={handle}
                      className={inputCls}
                    />
                  </motion.div>
                  <motion.div variants={fieldV}>
                    <label className={labelCls}>
                      Asignado hasta (se completa al cerrar)
                    </label>
                    <input
                      type="date"
                      name="asignado_hasta"
                      value={form.asignado_hasta}
                      disabled
                      onChange={handle}
                      className={`${inputCls} disabled:opacity-60`}
                    />
                  </motion.div>
                </div>

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
                  <span className="relative inline-flex h-6 w-11 items-center rounded-full bg-slate-200 peer-checked:bg-teal-600 transition-colors duration-200">
                    <span className="absolute left-0.5 h-5 w-5 rounded-full bg-white shadow peer-checked:translate-x-5 transition-transform duration-200" />
                  </span>
                  <span className="text-sm text-slate-600">
                    {form.estado === 'activo' ? 'Activo' : 'Inactivo'}
                  </span>
                </motion.label>

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
                    className="px-4 py-2 rounded-xl bg-teal-600 text-white font-semibold hover:bg-teal-700 disabled:opacity-60 disabled:cursor-not-allowed transition"
                  >
                    {saving
                      ? 'Guardando…'
                      : isEdit
                      ? 'Guardar cambios'
                      : multiple
                      ? 'Crear asignaciones'
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
