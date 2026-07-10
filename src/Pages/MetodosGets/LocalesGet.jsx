import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { FaPlus, FaEdit, FaTrash, FaSearchLocation } from 'react-icons/fa';
import Modal from 'react-modal';
import ParticlesBackground from '../../Components/ParticlesBackground';
import ButtonBack from '../../Components/ButtonBack';
import { getUserId } from '../../utils/authUtils';
import { API_BASE_URL } from '../../api/apiBase';

Modal.setAppElement('#root');

const API = `${API_BASE_URL}/locales`;

const defaultFormValues = {
  nombre: '',
  codigo: '',
  direccion: '',
  ciudad: '',
  provincia: 'Tucumán',
  telefono: '',
  email: '',
  responsable_nombre: '',
  responsable_dni: '',
  horario_apertura: '09:00',
  horario_cierre: '18:00',
  printer_nombre: '',
  estado: 'activo'
};

const LocalesGet = () => {
  const [data, setData] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(6);
  const [orderBy, setOrderBy] = useState('id');
  const [orderDir, setOrderDir] = useState('ASC');

  const [modalOpen, setModalOpen] = useState(false);
  const [formValues, setFormValues] = useState(defaultFormValues);
  const [editId, setEditId] = useState(null);
  const usuarioId = getUserId();

  const debouncedQ = useMemo(() => search.trim(), [search]);

  const fetchLocales = async () => {
    setLoading(true);
    try {
      const res = await axios.get(API, {
        params: { page, limit, q: debouncedQ || undefined, orderBy, orderDir }
      });

      // Compat: si backend devuelve array plano
      if (Array.isArray(res.data)) {
        setData(res.data);
        setMeta(null);
      } else {
        setData(res.data.data || []);
        setMeta(res.data.meta || null);
      }
    } catch (e) {
      console.error('Error al obtener locales:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLocales();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit, orderBy, orderDir, debouncedQ]);

  const filteredWhenNoMeta = useMemo(() => {
    // Si NO hay meta (array plano por compat), mantené tu filtrado local
    if (meta) return data;
    const q = search.toLowerCase();
    return data.filter((l) =>
      [l.nombre, l.direccion, l.telefono].some((val) =>
        val?.toLowerCase().includes(q)
      )
    );
  }, [data, meta, search]);

  const openModal = (local = null) => {
    if (local) {
      setEditId(local.id);
      setFormValues({ ...defaultFormValues, ...local });
    } else {
      setEditId(null);
      setFormValues(defaultFormValues);
    }
    setModalOpen(true);
  };

  const handleDelete = async (id) => {
    await axios.delete(`${API}/${id}`, { data: { usuario_log_id: usuarioId } });
    if (meta && data.length === 1 && page > 1) {
      setPage((p) => p - 1);
    } else {
      fetchLocales();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = { ...formValues, usuario_log_id: usuarioId };
    if (editId) {
      await axios.put(`${API}/${editId}`, payload);
    } else {
      await axios.post(API, payload);
    }
    setModalOpen(false);
    setPage(1);
    fetchLocales();
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormValues((prev) => ({ ...prev, [name]: value }));
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0c0e24] via-[#0f112b] to-[#131538] py-10 px-6 text-white relative overflow-hidden">
      <ButtonBack />
      <ParticlesBackground />
      <div className="max-w-6xl mx-auto z-10 relative">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl titulo uppercase font-extrabold text-pink-400 flex items-center gap-3 drop-shadow-lg">
            <FaSearchLocation className="animate-pulse" /> Locales
          </h1>
          <button
            onClick={() => openModal()}
            className="bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700 transition-colors px-5 py-2 rounded-xl font-bold shadow-md flex items-center gap-2"
          >
            <FaPlus /> Nuevo Local
          </button>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="flex items-center gap-2">
            <select
              value={orderBy}
              onChange={(e) => setOrderBy(e.target.value)}
              className="px-3 py-2 rounded-lg bg-gray-900 border border-gray-700"
              aria-label="Ordenar por"
            >
              <option value="id">ID</option>
              <option value="nombre">Nombre</option>
              <option value="codigo">Código</option>
              <option value="ciudad">Ciudad</option>
              <option value="provincia">Provincia</option>
              {/* <option value="created_at">Creación</option>
              <option value="updated_at">Actualización</option> */}
            </select>
            <select
              value={orderDir}
              onChange={(e) => setOrderDir(e.target.value)}
              className="px-3 py-2 rounded-lg bg-gray-900 border border-gray-700"
              aria-label="Dirección de orden"
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
              className="px-3 py-2 rounded-lg bg-gray-900 border border-gray-700"
              aria-label="Items por página"
            >
              <option value={6}>6</option>
              <option value={12}>12</option>
              <option value={24}>24</option>
              <option value={48}>48</option>
            </select>
          </div>

          <input
            type="text"
            placeholder="Buscar local..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="flex-1 px-4 py-3 rounded-xl border border-gray-700 bg-gray-900 text-white focus:outline-none focus:ring-2 focus:ring-pink-500 placeholder:text-gray-400"
          />
        </div>

        {/* Info + Paginador superior */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
          <div className="text-white/80 text-xs sm:text-sm">
            Total: <b>{total}</b> · Página <b>{currPage}</b> de{' '}
            <b>{totalPages}</b>
          </div>
          <div className="-mx-2 sm:mx-0">
            <div className="overflow-x-auto no-scrollbar px-2 sm:px-0">
              <div className="inline-flex items-center whitespace-nowrap gap-2">
                <button
                  className="px-3 py-2 rounded-lg bg-gray-700 text-white disabled:opacity-40"
                  onClick={() => setPage(1)}
                  disabled={!hasPrev}
                >
                  «
                </button>
                <button
                  className="px-3 py-2 rounded-lg bg-gray-700 text-white disabled:opacity-40"
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
                          className={`px-3 py-2 rounded-lg border ${
                            active
                              ? 'bg-pink-600 border-pink-400'
                              : 'bg-gray-800 border-gray-700 hover:bg-gray-700'
                          }`}
                          aria-current={active ? 'page' : undefined}
                        >
                          {num}
                        </button>
                      );
                    })}
                </div>

                <button
                  className="px-3 py-2 rounded-lg bg-gray-700 text-white disabled:opacity-40"
                  onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                  disabled={!hasNext}
                >
                  ›
                </button>
                <button
                  className="px-3 py-2 rounded-lg bg-gray-700 text-white disabled:opacity-40"
                  onClick={() => setPage(totalPages)}
                  disabled={!hasNext}
                >
                  »
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Grid */}
        <motion.div layout className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {loading
            ? Array.from({ length: Math.min(limit, 8) }).map((_, i) => (
                <div
                  key={i}
                  className="h-40 rounded-2xl bg-white/5 border border-white/10 animate-pulse"
                />
              ))
            : rows.map((local) => (
                <motion.div
                  key={local.id}
                  layout
                  className="bg-white/10 p-6 rounded-2xl shadow-xl backdrop-blur-lg border border-white/10 hover:scale-[1.02] transition-transform"
                >
                  <h2 className="text-xl font-bold text-white">
                    ID: {local.id}
                  </h2>
                  <h2 className="text-xl font-bold text-pink-300">
                    {local.nombre}
                  </h2>
                  <p className="text-sm text-gray-400 italic">
                    {local.direccion}
                  </p>
                  <p className="text-sm text-gray-400">
                    📍 {local.ciudad}, {local.provincia}
                  </p>
                  <p className="text-sm text-gray-400">📞 {local.telefono}</p>
                  <p className="text-sm text-gray-400">
                    Responsable: {local.responsable_nombre} (
                    {local.responsable_dni})
                  </p>
                  <p className="text-sm text-gray-400">
                    🕒 {local.horario_apertura} - {local.horario_cierre}
                  </p>
                  <p className="text-sm text-gray-400">
                    🖨️ {local.printer_nombre}
                  </p>
                  <p className="text-sm text-gray-400">✉️ {local.email}</p>
                  <p className="text-sm text-green-400 font-bold">
                    Estado: {local.estado}
                  </p>

                  <div className="mt-4 flex justify-end gap-4">
                    <button
                      onClick={() => openModal(local)}
                      className="text-yellow-400 hover:text-yellow-300 text-xl"
                    >
                      <FaEdit />
                    </button>
                    <button
                      onClick={() => handleDelete(local.id)}
                      className="text-red-500 hover:text-red-400 text-xl"
                    >
                      <FaTrash />
                    </button>
                  </div>
                </motion.div>
              ))}
        </motion.div>

        {/* Paginador inferior (igual al superior) */}
        <div className="mt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="text-white/80 text-xs sm:text-sm">
            Total: <b>{total}</b> · Página <b>{currPage}</b> de{' '}
            <b>{totalPages}</b>
          </div>
          <div className="-mx-2 sm:mx-0">
            <div className="overflow-x-auto no-scrollbar px-2 sm:px-0">
              <div className="inline-flex items-center whitespace-nowrap gap-2">
                <button
                  className="px-3 py-2 rounded-lg bg-gray-700 text-white disabled:opacity-40"
                  onClick={() => setPage(1)}
                  disabled={!hasPrev}
                >
                  «
                </button>
                <button
                  className="px-3 py-2 rounded-lg bg-gray-700 text-white disabled:opacity-40"
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
                          className={`px-3 py-2 rounded-lg border ${
                            active
                              ? 'bg-pink-600 border-pink-400'
                              : 'bg-gray-800 border-gray-700 hover:bg-gray-700'
                          }`}
                        >
                          {num}
                        </button>
                      );
                    })}
                </div>
                <button
                  className="px-3 py-2 rounded-lg bg-gray-700 text-white disabled:opacity-40"
                  onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                  disabled={!hasNext}
                >
                  ›
                </button>
                <button
                  className="px-3 py-2 rounded-lg bg-gray-700 text-white disabled:opacity-40"
                  onClick={() => setPage(totalPages)}
                  disabled={!hasNext}
                >
                  »
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Crear/Editar */}
        <Modal
          isOpen={modalOpen}
          onRequestClose={() => setModalOpen(false)}
          overlayClassName="fixed inset-0 bg-black/50 backdrop-blur-sm flex justify-center items-center z-50"
          className="bg-white rounded-2xl p-6 max-w-2xl w-full mx-4 shadow-2xl border-l-4 border-pink-500 overflow-y-auto max-h-[90vh] scrollbar-thin scrollbar-thumb-pink-300"
        >
          <h2 className="text-2xl font-bold mb-4 text-pink-600">
            {editId ? 'Editar Local' : 'Nuevo Local'}
          </h2>

          <form
            onSubmit={handleSubmit}
            className="grid grid-cols-1 md:grid-cols-2 gap-4"
          >
            {Object.entries(defaultFormValues).map(([key]) => {
              const label = key
                .replace(/_/g, ' ')
                .replace(/\b\w/g, (c) => c.toUpperCase());

              if (key === 'estado') {
                return (
                  <div key={key} className="md:col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      {label}
                    </label>
                    <select
                      name={key}
                      value={formValues[key]}
                      onChange={handleChange}
                      className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-pink-400"
                    >
                      <option value="activo">Activo</option>
                      <option value="inactivo">Inactivo</option>
                    </select>
                  </div>
                );
              }

              return (
                <div key={key} className="w-full">
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    {label}
                  </label>
                  <input
                    type={
                      key.includes('email')
                        ? 'email'
                        : key.includes('horario')
                        ? 'time'
                        : 'text'
                    }
                    name={key}
                    value={formValues[key]}
                    onChange={handleChange}
                    placeholder={label}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-pink-400"
                  />
                </div>
              );
            })}
            <div className="md:col-span-2 text-right mt-4">
              <button
                type="submit"
                className="bg-pink-500 hover:bg-pink-600 transition px-6 py-2 text-white font-semibold rounded-lg shadow-md"
              >
                {editId ? 'Actualizar' : 'Guardar'}
              </button>
            </div>
          </form>
        </Modal>
      </div>
    </div>
  );
};

export default LocalesGet;
