// src/Pages/Caja/CajaPage.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppShell from '../../Components/Layout/AppShell';
import { useAuth } from '../../AuthContext';
import { motion } from 'framer-motion';
import {
  FaPlus,
  FaArrowUp,
  FaArrowDown,
  FaWallet,
  FaArrowLeft,
  FaLock,
  FaBan,
  FaEdit,
  FaHistory
} from 'react-icons/fa';
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
import MovimientoManualFormModal from '../../Components/Caja/MovimientoManualFormModal';
import CerrarCajaModal from '../../Components/Caja/CerrarCajaModal';
import CajaDetalleModal from '../../Components/Caja/CajaDetalleModal';
import {
  getCajaActual,
  getCajaDetalle,
  listCajaMovimientos,
  getCajaResumen,
  createCajaMovimientoManual,
  updateCajaMovimientoManual,
  anularCajaMovimiento,
  cerrarCaja,
  listCajasHistorial
} from '../../api/caja.js';
import { listLocales } from '../../api/locales.js';
import { createGasto } from '../../api/gastos.js';
import { listGastosCategorias } from '../../api/gastosCategorias.js';
import { showErrorSwal, showSuccessSwal, showConfirmSwal, showWarnSwal } from '../../ui/swal';
import moneyAR from '../../utils/money';
import { MEDIOS_PAGO, medioPagoLabel } from '../../utils/mediosPago';
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

const ESTADO_BADGE = {
  abierta: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  pendiente_cierre: 'bg-amber-50 text-amber-700 border-amber-200',
  cerrada: 'bg-slate-100 text-slate-600 border-slate-200'
};
const ESTADO_LABEL = {
  abierta: 'Abierta',
  pendiente_cierre: 'Pendiente de cierre',
  cerrada: 'Cerrada'
};

const fmtFecha = (v) => (v ? new Date(v).toLocaleDateString('es-AR') : '—');
const fmtFechaHora = (v) =>
  v ? new Date(v).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' }) : '—';
const fmtFechaChart = (v) =>
  v ? new Date(v).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' }) : '';

