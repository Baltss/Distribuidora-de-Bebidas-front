// src/Pages/Geografia/BarriosCards.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppShell from '../../Components/Layout/AppShell';
import { motion } from 'framer-motion';
import { FaPlus, FaSearch, FaArrowLeft } from 'react-icons/fa';

import BarrioCard from '../../Components/Geografia/BarrioCard';
import BarrioFormModal from '../../Components/Geografia/BarrioFormModal';

import {
  listBarrios,
  createBarrio,
  updateBarrio,
  patchBarrioEstado,
  deleteBarrio
} from '../../api/barrios';
import { listCiudades } from '../../api/ciudades';
import { listLocalidades } from '../../api/localidades';
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

export default function BarriosCards() {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);

  const [q, setQ] = useState('');
  const dq = useDebouncedValue(q, 500);

  const [filtroEstado, setFiltroEstado] = useState('todas'); // todas|activas|inactivas
  const [filtroCiudad, setFiltroCiudad] = useState('');
  const [filtroLocalidad, setFiltroLocalidad] = useState('');
  const [ciudades, setCiudades] = useState([]);
  const [localidadesFiltro, setLocalidadesFiltro] = useState([]);

  const [page, setPage] = useState(1);
  const limit = 18;

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  // Cargar ciudades para filtro
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

  // Cargar localidades del filtro cuando se elija una ciudad
  useEffect(() => {
    const loadLocs = async () => {
      if (!filtroCiudad) {
        setLocalidadesFiltro([]);
        setFiltroLocalidad('');
        return;
      }
      try {
        const resp = await listLocalidades({
          ciudad_id: filtroCiudad,
          estado: 'activa',
          page: 1,
          limit: 500,
          orderBy: 'nombre',
          orderDir: 'ASC'
        });
        const data = Array.isArray(resp) ? resp : resp?.data || [];
        setLocalidadesFiltro(data);
        // limpiar si la localidad elegida no pertenece a la nueva ciudad
        setFiltroLocalidad((curr) =>
          data.some((l) => String(l.id) === String(curr)) ? curr : ''
        );
      } catch {
        setLocalidadesFiltro([]);
        setFiltroLocalidad('');
      }
    };
    loadLocs(); // eslint-disable-next-line
  }, [filtroCiudad]);

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
      if (filtroLocalidad) params.localidad_id = filtroLocalidad;

      const data = await listBarrios(params);
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
        text: 'No se pudieron cargar los barrios'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(); // eslint-disable-next-line
  }, [dq, filtroEstado, filtroCiudad, filtroLocalidad, page]);

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
        await updateBarrio(editing.id, form);
        await showSuccessSwal({
          title: 'Guardado',
          text: 'Barrio actualizado'
        });
      } else {
        await createBarrio(form);
        await showSuccessSwal({ title: 'Creado', text: 'Barrio creado' });
      }
      await fetchData();
      setModalOpen(false);
      setEditing(null);
    } catch (err) {
      const { code, mensajeError, tips } = err || {};

      if (code === 'DUPLICATE') {
        return showErrorSwal({
          title: 'Duplicado',
          text:
            mensajeError ||
            'Ya existe un barrio con ese nombre en esa localidad.',
          tips: tips?.length
            ? tips
            : ['Usá otro nombre o elegí otra localidad.']
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
      await patchBarrioEstado(item.id, next);
      await showSuccessSwal({
        title: next === 'activa' ? 'Activado' : 'Desactivado',
        text: `Barrio ${next === 'activa' ? 'activado' : 'desactivado'}`
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
      title: '¿Eliminar barrio?',
      text: `Se eliminará "${item?.nombre}". Esta acción no se puede deshacer.`,
      confirmText: 'Sí, eliminar'
    });
    if (!isConfirmed(res)) return;

    const id = Number(item.id);

    // Optimista
    setRows((r) => r.filter((x) => Number(x.id) !== id));

    try {
      const resp = await deleteBarrio(id); // tu wrapper puede devolver { message } o 204
      await showSuccessSwal({
        title: 'Eliminado',
        text: resp?.message || 'Barrio eliminado correctamente.'
      });

      // Re-sync (paginación/meta)
      await fetchData();
    } catch (err) {
      // Rollback a estado real
      await fetchData();

      const { mensajeError, tips } = err || {};
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
          Barrios
        </motion.h1>
        <p className="mt-1 text-sm text-slate-500">
          Gestioná barrios con filtros por ciudad y localidad.
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
            {/* Ciudad */}
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

            {/* Localidad (depende de ciudad) */}
            <select
              value={filtroLocalidad}
              onChange={(e) => {
                setPage(1);
                setFiltroLocalidad(e.target.value);
              }}
              disabled={!filtroCiudad}
              className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-400/40 disabled:opacity-60"
            >
              <option value="">
                {filtroCiudad ? 'Todas las localidades' : 'Elegí ciudad'}
              </option>
              {localidadesFiltro.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.nombre}
                </option>
              ))}
            </select>

            {/* Estado */}
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
              <FaPlus /> Nuevo Barrio
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
              No hay barrios con esos filtros.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              {rows.map((it) => (
                <BarrioCard
                  key={it.id}
                  item={it}
                  onEdit={onEdit}
                  onToggleEstado={onToggleEstado}
                  onDelete={onDeleteDirect} // ← eliminación directa
                />
              ))}
            </div>
          )}

          {Pager}
        </div>
      </div>

      {/* Modal alta/edición */}
      <BarrioFormModal
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
