// ===========================================
// FILE: src/Pages/Vendedores/VendedorBarriosCards.jsx
// ===========================================
import React, { useEffect, useMemo, useState } from 'react';
import NavbarStaff from '../Dash/NavbarStaff';
import '../../Styles/staff/dashboard.css';
import '../../Styles/staff/background.css';
import ParticlesBackground from '../../Components/ParticlesBackground';
import ButtonBack from '../../Components/ButtonBack';
import { motion } from 'framer-motion';
import { FaPlus, FaSearch } from 'react-icons/fa';

import VendedorBarrioCard from '../../Components/Vendedores/VendedorBarrioCard';
import VendedorBarrioFormModal from '../../Components/Vendedores/VendedorBarrioFormModal';

import { listVendedores } from '../../api/vendedores';
import { listCiudades } from '../../api/ciudades';
import { listLocalidades } from '../../api/localidades';
import { listBarrios } from '../../api/barrios';

import {
  listVendedorBarrios,
  createVendedorBarrio,
  closeVendedorBarrio,
  patchVendedorBarrioEstado,
  deleteVendedorBarrio
} from '../../api/vendedores_barrios';
import useDebouncedValue from '../../hooks/useDebouncedValue';

import {
  showErrorSwal,
  showWarnSwal,
  showSuccessSwal,
  showConfirmSwal
} from '../../ui/swal';

