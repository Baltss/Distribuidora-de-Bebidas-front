// ===============================
// FILE: src/Pages/Ventas/VentasReportesPage.jsx
// ===============================
/*
 *
 * Fecha: 14 / 11 / 2025
 * Versión: 1.0
 *
 * Descripción:
 *  Panel de Reportes y Análisis de Ventas:
 *  - KPIs: total vendido, cantidad de ventas, ticket promedio
 *  - Filtros: texto, tipo, estado, vendedor, rango de fechas
 *  - Gráfico línea: total vendido por fecha
 *  - Gráfico barras: total por tipo de venta
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppShell from '../../Components/Layout/AppShell';
import { useAuth } from '../../AuthContext';
import { motion } from 'framer-motion';
import { FaArrowLeft } from 'react-icons/fa';
import useDebouncedValue from '../../hooks/useDebouncedValue';
import {
  FaSearch,
  FaFilter,
  FaChartLine,
  FaChartBar,
  FaUserTie
} from 'react-icons/fa';

import { listVentas } from '../../api/ventas';
import { listVendedores } from '../../api/vendedores';
import SearchableSelect from '../../Components/Common/SearchableSelect';
import { moneyAR } from '../../utils/money';

// Recharts
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
  Legend
} from 'recharts';

// Util formatear fecha
const fmtFechaCorta = (v) => {
  if (!v) return '—';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return String(v);
  return d.toLocaleDateString('es-AR', {
    month: '2-digit',
    day: '2-digit'
  });
};

// Util: clave yyyy-mm-dd
const toDateKey = (v) => {
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return 'N/A';
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

// Badges de tipo para colores de barra
const tipoColor = {
  contado: '#10b981', // emerald
  fiado: '#f59e0b', // amber
  a_cuenta: '#0ea5e9' // sky
};

const VentasReportesPage = () => {
  const navigate = useNavigate();
  const { userLevel } = useAuth();

  // --------- Filtros ---------
  const [q, setQ] = useState('');
  const [tipo, setTipo] = useState(''); // '' = todos
  const [estado, setEstado] = useState('confirmada'); // por defecto: confirmadas
  const [vendedorId, setVendedorId] = useState(null);
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');

  const [vendedores, setVendedores] = useState([]);

  // Datos
  const [ventas, setVentas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [meta, setMeta] = useState({
    total: 0,
    page: 1,
    limit: 200,
    totalPages: 1
  });

  const [error, setError] = useState('');

  // --------- Carga inicial de vendedores ---------
  useEffect(() => {
    (async () => {
      try {
        const res = await listVendedores({ estado: 'activo', limit: 200 });
        const arr = Array.isArray(res?.data)
          ? res.data
          : Array.isArray(res)
          ? res
          : [];
        setVendedores(arr);
      } catch (err) {
        console.error('Error cargando vendedores:', err);
      }
    })();
  }, []);

  // --------- Fetch de ventas ---------
  const fetchVentas = async () => {
    try {
      setLoading(true);
      setError('');

      const params = {
        q: q || undefined,
        tipo: tipo || undefined,
        estado: estado || undefined,
        vendedor_id: vendedorId || undefined,
        desde: fechaDesde || undefined,
        hasta: fechaHasta || undefined,
        limit: 500 // subimos un poco para tener data de análisis
      };

      console.log('Params reportes ventas:', params);

      const res = await listVentas(params);
      const rows = Array.isArray(res?.data)
        ? res.data
        : Array.isArray(res)
        ? res
        : [];
      const metaRes = res?.meta || {};

      setVentas(rows);
      setMeta({
        total: metaRes.total ?? rows.length,
        page: metaRes.page ?? 1,
        limit: metaRes.limit ?? 500,
        totalPages: metaRes.totalPages ?? 1
      });
    } catch (err) {
      console.error('Error listando ventas:', err);
      setError('No se pudieron cargar las ventas para los reportes.');
    } finally {
      setLoading(false);
    }
  };

  // Carga inicial
  useEffect(() => {
    fetchVentas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ======================================================
  //   - 16-07-2026
  // Filtros automáticos: ya no hace falta apretar "Aplicar filtros".
  // ======================================================
  const filtroCriteriaKey = useMemo(
    () => JSON.stringify({ q, tipo, estado, vendedorId, fechaDesde, fechaHasta }),
    [q, tipo, estado, vendedorId, fechaDesde, fechaHasta]
  );
  const debouncedFiltroCriteriaKey = useDebouncedValue(filtroCriteriaKey, 500);
  const isFirstFiltroRun = useRef(true);

  useEffect(() => {
    if (isFirstFiltroRun.current) {
      isFirstFiltroRun.current = false;
      return;
    }
    fetchVentas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedFiltroCriteriaKey]);

  // --------- KPIs y datasets para gráficos ---------
  const { kpis, seriesPorFecha, seriesPorTipo } = useMemo(() => {
    if (!ventas || ventas.length === 0) {
      return {
        kpis: {
          totalVendido: 0,
          cantidad: 0,
          ticketPromedio: 0
        },
        seriesPorFecha: [],
        seriesPorTipo: []
      };
    }

    // KPIs
    const totalVendido = ventas.reduce(
      (acc, v) => acc + Number(v.total_neto || 0),
      0
    );
    const cantidad = ventas.length;
    const ticketPromedio = cantidad > 0 ? totalVendido / cantidad : 0;

    // Agrupación por fecha (yyyy-mm-dd)
    const mapFecha = new Map();
    for (const v of ventas) {
      const key = toDateKey(v.fecha);
      const actual = mapFecha.get(key) || { key, total: 0 };
      actual.total += Number(v.total_neto || 0);
      mapFecha.set(key, actual);
    }
    const seriesFechaArr = Array.from(mapFecha.values()).sort((a, b) =>
      a.key.localeCompare(b.key)
    );
    const seriesPorFecha = seriesFechaArr.map((row) => ({
      key: row.key,
      label: fmtFechaCorta(row.key),
      total: Number(row.total.toFixed(2))
    }));

    // Agrupación por tipo
    const mapTipo = new Map();
    for (const v of ventas) {
      const t = v.tipo || 'sin_tipo';
      const actual = mapTipo.get(t) || { tipo: t, total: 0, cantidad: 0 };
      actual.total += Number(v.total_neto || 0);
      actual.cantidad += 1;
      mapTipo.set(t, actual);
    }
    const seriesPorTipo = Array.from(mapTipo.values()).map((row) => ({
      tipo: row.tipo,
      total: Number(row.total.toFixed(2)),
      cantidad: row.cantidad
    }));

    return {
      kpis: {
        totalVendido,
        cantidad,
        ticketPromedio
      },
      seriesPorFecha,
      seriesPorTipo
    };
  }, [ventas]);

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

        {/* Título + descripción */}
        <motion.h1
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900"
        >
          Reportes y Análisis de Ventas
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mt-1 text-sm text-slate-500 max-w-2xl"
        >
          Explorá la evolución de tus ventas, analizá por tipo y filtrá por
          vendedor y fechas para tomar mejores decisiones comerciales.
        </motion.p>

        <div className="mt-6 space-y-6">
            {/* KPIs */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.15 }}
              className="grid grid-cols-1 sm:grid-cols-3 gap-4"
            >
              <div className="rounded-2xl bg-white border border-slate-200 p-4 flex flex-col">
                <span className="text-xs uppercase tracking-wide text-gray-500 mb-1">
                  Total vendido
                </span>
                <span className="text-2xl font-semibold text-gray-900">
                  {moneyAR(kpis.totalVendido)}
                </span>
              </div>

              <div className="rounded-2xl bg-white border border-slate-200 p-4 flex flex-col">
                <span className="text-xs uppercase tracking-wide text-gray-500 mb-1">
                  Cantidad de ventas
                </span>
                <span className="text-2xl font-semibold text-gray-900">
                  {kpis.cantidad}
                </span>
              </div>

              <div className="rounded-2xl bg-white border border-slate-200 p-4 flex flex-col">
                <span className="text-xs uppercase tracking-wide text-gray-500 mb-1">
                  Ticket promedio
                </span>
                <span className="text-2xl font-semibold text-gray-900">
                  {moneyAR(kpis.ticketPromedio)}
                </span>
              </div>
            </motion.div>

            {/* Filtros */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.2 }}
              className="rounded-2xl bg-white border border-slate-200 p-4 sm:p-5 space-y-4"
            >
              <div className="flex items-center gap-2 text-gray-700 mb-1">
                <FaFilter className="text-xs" />
                <span className="text-sm font-semibold">
                  Filtros de análisis
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                {/* Búsqueda texto */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    Buscar (cliente / doc / email)
                  </label>
                  <div className="relative">
                    <input
                      value={q}
                      onChange={(e) => setQ(e.target.value)}
                      className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-800
                                 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-400/60 focus:border-transparent"
                      placeholder="Ej: Benjamín, 20-4384..."
                    />
                    <FaSearch className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 text-xs" />
                  </div>
                </div>

                {/* Tipo */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    Tipo
                  </label>
                  <select
                    value={tipo}
                    onChange={(e) => setTipo(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-800
                               focus:outline-none focus:ring-2 focus:ring-orange-400/60 focus:border-transparent"
                  >
                    <option value="">Todos</option>
                    <option value="contado">Contado</option>
                    <option value="fiado">Fiado</option>
                    <option value="a_cuenta">A cuenta</option>
                  </select>
                </div>

                {/* Estado */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    Estado
                  </label>
                  <select
                    value={estado}
                    onChange={(e) => setEstado(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-800
                               focus:outline-none focus:ring-2 focus:ring-orange-400/60 focus:border-transparent"
                  >
                    <option value="">Todos</option>
                    <option value="confirmada">Confirmada</option>
                    <option value="anulada">Anulada</option>
                  </select>
                </div>

                {/* Vendedor */}
                <div className="relative z-30">
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    Vendedor
                  </label>
                  <SearchableSelect
                    items={vendedores}
                    value={vendedorId}
                    onChange={(val) => {
                      console.log('Vendedor filtro reportes:', val);
                      setVendedorId(val || null);
                    }}
                    placeholder="Todos"
                    getOptionLabel={(v) => v?.nombre || ''}
                    getOptionValue={(v) => v?.id}
                    getOptionSearchText={(v) =>
                      [v?.nombre || '', v?.email || ''].join(' ')
                    }
                    portal
                    portalZIndex={3000}
                    dropdownMaxHeight="40vh"
                    menuPlacement="bottom"
                  />
                </div>
              </div>

              {/* Rango fechas + botón buscar */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    Desde
                  </label>
                  <input
                    type="date"
                    value={fechaDesde}
                    onChange={(e) => setFechaDesde(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-800
                               focus:outline-none focus:ring-2 focus:ring-orange-400/60 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    Hasta
                  </label>
                  <input
                    type="date"
                    value={fechaHasta}
                    onChange={(e) => setFechaHasta(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-800
                               focus:outline-none focus:ring-2 focus:ring-orange-400/60 focus:border-transparent"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={() => {
                      setQ('');
                      setTipo('');
                      setEstado('confirmada');
                      setVendedorId(null);
                      setFechaDesde('');
                      setFechaHasta('');
                      fetchVentas();
                    }}
                    className="w-full inline-flex justify-center items-center gap-2 rounded-xl border border-gray-200
                               text-gray-700 text-sm font-semibold px-4 py-2.5 hover:bg-gray-100 transition disabled:opacity-60"
                    disabled={loading}
                  >
                    {loading ? 'Actualizando…' : 'Limpiar filtros'}
                  </button>
                </div>
              </div>
            </motion.div>

            {/* Gráficos */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.25 }}
              className="grid grid-cols-1 lg:grid-cols-2 gap-6"
            >
              {/* Línea: ventas por fecha */}
              <div className="rounded-2xl bg-white border border-slate-200 p-4 sm:p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <FaChartLine className="text-orange-500" />
                  <h2 className="text-sm sm:text-base font-semibold text-gray-800">
                    Evolución de ventas por fecha
                  </h2>
                </div>
                <div className="h-64">
                  {seriesPorFecha.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-xs text-gray-500">
                      No hay datos suficientes para graficar. Ajustá los
                      filtros.
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={seriesPorFecha}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                        <YAxis
                          tick={{ fontSize: 11 }}
                          tickFormatter={(v) =>
                            moneyAR(v).replace('$', '').split(',')[0]
                          }
                        />
                        <Tooltip
                          formatter={(value) => moneyAR(value)}
                          labelFormatter={(label) => `Fecha: ${label}`}
                        />
                        <Line
                          type="monotone"
                          dataKey="total"
                          stroke="#fb923c"
                          strokeWidth={2}
                          dot={{ r: 3 }}
                          activeDot={{ r: 5 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              {/* Barras: ventas por tipo */}
              <div className="rounded-2xl bg-white border border-slate-200 p-4 sm:p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <FaChartBar className="text-sky-500" />
                  <h2 className="text-sm sm:text-base font-semibold text-gray-800">
                    Ventas por tipo (contado / fiado / a cuenta)
                  </h2>
                </div>
                <div className="h-64">
                  {seriesPorTipo.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-xs text-gray-500">
                      No hay datos suficientes para graficar. Ajustá los
                      filtros.
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={seriesPorTipo}
                        margin={{ top: 10, right: 10, left: 0, bottom: 20 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis
                          dataKey="tipo"
                          tick={{ fontSize: 11 }}
                          tickFormatter={(v) =>
                            v === 'a_cuenta' ? 'A cuenta' : v
                          }
                        />
                        <YAxis
                          tick={{ fontSize: 11 }}
                          tickFormatter={(v) =>
                            moneyAR(v).replace('$', '').split(',')[0]
                          }
                        />
                        <Tooltip
                          formatter={(value) => moneyAR(value)}
                          labelFormatter={(label) =>
                            label === 'a_cuenta'
                              ? 'Tipo: A cuenta'
                              : `Tipo: ${label}`
                          }
                        />
                        <Legend
                          formatter={(value) =>
                            value === 'total'
                              ? 'Total vendido'
                              : value === 'cantidad'
                              ? 'Cantidad de ventas'
                              : value
                          }
                        />
                        <Bar
                          dataKey="total"
                          name="Total vendido"
                          fill="#fb923c"
                          radius={[6, 6, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>
            </motion.div>

          {/* (futuro) Ranking por vendedor / cliente */}
        </div>
      </div>
    </AppShell>
  );
};

export default VentasReportesPage;
