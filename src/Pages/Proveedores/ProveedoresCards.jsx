// src/Pages/Proveedores/ProveedoresCards.jsx
import React, { useEffect, useState } from 'react';
import NavbarStaff from '../Dash/NavbarStaff';
import '../../Styles/staff/dashboard.css';
import '../../Styles/staff/background.css';
import ParticlesBackground from '../../Components/ParticlesBackground';
import ButtonBack from '../../Components/ButtonBack';
import { motion } from 'framer-motion';
import { FaPlus, FaSearch } from 'react-icons/fa';

import ProveedorCard from '../../Components/Proveedores/ProveedorCard';
import ProveedorFormModal from '../../Components/Proveedores/ProveedorFormModal';
import DeudaProveedorModal from '../../Components/Proveedores/DeudaProveedorModal';

import {
  listProveedores,
  createProveedor,
  updateProveedor,
  patchProveedorEstado,
  deleteProveedor
} from '../../api/proveedores.js';

import {
  showErrorSwal,
  showWarnSwal,
  showSuccessSwal,
  showConfirmSwal
} from '../../ui/swal';

const useDebounce = (value, ms = 200) => {
  const [deb, setDeb] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDeb(value), ms);
    return () => clearTimeout(id);
  }, [value, ms]);
  return deb;
};