export default function VendedorBarriosCards() {
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [q, setQ] = useState('');
  const dq = useDebouncedValue(q, 500);
  const [filtroVendedor, setFiltroVendedor] = useState('');
  const [filtroCiudad, setFiltroCiudad] = useState('');
  const [filtroLocalidad, setFiltroLocalidad] = useState('');
  const [filtroBarrio, setFiltroBarrio] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('todas'); // todas|activo|inactivo
  const [filtroVigentes, setFiltroVigentes] = useState('todos'); // todos|vigentes|cerradas

  const [vendedores, setVendedores] = useState([]);
  const [ciudades, setCiudades] = useState([]);
  const [localidades, setLocalidades] = useState([]);
  const [barrios, setBarrios] = useState([]);

  const [page, setPage] = useState(1);
  const limit = 18;

  const [modalOpen, setModalOpen] = useState(false);

  // Cargar catálogos
  useEffect(() => {
    (async () => {
      try {
        const [vs, cs] = await Promise.all([
          listVendedores({
            estado: 'activo',
            page: 1,
            limit: 500,
            orderBy: 'nombre',
            orderDir: 'ASC'
          }),
          listCiudades({
            estado: 'activa',
            page: 1,
            limit: 500,
            orderBy: 'nombre',
            orderDir: 'ASC'
          })
        ]);
        setVendedores(Array.isArray(vs) ? vs : vs?.data || []);
        setCiudades(Array.isArray(cs) ? cs : cs?.data || []);
      } catch {
        // silencioso
      }
    })();
  }, []);

  // Localidades por ciudad (filtro)
  useEffect(() => {
    (async () => {
      if (!filtroCiudad) {
        setLocalidades([]);
        setBarrios([]);
        setFiltroLocalidad('');
        setFiltroBarrio('');
        return;
      }
      try {
        const ls = await listLocalidades({
          ciudad_id: filtroCiudad,
          estado: 'activa',
          page: 1,
          limit: 500,
          orderBy: 'nombre',
          orderDir: 'ASC'
        });
        const larr = Array.isArray(ls) ? ls : ls?.data || [];
        setLocalidades(larr);
        // limpiar cascada
        setFiltroLocalidad((curr) =>
          larr.some((x) => String(x.id) === String(curr)) ? curr : ''
        );
        setFiltroBarrio('');
      } catch {
        setLocalidades([]);
        setBarrios([]);
        setFiltroLocalidad('');
        setFiltroBarrio('');
      }
    })();
  }, [filtroCiudad]);

  // Barrios por localidad (filtro)
  useEffect(() => {
    (async () => {
      if (!filtroLocalidad) {
        setBarrios([]);
        setFiltroBarrio('');
        return;
      }
      try {
        const bs = await listBarrios({
          localidad_id: filtroLocalidad,
          estado: 'activa',
          page: 1,
          limit: 500,
          orderBy: 'nombre',
          orderDir: 'ASC'
        });
        const barr = Array.isArray(bs) ? bs : bs?.data || [];
        setBarrios(barr);
        setFiltroBarrio((curr) =>
          barr.some((x) => String(x.id) === String(curr)) ? curr : ''
        );
      } catch {
        setBarrios([]);
        setFiltroBarrio('');
      }
    })();
  }, [filtroLocalidad]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = {
        page,
        limit,
        q: dq || '',
        orderBy: 'asignado_desde',
        orderDir: 'DESC'
      };
      if (filtroVendedor) params.vendedor_id = filtroVendedor;
      if (filtroCiudad) params.ciudad_id = filtroCiudad;
      if (filtroLocalidad) params.localidad_id = filtroLocalidad;
      if (filtroBarrio) params.barrio_id = filtroBarrio;
      if (filtroEstado !== 'todas') params.estado = filtroEstado; // 'activo' | 'inactivo'
      if (filtroVigentes === 'vigentes') params.vigentes = 1;
      if (filtroVigentes === 'cerradas') params.vigentes = 0;

      const data = await listVendedorBarrios(params);
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
        text: 'No se pudieron cargar las asignaciones'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(); // eslint-disable-next-line
  }, [
    dq,
    filtroVendedor,
    filtroCiudad,
    filtroLocalidad,
    filtroBarrio,
    filtroEstado,
    filtroVigentes,
    page
  ]);

  // Crear
  const onSubmit = async (payload) => {
    try {
      await createVendedorBarrio(payload.vendedor_id, payload);
      await showSuccessSwal({ title: 'Asignado', text: 'Asignación creada' });
      setModalOpen(false);
      setPage(1);
      await fetchData();
    } catch (err) {
      const { code, mensajeError, tips } = err || {};
      if (code === 'UNIQUE_VIGENTE' || code === 'ER_DUP_ENTRY') {
        return showWarnSwal({
          title: 'Ya existe una asignación vigente',
          text:
            mensajeError ||
            'El barrio ya tiene un vendedor vigente. Cerrá la actual para asignar otro.',
          tips: tips?.length
            ? tips
            : ['Podés usar “Cerrar” en la tarjeta vigente.']
        });
      }
      return showErrorSwal({
        title: 'No se pudo asignar',
        text: mensajeError || 'Error inesperado',
        tips
      });
    }
  };

  // Cerrar asignación
  const onClose = async (item) => {
    const res = await showConfirmSwal({
      title: 'Cerrar asignación',
      text: `¿Cerrar la asignación de ${item?.vendedor?.nombre} para "${item?.barrio?.nombre}" a la fecha de hoy?`,
      confirmText: 'Sí, cerrar'
    });

    const isConfirmed =
      typeof res === 'object' && res ? !!res.isConfirmed : !!res;
    if (!isConfirmed) return;

    try {
      // Optimista
      setRows((r) =>
        r.map((x) =>
          x.id === item.id
            ? { ...x, asignado_hasta: new Date().toISOString() }
            : x
        )
      );
      await closeVendedorBarrio(
        item.vendedor_id || item?.vendedor?.id,
        item.id,
        {}
      ); // backend pone hoy si no mandás 'hasta'
      await showSuccessSwal({
        title: 'Cerrada',
        text: 'La asignación fue cerrada'
      });
      await fetchData();
    } catch (err) {
      await fetchData();
      const { mensajeError, tips } = err || {};
      await showErrorSwal({
        title: 'No se pudo cerrar',
        text: mensajeError || 'Error al cerrar asignación',
        tips
      });
    }
  };

  // Toggle estado
  const onToggleEstado = async (item) => {
    const next = item?.estado === 'activo' ? 'inactivo' : 'activo';
    try {
      // Optimista
      setRows((r) =>
        r.map((x) => (x.id === item.id ? { ...x, estado: next } : x))
      );
      await patchVendedorBarrioEstado(
        item.vendedor_id || item?.vendedor?.id,
        item.id,
        next
      );
      await showSuccessSwal({
        title: next === 'activo' ? 'Activada' : 'Desactivada',
        text: `Asignación ${next === 'activo' ? 'activada' : 'desactivada'}`
      });
    } catch (err) {
      await fetchData();
      const { mensajeError, tips } = err || {};
      await showErrorSwal({
        title: 'No se pudo actualizar',
        text: mensajeError || 'Error al cambiar estado',
        tips
      });
    }
  };

  // Delete
  const onDelete = async (item) => {
    const res = await showConfirmSwal({
      title: '¿Eliminar asignación?',
      text: `Se eliminará la asignación de ${item?.vendedor?.nombre} → "${item?.barrio?.nombre}". Esta acción no se puede deshacer.`,
      confirmText: 'Sí, eliminar'
    });
    const isConfirmed =
      typeof res === 'object' && res ? !!res.isConfirmed : !!res;
    if (!isConfirmed) return;

    try {
      // Optimista
      setRows((r) => r.filter((x) => x.id !== item.id));
      await deleteVendedorBarrio(
        item.vendedor_id || item?.vendedor?.id,
        item.id
      );
      await showSuccessSwal({
        title: 'Eliminada',
        text: 'Asignación eliminada'
      });
      await fetchData();
    } catch (err) {
      await fetchData();
      const { mensajeError, tips } = err || {};
      await showErrorSwal({
        title: 'No se pudo eliminar',
        text: mensajeError || 'Error al eliminar',
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
              Vendedores ↔ Barrios
            </motion.h1>
            <p className="text-white/80">
              Asigná vendedores a barrios y gestioná vigencias.
            </p>
          </div>

          {/* Barra de acciones y filtros */}
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
                  placeholder="Buscar por vendedor o barrio…"
                  className="w-full pl-10 pr-3 py-2 rounded-xl border border-white/20 bg-white/90 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {/* Vendedor */}
                <select
                  value={filtroVendedor}
                  onChange={(e) => {
                    setPage(1);
                    setFiltroVendedor(e.target.value);
                  }}
                  className="px-3 py-2 rounded-xl border border-white/20 bg-white/90 focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  <option value="">Todos los vendedores</option>
                  {vendedores.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.nombre}
                    </option>
                  ))}
                </select>

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

                {/* Localidad */}
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
                  {localidades.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.nombre}
                    </option>
                  ))}
                </select>

                {/* Barrio */}
                <select
                  value={filtroBarrio}
                  onChange={(e) => {
                    setPage(1);
                    setFiltroBarrio(e.target.value);
                  }}
                  disabled={!filtroLocalidad}
                  className="px-3 py-2 rounded-xl border border-white/20 bg-white/90 focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:opacity-60"
                >
                  <option value="">
                    {filtroLocalidad ? 'Todos los barrios' : 'Elegí localidad'}
                  </option>
                  {barrios.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.nombre}
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
                  <option value="todas">Estado (todos)</option>
                  <option value="activo">Activas</option>
                  <option value="inactivo">Inactivas</option>
                </select>

                {/* Vigencia */}
                <select
                  value={filtroVigentes}
                  onChange={(e) => {
                    setPage(1);
                    setFiltroVigentes(e.target.value);
                  }}
                  className="px-3 py-2 rounded-xl border border-white/20 bg-white/90 focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  <option value="todos">Vigencia (todas)</option>
                  <option value="vigentes">Vigentes</option>
                  <option value="cerradas">Cerradas</option>
                </select>

                <button
                  onClick={() => setModalOpen(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-600 text-white font-semibold hover:bg-teal-700"
                >
                  <FaPlus /> Nueva Asignación
                </button>
              </div>
            </div>
          </div>

          {/* Grid */}
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {loading ? (
              <div className="flex items-center justify-center py-24">
                <div className="h-10 w-10 border-4 border-white/50 border-t-teal-400 rounded-full animate-spin" />
              </div>
            ) : rows.length === 0 ? (
              <div className="text-center text-white/80 py-24">
                No hay asignaciones con esos filtros.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                {rows.map((it) => (
                  <VendedorBarrioCard
                    key={it.id}
                    item={it}
                    onClose={onClose}
                    onToggleEstado={onToggleEstado}
                    onDelete={onDelete}
                  />
                ))}
              </div>
            )}

            {Pager}
          </div>
        </div>
      </section>

      {/* Modal crear */}
      <VendedorBarrioFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={onSubmit}
        fetchData={fetchData}

      />
    </>
  );
}
