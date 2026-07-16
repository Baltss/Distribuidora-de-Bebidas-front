/*
 *
 * Fecha Creación: 30 / 11 / 2025
 * Versión: 1.1 (buscador + paginación)
 *
 * Descripción:
 *  Pantalla de "Reporte moderno de Reparto & Cobranza por Zona".
 *  - Filtros: zona, fecha desde/hasta, solo clientes con deuda.
 *  - Grid de clientes con deuda, resumen de fiados y planeo de reparto.
 *  - Planeo: selección de productos sugeridos, cantidades y observaciones.
 *  - Buscador de clientes y paginación moderna.
 *
 * Tema: Ventas / Cobranzas
 * Capa: Frontend - Pages
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Filter,
  MapPin,
  CalendarRange,
  Users,
  DollarSign,
  Truck,
  FileDown,
  Loader2,
  AlertCircle,
  Search,
  ChevronLeft,
  ChevronRight,
  FileText
} from 'lucide-react';
import { FaInstagram, FaGlobeAmericas } from 'react-icons/fa';

import NavbarStaff from '../Dash/NavbarStaff';
import ButtonBack from '../../Components/ButtonBack';
import ParticlesBackground from '../../Components/ParticlesBackground';
import { useAuth } from '../../AuthContext';

import { API_BASE_URL as API_URL } from '../../api/apiBase';
import { blockWheelChange } from '../../utils/numberInput';

const moneyAR = (n) =>
  (Number(n) || 0).toLocaleString('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 2
  });

const fmtFecha = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export default function ReporteRepartoCobranza() {
  const { authToken } = useAuth();

  // Filtros
  const [zonaId, setZonaId] = useState('all'); // reservado
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  //  - 25-02-2026 palomita de “imprimir solo clientes con deuda” siempre activada por pedido de chocoloca
  const [soloConDeuda, setSoloConDeuda] = useState(true);

  // Data del backend
  const [reporte, setReporte] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  // Repartos (zonas de reparto reales desde la BD)
  const [repartos, setRepartos] = useState([]);
  const [repartosLoading, setRepartosLoading] = useState(false);
  const [repartosError, setRepartosError] = useState(null);
  const [repartoId, setRepartoId] = useState(''); // id del reparto seleccionado

  useEffect(() => {
    const fetchRepartos = async () => {
      try {
        setRepartosLoading(true);
        setRepartosError(null);

        const resp = await axios.get(`${API_URL}/repartos`, {
          params: {
            estado: 'activo',
            orderBy: 'nombre',
            orderDir: 'ASC'
          },
          headers: {
            Authorization: `Bearer ${authToken}`
          }
        });

        const rows = Array.isArray(resp.data?.data)
          ? resp.data.data
          : Array.isArray(resp.data)
            ? resp.data
            : [];

        setRepartos(rows);

        if (!repartoId && rows.length) {
          setRepartoId(String(rows[0].id));
        }
      } catch (err) {
        console.error('Error cargando repartos:', err);
        setRepartosError(
          err?.response?.data?.mensajeError ||
            'No se pudieron cargar los repartos.'
        );
        setRepartos([]);
      } finally {
        setRepartosLoading(false);
      }
    };

    fetchRepartos();
  }, [API_URL, authToken]); // eslint-disable-line react-hooks/exhaustive-deps

  const [planeo, setPlaneo] = useState({});

  // Buscador + paginación
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(4);

  const fetchReporte = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMsg(null);

      if (!repartoId) {
        setReporte(null);
        setPlaneo({});
        return;
      }

      const params = {
        reparto_id: repartoId
      };

      if (fechaDesde) params.fecha_desde = fechaDesde;
      if (fechaHasta) params.fecha_hasta = fechaHasta;

      //  - 18-01-2026
      // Si está tildado, el backend debería devolver solo clientes con deuda.
      if (soloConDeuda) params.solo_con_deuda = '1';

      const resp = await axios.get(`${API_URL}/reportes/reparto-cobranza`, {
        params,
        headers: {
          Authorization: `Bearer ${authToken}`
        }
      });

      setReporte(resp.data || null);
      setPlaneo({});
    } catch (err) {
      console.error('Error cargando reporte reparto & cobranza:', err);
      setErrorMsg(
        err?.response?.data?.mensajeError ||
          'No se pudo obtener el reporte. Intentá nuevamente.'
      );
    } finally {
      setLoading(false);
    }
  }, [repartoId, fechaDesde, fechaHasta, soloConDeuda]);

  //  - 18-01-2026
  // Antes estaba [], por eso NO refrescaba al cambiar filtros.
  // Ahora vuelve a pedir el reporte cuando cambian reparto/fechas/soloConDeuda.
  useEffect(() => {
    fetchReporte();
  }, [fetchReporte]);

  // Si cambia el reporte o el término de búsqueda, volvemos a la página 1
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, reporte]);

  // ------------------------
  // Handlers planeo reparto
  // ------------------------
  const toggleProducto = (clienteId, producto) => {
    setPlaneo((prev) => {
      const cli = prev[clienteId] || { productos: {}, observacion: '' };
      const actual = cli.productos[producto.producto_id] || {
        selected: false,
        cantidad: ''
      };
      const selected = !actual.selected;

      const productos = {
        ...cli.productos,
        [producto.producto_id]: {
          ...actual,
          selected,
          cantidad: selected ? actual.cantidad || 1 : ''
        }
      };

      return {
        ...prev,
        [clienteId]: { ...cli, productos }
      };
    });
  };

  const changeCantidad = (clienteId, productoId, value) => {
    const num = value === '' ? '' : Math.max(0, Number(value) || 0);
    setPlaneo((prev) => {
      const cli = prev[clienteId] || { productos: {}, observacion: '' };
      const actual = cli.productos[productoId] || {
        selected: true,
        cantidad: ''
      };

      const productos = {
        ...cli.productos,
        [productoId]: {
          ...actual,
          selected: true,
          cantidad: num
        }
      };

      return {
        ...prev,
        [clienteId]: { ...cli, productos }
      };
    });
  };

  const changeObservacion = (clienteId, value) => {
    setPlaneo((prev) => {
      const cli = prev[clienteId] || { productos: {}, observacion: '' };
      return {
        ...prev,
        [clienteId]: { ...cli, observacion: value }
      };
    });
  };

  // ------------------------
  // Resumen de selección
  // ------------------------
  const resumenSeleccionado = useMemo(() => {
    if (!reporte || !reporte.clientes) {
      return { clientesSeleccionados: 0, deudaSeleccionada: 0 };
    }

    let clientesSel = 0;
    let deudaSel = 0;

    for (const c of reporte.clientes) {
      const clienteId = c.cliente.id;
      const planCli = planeo[clienteId];
      if (!planCli) continue;

      const productosPlaneados = Object.values(planCli.productos || {});
      const tieneProductos = productosPlaneados.some(
        (p) => p.selected && Number(p.cantidad) > 0
      );

      if (!tieneProductos) continue;

      clientesSel += 1;
      deudaSel += Number(c.deuda_total) || 0;
    }

    return {
      clientesSeleccionados: clientesSel,
      deudaSeleccionada: deudaSel
    };
  }, [reporte, planeo]);

  //  - 25-02-2026 - Estado de selección de clientes para impresión
  const [selectedClientes, setSelectedClientes] = useState({});

  const toggleSelectCliente = (clienteId) => {
    setSelectedClientes((prev) => ({
      ...prev,
      [clienteId]: !prev?.[clienteId]
    }));
  };

  const clearSelection = () => setSelectedClientes({});

  const selectedClienteIds = useMemo(() => {
    return Object.keys(selectedClientes || {})
      .filter((k) => selectedClientes[k])
      .map((k) => Number(k))
      .filter((n) => Number.isFinite(n) && n > 0);
  }, [selectedClientes]);
  // ------------------------
  // Exportar / Imprimir (PDF)
  // ------------------------
  const handleExport = () => {
    if (!repartoId) return;

    const params = new URLSearchParams({
      reparto_id: repartoId,
      fecha_desde: fechaDesde || '',
      fecha_hasta: fechaHasta || '',
      solo_con_deuda: soloConDeuda ? '1' : ''
    });

    // ======================================================
    //  - 25-02-2026
    // Nuevo: si hay clientes seleccionados, imprimimos SOLO esos clientes.
    // cliente_ids se manda como CSV: "20,35,99"
    // ======================================================
    const selectedIds = Array.isArray(selectedClienteIds)
      ? selectedClienteIds
      : [];

    if (selectedIds.length > 0) {
      params.set('cliente_ids', selectedIds.join(','));
    }

    window.open(
      `${API_URL}/reportes/reparto-cobranza/pdf?${params.toString()}`,
      '_blank'
    );
  };
  // ------------------------------------
  // Reporte simple (PDF tipo Excel 2 cols)
  // ------------------------------------
  const handleExportSimple = () => {
    if (!repartoId) return;

    const params = new URLSearchParams({
      reparto_id: repartoId,
      fecha_desde: fechaDesde || '',
      fecha_hasta: fechaHasta || '',
      solo_con_deuda: soloConDeuda ? '1' : ''
    });

    window.open(
      `${API_URL}/reportes/reparto-cobranza-simple/pdf?${params.toString()}`,
      '_blank'
    );
  };
  // ------------------------
  // Clientes + buscador + paginación
  // ------------------------
  const EPS = 0.01;

  // Fuente base
  const clientesData = reporte?.clientes || [];
  const resumen = reporte?.resumen || {
    total_clientes: 0,
    total_clientes_con_deuda: 0,
    deuda_total_zona: 0
  };

  //  - 18-01-2026
  // Regla de negocio: si NO hay deuda (0) y NO hay ventas fiado pendientes, NO se muestra en el reporte visual.
  // Esto evita que aparezcan "saldados" aunque el backend los incluya por cualquier motivo.
  const clientesConDeudaUI = useMemo(() => {
    if (!clientesData.length) return [];

    // Si el toggle está APAGADO, mostramos todo (no escondemos "saldados")
    if (!soloConDeuda) return clientesData;

    // Si está PRENDIDO, filtramos por deuda o pendientes
    return clientesData.filter((item) => {
      const deudaTotal = Number(item?.deuda_total ?? 0);

      const ventasPend = Array.isArray(item?.ventas_pendientes)
        ? item.ventas_pendientes
        : [];

      const saldoPendSum = ventasPend.reduce(
        (acc, v) => acc + Number(v?.saldo_pendiente ?? 0),
        0
      );

      // (Opcional, por robustez) si el backend manda deuda_ventas_pendientes, la consideramos también
      const deudaPend = Math.max(
        saldoPendSum,
        Number(item?.deuda_ventas_pendientes ?? 0)
      );

      return deudaTotal > EPS || deudaPend > EPS;
    });
  }, [clientesData, soloConDeuda]);

  const filteredClientes = useMemo(() => {
    if (!clientesConDeudaUI.length) return [];
    const term = searchTerm.trim().toLowerCase();
    if (!term) return clientesConDeudaUI;

    return clientesConDeudaUI.filter(({ cliente }) => {
      const nombre = (cliente.nombre || '').toLowerCase();
      const doc = (cliente.documento || '').toLowerCase();
      return nombre.includes(term) || doc.includes(term);
    });
  }, [clientesConDeudaUI, searchTerm]);

  const totalFiltrados = filteredClientes.length;

  //  Selección masiva: seleccionar/quitar todos los clientes filtrados actuales.
  const allFilteredSelected =
    filteredClientes.length > 0 &&
    filteredClientes.every(({ cliente }) => selectedClientes[cliente.id]);

  const toggleSelectAllFiltered = () => {
    setSelectedClientes((prev) => {
      const next = { ...prev };
      if (allFilteredSelected) {
        for (const { cliente } of filteredClientes) delete next[cliente.id];
      } else {
        for (const { cliente } of filteredClientes) next[cliente.id] = true;
      }
      return next;
    });
  };

  const totalPages = Math.max(1, Math.ceil(totalFiltrados / pageSize));
  const paginaActual = Math.min(currentPage, totalPages);

  const startIndex = (paginaActual - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedClientes = filteredClientes.slice(startIndex, endIndex);

  const fromLabel = totalFiltrados ? startIndex + 1 : 0;
  const toLabel = totalFiltrados ? Math.min(endIndex, totalFiltrados) : 0;

  const pageNumbers = (() => {
    const pages = [];
    const maxButtons = 5;
    let start = Math.max(1, paginaActual - 2);
    let end = Math.min(totalPages, start + maxButtons - 1);

    if (end - start < maxButtons - 1) {
      start = Math.max(1, end - maxButtons + 1);
    }

    for (let p = start; p <= end; p += 1) {
      pages.push(p);
    }
    return pages;
  })();

  return (
    <>
      <NavbarStaff />
      <section className="relative w-full min-h-screen bg-slate-950 text-slate-50">
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-slate-900 to-amber-900/70" />
        <ParticlesBackground />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
          <div className="pt-20 sm:pt-24 flex items-start justify-between gap-4">
            <ButtonBack />
            <div className="flex-1 text-center">
              <motion.h1
                initial={{ opacity: 0, y: -16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="text-2xl titulo uppercase sm:text-3xl md:text-4xl font-bold tracking-tight text-amber-100 drop-shadow-md"
              >
                Reporte de Reparto & Cobranza por Zona
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1 }}
                className="mt-3 text-sm sm:text-base text-amber-50/80 max-w-2xl mx-auto"
              >
                Elegí una zona, visualizá la deuda de tus clientes fiados y armá
                el plan de reparto con los productos que vas a llevar a cada
                uno.
              </motion.p>
            </div>
            <div className="hidden sm:block w-16" />
          </div>

          {/* Filtros */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.15 }}
            className="mt-8 bg-white/5 backdrop-blur-xl border border-amber-400/30 rounded-3xl shadow-[0_0_35px_rgba(251,191,36,0.25)] p-4 sm:p-6"
          >
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-400/20 border border-amber-300/70">
                  <Filter className="h-5 w-5 text-amber-100" />
                </span>
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-amber-200/80">
                    Filtros
                  </p>
                  <p className="text-sm text-amber-50/90">
                    Zona, fechas y estado de deuda.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 justify-end">
                {loading && (
                  <span className="inline-flex items-center gap-2 px-3 py-2 text-xs sm:text-sm text-amber-100/80">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Actualizando…
                  </span>
                )}
                <button
                  type="button"
                  onClick={handleExport}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-amber-300/70 text-amber-100 text-xs sm:text-sm hover:bg-amber-400/10 transition"
                >
                  <FileDown className="h-4 w-4" />
                  Exportar / Imprimir
                </button>

                <button
                  type="button"
                  onClick={handleExportSimple}
                  disabled={!repartoId}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-400 text-slate-950 text-xs sm:text-sm font-semibold hover:bg-emerald-300 transition disabled:opacity-60 disabled:cursor-not-allowed"
                  title={
                    !repartoId
                      ? 'Seleccioná un reparto para exportar'
                      : 'Generar PDF simple'
                  }
                >
                  <FileText className="h-4 w-4" />
                  Reporte simple
                </button>
              </div>
            </div>

            {/* Inputs de filtros */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Reparto */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-200">
                  Reparto
                </label>
                <select
                  value={repartoId}
                  onChange={(e) => setRepartoId(e.target.value)}
                  className="h-9 rounded-xl bg-slate-900/70 border border-slate-700 px-3 text-xs text-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent"
                  disabled={repartosLoading}
                >
                  {repartosLoading && (
                    <option value="">Cargando repartos…</option>
                  )}
                  {!repartosLoading && !repartos.length && (
                    <option value="">Sin repartos activos</option>
                  )}
                  {!repartosLoading &&
                    repartos.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.nombre}{' '}
                        {r.rango_min != null && r.rango_max != null
                          ? `(${r.rango_min}–${r.rango_max})`
                          : ''}
                      </option>
                    ))}
                </select>
                {repartosError && (
                  <p className="text-[11px] text-red-300 mt-0.5">
                    {repartosError}
                  </p>
                )}
              </div>

              {/* Fecha desde */}
              <div>
                <label className="flex items-center gap-2 text-xs font-semibold text-amber-100 mb-1.5">
                  <CalendarRange className="h-4 w-4" />
                  Fecha desde
                </label>
                <input
                  type="date"
                  value={fechaDesde}
                  onChange={(e) => setFechaDesde(e.target.value)}
                  className="w-full rounded-xl border border-amber-300/60 bg-slate-950/70 text-sm px-3 py-2.5 text-amber-50 focus:outline-none focus:ring-2 focus:ring-amber-300/80"
                />
              </div>

              {/* Fecha hasta */}
              <div>
                <label className="flex items-center gap-2 text-xs font-semibold text-amber-100 mb-1.5">
                  <CalendarRange className="h-4 w-4" />
                  Fecha hasta
                </label>
                <input
                  type="date"
                  value={fechaHasta}
                  onChange={(e) => setFechaHasta(e.target.value)}
                  className="w-full rounded-xl border border-amber-300/60 bg-slate-950/70 text-sm px-3 py-2.5 text-amber-50 focus:outline-none focus:ring-2 focus:ring-amber-300/80"
                />
              </div>

              {/* Solo con deuda */}
              <div className="mt-2 md:mt-6">
                <label
                  htmlFor="solo-deuda"
                  className="group relative flex w-full items-start justify-between gap-4 rounded-2xl border border-amber-300/30 bg-slate-950/35 px-4 py-3 backdrop-blur-md transition hover:border-amber-300/55 hover:bg-slate-950/45 cursor-pointer"
                >
                  {/* Texto */}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-amber-50">
                        Solo clientes con deuda &gt; 0
                      </span>

                      {/* Badge estado */}
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide border transition ${
                          soloConDeuda
                            ? 'bg-emerald-400/15 text-emerald-200 border-emerald-300/30'
                            : 'bg-slate-400/10 text-slate-200/80 border-slate-300/20'
                        }`}
                      >
                        {soloConDeuda ? 'ACTIVO' : 'INACTIVO'}
                      </span>
                    </div>

                    <p className="mt-1 text-[11px] leading-snug text-amber-100/70">
                      Si lo desactivás, verás también clientes saldados (deuda
                      0).
                    </p>
                  </div>

                  {/* Toggle */}
                  <div className="flex items-center gap-3 shrink-0">
                    <input
                      id="solo-deuda"
                      type="checkbox"
                      checked={soloConDeuda}
                      onChange={(e) => setSoloConDeuda(e.target.checked)}
                      className="sr-only"
                    />

                    <div
                      className={`relative h-7 w-12 rounded-full border transition ${
                        soloConDeuda
                          ? 'bg-emerald-400/25 border-emerald-300/35'
                          : 'bg-slate-300/10 border-slate-300/25'
                      }`}
                      aria-hidden="true"
                    >
                      <span
                        className={`absolute top-1/2 -translate-y-1/2 h-5 w-5 rounded-full transition-all shadow ${
                          soloConDeuda
                            ? 'left-6 bg-emerald-200 shadow-emerald-500/20'
                            : 'left-1 bg-slate-200 shadow-black/20'
                        }`}
                      />
                    </div>
                  </div>

                  {/* Glow sutil */}
                  <div
                    className={`pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition group-hover:opacity-100 ${
                      soloConDeuda
                        ? 'ring-1 ring-emerald-300/25'
                        : 'ring-1 ring-amber-300/15'
                    }`}
                  />
                </label>
              </div>
            </div>
          </motion.div>

          {/* Errores */}
          <AnimatePresence>
            {errorMsg && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="mt-4 rounded-2xl border border-red-400/60 bg-red-900/40 px-4 py-3 flex items-start gap-2 text-sm text-red-50"
              >
                <AlertCircle className="h-5 w-5 mt-0.5" />
                <div>
                  <p className="font-semibold">Ups, algo salió mal</p>
                  <p className="text-xs">{errorMsg}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* KPIs de resumen */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.25 }}
            className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3"
          >
            <div className="rounded-2xl bg-white/5 border border-white/10 px-4 py-3 flex items-center gap-3">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-slate-900 border border-white/20">
                <Users className="h-4 w-4 text-amber-200" />
              </span>
              <div>
                <p className="text-[11px] uppercase tracking-[0.18em] text-amber-200/80">
                  Clientes en zona
                </p>
                <p className="text-lg font-semibold">
                  {resumen.total_clientes || 0}
                </p>
              </div>
            </div>

            <div className="rounded-2xl bg-white/5 border border-white/10 px-4 py-3 flex items-center gap-3">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-slate-900 border border-white/20">
                <DollarSign className="h-4 w-4 text-emerald-300" />
              </span>
              <div>
                <p className="text-[11px] uppercase tracking-[0.18em] text-emerald-200/80">
                  Clientes con deuda
                </p>
                <p className="text-lg font-semibold">
                  {resumen.total_clientes_con_deuda || 0}
                </p>
              </div>
            </div>

            <div className="rounded-2xl bg-white/5 border border-white/10 px-4 py-3 flex items-center gap-3">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-slate-900 border border-white/20">
                <Truck className="h-4 w-4 text-amber-200" />
              </span>
              <div className="flex-1 flex justify-between items-center gap-3">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.18em] text-amber-200/80">
                    Deuda total zona
                  </p>
                  <p className="text-lg font-semibold">
                    {moneyAR(resumen.deuda_total_zona || 0)}
                  </p>
                </div>
                <div className="text-right text-[11px] text-emerald-100/80">
                  <p>
                    Seleccionados:{' '}
                    <span className="font-semibold">
                      {resumenSeleccionado.clientesSeleccionados}
                    </span>
                  </p>
                  <p>
                    Deuda seleccionada:{' '}
                    <span className="font-semibold">
                      {moneyAR(resumenSeleccionado.deudaSeleccionada)}
                    </span>
                  </p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Listado de clientes */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.3 }}
            className="mt-8"
          >
            {/*  - 18-01-2026
                Usamos la lista "clientesConDeudaUI" para evitar mostrar saldados (deuda 0 y sin pendientes) */}
            {loading && !clientesConDeudaUI.length && (
              <div className="py-10 text-center text-sm text-amber-50/80 flex flex-col items-center gap-3">
                <Loader2 className="h-6 w-6 animate-spin" />
                Cargando clientes y deudas de la zona...
              </div>
            )}

            {!loading && !clientesConDeudaUI.length && (
              <div className="py-10 text-center text-sm text-amber-50/80">
                No se encontraron clientes para el filtro seleccionado.
              </div>
            )}

            {!!clientesConDeudaUI.length && (
              <>
                {/* Buscador + controles de página */}
                <div className="mb-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div className="w-full md:max-w-sm">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-amber-100/70" />
                      <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Buscar por nombre o DNI/CUIT..."
                        className="w-full pl-9 pr-3 py-2 rounded-2xl bg-slate-950/80 border border-white/15 text-sm text-amber-50 placeholder:text-amber-100/40 focus:outline-none focus:ring-2 focus:ring-amber-300/80"
                      />
                    </div>
                    <p className="mt-1 text-[11px] text-amber-100/70">
                      {totalFiltrados === clientesConDeudaUI.length &&
                      !searchTerm
                        ? `Mostrando ${clientesConDeudaUI.length} cliente(s) del reparto.`
                        : `Coincidencias: ${totalFiltrados} cliente(s) para "${searchTerm}".`}
                    </p>
                  </div>

                  <div className="flex items-center justify-between md:justify-end gap-3 text-[11px] text-amber-100/80">
                    <div className="hidden sm:block">
                      {totalFiltrados ? (
                        <span>
                          Mostrando{' '}
                          <span className="font-semibold">
                            {fromLabel}–{toLabel}
                          </span>{' '}
                          de{' '}
                          <span className="font-semibold">
                            {totalFiltrados}
                          </span>{' '}
                          clientes
                        </span>
                      ) : (
                        <span>Sin coincidencias para el filtro actual.</span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={toggleSelectAllFiltered}
                      disabled={!totalFiltrados}
                      className="h-8 rounded-xl border border-amber-300/40 bg-amber-400/10 px-3 text-[11px] font-semibold text-amber-100 hover:bg-amber-400/20 disabled:opacity-40 disabled:cursor-not-allowed transition"
                    >
                      {allFilteredSelected ? 'Quitar selección' : 'Seleccionar todos'}
                    </button>

                    <div className="flex items-center gap-2">
                      <span className="hidden sm:inline">Por página</span>
                      <select
                        value={pageSize}
                        onChange={(e) => {
                          setPageSize(Number(e.target.value) || 5);
                          setCurrentPage(1);
                        }}
                        className="h-8 rounded-xl bg-slate-950/80 border border-white/20 px-2 text-[11px] text-amber-50 focus:outline-none focus:ring-1 focus:ring-amber-300/80"
                      >
                        <option value={5}>5</option>
                        <option value={10}>10</option>
                        <option value={15}>15</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Tarjetas de clientes (paginadas) */}
                {totalFiltrados === 0 && (
                  <div className="py-10 text-center text-sm text-amber-50/80">
                    Ningún cliente coincide con la búsqueda actual.
                  </div>
                )}

                {totalFiltrados > 0 && (
                  <>
                    <div className="grid grid-cols-1 gap-4">
                      {paginatedClientes.map((item) => {
                        const {
                          cliente,
                          deuda_total,
                          resumen_fiado,
                          ventas_pendientes,
                          productos_sugeridos
                        } = item;

                        const resumenFiado = resumen_fiado || {
                          ventas_abiertas: 0,
                          fecha_venta_mas_vieja: null,
                          dias_max_atraso: 0
                        };
                        const planCli = planeo[cliente.id] || {
                          productos: {},
                          observacion: ''
                        };

                        return (
                          <motion.div
                            key={cliente.id}
                            layout
                            className="rounded-3xl bg-white/7 border border-white/10 backdrop-blur-xl shadow-[0_0_30px_rgba(15,23,42,0.6)] p-4 sm:p-5 flex flex-col gap-4"
                          >
                            {/* Header cliente + deuda */}
                            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                              <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-2xl bg-amber-400/20 border border-amber-300/70 flex items-center justify-center text-sm font-semibold text-amber-50">
                                  {(cliente.nombre || '?')
                                    .trim()
                                    .charAt(0)
                                    .toUpperCase()}
                                </div>
                                <div>
                                  <p className="text-sm font-semibold text-amber-50">
                                    {cliente.nombre}
                                  </p>
                                  <p className="text-[11px] text-amber-100/80">
                                    {cliente.documento
                                      ? `DNI/CUIT: ${cliente.documento}`
                                      : 'Sin documento registrado'}
                                  </p>
                                  {cliente.telefono && (
                                    <p className="text-[11px] text-amber-100/70">
                                      Tel: {cliente.telefono}
                                    </p>
                                  )}
                                  {cliente.email && (
                                    <p className="text-[11px] text-amber-100/70">
                                      Email: {cliente.email}
                                    </p>
                                  )}
                                  {cliente.direccion_calle && (
                                    <p className="text-[11px] text-amber-100/70">
                                      Calle: {cliente.direccion_calle} - Nro:{' '}
                                      {cliente.direccion_numero} - Piso/Dpto:{' '}
                                      {cliente.direccion_piso_dpto} -
                                      Referencia: {cliente.referencia}
                                    </p>
                                  )}
                                </div>
                              </div>

                              <div className="flex flex-col items-end gap-1">
                                <div className="inline-flex items-center gap-2 rounded-2xl bg-emerald-500/10 border border-emerald-400/70 px-3 py-1.5">
                                  <DollarSign className="h-4 w-4 text-emerald-300" />
                                  <div className="text-right">
                                    {/*  - 25-02-2026 - Checkbox
                                    para seleccionar cliente a imprimir */}
                                    <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                                      <input
                                        type="checkbox"
                                        checked={!!selectedClientes[cliente.id]}
                                        onChange={() =>
                                          toggleSelectCliente(cliente.id)
                                        }
                                        className="h-4 w-4 rounded border-amber-300 bg-slate-950 text-amber-400 focus:ring-amber-300"
                                      />
                                      <span className="text-[11px] text-amber-100/80">
                                        Imprimir
                                      </span>
                                    </label>
                                    <p className="text-[11px] uppercase tracking-[0.18em] text-emerald-200/80">
                                      Deuda total
                                    </p>
                                    <p className="text-sm font-semibold text-emerald-100">
                                      {moneyAR(deuda_total)}
                                    </p>
                                  </div>
                                </div>
                                <p className="text-[11px] text-amber-100/80">
                                  {resumenFiado.ventas_abiertas} venta(s) fiado
                                  pendiente ·{' '}
                                  {resumenFiado.dias_max_atraso || 0} día(s) de
                                  atraso máx.
                                </p>
                                {resumenFiado.fecha_venta_mas_vieja && (
                                  <p className="text-[11px] text-amber-100/70">
                                    Venta más vieja:{' '}
                                    {fmtFecha(
                                      resumenFiado.fecha_venta_mas_vieja
                                    )}
                                  </p>
                                )}
                              </div>
                            </div>

                            {/* Línea separadora */}
                            <div className="h-px bg-gradient-to-r from-transparent via-amber-300/40 to-transparent" />

                            {/* Grid: ventas y planeo */}
                            <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1.5fr)] gap-4">
                              {/* Ventas pendientes */}
                              <div className="rounded-2xl bg-slate-950/70 border border-white/10 px-3 py-3 text-xs max-h-64 overflow-y-auto">
                                <p className="text-[11px] uppercase tracking-[0.18em] text-amber-200/80 mb-2 flex items-center gap-1.5">
                                  Ventas fiado pendientes
                                </p>
                                {!ventas_pendientes.length ? (
                                  <p className="text-[11px] text-amber-100/80">
                                    Este cliente no tiene ventas fiado
                                    pendientes en el rango filtrado.
                                  </p>
                                ) : (
                                  <div className="space-y-2">
                                    {ventas_pendientes.map((v) => {
                                      let diasAtraso = null;
                                      if (v.fecha) {
                                        const fv = new Date(v.fecha);
                                        if (!Number.isNaN(fv.getTime())) {
                                          const diffMs =
                                            Date.now() - fv.getTime();
                                          diasAtraso = Math.max(
                                            0,
                                            Math.floor(
                                              diffMs / (1000 * 60 * 60 * 24)
                                            )
                                          );
                                        }
                                      }

                                      return (
                                        <div
                                          key={v.id}
                                          className="border border-white/10 rounded-xl px-2 py-1.5 flex justify-between gap-2"
                                        >
                                          <div className="text-[11px] text-amber-100/90">
                                            <p className="font-semibold">
                                              Venta #{v.id}
                                            </p>
                                            <p>{fmtFecha(v.fecha)}</p>
                                            <p className="text-amber-100/70">
                                              Atraso:{' '}
                                              <span className="font-semibold">
                                                {diasAtraso !== null
                                                  ? `${diasAtraso} días`
                                                  : '—'}
                                              </span>
                                            </p>
                                          </div>
                                          <div className="text-right text-[11px] text-amber-100/90">
                                            <p>
                                              Total:{' '}
                                              <span className="font-semibold">
                                                {moneyAR(v.total_neto)}
                                              </span>
                                            </p>
                                            <p>
                                              Saldo:{' '}
                                              <span className="font-semibold text-emerald-300">
                                                {moneyAR(
                                                  v.saldo_pendiente
                                                )}{' '}
                                              </span>
                                            </p>
                                            <p className="capitalize text-amber-100/70">
                                              Estado: {v.estado}
                                            </p>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>

                              {/* Planeo de reparto */}
                              <div className="rounded-2xl bg-slate-950/70 border border-white/10 px-3 py-3 text-xs flex flex-col gap-3">
                                <div className="flex items-center justify-between gap-2">
                                  <p className="text-[11px] uppercase tracking-[0.18em] text-amber-200/80 flex items-center gap-1.5">
                                    <Truck className="h-3 w-3" />
                                    Planeo de reparto
                                  </p>
                                  <p className="text-[11px] text-amber-100/70">
                                    Marcá productos y cantidades a entregar.
                                  </p>
                                </div>

                                {/* Productos sugeridos */}
                                <div className="space-y-1">
                                  <p className="text-[11px] text-amber-100/80 mb-1">
                                    Productos sugeridos (historial de fiado):
                                  </p>
                                  {!productos_sugeridos.length ? (
                                    <p className="text-[11px] text-amber-100/60">
                                      No hay productos sugeridos para este
                                      cliente en el rango filtrado.
                                    </p>
                                  ) : (
                                    <div className="flex gap-2 overflow-x-auto pb-1">
                                      {productos_sugeridos.map((p) => {
                                        const prodPlan =
                                          planCli.productos[p.producto_id] ||
                                          {};
                                        const isSelected = !!prodPlan.selected;
                                        const cantidad =
                                          prodPlan.cantidad ?? '';

                                        return (
                                          <label
                                            key={p.producto_id}
                                            className={`min-w-[180px] rounded-2xl border px-3 py-2 flex flex-col gap-1 cursor-pointer transition
                                      ${
                                        isSelected
                                          ? 'border-emerald-400 bg-emerald-500/10 shadow-[0_0_0_1px_rgba(52,211,153,0.6)]'
                                          : 'border-white/15 bg-slate-900/70 hover:border-amber-300/70'
                                      }`}
                                          >
                                            <div className="flex items-center justify-between gap-2">
                                              <div className="flex items-center gap-2">
                                                <input
                                                  type="checkbox"
                                                  checked={isSelected}
                                                  onChange={() =>
                                                    toggleProducto(
                                                      cliente.id,
                                                      p
                                                    )
                                                  }
                                                  className="h-3.5 w-3.5 rounded border-amber-300 bg-slate-950 text-amber-400 focus:ring-amber-300"
                                                />
                                                <div className="text-[11px]">
                                                  <p className="font-semibold">
                                                    {p.nombre}
                                                  </p>
                                                  {p.codigo_sku && (
                                                    <p className="text-amber-100/60">
                                                      SKU: {p.codigo_sku}
                                                    </p>
                                                  )}
                                                </div>
                                              </div>
                                              <p className="text-[11px] text-emerald-200">
                                                {moneyAR(p.precio_ultimo)}
                                              </p>
                                            </div>
                                            <div className="flex items-center gap-2 mt-1">
                                              <span className="text-[11px] text-amber-100/70">
                                                Cant:
                                              </span>
                                              <input
                                                type="number"
                                                onWheel={blockWheelChange}
                                                min="0"
                                                step="1"
                                                value={cantidad}
                                                onChange={(e) =>
                                                  changeCantidad(
                                                    cliente.id,
                                                    p.producto_id,
                                                    e.target.value
                                                  )
                                                }
                                                className="w-16 rounded-lg border border-white/20 bg-slate-950/80 text-[11px] px-1.5 py-1 text-amber-50 focus:outline-none focus:ring-1 focus:ring-emerald-300"
                                              />
                                            </div>
                                          </label>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>

                                {/* Observación */}
                                <div>
                                  <p className="text-[11px] text-amber-100/80 mb-1">
                                    Observación para el reparto (opcional):
                                  </p>
                                  <textarea
                                    value={planCli.observacion || ''}
                                    onChange={(e) =>
                                      changeObservacion(
                                        cliente.id,
                                        e.target.value
                                      )
                                    }
                                    rows={2}
                                    maxLength={140}
                                    className="w-full rounded-2xl border border-white/15 bg-slate-950/80 text-[11px] px-2.5 py-2 text-amber-50 placeholder:text-amber-100/40 focus:outline-none focus:ring-1 focus:ring-amber-300 resize-none"
                                    placeholder="Ej: dejar en vecino, tocar timbre negro, horario preferido…"
                                  />
                                  <p className="text-[10px] text-amber-100/60 text-right mt-0.5">
                                    {(planCli.observacion || '').length}/140
                                  </p>
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>

                    {/* Paginación */}
                    {totalPages > 1 && (
                      <div className="mt-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-amber-100/80">
                        <div className="sm:hidden">
                          Mostrando{' '}
                          <span className="font-semibold">
                            {fromLabel}–{toLabel}
                          </span>{' '}
                          de{' '}
                          <span className="font-semibold">
                            {totalFiltrados}
                          </span>{' '}
                          clientes
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() =>
                              setCurrentPage((prev) => Math.max(1, prev - 1))
                            }
                            disabled={paginaActual === 1}
                            className="inline-flex items-center justify-center h-8 w-8 rounded-xl border border-white/15 bg-slate-950/80 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <ChevronLeft className="h-4 w-4" />
                          </button>
                          {pageNumbers.map((p) => (
                            <button
                              key={p}
                              type="button"
                              onClick={() => setCurrentPage(p)}
                              className={`h-8 min-w-[2rem] px-2 rounded-xl text-xs font-semibold border transition
                                ${
                                  p === paginaActual
                                    ? 'bg-amber-400 text-slate-950 border-amber-400'
                                    : 'bg-slate-950/80 text-amber-50 border-white/15 hover:bg-white/10'
                                }`}
                            >
                              {p}
                            </button>
                          ))}
                          <button
                            type="button"
                            onClick={() =>
                              setCurrentPage((prev) =>
                                Math.min(totalPages, prev + 1)
                              )
                            }
                            disabled={paginaActual === totalPages}
                            className="inline-flex items-center justify-center h-8 w-8 rounded-xl border border-white/15 bg-slate-950/80 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <ChevronRight className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </>
            )}
          </motion.div>

          {/* Footer mini */}
          <div className="mt-10 pt-4 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-[11px] text-amber-100/80 text-center sm:text-left">
              Módulo Reparto &amp; CxC ·{' '}
              <span className="font-semibold text-amber-200">SodaSale</span> ·
              Desarrollado por{' '}
              <span className="font-semibold text-amber-200">SoftFusion</span>
            </p>
            <div className="flex items-center gap-2">
              <a
                href="https://www.instagram.com/softfusiontechnologies/"
                target="_blank"
                rel="noreferrer"
                className="h-8 w-8 flex items-center justify-center rounded-full bg-white/10 border border-white/20 hover:bg-white/20 transition"
                title="Instagram SoftFusion"
              >
                <FaInstagram className="text-sm text-amber-50" />
              </a>
              <a
                href="https://softfusion.com.ar/"
                target="_blank"
                rel="noreferrer"
                className="h-8 w-8 flex items-center justify-center rounded-full bg-white/10 border border-white/20 hover:bg-white/20 transition"
                title="Sitio web SoftFusion"
              >
                <FaGlobeAmericas className="text-sm text-amber-50" />
              </a>
            </div>
          </div>
        </div>
        {/* ======================================================
     - 25-02-2026
    CTA flotante: Exportar/Imprimir para clientes seleccionados.
    Se muestra fijo abajo solo si hay seleccionados, para evitar volver al header.
   ====================================================== */}
        {selectedClienteIds.length > 0 && (
          <div className="fixed inset-x-0 bottom-0 z-50 pb-[env(safe-area-inset-bottom)]">
            <div className="mx-auto max-w-6xl px-3 sm:px-4">
              <div className="mb-3 rounded-2xl border border-amber-300/30 bg-slate-950/85 backdrop-blur-xl shadow-[0_10px_40px_rgba(0,0,0,0.35)]">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-3 py-2.5">
                  <div className="flex items-center justify-between sm:justify-start gap-2">
                    <div className="text-[11px] sm:text-xs text-amber-100/80">
                      Seleccionados:{' '}
                      <span className="font-semibold text-amber-100">
                        {selectedClienteIds.length}
                      </span>
                    </div>

                    {/* Opcional: limpiar selección rápido */}
                    <button
                      type="button"
                      onClick={clearSelection}
                      className="text-[11px] sm:text-xs px-2.5 py-1 rounded-full border border-white/15 bg-white/5 text-amber-100/80 hover:bg-white/10 transition"
                      title="Limpiar selección"
                    >
                      Limpiar
                    </button>
                  </div>

                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={handleExport}
                      className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-amber-300/70 text-amber-100 text-xs sm:text-sm hover:bg-amber-400/10 transition"
                    >
                      <FileDown className="h-4 w-4" />
                      Exportar seleccionados
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </section>
    </>
  );
}
