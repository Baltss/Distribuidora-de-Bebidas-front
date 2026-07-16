// src/Pages/Caja/CajaPage.jsx
import React, { useEffect, useMemo, useState } from 'react';
import NavbarStaff from '../Dash/NavbarStaff';
import '../../Styles/staff/dashboard.css';
import '../../Styles/staff/background.css';
import ParticlesBackground from '../../Components/ParticlesBackground';
import ButtonBack from '../../Components/ButtonBack';
import { motion } from 'framer-motion';
import { FaPlus, FaTrash, FaArrowUp, FaArrowDown, FaWallet } from 'react-icons/fa';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';

import GastoFormModal from '../../Components/Gastos/GastoFormModal';
import IngresoManualFormModal from '../../Components/Caja/IngresoManualFormModal';
import {
  listCajaMovimientos,
  getCajaResumen,
  createCajaMovimientoManual,
  deleteCajaMovimientoManual
} from '../../api/caja.js';
import { createGasto } from '../../api/gastos.js';
import { listGastosCategorias } from '../../api/gastosCategorias.js';
import { showErrorSwal, showSuccessSwal, showConfirmSwal, showWarnSwal } from '../../ui/swal';
import moneyAR from '../../utils/money';
import useDebouncedValue from '../../hooks/useDebouncedValue';

const ORIGEN_OPCIONES = [
  { value: '', label: 'Todos los orígenes' },
  { value: 'cobranza', label: 'Cobro a cliente' },
  { value: 'pago_proveedor', label: 'Pago a proveedor' },
  { value: 'gasto', label: 'Gasto' },
  { value: 'venta_contado', label: 'Venta contado' },
  { value: 'compra_contado', label: 'Compra contado' },
  { value: 'ingreso_manual', label: 'Ingreso manual' },
  { value: 'egreso_manual', label: 'Egreso manual' }
];

const fmtFecha = (v) => (v ? new Date(v).toLocaleDateString('es-AR') : '—');
const fmtFechaChart = (v) =>
  v ? new Date(v).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' }) : '';

