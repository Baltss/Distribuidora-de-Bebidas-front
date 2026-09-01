// ===============================
// FILE: src/Pages/Clientes/ClientesCards.jsx
// ===============================
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppShell from '../../Components/Layout/AppShell';
import { motion } from 'framer-motion';
import { FaPlus, FaSearch, FaArrowLeft, FaFileExcel } from 'react-icons/fa';

import ClienteCard from '../../Components/Clientes/ClienteCard';
import ClienteFormModal from '../../Components/Clientes/ClienteFormModal';

import {
  listClientes,
  createCliente,
  updateCliente,
  patchClienteEstado,
  deleteCliente,
  exportClientesXlsx
} from '../../api/clientes';

import { listVendedores } from '../../api/vendedores';
import { listBarrios } from '../../api/barrios';
import useDebouncedValue from '../../hooks/useDebouncedValue';

//   - 14-07-2026 - Borrado lógico del filtro de barrios (dejó de ser
// necesario). Se mantiene el estado/lógica por si se reactiva a futuro;
// solo se oculta el control de UI.
const SHOW_FILTRO_BARRIO = false;

import {
  showErrorSwal,
  showWarnSwal,
  showSuccessSwal,
  showConfirmSwal
} from '../../ui/swal';

export default function ClientesCards() {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [q, setQ] = useState('');
  const dq = useDebouncedValue(q, 500);
  const [filtroEstado, setFiltroEstado] = useState('todos'); // todos|activos|inactivos
  const [filtroBarrio, setFiltroBarrio] = useState('');
  const [filtroVendedor, setFiltroVendedor] = useState('');

  const [page, setPage] = useState(1);
  const limit = 18;

  // Datos auxiliares para el form
  const [barrios, setBarrios] = useState([]);
  const [vendedores, setVendedores] = useState([]);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  // Catálogos (barrios, vendedores)
  useEffect(() => {
    (async () => {
      try {
        const [bRes, vRes] = await Promise.all([
          listBarrios({ orderBy: 'nombre', orderDir: 'ASC', limit: 500 }),
          listVendedores({
            estado: 'activo',
            orderBy: 'nombre',
            orderDir: 'ASC',
            limit: 500
          })
        ]);

        const bRows = Array.isArray(bRes) ? bRes : bRes?.data || [];
        const vRows = Array.isArray(vRes) ? vRes : vRes?.data || [];

        setBarrios(bRows);
        setVendedores(vRows);
      } catch (e) {
        console.error('Error cargando catálogos', e);
      }
    })();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = {
        page,
        limit,
        q: dq || '',
        orderBy: 'created_at',
        orderDir: 'DESC'
      };
      if (filtroEstado === 'activos') params.estado = 'activo';
      if (filtroEstado === 'inactivos') params.estado = 'inactivo';
      if (filtroBarrio) params.barrio_id = filtroBarrio;
      if (filtroVendedor) params.vendedor_id = filtroVendedor;

      const resp = await listClientes(params);

      const apiRows = Array.isArray(resp) ? resp : resp?.data || [];
      const apiMeta = Array.isArray(resp) ? null : resp?.meta || null;

      let normalized = null;
      if (apiMeta) {
        const lim = apiMeta.limit || limit;
        const pageNum =
          apiMeta.page ??
          (apiMeta.offset !== undefined
            ? Math.floor(apiMeta.offset / lim) + 1
            : 1);
        const totalPages =
          apiMeta.totalPages ??
          (apiMeta.total ? Math.ceil(apiMeta.total / lim) : undefined);
        const hasPrev =
          apiMeta.hasPrev ??
          (totalPages ? pageNum > 1 : (apiMeta.offset || 0) > 0);
        const hasNext =
          apiMeta.hasNext ?? (totalPages ? pageNum < totalPages : false);

        normalized = {
          ...apiMeta,
          page: pageNum,
          totalPages,
          hasPrev,
          hasNext
        };
      }

      setRows(apiRows);
      setMeta(normalized);
    } catch (e) {
      console.error(e);
      await showErrorSwal({
        title: 'Error',
        text: 'No se pudieron cargar los clientes'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(); // eslint-disable-next-line
  }, [dq, filtroEstado, filtroBarrio, filtroVendedor, page]);

  const onNew = () => {
    setEditing(null);
    setModalOpen(true);
  };
  const [exportando, setExportando] = useState(false);
  const onExport = async () => {
    setExportando(true);
    try {
      await exportClientesXlsx();
    } catch (err) {
      await showErrorSwal({
        title: 'No se pudo exportar',
        text: err?.mensajeError || 'Ocurrió un error inesperado'
      });
    } finally {
      setExportando(false);
    }
  };
  const onEdit = (item) => {
    setEditing(item);
    setModalOpen(true);
  };

  const onSubmit = async (form) => {
    try {
      if (editing?.id) {
        await updateCliente(editing.id, form);
        await showSuccessSwal({
          title: 'Guardado',
          text: 'Cliente actualizado'
        });
      } else {
        await createCliente(form);
        await showSuccessSwal({ title: 'Creado', text: 'Cliente creado' });
      }
      await fetchData();
      setModalOpen(false);
      setEditing(null);
    } catch (err) {
      const { code, mensajeError, tips } = err || {};
      if (code === 'DUPLICATE') {
        return showErrorSwal({
          title: 'Duplicado',
          text: mensajeError || 'Documento ya está en uso.',
          tips: tips?.length ? tips : ['Verificá DNI/CUIT del cliente.']
        });
      }
      if (code === 'VENDEDOR_INACTIVO') {
        return showWarnSwal({
          title: 'Vendedor inactivo',
          text: 'El vendedor preferido seleccionado está inactivo.',
          tips: ['Elegí un vendedor activo o quitá la asignación.']
        });
      }
      if (code === 'MODEL_VALIDATION' || code === 'BAD_REQUEST') {
        return showWarnSwal({
          title: 'Datos inválidos',
          text: mensajeError || 'Revisá los campos del formulario.',
          tips
        });
      }
      if (code === 'NETWORK') {
        return showErrorSwal({
          title: 'Sin conexión',
          text: mensajeError,
          tips
        });
      }
      return showErrorSwal({
        title: 'No se pudo guardar',
        text: mensajeError || 'Ocurrió un error inesperado',
        tips
      });
    }
  };

  const onToggleEstado = async (item) => {
    const next = item.estado === 'activo' ? 'inactivo' : 'activo';

    setRows((r) =>
      r.map((x) => (x.id === item.id ? { ...x, estado: next } : x))
    );

    try {
      await patchClienteEstado(item.id, { estado: next });
      await showSuccessSwal({
        title: next === 'activo' ? 'Activado' : 'Desactivado',
        text: `Cliente ${next === 'activo' ? 'activado' : 'desactivado'}`
      });
    } catch (err) {
      setRows((r) =>
        r.map((x) => (x.id === item.id ? { ...x, estado: item.estado } : x))
      );
      const { mensajeError, tips } = err || {};
      await showErrorSwal({
        title: 'No se pudo actualizar',
        text: mensajeError || 'Error al cambiar el estado',
        tips
      });
    }
  };

  const onDelete = async (item) => {
    const res = await showConfirmSwal({
      title: '¿Eliminar cliente?',
      text: `Se eliminará "${item?.nombre}". Esta acción no se puede deshacer.`,
      confirmText: 'Sí, eliminar'
    });
    const isConfirmed =
      typeof res === 'object' && res ? !!res.isConfirmed : !!res;
    if (!isConfirmed) return;

    const id = Number(item.id);
    setRows((r) => r.filter((x) => Number(x.id) !== id));

    try {
      const resp = await deleteCliente(id, { hard: 1 });
      await showSuccessSwal({
        title: 'Eliminado',
        text: resp?.message || 'Se borró correctamente.'
      });
      await fetchData();
    } catch (err) {
      await fetchData(); // rollback total
      const { code, mensajeError, tips } = err || {};

      if (code === 'HAS_DEPENDENCIES') {
        return showErrorSwal({
          title: 'No se puede eliminar',
          text:
            mensajeError ||
            'El cliente posee ventas o movimientos asociados. Cerrá/quitá dependencias antes de borrar.',
          tips
        });
      }

      await showErrorSwal({
        title: 'No se pudo eliminar',
        text: mensajeError || 'Ocurrió un error al eliminar',
        tips
      });
    }
  };

  const Pager = useMemo(() => {
    if (!meta) return null;
    return (
      <div className="flex items-center justify-center gap-2 mt-6">
        <button
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={!meta.hasPrev}
          className="px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50"
        >
          ← Anterior
        </button>
        <span className="text-slate-500 text-sm">
          Página {meta.page} {meta.totalPages ? `/ ${meta.totalPages}` : ''}
        </span>
        <button
          onClick={() => setPage((p) => (meta.hasNext ? p + 1 : p))}
          disabled={!meta.hasNext}
          className="px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50"
        >
          Siguiente →
        </button>
      </div>
    );
  }, [meta]);

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition"
          >
            <FaArrowLeft className="h-3.5 w-3.5" /> Volver
          </button>
        </div>

        <motion.h1
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900"
        >
          Clientes
        </motion.h1>
        <p className="mt-1 text-sm text-slate-500">
          Gestioná clientes, su zona y vendedor preferido.
        </p>

        {/* Barra de acciones */}
        <div className="mt-6 flex flex-col md:flex-row items-stretch md:items-center gap-3">
          <div className="relative flex-1">
            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
            <input
              value={q}
              onChange={(e) => {
                setPage(1);
                setQ(e.target.value);
              }}
              placeholder="Buscar por nombre, documento, teléfono o email…"
              className="w-full pl-10 pr-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-400/40"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={filtroEstado}
              onChange={(e) => {
                setPage(1);
                setFiltroEstado(e.target.value);
              }}
              className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-400/40"
            >
              <option value="todos">Todos</option>
              <option value="activos">Activos</option>
              <option value="inactivos">Inactivos</option>
            </select>

            {SHOW_FILTRO_BARRIO && (
              <select
                value={filtroBarrio}
                onChange={(e) => {
                  setPage(1);
                  setFiltroBarrio(e.target.value);
                }}
                className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-400/40"
              >
                <option value="">Barrio (todos)</option>
                {barrios.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.nombre}
                  </option>
                ))}
              </select>
            )}

            <select
              value={filtroVendedor}
              onChange={(e) => {
                setPage(1);
                setFiltroVendedor(e.target.value);
              }}
              className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-400/40"
            >
              <option value="">Vendedor (todos)</option>
              {vendedores.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.nombre}
                </option>
              ))}
            </select>

            <button
              onClick={onExport}
              disabled={exportando}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 font-semibold hover:bg-slate-50 transition disabled:opacity-60"
            >
              <FaFileExcel className="text-emerald-600" /> {exportando ? 'Exportando…' : 'Exportar Excel'}
            </button>

            <button
              onClick={onNew}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-600 text-white font-semibold hover:bg-teal-700 transition"
            >
              <FaPlus /> Nuevo Cliente
            </button>
          </div>
        </div>

        {/* Grid */}
        <div className="mt-8">
          {loading ? (
            <div className="flex items-center justify-center py-24">
              <div className="h-10 w-10 border-4 border-slate-200 border-t-teal-500 rounded-full animate-spin" />
            </div>
          ) : rows.length === 0 ? (
            <div className="text-center text-slate-600 py-24">
              No hay clientes con esos filtros.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              {rows.map((it) => (
                <ClienteCard
                  key={it.id}
                  item={it}
                  onEdit={onEdit}
                  onToggleEstado={onToggleEstado}
                  onDelete={onDelete}
                />
              ))}
            </div>
          )}

          {Pager}
        </div>
      </div>

      <ClienteFormModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditing(null);
        }}
        onSubmit={onSubmit}
        initial={editing}
        barrios={barrios}
        vendedores={vendedores}
      />
    </AppShell>
  );
}
