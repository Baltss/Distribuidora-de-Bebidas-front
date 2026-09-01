// src/Pages/Usuarios/UsuariosPage.jsx
import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { FaSearch, FaPlus, FaEdit, FaBan, FaCheckCircle } from 'react-icons/fa';
import { ShieldCheck } from 'lucide-react';

import AppShell from '../../Components/Layout/AppShell';
import UsuarioFormModal from '../../Components/Usuarios/UsuarioFormModal';

import {
  listUsuarios,
  createUsuario,
  updateUsuario,
  deactivateUsuario,
  reactivateUsuario
} from '../../api/usuarios';
import { listLocales } from '../../api/locales';
import { getUserId } from '../../utils/authUtils';

import {
  showErrorSwal,
  showSuccessSwal,
  showConfirmSwal
} from '../../ui/swal';

export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState([]);
  const [locales, setLocales] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [rolFiltro, setRolFiltro] = useState('todos');
  const [localFiltro, setLocalFiltro] = useState('todos');

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const usuarioId = getUserId();

  const fetchUsuarios = async () => {
    setLoading(true);
    try {
      const resp = await listUsuarios();
      const list = Array.isArray(resp) ? resp : resp?.data || [];
      setUsuarios(list);
    } catch (error) {
      console.error(
        'Error al obtener usuarios:',
        error?.mensajeError || error?.response?.data || error?.message
      );
    } finally {
      setLoading(false);
    }
  };

  const fetchLocales = async () => {
    try {
      const resp = await listLocales();
      const list = Array.isArray(resp) ? resp : resp?.data || [];
      setLocales(list);
    } catch (error) {
      console.error('Error al obtener locales:', error);
    }
  };

  useEffect(() => {
    fetchUsuarios();
    fetchLocales();
  }, []);

  const openModal = (usuario = null) => {
    setEditing(usuario);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditing(null);
  };

  const handleSubmit = async (payload, { isEdit, id }) => {
    try {
      if (isEdit) {
        await updateUsuario(id, payload);
        await showSuccessSwal({
          title: 'ACTUALIZADO',
          text: 'Usuario actualizado correctamente'
        });
      } else {
        await createUsuario(payload);
        await showSuccessSwal({
          title: 'CREADO',
          text: 'Usuario creado correctamente'
        });
      }
      await fetchUsuarios();
      closeModal();
    } catch (err) {
      console.error('Error al guardar usuario:', err);
      await showErrorSwal({
        title: 'ERROR',
        text:
          err?.mensajeError ||
          err?.response?.data?.mensajeError ||
          'Ocurrió un error al guardar.'
      });
    }
  };

  const handleToggleEstado = async (u) => {
    const desactivando = u.estado !== 'inactivo';
    const confirmed = await showConfirmSwal({
      title: desactivando ? '¿Desactivar usuario?' : '¿Reactivar usuario?',
      text: desactivando
        ? `${u.nombre} no va a poder iniciar sesión hasta que lo reactives.`
        : `${u.nombre} va a poder volver a iniciar sesión.`,
      icon: 'warning',
      confirmText: desactivando ? 'Sí, desactivar' : 'Sí, reactivar'
    });
    if (!confirmed) return;

    try {
      if (desactivando) {
        await deactivateUsuario(u.id, { usuario_log_id: usuarioId });
      } else {
        await reactivateUsuario(u.id, { usuario_log_id: usuarioId });
      }
      fetchUsuarios();
    } catch (err) {
      console.error('Error al cambiar estado del usuario:', err);
      await showErrorSwal({
        title: 'ERROR',
        text:
          err?.mensajeError ||
          err?.response?.data?.mensajeError ||
          'No se pudo cambiar el estado.'
      });
    }
  };

  const filtered = usuarios.filter((u) => {
    const coincideTexto = [u.nombre, u.email, u.rol].some((f) =>
      f?.toLowerCase().includes(search.toLowerCase())
    );

    const coincideRol = rolFiltro === 'todos' || u.rol === rolFiltro;
    const coincideLocal =
      localFiltro === 'todos' || u.local_id === parseInt(localFiltro);

    return coincideTexto && coincideRol && coincideLocal;
  });

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.h1
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 flex items-center gap-2.5"
        >
          <ShieldCheck className="h-7 w-7 text-teal-600" /> Usuarios
        </motion.h1>
        <p className="mt-1 text-sm text-slate-500">
          Gestioná los usuarios del sistema y sus permisos.
        </p>

        {/* Barra de acciones */}
        <div className="mt-6 flex flex-col md:flex-row items-stretch md:items-center gap-3">
          <div className="relative flex-1">
            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre, email o rol…"
              className="w-full pl-10 pr-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-400/40"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={rolFiltro}
              onChange={(e) => setRolFiltro(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-400/40"
            >
              <option value="todos">Todos los roles</option>
              <option value="socio">Socio</option>
              <option value="administrativo">Administrativo</option>
              <option value="vendedor">Vendedor</option>
              <option value="contador">Contador</option>
            </select>

            <select
              value={localFiltro}
              onChange={(e) => setLocalFiltro(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-400/40"
            >
              <option value="todos">Todos los locales</option>
              {locales.map((local) => (
                <option key={local.id} value={local.id}>
                  {local.nombre}
                </option>
              ))}
            </select>

            <button
              onClick={() => openModal()}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-600 text-white font-semibold hover:bg-teal-700 transition"
            >
              <FaPlus /> Nuevo Usuario
            </button>
          </div>
        </div>

        {/* Tabla */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
          className="mt-8 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
        >
          {loading ? (
            <div className="flex items-center justify-center py-24">
              <div className="h-10 w-10 border-4 border-slate-200 border-t-teal-500 rounded-full animate-spin" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50/90 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-2 text-left font-semibold text-gray-600">
                      Nombre
                    </th>
                    <th className="px-4 py-2 text-left font-semibold text-gray-600">
                      Email
                    </th>
                    <th className="px-4 py-2 text-left font-semibold text-gray-600">
                      Rol
                    </th>
                    <th className="px-4 py-2 text-left font-semibold text-gray-600">
                      Local
                    </th>
                    <th className="px-4 py-2 text-left font-semibold text-gray-600">
                      Estado
                    </th>
                    <th className="px-4 py-2 text-center font-semibold text-gray-600">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 && (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-4 py-6 text-center text-gray-500"
                      >
                        No hay usuarios con esos filtros.
                      </td>
                    </tr>
                  )}
                  {filtered.map((u) => (
                    <tr
                      key={u.id}
                      className="border-b border-gray-100 hover:bg-teal-50/40 transition"
                    >
                      <td className="px-4 py-2 font-medium text-gray-800">
                        {u.nombre}
                      </td>
                      <td className="px-4 py-2 text-gray-700">{u.email}</td>
                      <td className="px-4 py-2 capitalize text-gray-700">
                        {u.rol}
                      </td>
                      <td className="px-4 py-2 text-gray-700">
                        {locales.find((l) => l.id === u.local_id)?.nombre ||
                          '-'}
                      </td>
                      <td className="px-4 py-2">
                        {u.estado === 'inactivo' ? (
                          <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                            Inactivo
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Activo
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex items-center justify-center gap-3">
                          <button
                            onClick={() => openModal(u)}
                            className="text-amber-500 hover:text-amber-600 transition"
                            title="Editar"
                          >
                            <FaEdit />
                          </button>
                          <button
                            onClick={() => handleToggleEstado(u)}
                            className={
                              u.estado === 'inactivo'
                                ? 'text-emerald-600 hover:text-emerald-700 transition'
                                : 'text-rose-500 hover:text-rose-600 transition'
                            }
                            title={
                              u.estado === 'inactivo'
                                ? 'Reactivar'
                                : 'Desactivar'
                            }
                          >
                            {u.estado === 'inactivo' ? (
                              <FaCheckCircle />
                            ) : (
                              <FaBan />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>
      </div>

      <UsuarioFormModal
        open={modalOpen}
        onClose={closeModal}
        onSubmit={handleSubmit}
        initial={editing}
        locales={locales}
      />
    </AppShell>
  );
}
