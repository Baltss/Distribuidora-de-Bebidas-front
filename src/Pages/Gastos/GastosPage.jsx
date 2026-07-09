// src/Pages/Gastos/GastosPage.jsx
import React, { useEffect, useState } from 'react';
import NavbarStaff from '../Dash/NavbarStaff';
import '../../Styles/staff/dashboard.css';
import '../../Styles/staff/background.css';
import ParticlesBackground from '../../Components/ParticlesBackground';
import ButtonBack from '../../Components/ButtonBack';
import { motion } from 'framer-motion';
import { FaPlus, FaTrash } from 'react-icons/fa';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip
} from 'recharts';

import GastoFormModal from '../../Components/Gastos/GastoFormModal';
import { listGastos, createGasto, deleteGasto, getGastosResumen } from '../../api/gastos.js';
import { listGastosCategorias } from '../../api/gastosCategorias.js';
import { showErrorSwal, showSuccessSwal, showConfirmSwal, showWarnSwal } from '../../ui/swal';
import moneyAR from '../../utils/money';

export default function GastosPage() {
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  const [categorias, setCategorias] = useState([]);
  const [resumen, setResumen] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);

  const fetchCategorias = async () => {
    try {
      const resp = await listGastosCategorias({ estado: 'activo' });
      setCategorias(resp?.data || []);
    } catch {
      // no bloqueamos si falla
    }
  };

  const fetchResumen = async () => {
    try {
      const resp = await getGastosResumen();
      setResumen(
        (resp?.data || [])
          .filter((r) => r.total > 0)
          .map((r) => ({ name: r.categoria, total: r.total }))
      );
    } catch {
      // no bloqueamos si falla
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const resp = await listGastos({ page, limit: 15 });
      setRows(resp?.data || []);
      setMeta(resp?.meta || null);
    } catch (e) {
      console.error(e);
      await showErrorSwal({ title: 'Error', text: 'No se pudieron cargar los gastos' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategorias();
    fetchResumen();
  }, []);

  useEffect(() => {
    fetchData(); // eslint-disable-next-line
  }, [page]);

  const onSubmit = async (payload) => {
    try {
      await createGasto(payload);
      await showSuccessSwal({ title: 'Gasto registrado' });
      await Promise.all([fetchData(), fetchResumen()]);
      setModalOpen(false);
    } catch (err) {
      const { code, mensajeError, tips } = err || {};
      if (code === 'BAD_REQUEST' || code === 'NOT_FOUND') {
        return showWarnSwal({ title: 'Datos inválidos', text: mensajeError, tips });
      }
      return showErrorSwal({
        title: 'No se pudo registrar el gasto',
        text: mensajeError || 'Ocurrió un error inesperado',
        tips
      });
    }
  };

  const onDelete = async (gasto) => {
    const ok = await showConfirmSwal({
      title: 'Eliminar gasto',
      text: `¿Eliminar el gasto de ${moneyAR(gasto.monto)}?`
    });
    if (!ok) return;

    try {
      await deleteGasto(gasto.id);
      await showSuccessSwal({ title: 'Eliminado' });
      await Promise.all([fetchData(), fetchResumen()]);
    } catch (err) {
      const { mensajeError, tips } = err || {};
      await showErrorSwal({
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
        <div className="min-h-screen bg-gradient-to-b from-[#1a1200] via-[#3a2200] to-[#7a3b00]">
          <ParticlesBackground />
          <ButtonBack />

          <div className="text-center pt-24 px-4">
            <motion.h1
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-4xl titulo uppercase font-bold text-white mb-3 drop-shadow-md"
            >
              Gastos
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-sm sm:text-base text-gray-200/80 max-w-2xl mx-auto"
            >
              Registrá y controlá los gastos operativos de la distribuidora.
            </motion.p>
          </div>

          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
            <div className="flex justify-end">
              <button
                onClick={() => setModalOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-rose-500 text-white font-semibold hover:brightness-110 transition"
              >
                <FaPlus /> Nuevo gasto
              </button>
            </div>

            {resumen.length > 0 && (
              <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-4 sm:p-6">
                <h3 className="text-sm font-semibold text-gray-200 uppercase tracking-wide mb-3">
                  Gastos por categoría
                </h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={resumen}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                      <XAxis dataKey="name" stroke="#e5e7eb" fontSize={12} />
                      <YAxis stroke="#e5e7eb" fontSize={12} />
                      <Tooltip
                        formatter={(v) => moneyAR(v)}
                        contentStyle={{ background: '#111827', border: 'none', borderRadius: 8 }}
                        labelStyle={{ color: '#fff' }}
                      />
                      <Bar dataKey="total" fill="#f59e0b" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {loading ? (
              <div className="text-center text-white/80 py-16">Cargando…</div>
            ) : rows.length === 0 ? (
              <div className="text-center text-white/80 py-16">No hay gastos registrados.</div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl">
                <table className="w-full text-sm text-left text-gray-100">
                  <thead className="bg-white/10 text-xs uppercase text-gray-300">
                    <tr>
                      <th className="px-4 py-3">Fecha</th>
                      <th className="px-4 py-3">Categoría</th>
                      <th className="px-4 py-3">Descripción</th>
                      <th className="px-4 py-3">Medio de pago</th>
                      <th className="px-4 py-3 text-right">Monto</th>
                      <th className="px-4 py-3 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((g) => (
                      <tr key={g.id} className="border-t border-white/10">
                        <td className="px-4 py-3">
                          {g.fecha ? new Date(g.fecha).toLocaleDateString() : '—'}
                        </td>
                        <td className="px-4 py-3">{g.categoria?.nombre || '—'}</td>
                        <td className="px-4 py-3">{g.descripcion || '—'}</td>
                        <td className="px-4 py-3">{g.medio_pago || '—'}</td>
                        <td className="px-4 py-3 text-right font-semibold">{moneyAR(g.monto)}</td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => onDelete(g)}
                            className="inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border border-rose-300/30 text-rose-300 hover:bg-rose-500/10 transition"
                          >
                            <FaTrash /> Eliminar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {meta && meta.totalPages > 1 && (
              <div className="flex items-center justify-center gap-3 pt-4">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="px-4 py-2 rounded-xl border border-white/10 text-white disabled:opacity-40"
                >
                  Anterior
                </button>
                <span className="text-white/80 text-sm">
                  Página {meta.page} de {meta.totalPages}
                </span>
                <button
                  disabled={page >= meta.totalPages}
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

      <GastoFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={onSubmit}
        categorias={categorias}
      />
    </>
  );
}