export default function ProveedoresCards() {
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);

  const [q, setQ] = useState('');
  const dq = useDebounce(q);

  const [filtroEstado, setFiltroEstado] = useState('todos'); // 'todos' | 'activos' | 'inactivos'

  const [page, setPage] = useState(1);
  const limit = 18;

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const [deudaProveedor, setDeudaProveedor] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = { page, limit, q: dq || '' };
      if (filtroEstado === 'activos') params.estado = 'activo';
      if (filtroEstado === 'inactivos') params.estado = 'inactivo';

      const resp = await listProveedores(params);
      setRows(resp?.data || []);
      setMeta(resp?.meta || null);
    } catch (e) {
      console.error(e);
      await showErrorSwal({
        title: 'Error',
        text: 'No se pudieron cargar los proveedores'
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
        await updateProveedor(editing.id, form);
        await showSuccessSwal({ title: 'Guardado', text: 'Proveedor actualizado' });
      } else {
        await createProveedor(form);
        await showSuccessSwal({ title: 'Creado', text: 'Proveedor creado' });
      }
      await fetchData();
      setModalOpen(false);
      setEditing(null);
    } catch (err) {
      const { code, mensajeError, tips } = err || {};
      if (code === 'DUPLICATE') {
        return showErrorSwal({
          title: 'CUIT en uso',
          text: mensajeError || 'Ya existe un proveedor con ese CUIT.',
          tips: tips?.length ? tips : ['Usá un CUIT distinto.']
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
        return showErrorSwal({ title: 'Sin conexión', text: mensajeError, tips });
      }
      return showErrorSwal({
        title: 'No se pudo guardar',
        text: mensajeError || 'Ocurrió un error inesperado',
        tips
      });
    }
  };

  const onToggleActivo = async (item) => {
    const nextEstado = (item?.estado || '') === 'activo' ? 'inactivo' : 'activo';

    setRows((r) => r.map((x) => (x.id === item.id ? { ...x, estado: nextEstado } : x)));

    try {
      await patchProveedorEstado(item.id, { estado: nextEstado });
      await showSuccessSwal({
        title: nextEstado === 'activo' ? 'Activado' : 'Desactivado',
        text: `Proveedor ${nextEstado === 'activo' ? 'activado' : 'desactivado'}`
      });
    } catch (err) {
      setRows((r) => r.map((x) => (x.id === item.id ? { ...x, estado: item.estado } : x)));
      const { mensajeError, tips } = err || {};
      await showErrorSwal({
        title: 'No se pudo actualizar',
        text: mensajeError || 'Ocurrió un error inesperado',
        tips
      });
    }
  };

  const onDelete = async (item) => {
    const ok = await showConfirmSwal({
      title: 'Eliminar proveedor',
      text: `¿Seguro que querés eliminar "${item?.razon_social}"?`
    });
    if (!ok) return;

    try {
      await deleteProveedor(item.id);
      await showSuccessSwal({ title: 'Eliminado', text: 'Proveedor eliminado' });
      await fetchData();
    } catch (err) {
      const { code, mensajeError, tips } = err || {};
      if (code === 'PROVIDER_HAS_PURCHASES') {
        return showWarnSwal({
          title: 'No se puede eliminar',
          text: mensajeError,
          tips
        });
      }
      return showErrorSwal({
        title: 'No se pudo eliminar',
        text: mensajeError || 'Ocurrió un error inesperado',
        tips
      });
    }
  };

  return (
    <>
      <NavbarStaff />
      <section className="relative w-full min-h-screen bg-white">
        <div className="min-h-screen bg-gradient-to-b from-[#001219] via-[#013a2e] to-[#05684f]">
          <ParticlesBackground />
          <ButtonBack />

          <div className="text-center pt-24 px-4">
            <motion.h1
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-4xl titulo uppercase font-bold text-white mb-3 drop-shadow-md"
            >
              Proveedores
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-sm sm:text-base text-gray-200/80 max-w-2xl mx-auto"
            >
              Gestioná tus proveedores y su cuenta corriente.
            </motion.p>
          </div>

          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
            <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
              <div className="relative flex-1 max-w-md">
                <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  value={q}
                  onChange={(e) => {
                    setPage(1);
                    setQ(e.target.value);
                  }}
                  placeholder="Buscar por razón social o CUIT…"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-white/10 bg-white/10 text-white
                             placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-300/40"
                />
              </div>

              <div className="flex gap-2">
                <select
                  value={filtroEstado}
                  onChange={(e) => {
                    setPage(1);
                    setFiltroEstado(e.target.value);
                  }}
                  className="rounded-xl border border-white/10 bg-white/10 px-3 py-2.5 text-white"
                >
                  <option value="todos" className="text-black">Todos</option>
                  <option value="activos" className="text-black">Activos</option>
                  <option value="inactivos" className="text-black">Inactivos</option>
                </select>

                <button
                  onClick={onNew}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-semibold hover:brightness-110 transition"
                >
                  <FaPlus /> Nuevo proveedor
                </button>
              </div>
            </div>

            {loading ? (
              <div className="text-center text-white/80 py-16">Cargando…</div>
            ) : rows.length === 0 ? (
              <div className="text-center text-white/80 py-16">
                No hay proveedores para mostrar.
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {rows.map((item) => (
                  <ProveedorCard
                    key={item.id}
                    item={item}
                    onEdit={onEdit}
                    onToggleActivo={onToggleActivo}
                    onDelete={onDelete}
                    onVerCuenta={(p) => setDeudaProveedor(p)}
                  />
                ))}
              </div>
            )}

            {meta && meta.totalPages > 1 && (
              <div className="flex items-center justify-center gap-3 pt-4">
                <button
                  disabled={!meta.hasPrev}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="px-4 py-2 rounded-xl border border-white/10 text-white disabled:opacity-40"
                >
                  Anterior
                </button>
                <span className="text-white/80 text-sm">
                  Página {meta.page} de {meta.totalPages}
                </span>
                <button
                  disabled={!meta.hasNext}
                  onClick={() => setPage((p) => p + 1)}
                  className="px-4 py-2 rounded-xl border border-white/10 text-white disabled:opacity-40"
                >
                  Siguiente
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      <ProveedorFormModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditing(null);
        }}
        onSubmit={onSubmit}
        initial={editing}
      />

      <DeudaProveedorModal
        open={!!deudaProveedor}
        proveedor={deudaProveedor}
        onClose={() => setDeudaProveedor(null)}
        onPagoRegistrado={fetchData}
      />
    </>
  );
}
