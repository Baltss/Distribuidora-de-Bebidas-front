// src/Pages/Geografia/CiudadesCards.jsx
import React, { useEffect, useMemo, useState } from 'react';
import NavbarStaff from '../Dash/NavbarStaff';
import '../../Styles/staff/dashboard.css';
import '../../Styles/staff/background.css';
import ParticlesBackground from '../../Components/ParticlesBackground';
import ButtonBack from '../../Components/ButtonBack';
import { motion } from 'framer-motion';
import { FaPlus, FaSearch } from 'react-icons/fa';

import CiudadCard from '../../Components/Geografia/CiudadCard';
import CiudadFormModal from '../../Components/Geografia/CiudadFormModal';

import {
  listCiudades,
  createCiudad,
  updateCiudad,
  patchCiudadEstado,
  deleteCiudad
} from '../../api/ciudades';
import useDebouncedValue from '../../hooks/useDebouncedValue';

import {
  showErrorSwal,
  showWarnSwal,
  showSuccessSwal,
  showConfirmSwal
} from '../../ui/swal';

// Soporta confirm wrappers que devuelven boolean o { isConfirmed }
const isConfirmed = (res) =>
  typeof res === 'object' && res !== null ? !!res.isConfirmed : !!res;

export default function CiudadesCards() {
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);

  const [q, setQ] = useState('');
  const dq = useDebouncedValue(q, 500);
  const [filtroEstado, setFiltroEstado] = useState('todas'); // todas|activas|inactivas
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
      if (filtroEstado === 'activas') params.estado = 'activa';
      if (filtroEstado === 'inactivas') params.estado = 'inactiva';

      const data = await listCiudades(params);
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
        text: 'No se pudieron cargar las ciudades'
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
        await updateCiudad(editing.id, form);
        await showSuccessSwal({
          title: 'Guardado',
          text: 'Ciudad actualizada'
        });
      } else {
        await createCiudad(form);
        await showSuccessSwal({ title: 'Creada', text: 'Ciudad creada' });
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
            'Ya existe una ciudad con ese nombre en esa provincia.',
          tips: tips?.length ? tips : ['Usá otro nombre o provincia.']
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
      await patchCiudadEstado(item.id, next);
      await showSuccessSwal({
        title: next === 'activa' ? 'Activada' : 'Desactivada',
        text: `Ciudad ${next === 'activa' ? 'activada' : 'desactivada'}`
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
      title: '¿Eliminar ciudad?',
      text: `Se eliminará "${item?.nombre}". Esta acción no se puede deshacer.`,
      confirmText: 'Sí, eliminar'
    });
    if (!isConfirmed(res)) return;

    const id = Number(item.id);

    // Optimista: sacamos del grid ya
    setRows((r) => r.filter((x) => Number(x.id) !== id));

    try {
      const resp = await deleteCiudad(id); // backend puede responder 204 o 200
      await showSuccessSwal({
        title: 'Eliminada',
        text: resp?.message || 'Ciudad eliminada correctamente.'
      });

      // Re-sync para ajustar paginación/meta
      await fetchData();
    } catch (err) {
      // Rollback total al estado real
      await fetchData();

      const { code, mensajeError, tips, details } = err || {};
      if (code === 'HAS_DEPENDENCIES') {
        const res2 = await showConfirmSwal({
          icon: 'warning',
          title: 'Tiene dependencias',
          text:
            (mensajeError ||
              'Esta ciudad tiene localidades/barrios asociados. ¿Deseás desactivarla?') +
            (details?.localidadesAsociadas
              ? `<br/><br/>Localidades asociadas: <b>${details.localidadesAsociadas}</b>`
              : ''),
          confirmText: 'Desactivar',
          cancelText: 'Cancelar'
        });
        if (isConfirmed(res2)) {
          try {
            await patchCiudadEstado(id, 'inactiva');
            await fetchData();
            await showSuccessSwal({
              title: 'Desactivada',
              text: 'La ciudad fue desactivada (posee dependencias).'
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
              Ciudades
            </motion.h1>
            <p className="text-white/80">Gestioná ciudades y su estado.</p>
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
                  placeholder="Buscar por nombre o provincia…"
                  className="w-full pl-10 pr-3 py-2 rounded-xl border border-white/20 bg-white/90 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="flex items-center gap-2">
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
                  <FaPlus /> Nueva Ciudad
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
                No hay ciudades con esos filtros.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                {rows.map((it) => (
                  <CiudadCard
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
      </section>

      {/* Modal alta/edición */}
      <CiudadFormModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditing(null);
        }}
        onSubmit={onSubmit}
        initial={editing}
      />
    </>
  );
}
