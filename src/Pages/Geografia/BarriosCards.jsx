// src/Pages/Geografia/BarriosCards.jsx
import React, { useEffect, useMemo, useState } from 'react';
import NavbarStaff from '../Dash/NavbarStaff';
import '../../Styles/staff/dashboard.css';
import '../../Styles/staff/background.css';
import ParticlesBackground from '../../Components/ParticlesBackground';
import ButtonBack from '../../Components/ButtonBack';
import { motion } from 'framer-motion';
import { FaPlus, FaSearch } from 'react-icons/fa';

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
          className="px-3 py-2 rounded-xl border border-white/30 bg-white/70 hover:bg-white disabled:opacity-50"
        >
          ← Anterior
        </button>
        <span className="text-white/90 text-sm">
          Página {meta.page} / {meta.totalPages}
        </span>
        <button
          onClick={() => setPage((p) => (meta.hasNext ? p + 1 : p))}
          disabled={!meta.hasNext}
          className="px-3 py-2 rounded-xl border border-white/30 bg-white/70 hover:bg-white disabled:opacity-50"
        >
          Siguiente →
        </button>
      </div>
    );
  }, [meta]);

  return (
    <>
      <NavbarStaff />
      <section className="relative w-full min-h-screen bg-white">
        <div className="min-h-screen bg-gradient-to-b from-[#001219] via-[#003049] to-[#005f73]">
          <ParticlesBackground />
          <ButtonBack />

          <div className="text-center pt-24 px-4">
            <motion.h1
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-4xl titulo uppercase font-bold text-white mb-3 drop-shadow-md"
            >
              Barrios
            </motion.h1>
            <p className="text-white/80">
              Gestioná barrios con filtros por ciudad y localidad.
            </p>
          </div>

          {/* Barra de acciones */}
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
            <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
              <div className="relative flex-1">
                <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  value={q}
                  onChange={(e) => {
                    setPage(1);
                    setQ(e.target.value);
                  }}
                  placeholder="Buscar por nombre…"
                  className="w-full pl-10 pr-3 py-2 rounded-xl border border-white/20 bg-white/90 focus:outline-none focus:ring-2 focus:ring-teal-500"
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
                  className="px-3 py-2 rounded-xl border border-white/20 bg-white/90 focus:outline-none focus:ring-2 focus:ring-teal-500"
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
                  className="px-3 py-2 rounded-xl border border-white/20 bg-white/90 focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:opacity-60"
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
                  className="px-3 py-2 rounded-xl border border-white/20 bg-white/90 focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  <option value="todas">Todas</option>
                  <option value="activas">Activas</option>
                  <option value="inactivas">Inactivas</option>
                </select>

                <button
                  onClick={onNew}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-600 text-white font-semibold hover:bg-teal-700"
                >
                  <FaPlus /> Nuevo Barrio
                </button>
              </div>
            </div>
          </div>

          {/* Grid de cards */}
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {loading ? (
              <div className="flex items-center justify-center py-24">
                <div className="h-10 w-10 border-4 border-white/50 border-t-teal-400 rounded-full animate-spin" />
              </div>
            ) : rows.length === 0 ? (
              <div className="text-center text-white/80 py-24">
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
      </section>

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
    </>
  );
}
