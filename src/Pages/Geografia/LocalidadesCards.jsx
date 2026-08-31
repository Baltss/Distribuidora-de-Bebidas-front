// src/Pages/Geografia/LocalidadesCards.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppShell from '../../Components/Layout/AppShell';
import { motion } from 'framer-motion';
import { FaPlus, FaSearch, FaArrowLeft } from 'react-icons/fa';

import LocalidadCard from '../../Components/Geografia/LocalidadCard';
import LocalidadFormModal from '../../Components/Geografia/LocalidadFormModal';

import {
  listLocalidades,
  createLocalidad,
  updateLocalidad,
  patchLocalidadEstado,
  deleteLocalidad
} from '../../api/localidades';

import { listCiudades } from '../../api/ciudades';
import useDebouncedValue from '../../hooks/useDebouncedValue';

import {
  showErrorSwal,
  showWarnSwal,
  showSuccessSwal,
  showConfirmSwal
} from '../../ui/swal';

// Acepta boolean o { isConfirmed }
const isConfirmed = (res) =>
  typeof res === 'object' && res !== null ? !!res.isConfirmed : !!res;

export default function LocalidadesCards() {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);

  const [q, setQ] = useState('');
  const dq = useDebouncedValue(q, 500);

  const [filtroEstado, setFiltroEstado] = useState('todas'); // todas|activas|inactivas
  const [filtroCiudad, setFiltroCiudad] = useState(''); // id o ''
  const [ciudades, setCiudades] = useState([]);

  const [page, setPage] = useState(1);
  const limit = 18;

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  // Cargar ciudades (filtro)
  useEffect(() => {
    (async () => {
      try {
        const resp = await listCiudades({
          estado: 'activa',
          page: 1,
          limit: 500,
          orderBy: 'nombre',
          orderDir: 'ASC'
        });
        setCiudades(Array.isArray(resp) ? resp : resp?.data || []);
      } catch {
        setCiudades([]);
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
        orderBy: 'nombre',
        orderDir: 'ASC'
      };
      if (filtroEstado === 'activas') params.estado = 'activa';
      if (filtroEstado === 'inactivas') params.estado = 'inactiva';
      if (filtroCiudad) params.ciudad_id = filtroCiudad;

      const data = await listLocalidades(params);
      if (Array.isArray(data)) {
        setRows(data);
        setMeta(null);
      } else {
        setRows(data.data || []);
        setMeta(data.meta || null);
      }
    } catch (e) {
      console.error(e);
      await showErrorSwal({
        title: 'Error',
        text: 'No se pudieron cargar las localidades'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(); // eslint-disable-next-line
  }, [dq, filtroEstado, filtroCiudad, page]);

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
        await updateLocalidad(editing.id, form);
        await showSuccessSwal({
          title: 'Guardado',
          text: 'Localidad actualizada'
        });
      } else {
        await createLocalidad(form);
        await showSuccessSwal({ title: 'Creada', text: 'Localidad creada' });
      }
      await fetchData();
      setModalOpen(false);
      setEditing(null);
    } catch (err) {
      const { code, mensajeError, tips } = err || {};
      if (code === 'DUPLICATE') {
        return showErrorSwal({
          title: 'Duplicada',
          text:
            mensajeError ||
            'Ya existe una localidad con ese nombre en esa ciudad.',
          tips: tips?.length ? tips : ['Usá otro nombre o elegí otra ciudad.']
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
          text: mensajeError || 'No se pudo conectar',
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
    const next = item.estado === 'activa' ? 'inactiva' : 'activa';

    // Optimista
    setRows((r) =>
      r.map((x) => (x.id === item.id ? { ...x, estado: next } : x))
    );

    try {
      await patchLocalidadEstado(item.id, next);
      await showSuccessSwal({
        title: next === 'activa' ? 'Activada' : 'Desactivada',
        text: `Localidad ${next === 'activa' ? 'activada' : 'desactivada'}`
      });
    } catch (err) {
      // Rollback
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

  // Eliminación directa (sin ConfirmDialog)
  const onDeleteDirect = async (item) => {
    const res = await showConfirmSwal({
      title: '¿Eliminar localidad?',
      text: `Se eliminará "${item?.nombre}". Esta acción no se puede deshacer.`,
      confirmText: 'Sí, eliminar'
    });
    if (!isConfirmed(res)) return;

    const id = Number(item.id);

    // Optimista
    setRows((r) => r.filter((x) => Number(x.id) !== id));

    try {
      const resp = await deleteLocalidad(id); // maneja 204/200
      await showSuccessSwal({
        title: 'Eliminada',
        text: resp?.message || 'Localidad eliminada correctamente.'
      });

      // Re-sync (paginación/meta)
      await fetchData();
    } catch (err) {
      // Rollback al estado real
      await fetchData();

      const { code, mensajeError, tips, details } = err || {};
      if (code === 'HAS_DEPENDENCIES') {
        // Ofrecer desactivar si tiene barrios asociados
        const res2 = await showConfirmSwal({
          icon: 'warning',
          title: 'Tiene barrios asociados',
          text:
            (mensajeError ||
              'Esta localidad tiene barrios asociados. ¿Deseás desactivarla?') +
            (details?.barriosAsociados
              ? `<br/><br/>Barrios asociados: <b>${details.barriosAsociados}</b>`
              : ''),
          confirmText: 'Desactivar',
          cancelText: 'Cancelar'
        });
        if (isConfirmed(res2)) {
          try {
            await patchLocalidadEstado(id, 'inactiva');
            await fetchData();
            await showSuccessSwal({
              title: 'Desactivada',
              text: 'La localidad fue desactivada (posee dependencias).'
            });
          } catch (err2) {
            const { mensajeError: m2, tips: t2 } = err2 || {};
            await showErrorSwal({
              title: 'No se pudo desactivar',
              text: m2 || 'Error al desactivar',
              tips: t2
            });
          }
        }
        return;
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
          Página {meta.page} / {meta.totalPages}
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
          Localidades
        </motion.h1>
        <p className="mt-1 text-sm text-slate-500">
          Gestioná localidades, filtrá por ciudad y estado.
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
              placeholder="Buscar por nombre…"
              className="w-full pl-10 pr-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-400/40"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={filtroCiudad}
              onChange={(e) => {
                setPage(1);
                setFiltroCiudad(e.target.value);
              }}
              className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-400/40"
            >
              <option value="">Todas las ciudades</option>
              {ciudades.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre} {c.provincia ? `(${c.provincia})` : ''}
                </option>
              ))}
            </select>

            <select
              value={filtroEstado}
              onChange={(e) => {
                setPage(1);
                setFiltroEstado(e.target.value);
              }}
              className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-400/40"
            >
              <option value="todas">Todas</option>
              <option value="activas">Activas</option>
              <option value="inactivas">Inactivas</option>
            </select>

            <button
              onClick={onNew}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-600 text-white font-semibold hover:bg-teal-700 transition"
            >
              <FaPlus /> Nueva Localidad
            </button>
          </div>
        </div>

        {/* Grid de cards */}
        <div className="mt-8">
          {loading ? (
            <div className="flex items-center justify-center py-24">
              <div className="h-10 w-10 border-4 border-slate-200 border-t-teal-500 rounded-full animate-spin" />
            </div>
          ) : rows.length === 0 ? (
            <div className="text-center text-slate-600 py-24">
              No hay localidades con esos filtros.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              {rows.map((it) => (
                <LocalidadCard
                  key={it.id}
                  item={it}
                  onEdit={onEdit}
                  onToggleEstado={onToggleEstado}
                  onDelete={onDeleteDirect} // ← directo
                />
              ))}
            </div>
          )}

          {Pager}
        </div>
      </div>

      {/* Modal alta/edición */}
      <LocalidadFormModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditing(null);
        }}
        onSubmit={onSubmit}
        initial={editing}
        fetchData={fetchData}
      />
    </AppShell>
  );
}
