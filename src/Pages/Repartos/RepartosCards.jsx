// src/Pages/Repartos/RepartosCards.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppShell from '../../Components/Layout/AppShell';
import { motion } from 'framer-motion';
import { FaPlus, FaSearch, FaArrowLeft } from 'react-icons/fa';

import RepartoCard from '../../Components/Repartos/RepartoCard';
import RepartoFormModal from '../../Components/Repartos/RepartoFormModal';
import RepartoAsignarClientesModal from '../../Components/Repartos/RepartoAsignarClientesModal.jsx';
import RepartoClientesSlideover from '../../Components/Repartos/RepartoClientesSlideover';
import RepartoAsignarUsuariosModal from '../../Components/Repartos/RepartoAsignarUsuariosModal';
import RepartoDiasModal from '../../Components/Repartos/RepartoDiasModal';
import {
  listRepartos,
  createReparto,
  updateReparto,
  patchRepartoEstado,
  deleteReparto
} from '../../api/repartos';
import useDebouncedValue from '../../hooks/useDebouncedValue';

import {
  showErrorSwal,
  showWarnSwal,
  showSuccessSwal,
  showConfirmSwal
} from '../../ui/swal';

const isConfirmed = (res) =>
  typeof res === 'object' && res !== null ? !!res.isConfirmed : !!res;

export default function RepartosCards() {
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

  const [assignOpen, setAssignOpen] = useState(false);
  const [selectedReparto, setSelectedReparto] = useState(null);

  const [clientesOpen, setClientesOpen] = useState(false);
  const [repartoForClientes, setRepartoForClientes] = useState(null);

  const [usuariosModalOpen, setUsuariosModalOpen] = useState(false);
  const [diasModalOpen, setDiasModalOpen] = useState(false);

  const [repartoForUsuarios, setRepartoForUsuarios] = useState(null);
  const [repartoForDias, setRepartoForDias] = useState(null);

  const onVerClientesReparto = (item) => {
    setRepartoForClientes(item);
    setClientesOpen(true);
  };

  const onAsignarUsuarios = (item) => {
    setRepartoForUsuarios(item);
    setUsuariosModalOpen(true);
  };

  const onConfigDias = (item) => {
    setRepartoForDias(item);
    setDiasModalOpen(true);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = {
        page,
        limit,
        q: dq || '',
        orderBy: 'nombre',
        orderDir: 'ASC',
        withCiudad: 1
      };
      if (filtroEstado === 'activos') params.estado = 'activo';
      if (filtroEstado === 'inactivos') params.estado = 'inactivo';

      const data = await listRepartos(params);
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
        text: 'No se pudieron cargar los repartos'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(); // eslint-disable-line react-hooks/exhaustive-deps
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
      // Normalizamos tipos antes de mandar
      const payload = {
        ...form,
        ciudad_id: Number(form.ciudad_id) || null,
        rango_min: Number(form.rango_min) || 0,
        rango_max: Number(form.rango_max) || 0
      };

      if (editing?.id) {
        await updateReparto(editing.id, payload);
        await showSuccessSwal({
          title: 'Guardado',
          text: 'Reparto actualizado'
        });
      } else {
        await createReparto(payload);
        await showSuccessSwal({
          title: 'Creado',
          text: 'Reparto creado correctamente'
        });
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
            'Ya existe un reparto con ese nombre en esta ciudad o el rango se superpone.',
          tips: (tips?.length && tips) || [
            'Revisá el nombre y los rangos configurados.'
          ]
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
    const next = item.estado === 'activo' ? 'inactivo' : 'activo';

    // Optimista
    setRows((r) =>
      r.map((x) => (x.id === item.id ? { ...x, estado: next } : x))
    );

    try {
      await patchRepartoEstado(item.id, next);
      await showSuccessSwal({
        title: next === 'activo' ? 'Activado' : 'Desactivado',
        text: `Reparto ${next === 'activo' ? 'activado' : 'desactivado'}`
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

  const onDeleteDirect = async (item) => {
    const res = await showConfirmSwal({
      title: '¿Eliminar reparto?',
      text: `Se eliminará "${item?.nombre}". Esta acción no se puede deshacer.`,
      confirmText: 'Sí, eliminar'
    });
    if (!isConfirmed(res)) return;

    const id = Number(item.id);
    setRows((r) => r.filter((x) => Number(x.id) !== id));

    try {
      const resp = await deleteReparto(id);
      await showSuccessSwal({
        title: 'Eliminado',
        text: resp?.message || 'Reparto eliminado correctamente.'
      });
      await fetchData();
    } catch (err) {
      await fetchData();
      const { mensajeError, tips } = err || {};
      await showErrorSwal({
        title: 'No se pudo eliminar',
        text: mensajeError || 'Ocurrió un error al eliminar',
        tips
      });
    }
  };

  const onAssign = (reparto) => {
    setSelectedReparto(reparto);
    setAssignOpen(true);
  };

  const Pager = useMemo(() => {
    if (!meta) return null;
    return (
      <div className="flex items-center justify-center gap-2 mt-6">
        <button
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={!meta.hasPrev}
          className="px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50 text-sm"
        >
          ← Anterior
        </button>
        <span className="text-slate-500 text-sm">
          Página {meta.page} / {meta.totalPages}
        </span>
        <button
          onClick={() => setPage((p) => (meta.hasNext ? p + 1 : p))}
          disabled={!meta.hasNext}
          className="px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50 text-sm"
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
          Repartos
        </motion.h1>
        <p className="mt-1 text-sm text-slate-500">
          Gestioná los repartos por ciudad, con sus rangos de clientes.
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
              placeholder="Buscar por nombre de reparto o ciudad…"
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
              className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-400/40 text-sm"
            >
              <option value="todos">Todos</option>
              <option value="activos">Activos</option>
              <option value="inactivos">Inactivos</option>
            </select>

            <button
              onClick={onNew}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-600 text-white font-semibold hover:bg-teal-700 text-sm transition"
            >
              <FaPlus /> Nuevo Reparto
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
              No hay repartos con esos filtros.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              {rows.map((it) => (
                <RepartoCard
                  key={it.id}
                  item={it}
                  onEdit={onEdit}
                  onToggleEstado={onToggleEstado}
                  onDelete={onDeleteDirect}
                  onAssign={onAssign}
                  onVerClientes={onVerClientesReparto}
                  onAsignarUsuarios={onAsignarUsuarios}
                  onConfigDias={onConfigDias}
                />
              ))}
            </div>
          )}

          {Pager}
        </div>
      </div>

      {/* Modal alta/edición */}
      <RepartoFormModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditing(null);
        }}
        onSubmit={onSubmit}
        initial={editing}
      />
      <RepartoAsignarClientesModal
        open={assignOpen}
        reparto={selectedReparto}
        onClose={() => {
          setAssignOpen(false);
          setSelectedReparto(null);
        }}
        onChanged={() => {
          fetchData();
        }}
      />
      <RepartoClientesSlideover
        open={clientesOpen}
        onClose={() => {
          setClientesOpen(false);
          setRepartoForClientes(null);
        }}
        reparto={repartoForClientes}
      />
      <RepartoAsignarUsuariosModal
        open={usuariosModalOpen}
        onClose={() => {
          setUsuariosModalOpen(false);
          setRepartoForUsuarios(null);
        }}
        reparto={repartoForUsuarios}
      />

      <RepartoDiasModal
        open={diasModalOpen}
        onClose={() => {
          setDiasModalOpen(false);
          setRepartoForDias(null);
        }}
        reparto={repartoForDias}
      />
    </AppShell>
  );
}
