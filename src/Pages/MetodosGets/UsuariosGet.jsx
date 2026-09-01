import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Modal from 'react-modal';
import { FaUser, FaPlus, FaEdit, FaBan, FaCheckCircle } from 'react-icons/fa';
import { motion } from 'framer-motion';
import ParticlesBackground from '../../Components/ParticlesBackground';
import ButtonBack from '../../Components/ButtonBack';
import { useAuth } from '../../AuthContext';
import axiosWithAuth from '../../utils/axiosWithAuth';
import { getUserId } from '../../utils/authUtils';
import PasswordEditor from '../../Security/PasswordEditor';
import Swal from 'sweetalert2';
import { API_BASE_URL } from '../../api/apiBase';

Modal.setAppElement('#root');

export default function UsuariosGet() {
  const [usuarios, setUsuarios] = useState([]);
  const [locales, setLocales] = useState([]);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    password: '',
    rol: 'socio',
    local_id: '',
    es_reemplazante: false // nuevo campo
  });

  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordValid, setPasswordValid] = useState(true);

  // helpers
  const allowedRoles = ['socio', 'administrativo', 'vendedor', 'contador'];
  const passPolicyOk = (pwd) => {
    if (!pwd || pwd.length < 8) return false;
    const hasUpper = /[A-Z]/.test(pwd);
    const hasLower = /[a-z]/.test(pwd);
    const hasNum = /\d/.test(pwd);
    const hasSym = /[^A-Za-z0-9]/.test(pwd);
    // mínimo: 8 y al menos 3 tipos
    const score = [hasUpper, hasLower, hasNum, hasSym].filter(Boolean).length;
    return score >= 3;
  };

  const usuarioId = getUserId();
  // RELACION AL FILTRADO  24-12-25
  const [rolFiltro, setRolFiltro] = useState('todos');
  const [localFiltro, setLocalFiltro] = useState('todos');
  // RELACION AL FILTRADO  24-12-25

  const fetchUsuarios = async () => {
    try {
      const res = await axiosWithAuth().get('/usuarios');
      setUsuarios(res.data);
    } catch (error) {
      console.error(
        'Error al obtener usuarios:',
        error.response?.data || error.message
      );
    }
  };

  const fetchLocales = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/locales`);
      setLocales(res.data);
    } catch (error) {
      console.error('Error al obtener locales:', error);
    }
  };

  useEffect(() => {
    fetchUsuarios();
    fetchLocales();
  }, []);

  const openModal = (usuario = null) => {
    if (usuario) {
      setEditId(usuario.id);
      setFormData({
        nombre: usuario.nombre,
        email: usuario.email,
        password: '',
        rol: usuario.rol,
        local_id: usuario.local_id || '',
        es_reemplazante: !!usuario.es_reemplazante //  nuevo campo
      });
    } else {
      setEditId(null);
      setFormData({
        nombre: '',
        email: '',
        password: '',
        rol: 'socio',
        local_id: '',
        es_reemplazante: false // nuevo campo
      });
    }
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const client = axiosWithAuth();

      // Saneo rol por si acaso
      let rol = formData.rol;
      if (!allowedRoles.includes(rol)) rol = 'socio';

      const payload = {
        ...formData,
        rol,
        usuario_log_id: usuarioId,
        local_id: formData.local_id ? Number(formData.local_id) : null,
        es_reemplazante: !!formData.es_reemplazante
      };

      // Validaciones con SweetAlert2
      if (!formData.nombre.trim()) {
        await Swal.fire('FALTAN DATOS', 'El nombre es obligatorio.', 'warning');
        return;
      }
      if (!formData.email.trim()) {
        await Swal.fire('FALTAN DATOS', 'El email es obligatorio.', 'warning');
        return;
      }

      if (editId) {
        // EDICIÓN
        if (!payload.password) {
          delete payload.password; // no tocar pass
        } else {
          // Si quiere cambiar pass: validar política
          if (!passPolicyOk(payload.password)) {
            await Swal.fire(
              'CONTRASEÑA DÉBIL',
              'Usá al menos 8 caracteres y combina mayúsculas, minúsculas, números y símbolos.',
              'error'
            );
            return;
          }
        }

        await client.put(`/usuarios/${editId}`, payload);
        await Swal.fire(
          'ACTUALIZADO',
          'Usuario actualizado correctamente',
          'success'
        );
      } else {
        // ALTA
        if (!payload.password) {
          await Swal.fire(
            'FALTAN DATOS',
            'La contraseña es obligatoria para crear el usuario.',
            'warning'
          );
          return;
        }
        if (!passwordValid || payload.password !== confirmPassword) {
          await Swal.fire(
            'REVISÁ LA CONTRASEÑA',
            'Las contraseñas no coinciden.',
            'error'
          );
          return;
        }
        if (!passPolicyOk(payload.password)) {
          await Swal.fire(
            'CONTRASEÑA DÉBIl',
            'Usá al menos 8 caracteres y combina mayúsculas, minúsculas, números y símbolos.',
            'error'
          );
          return;
        }

        await client.post('/usuarios', payload);
        await Swal.fire('CREADO', 'Usuario creado correctamente', 'success');
      }

      fetchUsuarios();
      setModalOpen(false);
      // limpiar confirm al cerrar
      setConfirmPassword('');
    } catch (err) {
      console.error('Error al guardar usuario:', err);
      await Swal.fire(
        'ERROR',
        err?.response?.data?.mensajeError || 'Ocurrió un error al guardar.',
        'error'
      );
    }
  };

  const handleToggleEstado = async (u) => {
    const desactivando = u.estado !== 'inactivo';
    const confirm = await Swal.fire({
      title: desactivando ? '¿Desactivar usuario?' : '¿Reactivar usuario?',
      text: desactivando
        ? `${u.nombre} no va a poder iniciar sesión hasta que lo reactives.`
        : `${u.nombre} va a poder volver a iniciar sesión.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: desactivando ? 'Sí, desactivar' : 'Sí, reactivar'
    });
    if (!confirm.isConfirmed) return;

    try {
      const client = axiosWithAuth();
      if (desactivando) {
        await client.delete(`/usuarios/${u.id}`, {
          data: { usuario_log_id: usuarioId }
        });
      } else {
        await client.put(`/usuarios/${u.id}`, {
          estado: 'activo',
          usuario_log_id: usuarioId
        });
      }
      fetchUsuarios();
    } catch (err) {
      console.error('Error al cambiar estado del usuario:', err);
      await Swal.fire(
        'ERROR',
        err?.response?.data?.mensajeError || 'No se pudo cambiar el estado.',
        'error'
      );
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
    <div className="min-h-screen bg-gradient-to-br from-[#1f2937] via-[#111827] to-[#000000] py-12 px-6 text-white relative font-sans">
      <ParticlesBackground />
      <ButtonBack />

      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-10">
          <h1 className="text-4xl titulo uppercase font-extrabold text-white flex items-center gap-3 drop-shadow-xl">
            <FaUser className="text-indigo-400" /> Gestión de Usuarios
          </h1>
          <button
            onClick={() => openModal()}
            className="bg-indigo-600 hover:bg-indigo-700 px-5 py-3 rounded-xl font-semibold flex items-center gap-2 shadow-md"
          >
            <FaPlus /> Nuevo Usuario
          </button>
        </div>

        <div className="w-full bg-gray-900 p-4 rounded-xl shadow-md mb-6">
          <h2 className="text-white text-lg font-semibold mb-4">Filtros</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Filtro de texto */}
            <div>
              <label className="block text-sm text-slate-600 mb-1">Buscar</label>
              <input
                type="text"
                placeholder="Nombre, email o rol..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full px-4 py-2 rounded-lg bg-gray-800 text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-600/80"
              />
            </div>

            {/* Filtro por rol */}
            <div>
              <label className="block text-sm text-slate-600 mb-1">Rol</label>
              <select
                value={rolFiltro}
                onChange={(e) => setRolFiltro(e.target.value)}
                className="w-full px-4 py-2 rounded-lg bg-gray-800 text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-600/80"
              >
                <option value="todos">Todos</option>
                <option value="socio">Socio</option>
                <option value="administrativo">Administrativo</option>
                <option value="vendedor">Vendedor</option>
                <option value="contador">Contador</option>
              </select>
            </div>

            {/* Filtro por local */}
            <div>
              <label className="block text-sm text-slate-600 mb-1">Local</label>
              <select
                value={localFiltro}
                onChange={(e) => setLocalFiltro(e.target.value)}
                className="w-full px-4 py-2 rounded-lg bg-gray-800 text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-600/80"
              >
                <option value="todos">Todos</option>
                {locales.map((local) => (
                  <option key={local.id} value={local.id}>
                    {local.nombre}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="overflow-auto rounded-2xl shadow-xl bg-white/5 backdrop-blur-sm">
          <table className="w-full text-sm text-left text-white">
            <thead className="uppercase bg-indigo-600/80">
              <tr className="text-sm text-white">
                <th className="px-6 py-4">Nombre</th>
                <th className="px-6 py-4">Email</th>
                <th className="px-6 py-4">Rol</th>
                <th className="px-6 py-4">Local</th>
                <th className="px-6 py-4">Estado</th>
                <th className="px-6 py-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <tr
                  key={u.id}
                  className="border-b border-white/10 hover:bg-white/10 transition"
                >
                  <td className="px-6 py-3 font-medium text-white/90">
                    {u.nombre}
                  </td>
                  <td className="px-6 py-3 text-white/80">{u.email}</td>
                  <td className="px-6 py-3 capitalize text-white/80">
                    {u.rol}
                  </td>
                  <td className="px-6 py-3 text-white/80">
                    {locales.find((l) => l.id === u.local_id)?.nombre || '-'}
                  </td>
                  <td className="px-6 py-3">
                    {u.estado === 'inactivo' ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-rose-500/20 text-rose-300 ring-1 ring-rose-400/30">
                        Inactivo
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-400/30">
                        Activo
                      </span>
                    )}
                  </td>

                  <td className="px-6 py-3 text-center flex justify-center gap-4">
                    <button
                      onClick={() => openModal(u)}
                      className="text-yellow-400 hover:text-yellow-300"
                      title="Editar"
                    >
                      <FaEdit />
                    </button>
                    <button
                      onClick={() => handleToggleEstado(u)}
                      className={
                        u.estado === 'inactivo'
                          ? 'text-emerald-400 hover:text-emerald-300'
                          : 'text-red-500 hover:text-red-400'
                      }
                      title={u.estado === 'inactivo' ? 'Reactivar' : 'Desactivar'}
                    >
                      {u.estado === 'inactivo' ? <FaCheckCircle /> : <FaBan />}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <Modal
          isOpen={modalOpen}
          onRequestClose={() => setModalOpen(false)}
          overlayClassName="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50"
          className="bg-white rounded-2xl p-8 max-w-lg w-full mx-4 shadow-2xl border-l-4 border-indigo-500"
        >
          <h2 className="uppercase text-2xl font-bold mb-4 text-indigo-600">
            {editId ? 'Editar Usuario' : 'Nuevo Usuario'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4 text-gray-800">
            <input
              type="text"
              placeholder="Nombre"
              value={formData.nombre}
              onChange={(e) =>
                setFormData({ ...formData, nombre: e.target.value })
              }
              required
              className="w-full px-4 py-2 rounded-lg border border-gray-300"
            />
            <input
              type="email"
              placeholder="Email"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              required
              className="w-full px-4 py-2 rounded-lg border border-gray-300"
            />
            {/* ANTES
            {!editId && (
              <input
                type="password"
                placeholder="Contraseña"
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                required
                className="w-full px-4 py-2 rounded-lg border border-gray-300"
              />
            )} */}

            <PasswordEditor
              value={formData.password}
              onChange={(val) => setFormData({ ...formData, password: val })}
              showConfirm={!editId} // confirma SOLO en alta
              confirmValue={confirmPassword}
              onConfirmChange={setConfirmPassword}
              onValidityChange={setPasswordValid} // 👈 opcional (match/mismatch)
            />

            <select
              value={formData.rol}
              onChange={(e) =>
                setFormData({ ...formData, rol: e.target.value })
              }
              className="w-full px-4 py-2 rounded-lg border border-gray-300"
              required
            >
              <option value="socio">Socio</option>
              <option value="administrativo">Administrativo</option>
              <option value="vendedor">Vendedor</option>
              <option value="contador">Contador</option>
            </select>
            <select
              value={formData.local_id || ''}
              onChange={(e) =>
                setFormData({ ...formData, local_id: e.target.value })
              }
              className="w-full px-4 py-2 rounded-lg border border-gray-300"
              required
            >
              <option value="">Seleccione Local</option>
              {locales.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.nombre}
                </option>
              ))}
            </select>
            <div className="text-right">
              <button
                type="submit"
                className="bg-indigo-600 hover:bg-indigo-700 px-6 py-2 text-white font-medium rounded-lg"
              >
                {editId ? 'Actualizar' : 'Guardar'}
              </button>
            </div>
          </form>
        </Modal>
      </div>
    </div>
  );
}
