// FILE: src/Components/Repartos/RepartoAsignarClientesModal.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Users, Search, Trash2, CheckCircle2 } from 'lucide-react';

import {
  backdropV,
  panelV,
  formContainerV,
  fieldV
} from '../../ui/animHelpers';

import {
  listClientesDeReparto,
  asignarClientesReparto,
  deleteRepartoCliente
} from '../../api/repartosClientes';
import { listClientes } from '../../api/clientes';

import {
  showErrorSwal,
  showWarnSwal,
  showSuccessSwal,
  showConfirmSwal
} from '../../ui/swal';
import useDebouncedValue from '../../hooks/useDebouncedValue';

export default function RepartoAsignarClientesModal({
  open,
  reparto,
  onClose,
  onChanged
}) {
  const [loadingAssigned, setLoadingAssigned] = useState(false);
  const [assignedRows, setAssignedRows] = useState([]);
  const [assignedMeta, setAssignedMeta] = useState(null);

  const [loadingClientes, setLoadingClientes] = useState(false);
  const [clientesRows, setClientesRows] = useState([]);
  const [clientesMeta, setClientesMeta] = useState(null);

  const [qClientes, setQClientes] = useState('');
  const dqClientes = useDebouncedValue(qClientes, 500);
  const [pageClientes, setPageClientes] = useState(1);
  const limitClientes = 20;

  const [selectedIds, setSelectedIds] = useState(new Set());

  const capacidad = useMemo(() => {
    if (!reparto) return 0;
    const min = Number(reparto.rango_min ?? 0);
    const max = Number(reparto.rango_max ?? 0);
    if (!Number.isFinite(min) || !Number.isFinite(max)) return 0;
    return max >= min ? max - min + 1 : 0;
  }, [reparto]);

  const ocupados = useMemo(() => {
    if (!assignedMeta?.total && assignedMeta?.total !== 0) {
      return assignedRows.length;
    }
    return assignedMeta.total;
  }, [assignedMeta, assignedRows]);

  const libres = useMemo(() => {
    if (!capacidad) return null;
    return Math.max(0, capacidad - ocupados);
  }, [capacidad, ocupados]);

  // IDs de clientes ya asignados al reparto
  const assignedClienteIds = useMemo(() => {
    const ids = new Set();
    for (const row of assignedRows || []) {
      if (row?.cliente_id) {
        ids.add(Number(row.cliente_id));
      } else if (row?.cliente?.id) {
        ids.add(Number(row.cliente.id));
      }
    }
    return ids;
  }, [assignedRows]);

  // Lista de clientes visibles en el panel derecho (excluye los ya asignados)
  const clientesFiltrados = useMemo(() => {
    return (clientesRows || []).filter(
      (cli) => !assignedClienteIds.has(Number(cli.id))
    );
  }, [clientesRows, assignedClienteIds]);

  // Helpers
  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const clearSelection = () => setSelectedIds(new Set());

  // ===============================
  // Fetch clientes asignados
  // ===============================
  const fetchAssigned = async () => {
    if (!reparto?.id) return;
    setLoadingAssigned(true);
    try {
      const data = await listClientesDeReparto(reparto.id, {
        page: 1,
        limit: 300
      });
      setAssignedRows(data.data || []);
      setAssignedMeta(data.meta || null);
    } catch (err) {
      console.error('fetchAssigned error:', err);
      await showErrorSwal({
        title: 'Error',
        text: 'No se pudieron cargar los clientes del reparto.'
      });
    } finally {
      setLoadingAssigned(false);
    }
  };

  // ===============================
  // Fetch clientes (buscador)
  // ===============================
  const fetchClientes = async () => {
    if (!open) return;
    setLoadingClientes(true);
    try {
      const params = {
        page: pageClientes,
        limit: limitClientes,
        q: dqClientes || '',
        estado: 'activo',
        orderBy: 'nombre',
        orderDir: 'ASC'
      };

      // Si quisieras filtrar por ciudad del reparto:
      // if (reparto?.ciudad_id) {
      //   params.ciudad_id = reparto.ciudad_id;
      // }

      const data = await listClientes(params);
      setClientesRows(data.data || []);
      setClientesMeta(data.meta || null);
    } catch (err) {
      console.error(err);
      await showErrorSwal({
        title: 'Error',
        text: 'No se pudieron cargar los clientes disponibles.'
      });
    } finally {
      setLoadingClientes(false);
    }
  };

  // Efectos
  useEffect(() => {
    if (open && reparto?.id) {
      fetchAssigned();
      setPageClientes(1);
      clearSelection();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, reparto?.id]);

  useEffect(() => {
    if (open) {
      fetchClientes();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, dqClientes, pageClientes, reparto?.ciudad_id]);

  const handleClose = () => {
    clearSelection();
    onClose?.();
  };

  // ===============================
  // Asignar seleccionados
  // ===============================
  const handleAsignar = async () => {
    const ids = Array.from(selectedIds);

    if (!ids.length) {
      return showWarnSwal({
        title: 'Sin selección',
        text: 'Seleccioná al menos un cliente para asignar.'
      });
    }
    if (!reparto?.id) return;

    try {
      const resp = await asignarClientesReparto(reparto.id, {
        cliente_ids: ids,
        modo: 'append' // el backend puede ignorarlo; no afecta
      });

      // Backend nuevo:
      // resp.asignados (creados) | resp.reactivados | resp.yaActivos
      const creados = Array.isArray(resp?.asignados)
        ? resp.asignados.length
        : 0;
      const reactivados = Array.isArray(resp?.reactivados)
        ? resp.reactivados.length
        : 0;
      const yaActivos = Array.isArray(resp?.yaActivos)
        ? resp.yaActivos.length
        : 0;

      const totalAfectados = creados + reactivados;

      // Mensaje UX claro (sin mentir con ids.length)
      const parts = [];
      if (creados) parts.push(`Creados: ${creados}`);
      if (reactivados) parts.push(`Reactivados: ${reactivados}`);
      if (yaActivos) parts.push(`Ya activos: ${yaActivos}`);
      const detalle = parts.length
        ? parts.join(' • ')
        : `Procesados: ${totalAfectados}`;

      await showSuccessSwal({
        title: 'Asignación realizada',
        text: detalle
      });

      clearSelection();
      await fetchAssigned();
      await fetchClientes();
      onChanged?.();
    } catch (err) {
      console.error(err);
      const { code, mensajeError, tips } = err || {};

      if (code === 'CAPACITY_EXCEEDED') {
        return showErrorSwal({
          title: 'Capacidad insuficiente',
          text:
            mensajeError ||
            'El reparto no tiene capacidad disponible para todos los clientes seleccionados.',
          tips: (tips?.length && tips) || [
            libres != null
              ? `Quedan ${libres} lugar(es) libre(s) en el rango.`
              : 'Ajustá el rango del reparto o reducí la selección.'
          ]
        });
      }

      // Compatibilidad: ALREADY_ASSIGNED (backend nuevo) o SIN_NUEVOS_CLIENTES (viejo)
      if (
        code === 'DUPLICATE' ||
        code === 'ALREADY_ASSIGNED' ||
        code === 'SIN_NUEVOS_CLIENTES'
      ) {
        return showWarnSwal({
          title: 'Clientes ya asignados',
          text:
            mensajeError ||
            'Los clientes seleccionados ya estaban asignados a este reparto.',
          tips
        });
      }

      return showErrorSwal({
        title: 'No se pudo asignar',
        text: mensajeError || 'Ocurrió un error al asignar los clientes.',
        tips
      });
    }
  };

  // ===============================
  // Quitar cliente del reparto
  // ===============================
  const handleRemoveAssigned = async (repCli) => {
    const res = await showConfirmSwal({
      title: 'Quitar cliente del reparto',
      text: `¿Quitar a "${repCli?.cliente?.nombre}" del reparto?`,
      confirmText: 'Sí, quitar'
    });

    const isConfirmed =
      typeof res === 'object' && res ? !!res.isConfirmed : !!res;

    if (!isConfirmed) return; //si canceló, no hacemos nada

    try {
      await deleteRepartoCliente(repCli.id);

      await showSuccessSwal({
        title: 'Cliente quitado',
        text: 'El cliente fue quitado del reparto.'
      });

      await fetchAssigned();
      await fetchClientes();
      onChanged?.();
    } catch (err) {
      console.error(err);
      const { mensajeError, tips } = err || {};
      await showErrorSwal({
        title: 'No se pudo quitar',
        text: mensajeError || 'Ocurrió un error al quitar el cliente.',
        tips
      });
    }
  };

  if (!reparto) return null;

  const ciudadNombre = reparto?.ciudad?.nombre || reparto?.ciudad_nombre || '—';

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
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={handleClose}
          />

          {/* Panel principal */}
          <motion.div
            variants={panelV}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="relative w-full max-w-[96vw] sm:max-w-5xl max-h-[90vh]
                       overflow-y-auto rounded-3xl border border-slate-200
                       bg-white shadow-2xl"
          >
            {/* Cerrar */}
            <button
              onClick={handleClose}
              className="absolute z-50 top-2.5 right-2.5 inline-flex h-9 w-9 items-center justify-center rounded-xl
                         bg-slate-100 border border-slate-200 text-slate-500 hover:bg-slate-200 transition"
              aria-label="Cerrar"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Contenido scrollable */}
            <div className="relative z-10 p-4 sm:p-6 lg:p-8">
              {/* Header */}
              <motion.div
                variants={formContainerV}
                initial="hidden"
                animate="visible"
                className="mb-5 sm:mb-6"
              >
                <motion.h3
                  variants={fieldV}
                  className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight text-slate-900 flex flex-wrap items-center gap-2"
                >
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-teal-50 border border-teal-200">
                    <Users className="h-5 w-5 text-teal-600" />
                  </span>
                  <span className="titulo uppercase text-xl">
                    Asignar clientes al reparto
                  </span>
                  <span className="text-teal-600">
                    “{reparto.nombre || 'Reparto'}”
                  </span>
                </motion.h3>

                <motion.div
                  variants={fieldV}
                  className="grid gap-2 sm:gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 text-xs sm:text-sm text-slate-600"
                >
                  <div className="flex flex-col">
                    <span className="uppercase text-[10px] tracking-widest text-slate-400">
                      Ciudad
                    </span>
                    <span className="font-medium text-slate-800">{ciudadNombre}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="uppercase text-[10px] tracking-widest text-slate-400">
                      Rango de clientes
                    </span>
                    <span className="font-medium text-slate-800">
                      {reparto.rango_min} – {reparto.rango_max}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="uppercase text-[10px] tracking-widest text-slate-400">
                      Capacidad
                    </span>
                    <span className="font-medium text-slate-800">
                      {capacidad || '—'} cliente(s)
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="uppercase text-[10px] tracking-widest text-slate-400">
                      Ocupados / Libres
                    </span>
                    <span className="font-medium text-slate-800">
                      {ocupados} ocupados
                      {libres != null && (
                        <span className="ml-1 text-teal-600">
                          · {libres} libre(s)
                        </span>
                      )}
                    </span>
                  </div>
                </motion.div>
              </motion.div>

              {/* Layout 1 col en mobile / 2 cols en desktop grande */}
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1.4fr)]">
                {/* Columna izquierda: asignados */}
                <motion.div
                  variants={formContainerV}
                  initial="hidden"
                  animate="visible"
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-3 sm:p-4 flex flex-col"
                >
                  <div className="flex items-center justify-between mb-3 gap-2">
                    <div>
                      <div className="text-xs uppercase tracking-widest text-slate-400">
                        Clientes asignados
                      </div>
                      <div className="text-sm text-slate-600">
                        {assignedRows.length} en este reparto
                      </div>
                    </div>
                    {loadingAssigned && (
                      <div className="h-6 w-6 rounded-full border-2 border-slate-300 border-t-teal-500 animate-spin" />
                    )}
                  </div>

                  <div className="flex-1 min-h-[160px] max-h-[320px] sm:max-h-[360px] overflow-y-auto space-y-2 pr-1">
                    {assignedRows.length === 0 && !loadingAssigned ? (
                      <div className="text-xs text-slate-400 italic">
                        Este reparto aún no tiene clientes asignados.
                      </div>
                    ) : (
                      assignedRows.map((rc) => {
                        const c = rc.cliente || rc;
                        const nombre = c?.nombre || 'Cliente';
                        const documento = c?.documento || null;
                        const barrio = c?.barrio?.nombre || null;
                        const loc = c?.barrio?.localidad?.nombre || null;

                        return (
                          <div
                            key={rc.id}
                            className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="inline-flex items-center justify-center h-7 w-7 rounded-lg bg-teal-50 border border-teal-200 text-[11px] font-bold text-teal-700">
                                {rc.numero_rango}
                              </span>
                              <div className="min-w-0">
                                <div className="text-xs font-semibold text-slate-800 truncate">
                                  {nombre}
                                </div>
                                <div className="text-[11px] text-slate-400 truncate">
                                  {documento && (
                                    <span>DNI: {documento} · </span>
                                  )}
                                  {barrio && loc
                                    ? `${barrio} (${loc})`
                                    : barrio || loc || '—'}
                                </div>
                              </div>
                            </div>
                            <button
                              onClick={() => handleRemoveAssigned(rc)}
                              className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-rose-50 border border-rose-200 hover:bg-rose-100 transition"
                              title="Quitar del reparto"
                            >
                              <Trash2 className="h-3.5 w-3.5 text-rose-600" />
                            </button>
                          </div>
                        );
                      })
                    )}
                  </div>
                </motion.div>

                {/* Columna derecha: buscador */}
                <motion.div
                  variants={formContainerV}
                  initial="hidden"
                  animate="visible"
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-3 sm:p-4 flex flex-col min-h-0"
                >
                  {/* Filtros */}
                  <motion.div
                    variants={fieldV}
                    className="flex flex-col sm:flex-row gap-2 sm:items-center mb-3"
                  >
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <input
                        value={qClientes}
                        onChange={(e) => {
                          setPageClientes(1);
                          setQClientes(e.target.value);
                        }}
                        placeholder="Buscar por nombre, teléfono, email o documento…"
                        className="w-full pl-9 pr-3 py-2 rounded-xl bg-white border border-slate-200 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-400/40"
                      />
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {selectedIds.size > 0 ? (
                        <span>
                          {selectedIds.size} cliente(s) seleccionado(s)
                        </span>
                      ) : (
                        <span>
                          Seleccioná clientes de la lista para asignar
                        </span>
                      )}
                    </div>
                  </motion.div>

                  {/* Lista de clientes (SCROLL) */}
                  <div
                    className="flex-1 min-h-0 overflow-y-auto overscroll-contain pr-1 rounded-xl border border-slate-200 bg-white"
                    style={{ WebkitOverflowScrolling: 'touch' }}
                  >
                    {loadingClientes ? (
                      <div className="flex items-center justify-center py-16">
                        <div className="h-9 w-9 rounded-full border-2 border-slate-200 border-t-teal-500 animate-spin" />
                      </div>
                    ) : clientesFiltrados.length === 0 ? (
                      <div className="py-10 text-center text-xs text-slate-400 px-3">
                        No se encontraron clientes con esos filtros.
                      </div>
                    ) : (
                      <ul className="divide-y divide-slate-200">
                        {clientesFiltrados.map((c) => {
                          const id = c.id;
                          const checked = selectedIds.has(id);
                          const ciudad =
                            c?.barrio?.localidad?.ciudad?.nombre || null;
                          const loc = c?.barrio?.localidad?.nombre || null;
                          const barrio = c?.barrio?.nombre || null;

                          return (
                            <li
                              key={id}
                              className={`px-3 py-2.5 text-xs sm:text-[13px] flex items-center gap-3 cursor-pointer
                         hover:bg-slate-50 ${
                           checked ? 'bg-teal-50' : 'bg-transparent'
                         }`}
                              onClick={() => toggleSelect(id)}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggleSelect(id)}
                                onClick={(e) => e.stopPropagation()}
                                className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-400"
                              />
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <span className="font-semibold text-slate-800 truncate">
                                    {c.nombre}
                                  </span>
                                  {c.documento && (
                                    <span className="text-[11px] text-slate-500">
                                      · {c.documento}
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] text-slate-400 truncate">
                                  {barrio && loc
                                    ? `${barrio} (${loc})`
                                    : barrio || loc || ciudad || '—'}
                                  {c.telefono && ` · Tel: ${c.telefono}`}
                                </div>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>

                  {/* Paginador + botón asignar */}
                  <div className="mt-3 flex flex-col sm:flex-row sm:items-center gap-2 justify-between">
                    <div className="flex items-center gap-2 text-[11px] text-slate-500">
                      <button
                        onClick={() =>
                          setPageClientes((p) =>
                            clientesMeta?.hasPrev ? Math.max(1, p - 1) : p
                          )
                        }
                        disabled={!clientesMeta?.hasPrev}
                        className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white disabled:opacity-40 text-xs"
                      >
                        ← Anterior
                      </button>
                      <span>
                        Página {clientesMeta?.page || 1} /{' '}
                        {clientesMeta?.totalPages || 1}
                      </span>
                      <button
                        onClick={() =>
                          setPageClientes((p) =>
                            clientesMeta?.hasNext ? p + 1 : p
                          )
                        }
                        disabled={!clientesMeta?.hasNext}
                        className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white disabled:opacity-40 text-xs"
                      >
                        Siguiente →
                      </button>
                    </div>

                    <div className="flex items-center gap-2 justify-end">
                      {selectedIds.size > 0 && (
                        <button
                          type="button"
                          onClick={clearSelection}
                          className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-[12px] text-slate-600 hover:bg-slate-100 transition"
                        >
                          Limpiar selección
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={handleAsignar}
                        disabled={selectedIds.size === 0}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl
                   bg-teal-600 text-white text-[13px] font-semibold
                   hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        Asignar seleccionados
                      </button>
                    </div>
                  </div>
                </motion.div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
