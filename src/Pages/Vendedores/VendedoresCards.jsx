import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppShell from '../../Components/Layout/AppShell';
import { motion } from 'framer-motion';
import { FaPlus, FaSearch, FaArrowLeft } from 'react-icons/fa';

import VendedorCard from '../../Components/Vendedores/VendedorCard';
import VendedorFormModal from '../../Components/Vendedores/VendedorFormModal';

import {
  listVendedores,
  createVendedor,
  updateVendedor,
  patchVendedorEstado,
  deleteVendedor
} from '../../api/vendedores';
import useDebouncedValue from '../../hooks/useDebouncedValue';

import {
  showErrorSwal,
  showWarnSwal,
  showSuccessSwal,
  showConfirmSwal
} from '../../ui/swal';

export default function VendedoresCards() {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);

  const [q, setQ] = useState('');
  const dq = useDebouncedValue(q, 500);
  const [filtroEstado, setFiltroEstado] = useState('todos'); // todos|activos|inactivos

  const [page, setPage] = useState(1);
  const limit = 18;

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = {
        page,
        limit,
        q: dq || '',
        orderBy: 'nombre',
        orderDir: 'ASC'
      };
      if (filtroEstado === 'activos') params.estado = 'activo';
      if (filtroEstado === 'inactivos') params.estado = 'inactivo';

      const resp = await listVendedores(params);

      let apiRows = Array.isArray(resp) ? resp : resp?.data || [];
      let apiMeta = Array.isArray(resp) ? null : resp?.meta || null;

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
        text: 'No se pudieron cargar los vendedores'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(); // eslint-disable-next-line
  }, [dq, filtroEstado, page]);

  const onNew = () => {
    setEditing(null);
    setModalOpen(true);
  };
  const onEdit = (item) => {
    setEditing(item);
    setModalOpen(true);
  };

  const onSubmit = async (form) => {
    try {
      if (editing?.id) {
        await updateVendedor(editing.id, form);
        await showSuccessSwal({
          title: 'Guardado',
          text: 'Vendedor actualizado'
        });
      } else {
        await createVendedor(form);
        await showSuccessSwal({ title: 'Creado', text: 'Vendedor creado' });
      }
      await fetchData();
      setModalOpen(false);
      setEditing(null);
    } catch (err) {
      const { code, mensajeError, tips } = err || {};
      if (code === 'DUPLICATE') {
        return showErrorSwal({
          title: 'Duplicado',
          text: mensajeError || 'Documento o email ya están en uso.',
          tips: tips?.length ? tips : ['Verificá CUIT/CUIL/DNI o email.']
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
      await patchVendedorEstado(item.id, { estado: next });
      await showSuccessSwal({
        title: next === 'activo' ? 'Activado' : 'Desactivado',
        text: `Vendedor ${next === 'activo' ? 'activado' : 'desactivado'}`
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
      title: '¿Eliminar vendedor?',
      text: `Se eliminará "${item?.nombre}". Esta acción no se puede deshacer.`,
      confirmText: 'Sí, eliminar'
    });
    const isConfirmed =
      typeof res === 'object' && res ? !!res.isConfirmed : !!res;
    if (!isConfirmed) return;

    const id = Number(item.id);
    setRows((r) => r.filter((x) => Number(x.id) !== id));

    try {
      const resp = await deleteVendedor(id, { hard: 1 });
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
            'El vendedor tiene asignaciones o ventas asociadas. Cerrá/quitá dependencias antes de borrar.',
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
          Vendedores
        </motion.h1>
        <p className="mt-1 text-sm text-slate-500">Gestioná vendedores y su estado.</p>

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
              placeholder="Buscar por nombre, documento o email…"
              className="w-full pl-10 pr-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-400/40"
            />
          </div>

          <div className="flex items-center gap-2">
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

            <button
              onClick={onNew}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-600 text-white font-semibold hover:bg-teal-700 transition"
            >
              <FaPlus /> Nuevo Vendedor
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
              No hay vendedores con esos filtros.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              {rows.map((it) => (
                <VendedorCard
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

      <VendedorFormModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditing(null);
        }}
        onSubmit={onSubmit}
        initial={editing}
      />
    </AppShell>
  );
}