export default function CajaPage() {
  const navigate = useNavigate();
  const { userLevel } = useAuth();
  const esAdmin = String(userLevel || '').toLowerCase() === 'socio';

  const [locales, setLocales] = useState([]);
  const [localSeleccionado, setLocalSeleccionado] = useState('');

  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  const [resumen, setResumen] = useState(null);
  const [categorias, setCategorias] = useState([]);
  const [cajaActual, setCajaActual] = useState(null);
  const [alertaCajaAnterior, setAlertaCajaAnterior] = useState(null);

  const [gastoModalOpen, setGastoModalOpen] = useState(false);
  const [movModalOpen, setMovModalOpen] = useState(false);
  const [movModalTipo, setMovModalTipo] = useState('ingreso');
  const [movModalEdit, setMovModalEdit] = useState(null);
  const [cajaACerrar, setCajaACerrar] = useState(null);

  const [detalleCajaId, setDetalleCajaId] = useState(null);
  const [historialCajas, setHistorialCajas] = useState([]);
  const [historialOpen, setHistorialOpen] = useState(false);

  // Filtros
  const [tipo, setTipo] = useState(''); // '' | ingreso | egreso
  const [origenTipo, setOrigenTipo] = useState('');
  const [medioPago, setMedioPago] = useState('');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');

  const filtroCriteriaKey = useMemo(
    () => JSON.stringify({ tipo, origenTipo, medioPago, desde, hasta }),
    [tipo, origenTipo, medioPago, desde, hasta]
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

  const fetchLocales = async () => {
    try {
      const resp = await listLocales();
      const activos = (Array.isArray(resp) ? resp : []).filter((l) => l.estado !== 'inactivo');
      setLocales(activos);
      if (esAdmin && activos.length > 0) {
        setLocalSeleccionado((prev) => prev || String(activos[0].id));
      }
    } catch {
      // no bloqueamos si falla
    }
  };

  const localIdParam = esAdmin && localSeleccionado ? localSeleccionado : undefined;

  const fetchCajaActual = async () => {
    try {
      const resp = await getCajaActual({ local_id: localIdParam });
      setCajaActual(resp?.caja || null);
      setAlertaCajaAnterior(resp?.alerta_caja_anterior_pendiente || null);
    } catch {
      // no bloqueamos si falla
    }
  };

  const fetchResumen = async () => {
    try {
      const resp = await getCajaResumen({ desde, hasta, local_id: localIdParam });
      setResumen(resp);
    } catch {
      // no bloqueamos si falla
    }
  };

  const fetchHistorial = async () => {
    try {
      const resp = await listCajasHistorial({ limit: 15, local_id: localIdParam });
      setHistorialCajas(resp?.data || []);
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
        medio_pago: medioPago || undefined,
        desde: desde || undefined,
        hasta: hasta || undefined,
        local_id: localIdParam
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

  const refreshAll = async (targetPage = page) => {
    await Promise.all([fetchData(targetPage), fetchResumen(), fetchCajaActual(), fetchHistorial()]);
  };

  useEffect(() => {
    fetchCategorias();
    fetchLocales();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Local elegido (o recién cargado para admin): recarga todo.
  useEffect(() => {
    fetchCajaActual();
    fetchHistorial();
    fetchResumen();
    fetchData(1);
    setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localIdParam]);

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
      await refreshAll(page);
      setGastoModalOpen(false);
    } catch (err) {
      const { code, mensajeError, tips } = err || {};
      if (code === 'BAD_REQUEST' || code === 'NOT_FOUND') {
        return showWarnSwal({ title: 'Datos inválidos', text: mensajeError, tips });
      }
      if (code === 'CAJA_CERRADA') {
        return showWarnSwal({ title: 'Caja cerrada', text: mensajeError });
      }
      return showErrorSwal({
        title: 'No se pudo registrar el gasto',
        text: mensajeError || 'Ocurrió un error inesperado',
        tips
      });
    }
  };

  const openNuevoMovimiento = (t) => {
    setMovModalTipo(t);
    setMovModalEdit(null);
    setMovModalOpen(true);
  };

  const openEditarMovimiento = (mov) => {
    setMovModalTipo(Number(mov.signo) === 1 ? 'ingreso' : 'egreso');
    setMovModalEdit(mov);
    setMovModalOpen(true);
  };

  const onSubmitMovimiento = async (payload) => {
    try {
      if (movModalEdit) {
        await updateCajaMovimientoManual(movModalEdit.id, payload);
        await showSuccessSwal({ title: 'Movimiento actualizado' });
      } else {
        await createCajaMovimientoManual(payload);
        await showSuccessSwal({ title: movModalTipo === 'ingreso' ? 'Ingreso registrado' : 'Egreso registrado' });
      }
      await refreshAll(page);
    } catch (err) {
      const { code, mensajeError, tips } = err || {};
      if (code === 'CAJA_CERRADA') {
        await showWarnSwal({ title: 'Caja cerrada', text: mensajeError });
      } else {
        await showErrorSwal({
          title: 'No se pudo guardar el movimiento',
          text: mensajeError || 'Ocurrió un error inesperado',
          tips
        });
      }
      throw err;
    }
  };

  const onAnularMovimiento = async (mov) => {
    const ok = await showConfirmSwal({
      title: 'Anular movimiento',
      text: `¿Anular este movimiento de ${moneyAR(mov.monto)}? Queda registrado como anulado, no se borra.`
    });
    if (!ok) return;

    try {
      await anularCajaMovimiento(mov.id);
      await showSuccessSwal({ title: 'Movimiento anulado' });
      await refreshAll(page);
    } catch (err) {
      const { mensajeError, tips } = err || {};
      await showErrorSwal({
        title: 'No se pudo anular',
        text: mensajeError || 'Ocurrió un error inesperado',
        tips
      });
    }
  };

  const onCerrarCaja = async (payload) => {
    if (!cajaACerrar?.id) return;
    const resp = await cerrarCaja(cajaACerrar.id, payload);
    await showSuccessSwal({
      title: 'Caja cerrada',
      text: resp?.estado_diferencia === 'ok' ? 'El efectivo contado cuadra con lo esperado.' : undefined
    });
    setCajaACerrar(null);
    await refreshAll(page);
  };

  // Abre el cierre para la caja pendiente que avisa el banner de arriba
  // (trae su resumen completo, incluido el desglose por medio de pago).
  const abrirCierreDesdeAlerta = async () => {
    if (!alertaCajaAnterior?.id) return;
    try {
      const resp = await getCajaDetalle(alertaCajaAnterior.id);
      if (resp?.caja) setCajaACerrar(resp.caja);
    } catch (err) {
      await showErrorSwal({
        title: 'No se pudo abrir el cierre',
        text: err?.mensajeError || 'Ocurrió un error inesperado'
      });
    }
  };

  const abrirCierreDesdeDetalle = (caja) => {
    setDetalleCajaId(null);
    setCajaACerrar(caja);
  };

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
          Caja y Finanzas
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mt-1 text-sm text-slate-500"
        >
          Todo el movimiento de dinero de la distribuidora en un solo lugar:
          cobros, pagos, gastos, y ventas/compras de contado.
        </motion.p>

        {esAdmin && locales.length > 1 && (
          <div className="mt-4">
            <label className="block text-xs font-medium text-slate-500 mb-1">Local</label>
            <select
              value={localSeleccionado}
              onChange={(e) => setLocalSeleccionado(e.target.value)}
              className="w-full sm:w-64 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800
                         focus:outline-none focus:ring-2 focus:ring-teal-400/40"
            >
              {locales.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.nombre}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="mt-6 space-y-6">
          {alertaCajaAnterior && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 flex flex-wrap items-center justify-between gap-3">
              <span>
                La caja del {fmtFecha(alertaCajaAnterior.fecha_jornada)} quedó sin cerrar. Cerrala para que los
                cierres queden al día.
              </span>
              {esAdmin && (
                <button
                  onClick={abrirCierreDesdeAlerta}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold transition shrink-0"
                >
                  <FaLock className="h-3 w-3" /> Cerrar esa caja
                </button>
              )}
            </div>
          )}

          {/* Caja del día */}
          {cajaActual && (
            <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-2.5">
                  <h2 className="text-lg font-bold text-slate-900">
                    Caja de hoy{cajaActual.local?.nombre ? ` · ${cajaActual.local.nombre}` : ''} · {fmtFecha(cajaActual.fecha_jornada)}
                  </h2>
                  <span className={`px-2 py-1 rounded-full text-xs border ${ESTADO_BADGE[cajaActual.estado] || ''}`}>
                    {ESTADO_LABEL[cajaActual.estado] || cajaActual.estado}
                  </span>
                </div>
                {esAdmin && cajaActual.estado !== 'cerrada' && (
                  <button
                    onClick={() => setCajaACerrar(cajaActual)}
                    className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold transition"
                  >
                    <FaLock className="h-3.5 w-3.5" /> Cerrar caja
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-slate-500">Saldo inicial</p>
                  <p className="text-base font-semibold text-slate-800">{moneyAR(cajaActual.saldo_inicial)}</p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-slate-500">Ingresos hoy</p>
                  <p className="text-base font-semibold text-emerald-600">{moneyAR(cajaActual.ingresos)}</p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-slate-500">Egresos hoy</p>
                  <p className="text-base font-semibold text-rose-600">{moneyAR(cajaActual.egresos)}</p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-slate-500">Efectivo esperado</p>
                  <p className="text-base font-bold text-slate-900">{moneyAR(cajaActual.efectivo_esperado_actual)}</p>
                </div>
              </div>
              {cajaActual.por_medio_pago && Object.keys(cajaActual.por_medio_pago).length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {Object.entries(cajaActual.por_medio_pago).map(([medio, v]) => (
                    <span
                      key={medio}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border border-slate-200 bg-slate-50 text-slate-600"
                    >
                      {medioPagoLabel(medio)}: {moneyAR(v.total)}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Acciones */}
          <div className="flex flex-wrap justify-end gap-2">
            <button
              onClick={() => setHistorialOpen((v) => !v)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold transition"
            >
              <FaHistory /> {historialOpen ? 'Ocultar historial de cajas' : 'Historial de cajas'}
            </button>
            <button
              onClick={() => openNuevoMovimiento('ingreso')}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold transition"
            >
              <FaPlus /> Nuevo ingreso
            </button>
            <button
              onClick={() => setGastoModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold transition"
            >
              <FaPlus /> Nuevo gasto
            </button>
          </div>

          {historialOpen && (
            <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
              <h3 className="text-sm font-semibold text-slate-600 uppercase tracking-wide mb-3">
                Historial de cajas
              </h3>
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-sm text-left text-slate-700">
                  <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-3 py-2">Jornada</th>
                      {esAdmin && <th className="px-3 py-2">Local</th>}
                      <th className="px-3 py-2">Estado</th>
                      <th className="px-3 py-2 text-right">Saldo esperado</th>
                      <th className="px-3 py-2 text-right">Diferencia</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historialCajas.map((c) => (
                      <tr
                        key={c.id}
                        className="border-t border-slate-100 cursor-pointer hover:bg-slate-50"
                        onClick={() => setDetalleCajaId(c.id)}
                      >
                        <td className="px-3 py-2 whitespace-nowrap">{fmtFecha(c.fecha_jornada)}</td>
                        {esAdmin && <td className="px-3 py-2">{c.local?.nombre || '—'}</td>}
                        <td className="px-3 py-2">
                          <span className={`px-2 py-0.5 rounded-full text-[11px] border ${ESTADO_BADGE[c.estado] || ''}`}>
                            {ESTADO_LABEL[c.estado] || c.estado}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right">{moneyAR(c.saldo_esperado)}</td>
                        <td className="px-3 py-2 text-right">
                          {c.estado === 'cerrada' ? moneyAR(c.diferencia) : '—'}
                        </td>
                      </tr>
                    ))}
                    {historialCajas.length === 0 && (
                      <tr>
                        <td colSpan={esAdmin ? 5 : 4} className="px-3 py-6 text-center text-slate-400">
                          Sin cajas registradas todavía.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 flex items-center gap-3">
              <div className="h-11 w-11 rounded-full bg-teal-50 flex items-center justify-center">
                <FaWallet className="text-teal-600" />
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wide text-slate-500">Saldo actual</p>
                <p className="text-xl font-bold text-slate-900">
                  {resumen ? moneyAR(resumen.saldo_actual) : '—'}
                </p>
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 flex items-center gap-3">
              <div className="h-11 w-11 rounded-full bg-emerald-50 flex items-center justify-center">
                <FaArrowUp className="text-emerald-600" />
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wide text-slate-500">Ingresos del período</p>
                <p className="text-xl font-bold text-slate-900">
                  {resumen ? moneyAR(resumen.ingresos_periodo) : '—'}
                </p>
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 flex items-center gap-3">
              <div className="h-11 w-11 rounded-full bg-rose-50 flex items-center justify-center">
                <FaArrowDown className="text-rose-600" />
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wide text-slate-500">Egresos del período</p>
                <p className="text-xl font-bold text-slate-900">
                  {resumen ? moneyAR(resumen.egresos_periodo) : '—'}
                </p>
              </div>
            </div>
          </div>

          {Array.isArray(resumen?.por_medio_pago) && resumen.por_medio_pago.length > 0 && (
            <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
              <h3 className="text-sm font-semibold text-slate-600 uppercase tracking-wide mb-3">
                Por medio de pago (período)
              </h3>
              <div className="flex flex-wrap gap-2">
                {resumen.por_medio_pago.map((m, i) => (
                  <span
                    key={`${m.medio_pago}-${m.signo}-${i}`}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border ${
                      m.signo === 1
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-rose-50 text-rose-700 border-rose-200'
                    }`}
                  >
                    {medioPagoLabel(m.medio_pago)}: {m.signo === 1 ? '+' : '-'}
                    {moneyAR(m.total)}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Filtros */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
              <select
                value={tipo}
                onChange={(e) => setTipo(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800
                           focus:outline-none focus:ring-2 focus:ring-teal-400/40"
              >
                <option value="">Todos (ingresos y egresos)</option>
                <option value="ingreso">Solo ingresos</option>
                <option value="egreso">Solo egresos</option>
              </select>

              <select
                value={origenTipo}
                onChange={(e) => setOrigenTipo(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800
                           focus:outline-none focus:ring-2 focus:ring-teal-400/40"
              >
                {ORIGEN_OPCIONES.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>

              <select
                value={medioPago}
                onChange={(e) => setMedioPago(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800
                           focus:outline-none focus:ring-2 focus:ring-teal-400/40"
              >
                <option value="">Todos los medios</option>
                {MEDIOS_PAGO.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>

              <input
                type="date"
                value={desde}
                onChange={(e) => setDesde(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800
                           focus:outline-none focus:ring-2 focus:ring-teal-400/40"
              />
              <input
                type="date"
                value={hasta}
                onChange={(e) => setHasta(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800
                           focus:outline-none focus:ring-2 focus:ring-teal-400/40"
              />
            </div>
          </div>

          {/* Gráfico ingresos vs egresos */}
          {serieChart.length > 0 && (
            <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
              <h3 className="text-sm font-semibold text-slate-600 uppercase tracking-wide mb-3">
                Ingresos vs. Egresos
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={serieChart}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="label" stroke="#94a3b8" fontSize={12} />
                    <YAxis stroke="#94a3b8" fontSize={12} />
                    <Tooltip
                      formatter={(v) => moneyAR(v)}
                      contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8 }}
                      labelStyle={{ color: '#334155' }}
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
            <div className="text-center text-slate-400 py-16">Cargando…</div>
          ) : rows.length === 0 ? (
            <div className="text-center text-slate-400 py-16">No hay movimientos para estos filtros.</div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
              <table className="w-full text-sm text-left text-slate-700">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Fecha</th>
                    <th className="px-4 py-3">Tipo</th>
                    <th className="px-4 py-3">Origen</th>
                    <th className="px-4 py-3">Medio</th>
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
                      <tr key={m.id} className={`border-t border-slate-100 ${m.anulado ? 'opacity-50' : ''}`}>
                        <td className="px-4 py-3 whitespace-nowrap">{fmtFechaHora(m.fecha)}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
                              esIngreso
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-rose-50 text-rose-700 border-rose-200'
                            }`}
                          >
                            {esIngreso ? <FaArrowUp /> : <FaArrowDown />}
                            {esIngreso ? 'Ingreso' : 'Egreso'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {m.origen_label}
                          {m.anulado && (
                            <span className="ml-1.5 text-[10px] uppercase text-rose-600 font-semibold">
                              Anulado
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">{medioPagoLabel(m.medio_pago)}</td>
                        <td className="px-4 py-3">{m.descripcion || '—'}</td>
                        <td
                          className={`px-4 py-3 text-right font-semibold ${
                            esIngreso ? 'text-emerald-600' : 'text-rose-600'
                          }`}
                        >
                          {esIngreso ? '+' : '-'}
                          {moneyAR(m.monto)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {esManual && !m.anulado && (
                            <div className="inline-flex items-center gap-1.5">
                              <button
                                onClick={() => openEditarMovimiento(m)}
                                className="inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition"
                              >
                                <FaEdit /> Editar
                              </button>
                              <button
                                onClick={() => onAnularMovimiento(m)}
                                className="inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 transition"
                              >
                                <FaBan /> Anular
                              </button>
                            </div>
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
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
              >
                Anterior
              </button>
              <span className="text-slate-500 text-sm">
                Página {meta.page} de {meta.totalPages}
              </span>
              <button
                disabled={page >= meta.totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
              >
                Siguiente
              </button>
            </div>
          )}
        </div>
      </div>

      <GastoFormModal
        open={gastoModalOpen}
        onClose={() => setGastoModalOpen(false)}
        onSubmit={onSubmitGasto}
        categorias={categorias}
      />
      <MovimientoManualFormModal
        open={movModalOpen}
        onClose={() => setMovModalOpen(false)}
        onSubmit={onSubmitMovimiento}
        tipo={movModalTipo}
        initialData={movModalEdit}
      />
      <CerrarCajaModal
        open={cajaACerrar != null}
        onClose={() => setCajaACerrar(null)}
        onSubmit={onCerrarCaja}
        caja={cajaACerrar}
      />
      <CajaDetalleModal
        open={detalleCajaId != null}
        onClose={() => setDetalleCajaId(null)}
        cajaId={detalleCajaId}
        esAdmin={esAdmin}
        onCerrar={abrirCierreDesdeDetalle}
      />
    </AppShell>
  );
}