export default function CajaPage() {
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  const [resumen, setResumen] = useState(null);
  const [categorias, setCategorias] = useState([]);

  const [gastoModalOpen, setGastoModalOpen] = useState(false);
  const [ingresoModalOpen, setIngresoModalOpen] = useState(false);

  // Filtros
  const [tipo, setTipo] = useState(''); // '' | ingreso | egreso
  const [origenTipo, setOrigenTipo] = useState('');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');

  const filtroCriteriaKey = useMemo(
    () => JSON.stringify({ tipo, origenTipo, desde, hasta }),
    [tipo, origenTipo, desde, hasta]
  );
  const debouncedFiltroCriteriaKey = useDebouncedValue(filtroCriteriaKey, 500);

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
      const resp = await getCajaResumen({ desde, hasta });
      setResumen(resp);
    } catch {
      // no bloqueamos si falla
    }
  };

  const fetchData = async (targetPage = page) => {
    setLoading(true);
    try {
      const resp = await listCajaMovimientos({
        page: targetPage,
        limit: 20,
        tipo: tipo || undefined,
        origen_tipo: origenTipo || undefined,
        desde: desde || undefined,
        hasta: hasta || undefined
      });
      setRows(resp?.data || []);
      setMeta(resp?.meta || null);
    } catch (e) {
      console.error(e);
      await showErrorSwal({ title: 'Error', text: 'No se pudieron cargar los movimientos de caja' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategorias();
  }, []);

  // Filtros cambiados (debounced): volvemos a página 1
  useEffect(() => {
    setPage(1);
    fetchData(1);
    fetchResumen();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedFiltroCriteriaKey]);

  // Cambio de página (sin debounce, acción directa)
  useEffect(() => {
    fetchData(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const serieChart = useMemo(
    () =>
      (resumen?.serie_diaria || []).map((d) => ({
        ...d,
        label: fmtFechaChart(d.fecha)
      })),
    [resumen]
  );

  const onSubmitGasto = async (payload) => {
    try {
      await createGasto(payload);
      await showSuccessSwal({ title: 'Gasto registrado' });
      await Promise.all([fetchData(page), fetchResumen()]);
      setGastoModalOpen(false);
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

  const onSubmitIngreso = async (payload) => {
    try {
      await createCajaMovimientoManual(payload);
      await showSuccessSwal({ title: 'Ingreso registrado' });
      await Promise.all([fetchData(page), fetchResumen()]);
      setIngresoModalOpen(false);
    } catch (err) {
      const { mensajeError, tips } = err || {};
      return showErrorSwal({
        title: 'No se pudo registrar el ingreso',
        text: mensajeError || 'Ocurrió un error inesperado',
        tips
      });
    }
  };

  const onDeleteManual = async (mov) => {
    const ok = await showConfirmSwal({
      title: 'Eliminar movimiento',
      text: `¿Eliminar este movimiento de ${moneyAR(mov.monto)}?`
    });
    if (!ok) return;

    try {
      await deleteCajaMovimientoManual(mov.id);
      await showSuccessSwal({ title: 'Eliminado' });
      await Promise.all([fetchData(page), fetchResumen()]);
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
              Caja y Finanzas
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-sm sm:text-base text-gray-200/80 max-w-2xl mx-auto"
            >
              Todo el movimiento de dinero de la distribuidora en un solo lugar:
              cobros, pagos, gastos, y ventas/compras de contado.
            </motion.p>
          </div>

          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
            {/* Acciones */}
            <div className="flex flex-wrap justify-end gap-2">
              <button
                onClick={() => setIngresoModalOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-semibold hover:brightness-110 transition"
              >
                <FaPlus /> Nuevo ingreso
              </button>
              <button
                onClick={() => setGastoModalOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-rose-500 text-white font-semibold hover:brightness-110 transition"
              >
                <FaPlus /> Nuevo gasto
              </button>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="rounded-2xl border border-white/10 bg-white/10 backdrop-blur-xl p-4 flex items-center gap-3">
                <div className="h-11 w-11 rounded-full bg-cyan-500/20 flex items-center justify-center">
                  <FaWallet className="text-cyan-300" />
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-gray-300">Saldo actual</p>
                  <p className="text-xl font-bold text-white">
                    {resumen ? moneyAR(resumen.saldo_actual) : '—'}
                  </p>
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/10 backdrop-blur-xl p-4 flex items-center gap-3">
                <div className="h-11 w-11 rounded-full bg-emerald-500/20 flex items-center justify-center">
                  <FaArrowUp className="text-emerald-300" />
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-gray-300">Ingresos del período</p>
                  <p className="text-xl font-bold text-white">
                    {resumen ? moneyAR(resumen.ingresos_periodo) : '—'}
                  </p>
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/10 backdrop-blur-xl p-4 flex items-center gap-3">
                <div className="h-11 w-11 rounded-full bg-rose-500/20 flex items-center justify-center">
                  <FaArrowDown className="text-rose-300" />
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-gray-300">Egresos del período</p>
                  <p className="text-xl font-bold text-white">
                    {resumen ? moneyAR(resumen.egresos_periodo) : '—'}
                  </p>
                </div>
              </div>
            </div>

            {/* Filtros */}
            <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-4 sm:p-5">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <select
                  value={tipo}
                  onChange={(e) => setTipo(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/10 px-3 py-2.5 text-sm text-white
                             focus:outline-none focus:ring-2 focus:ring-amber-300/40"
                >
                  <option value="" className="text-black">Todos (ingresos y egresos)</option>
                  <option value="ingreso" className="text-black">Solo ingresos</option>
                  <option value="egreso" className="text-black">Solo egresos</option>
                </select>

                <select
                  value={origenTipo}
                  onChange={(e) => setOrigenTipo(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/10 px-3 py-2.5 text-sm text-white
                             focus:outline-none focus:ring-2 focus:ring-amber-300/40"
                >
                  {ORIGEN_OPCIONES.map((o) => (
                    <option key={o.value} value={o.value} className="text-black">
                      {o.label}
                    </option>
                  ))}
                </select>

                <input
                  type="date"
                  value={desde}
                  onChange={(e) => setDesde(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/10 px-3 py-2.5 text-sm text-white
                             focus:outline-none focus:ring-2 focus:ring-amber-300/40"
                />
                <input
                  type="date"
                  value={hasta}
                  onChange={(e) => setHasta(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/10 px-3 py-2.5 text-sm text-white
                             focus:outline-none focus:ring-2 focus:ring-amber-300/40"
                />
              </div>
            </div>

            {/* Gráfico ingresos vs egresos */}
            {serieChart.length > 0 && (
              <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-4 sm:p-6">
                <h3 className="text-sm font-semibold text-gray-200 uppercase tracking-wide mb-3">
                  Ingresos vs. Egresos
                </h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={serieChart}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                      <XAxis dataKey="label" stroke="#e5e7eb" fontSize={12} />
                      <YAxis stroke="#e5e7eb" fontSize={12} />
                      <Tooltip
                        formatter={(v) => moneyAR(v)}
                        contentStyle={{ background: '#111827', border: 'none', borderRadius: 8 }}
                        labelStyle={{ color: '#fff' }}
                      />
                      <Legend />
                      <Line type="monotone" dataKey="ingresos" name="Ingresos" stroke="#10b981" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="egresos" name="Egresos" stroke="#f43f5e" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Listado */}
            {loading ? (
              <div className="text-center text-white/80 py-16">Cargando…</div>
            ) : rows.length === 0 ? (
              <div className="text-center text-white/80 py-16">No hay movimientos para estos filtros.</div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl">
                <table className="w-full text-sm text-left text-gray-100">
                  <thead className="bg-white/10 text-xs uppercase text-gray-300">
                    <tr>
                      <th className="px-4 py-3">Fecha</th>
                      <th className="px-4 py-3">Tipo</th>
                      <th className="px-4 py-3">Origen</th>
                      <th className="px-4 py-3">Descripción</th>
                      <th className="px-4 py-3 text-right">Monto</th>
                      <th className="px-4 py-3 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((m) => {
                      const esManual = ['ingreso_manual', 'egreso_manual'].includes(m.origen_tipo);
                      const esIngreso = Number(m.signo) === 1;
                      return (
                        <tr key={m.id} className="border-t border-white/10">
                          <td className="px-4 py-3 whitespace-nowrap">{fmtFecha(m.fecha)}</td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                                esIngreso
                                  ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-400/30'
                                  : 'bg-rose-500/15 text-rose-300 border border-rose-400/30'
                              }`}
                            >
                              {esIngreso ? <FaArrowUp /> : <FaArrowDown />}
                              {esIngreso ? 'Ingreso' : 'Egreso'}
                            </span>
                          </td>
                          <td className="px-4 py-3">{m.origen_label}</td>
                          <td className="px-4 py-3">{m.descripcion || '—'}</td>
                          <td
                            className={`px-4 py-3 text-right font-semibold ${
                              esIngreso ? 'text-emerald-300' : 'text-rose-300'
                            }`}
                          >
                            {esIngreso ? '+' : '-'}
                            {moneyAR(m.monto)}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {esManual && (
                              <button
                                onClick={() => onDeleteManual(m)}
                                className="inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border border-rose-300/30 text-rose-300 hover:bg-rose-500/10 transition"
                              >
                                <FaTrash /> Eliminar
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
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
        open={gastoModalOpen}
        onClose={() => setGastoModalOpen(false)}
        onSubmit={onSubmitGasto}
        categorias={categorias}
      />
      <IngresoManualFormModal
        open={ingresoModalOpen}
        onClose={() => setIngresoModalOpen(false)}
        onSubmit={onSubmitIngreso}
      />
    </>
  );
}
