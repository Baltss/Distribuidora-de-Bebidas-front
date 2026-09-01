import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FaPlus, FaSearch, FaArrowLeft, FaBuilding } from 'react-icons/fa';

import AppShell from '../../Components/Layout/AppShell';
import LocalCard from '../../Components/Locales/LocalCard';
import LocalFormModal from '../../Components/Locales/LocalFormModal';

import { listLocales, createLocal, updateLocal, deleteLocal } from '../../api/locales';
import useDebouncedValue from '../../hooks/useDebouncedValue';
import { showErrorSwal, showSuccessSwal, showConfirmSwal } from '../../ui/swal';

const LocalesGet = () => {
  const navigate = useNavigate();

  const [data, setData] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const debouncedQ = useDebouncedValue(search, 500);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(6);
  const [orderBy, setOrderBy] = useState('id');
  const [orderDir, setOrderDir] = useState('ASC');

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const fetchLocales = async () => {
    setLoading(true);
    try {
      const resp = await listLocales({
        page,
        limit,
        q: debouncedQ || undefined,
        orderBy,
        orderDir
      });

      // Compat: si backend devuelve array plano
      if (Array.isArray(resp)) {
        setData(resp);
        setMeta(null);
      } else {
        setData(resp.data || []);
        setMeta(resp.meta || null);
      }
    } catch (e) {
      console.error('Error al obtener locales:', e);
      const { mensajeError, tips } = e || {};
      await showErrorSwal({
        title: 'Error',
        text: mensajeError || 'No se pudieron cargar los locales',
        tips
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLocales();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit, orderBy, orderDir, debouncedQ]);

  const filteredWhenNoMeta = useMemo(() => {
    // Si NO hay meta (array plano por compat), mantené el filtrado local
    if (meta) return data;
    const q = search.toLowerCase();
    return data.filter((l) =>
      [l.nombre, l.direccion, l.telefono].some((val) =>
        val?.toLowerCase().includes(q)
      )
    );
  }, [data, meta, search]);

  const openModal = (local = null) => {
    setEditing(local);
    setModalOpen(true);
  };

  const onSubmit = async (form) => {
    try {
      if (editing?.id) {
        await updateLocal(editing.id, form);
        await showSuccessSwal({ title: 'Guardado', text: 'Local actualizado' });
      } else {
        await createLocal(form);
        await showSuccessSwal({ title: 'Creado', text: 'Local creado' });
      }
      setModalOpen(false);
      setEditing(null);
      setPage(1);
      await fetchLocales();
    } catch (err) {
      const { code, mensajeError, tips } = err || {};
      if (code === 'DUPLICATE') {
        return showErrorSwal({
          title: 'Duplicado',
          text: mensajeError || 'El código o nombre ya están en uso.',
          tips: tips?.length ? tips : ['Verificá el código del local.']
        });
      }
      if (code === 'MODEL_VALIDATION' || code === 'BAD_REQUEST') {
        return showErrorSwal({
          title: 'Datos inválidos',
          text: mensajeError || 'Revisá los campos del formulario.',
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

  const onDelete = async (item) => {
    const isConfirmed = await showConfirmSwal({
      title: '¿Eliminar local?',
      text: `Se eliminará "${item?.nombre}". Esta acción no se puede deshacer.`,
      confirmText: 'Sí, eliminar'
    });
    if (!isConfirmed) return;

    try {
      await deleteLocal(item.id);
      await showSuccessSwal({ title: 'Eliminado', text: 'Se borró correctamente.' });
      if (meta && data.length === 1 && page > 1) {
        setPage((p) => p - 1);
      } else {
        await fetchLocales();
      }
    } catch (err) {
      const { mensajeError, tips } = err || {};
      await showErrorSwal({
        title: 'No se pudo eliminar',
        text: mensajeError || 'Ocurrió un error al eliminar',
        tips
      });
    }
  };

  const total = meta?.total ?? filteredWhenNoMeta.length;
  const totalPages = meta?.totalPages ?? Math.max(Math.ceil(total / limit), 1);
  const currPage = meta?.page ?? page;
  const hasPrev = meta?.hasPrev ?? currPage > 1;
  const hasNext = meta?.hasNext ?? currPage < totalPages;

  // Datos que se muestran (server-side si hay meta, client-side si no hay)
  const rows = meta
    ? data
    : filteredWhenNoMeta.slice((page - 1) * limit, page * limit);

  const Pager = (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div className="text-slate-500 text-xs sm:text-sm">
        Total: <b className="text-slate-700">{total}</b> · Página{' '}
        <b className="text-slate-700">{currPage}</b> de{' '}
        <b className="text-slate-700">{totalPages}</b>
      </div>
      <div className="-mx-2 sm:mx-0">
        <div className="overflow-x-auto no-scrollbar px-2 sm:px-0">
          <div className="inline-flex items-center whitespace-nowrap gap-2">
            <button
              className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40"
              onClick={() => setPage(1)}
              disabled={!hasPrev}
            >
              «
            </button>
            <button
              className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40"
              onClick={() => setPage((p) => Math.max(p - 1, 1))}
              disabled={!hasPrev}
            >
              ‹
            </button>

            <div className="flex flex-wrap gap-2 max-w-[80vw]">
              {Array.from({ length: totalPages })
                .slice(
                  Math.max(0, currPage - 3),
                  Math.max(0, currPage - 3) + 6
                )
                .map((_, idx) => {
                  const start = Math.max(1, currPage - 2);
                  const num = start + idx;
                  if (num > totalPages) return null;
                  const active = num === currPage;
                  return (
                    <button
                      key={num}
                      onClick={() => setPage(num)}
                      className={`px-3 py-2 rounded-lg border text-sm ${
                        active
                          ? 'bg-teal-600 border-teal-600 text-white'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                      aria-current={active ? 'page' : undefined}
                    >
                      {num}
                    </button>
                  );
                })}
            </div>

            <button
              className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40"
              onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
              disabled={!hasNext}
            >
              ›
            </button>
            <button
              className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40"
              onClick={() => setPage(totalPages)}
              disabled={!hasNext}
            >
              »
            </button>
          </div>
        </div>
      </div>
    </div>
  );

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

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <motion.h1
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 flex items-center gap-3"
            >
              <FaBuilding className="text-teal-600" /> Locales
            </motion.h1>
            <p className="mt-1 text-sm text-slate-500">
              Gestioná las sucursales y puntos de venta.
            </p>
          </div>

          <button
            onClick={() => openModal()}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-teal-600 text-white font-semibold hover:bg-teal-700 transition shadow-sm"
          >
            <FaPlus /> Nuevo Local
          </button>
        </div>

        {/* Barra de acciones */}
        <div className="mt-6 flex flex-col md:flex-row items-stretch md:items-center gap-3">
          <div className="relative flex-1">
            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
            <input
              type="text"
              placeholder="Buscar por nombre, dirección o teléfono…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-10 pr-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-400/40"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={orderBy}
              onChange={(e) => setOrderBy(e.target.value)}
              aria-label="Ordenar por"
              className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-400/40"
            >
              <option value="id">ID</option>
              <option value="nombre">Nombre</option>
              <option value="codigo">Código</option>
              <option value="ciudad">Ciudad</option>
              <option value="provincia">Provincia</option>
            </select>
            <select
              value={orderDir}
              onChange={(e) => setOrderDir(e.target.value)}
              aria-label="Dirección de orden"
              className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-400/40"
            >
              <option value="ASC">Ascendente</option>
              <option value="DESC">Descendente</option>
            </select>
            <select
              value={limit}
              onChange={(e) => {
                setLimit(Number(e.target.value));
                setPage(1);
              }}
              aria-label="Items por página"
              className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-400/40"
            >
              <option value={6}>6</option>
              <option value={12}>12</option>
              <option value={24}>24</option>
              <option value={48}>48</option>
            </select>
          </div>
        </div>

        <div className="mt-4">{Pager}</div>

        {/* Grid */}
        <div className="mt-4">
          {loading ? (
            <div className="flex items-center justify-center py-24">
              <div className="h-10 w-10 border-4 border-slate-200 border-t-teal-500 rounded-full animate-spin" />
            </div>
          ) : rows.length === 0 ? (
            <div className="text-center text-slate-600 py-24">
              No hay locales con esos filtros.
            </div>
          ) : (
            <motion.div layout className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {rows.map((local) => (
                <LocalCard
                  key={local.id}
                  item={local}
                  onEdit={openModal}
                  onDelete={onDelete}
                />
              ))}
            </motion.div>
          )}
        </div>

        <div className="mt-6">{Pager}</div>
      </div>

      <LocalFormModal
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
};

export default LocalesGet;
