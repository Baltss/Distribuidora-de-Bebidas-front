// ===============================
// FILE: src/Pages/Ventas/VentasHistorialPage.jsx
// ===============================
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';

import AppShell from '../../Components/Layout/AppShell';
import useDebouncedValue from '../../hooks/useDebouncedValue';

import {
  listVentas,
  getVenta,
  anularVenta,
  updateVenta,
  createVentasRepartoMasiva
} from '../../api/ventas';
import EditarVentaModal from '../../Components/Ventas/EditarVentaModal';
import { moneyAR } from '../../utils/money';
import { useLocation } from 'react-router-dom';
import Swal from 'sweetalert2';
import { useAuth } from '../../AuthContext';
import VentaRepartoFormModal from '../../Components/Ventas/VentaRepartoFormModal';
import ExportarVentasModal from '../../Components/Ventas/ExportarVentasModal';
import { facturarVentas, reintentarFactura } from '../../api/facturacion';
import ComprobanteDetalleModal from '../../Components/Facturacion/ComprobanteDetalleModal';
import useImprimirComprobante from '../../hooks/useImprimirComprobante';
import DateRangeFilter, { getRangoPreset, DEFAULT_PRESET } from '../../Components/Common/DateRangeFilter';

// ======================================================
//  - 17-01-2026
// Repartos: para filtro reparto_id en historial
// ======================================================
import http from '../../api/http';

import {
  FaSearch,
  FaPlus,
  FaTimes,
  FaFileInvoiceDollar,
  FaUser,
  FaUserTie,
  FaMoneyBillWave,
  FaExclamationTriangle,
  FaUsers,
  FaChartLine,
  FaFileExport,
  FaCashRegister
} from 'react-icons/fa';

const badgeTipoClasses = {
  contado: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  fiado: 'bg-amber-100 text-amber-800 border-amber-200',
  a_cuenta: 'bg-sky-100 text-sky-800 border-sky-200'
};

const badgeEstadoClasses = {
  confirmada: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  anulada: 'bg-rose-100 text-rose-800 border-rose-200'
};

// Estado de facturación de una venta (ver estado_facturacion en GET /ventas).
const FACTURACION_BADGE = {
  facturada: { label: 'Facturada', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  facturando: { label: 'Facturando…', cls: 'bg-sky-50 text-sky-700 border-sky-200' },
  error: { label: 'Error al facturar', cls: 'bg-rose-50 text-rose-700 border-rose-200' },
  anulada_por_nc: { label: 'Anulada con NC', cls: 'bg-slate-100 text-slate-600 border-slate-200' },
  sin_facturar: { label: 'Sin facturar', cls: 'bg-amber-50 text-amber-700 border-amber-200' }
};

const estadoFacturacion = (v) => {
  if (v.estado_facturacion) return v.estado_facturacion;
  if (v.facturas_autorizadas_count > 0) return 'facturada';
  return v.estado === 'confirmada' ? 'sin_facturar' : null;
};

const fmtFecha = (v) => {
  if (!v) return '—';
  const d = new Date(v);
  if (isNaN(d.getTime())) return String(v);
  return d.toLocaleString('es-AR', {
    dateStyle: 'short'
    // timeStyle: 'short' se quita hora
  });
};

const VentasHistorialPage = () => {
  const { userLevel } = useAuth();
  const esVendedor = String(userLevel || '').toLowerCase() === 'vendedor';
  // ------------ estado base ------------
  const [ventas, setVentas] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const location = useLocation();

  // ------------ acciones sobre el listado (antes en AdminPageVentas) ------------
  const [ventasRepartoModalOpen, setVentasRepartoModalOpen] = useState(false);
  const [exportarModalOpen, setExportarModalOpen] = useState(false);
  const [creatingMasiva, setCreatingMasiva] = useState(false);

  const handleVentasRepartoMasiva = async (payload) => {
    try {
      setCreatingMasiva(true);
      const resp = await createVentasRepartoMasiva(payload);
      const cant =
        resp?.meta?.ventasCreadas ??
        (Array.isArray(resp?.ventas) ? resp.ventas.length : 0);
      const total = resp?.meta?.totalGeneral;

      Swal.fire({
        icon: 'success',
        title: 'Ventas generadas',
        html:
          cant && total != null
            ? `Se generaron <b>${cant}</b> venta(s) por reparto.<br/>Total general: <b>${moneyAR(
                total
              )}</b>.`
            : 'Las ventas por reparto se registraron correctamente.',
        timer: 2800,
        showConfirmButton: false
      });

      setVentasRepartoModalOpen(false);
      await fetchVentas();
    } catch (err) {
      console.error('Error generando ventas por reparto:', err);
      const msg =
        err?.response?.data?.mensajeError ||
        err?.message ||
        'No se pudieron generar las ventas por reparto.';
      Swal.fire({ icon: 'error', title: 'Error', text: msg });
      throw err;
    } finally {
      setCreatingMasiva(false);
    }
  };

  // filtros
  const [filtros, setFiltros] = useState({
    q: '',
    tipo: '',
    estado: '',
    ...getRangoPreset(DEFAULT_PRESET),
    page: 1,
    limit: 20
  });

  // detalle
  const [detalleOpen, setDetalleOpen] = useState(false);
  const [detalle, setDetalle] = useState(null);
  const [detalleLoading, setDetalleLoading] = useState(false);

  // edición de cabecera (cliente/vendedor/fecha/tipo/medio de pago/observaciones)
  const [editVenta, setEditVenta] = useState(null);

  // ======================================================
  //  - 17-01-2026
  // Repartos: sólo para mostrar el nombre de reparto en cada fila de la
  // tabla (repartoById más abajo) — el filtro por reparto se sacó.
  // ======================================================
  const [repartos, setRepartos] = useState([]);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const r = await http.get('/repartos', {
          params: {
            limit: 9999,
            offset: 0,
            orderBy: 'created_at',
            orderDir: 'DESC'
          }
        });

        const data = r?.data?.data || [];
        const list = Array.isArray(data) ? data : [];

        // Podés filtrar activos si querés (recomendado)
        const activos = list.filter(
          (x) => String(x?.estado || '').toLowerCase() === 'activo'
        );

        if (alive) setRepartos(activos);
      } catch (e) {
        console.error('Error cargando repartos:', e);
        if (alive) setRepartos([]);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  // ------------ carga de datos ------------
  // silent: refresco en segundo plano (sin spinner), para ver cuándo
  // termina de emitirse una factura.
  const fetchVentas = async ({ silent = false, ...overrides } = {}) => {
    if (!silent) {
      setLoading(true);
      setError('');
    }
    try {
      const params = {
        ...filtros,
        ...overrides
      };

      // limpiamos page si viene override
      if (overrides.page) params.page = overrides.page;

      const resp = await listVentas(params); // { data, meta }
      setVentas(resp.data || []);
      setMeta(resp.meta || null);
      setFiltros((prev) => ({
        ...prev,
        page: params.page || prev.page
      }));
    } catch (e) {
      console.error('Error cargando ventas:', e);
      if (!silent) setError('No se pudo cargar el historial de ventas.');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchVentas({ page: 1 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Mientras alguna venta de la lista se esté facturando, se refresca sola.
  const fetchVentasRef = useRef(fetchVentas);
  fetchVentasRef.current = fetchVentas;
  const hayFacturando = ventas.some((v) => v.estado_facturacion === 'facturando');
  useEffect(() => {
    if (!hayFacturando) return undefined;
    const interval = setInterval(() => fetchVentasRef.current({ silent: true }), 5000);
    return () => clearInterval(interval);
  }, [hayFacturando]);

  // ======================================================
  //   - 16-07-2026
  // Filtros automáticos: ya no hace falta apretar "Buscar". Se aplican
  // solos 0.5s después de que el usuario deja de tocar los campos.
  // ======================================================
  const filtroCriteriaKey = useMemo(
    () =>
      JSON.stringify({
        q: filtros.q,
        tipo: filtros.tipo,
        estado: filtros.estado,
        desde: filtros.desde,
        hasta: filtros.hasta
      }),
    [filtros.q, filtros.tipo, filtros.estado, filtros.desde, filtros.hasta]
  );
  const debouncedFiltroCriteriaKey = useDebouncedValue(filtroCriteriaKey, 500);
  const isFirstFiltroRun = useRef(true);

  useEffect(() => {
    if (isFirstFiltroRun.current) {
      isFirstFiltroRun.current = false;
      return;
    }
    fetchVentas({ page: 1 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedFiltroCriteriaKey]);

  // ------------ KPIs ------------
  const kpis = useMemo(() => {
    const total = ventas.reduce((acc, v) => acc + Number(v.total_neto || 0), 0);
    const count = ventas.length;
    const fiadas = ventas.filter((v) => v.tipo === 'fiado').length;
    const contado = ventas.filter((v) => v.tipo === 'contado').length;
    return { total, count, fiadas, contado };
  }, [ventas]);

  // ------------ handlers filtros ------------
  const handleFiltroChange = (e) => {
    const { name, value } = e.target;
    setFiltros((f) => ({
      ...f,
      [name]: value
    }));
  };

  const handleLimpiar = () => {
    const reset = {
      q: '',
      tipo: '',
      estado: '',
      ...getRangoPreset(DEFAULT_PRESET),
      page: 1,
      limit: filtros.limit
    };
    setFiltros(reset);
    fetchVentas(reset);
  };

  const handleFechaChange = ({ desde, hasta }) => {
    setFiltros((f) => ({ ...f, desde, hasta }));
  };

  const handlePageChange = (dir) => {
    if (!meta) return;
    const next = filtros.page + dir;
    if (next < 1 || next > meta.totalPages) return;
    fetchVentas({ page: next });
  };

  // ------------ detalle ------------
  const abrirDetalle = async (venta) => {
    setDetalleOpen(true);
    setDetalleLoading(true);
    try {
      const full = await getVenta(venta.id); // incluye cliente, vendedor e items
      setDetalle(full);
    } catch (e) {
      console.error('Error obteniendo detalle de venta:', e);
    } finally {
      setDetalleLoading(false);
    }
  };

  const ventaIdDesdeState = location.state?.ventaIdDetalle;

  useEffect(() => {
    if (ventaIdDesdeState) {
      abrirDetallePorId(ventaIdDesdeState);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ventaIdDesdeState]);

  const cerrarDetalle = () => {
    setDetalleOpen(false);
    setDetalle(null);
  };

  const imprimir = useImprimirComprobante();
  const [comprobanteId, setComprobanteId] = useState(null);

  const [facturandoId, setFacturandoId] = useState(null);
  const handleFacturar = async (venta) => {
    const reintento = venta.estado_facturacion === 'error' && venta.factura_id;
    const { isConfirmed } = await Swal.fire({
      icon: 'question',
      title: reintento ? `¿Reintentar la factura de la venta #${venta.id}?` : `¿Facturar la venta #${venta.id}?`,
      text: 'Se emite el comprobante electrónico ante ARCA. Puede tardar unos segundos.',
      showCancelButton: true,
      confirmButtonText: reintento ? 'Sí, reintentar' : 'Sí, facturar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#0d9488'
    });
    if (!isConfirmed) return;
    try {
      setFacturandoId(venta.id);
      const resp = reintento ? await reintentarFactura(venta.factura_id) : await facturarVentas([venta.id]);
      if (resp?.descartada) {
        await Swal.fire({ icon: 'info', title: 'Sin cambios', text: resp.message });
      } else {
        await Swal.fire({
          icon: 'success',
          title: 'Factura en proceso',
          text: 'Se está emitiendo ante ARCA. El estado se actualiza solo en esta lista.',
          timer: 2500,
          showConfirmButton: false
        });
      }
      await fetchVentas();
    } catch (e) {
      console.error('No se pudo facturar la venta:', e);
      await Swal.fire({
        icon: 'error',
        title: 'No se pudo facturar',
        text: e?.mensajeError || 'Ocurrió un error inesperado.'
      });
    } finally {
      setFacturandoId(null);
    }
  };

  const handleAnular = async (venta) => {
    if (venta.estado === 'anulada') return;
    const facturada = venta.estado_facturacion === 'facturada' || venta.facturas_autorizadas_count > 0;
    const { isConfirmed } = await Swal.fire({
      icon: 'warning',
      title: `¿Anular la venta #${venta.id}?`,
      text: facturada
        ? 'Esta venta está facturada: al anularla se emite automáticamente una Nota de Crédito ante ARCA por el total.'
        : 'Se revierte el stock y los movimientos de la venta.',
      showCancelButton: true,
      confirmButtonText: 'Sí, anular',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#e11d48'
    });
    if (!isConfirmed) return;
    try {
      const resp = await anularVenta(venta.id);
      await fetchVentas(); // refresca listado
      if (detalle?.id === venta.id) {
        // refrescar detalle si está abierto
        const full = await getVenta(venta.id);
        setDetalle(full);
      }
      const nc = resp?.nota_credito;
      if (nc?.ok) {
        await Swal.fire({
          icon: 'success',
          title: 'Venta anulada',
          text:
            nc.estado === 'verificando'
              ? 'La factura de esta venta todavía se estaba procesando con ARCA: si queda autorizada, se emite la Nota de Crédito automáticamente.'
              : 'La Nota de Crédito se está emitiendo ante ARCA. La podés ver en Facturación → Comprobantes emitidos.'
        });
      } else if (nc && !nc.ok) {
        await Swal.fire({
          icon: 'warning',
          title: 'Venta anulada, falta la Nota de Crédito',
          text: `No se pudo iniciar la Nota de Crédito: ${nc.mensajeError || 'error desconocido'}. Reintentala desde Facturación → Comprobantes emitidos.`
        });
      }
    } catch (e) {
      console.error('No se pudo anular la venta:', e);
      await Swal.fire({
        icon: 'error',
        title: 'No se pudo anular la venta',
        text: e?.mensajeError || 'Ocurrió un error inesperado.'
      });
    }
  };

  const handleSubmitEditarVenta = async (payload) => {
    await updateVenta(editVenta.id, payload);
    await fetchVentas();
    if (detalle?.id === editVenta.id) {
      const full = await getVenta(editVenta.id);
      setDetalle(full);
    }
  };

  const abrirDetallePorId = async (ventaId) => {
    if (!ventaId) return;

    setDetalleOpen(true);
    setDetalleLoading(true);

    try {
      const data = await getVenta(ventaId);
      setDetalle(data);
    } catch (e) {
      console.error('Error cargando detalle de venta:', e);
      //  meter un Sweet
    } finally {
      setDetalleLoading(false);
    }
  };

  // ======================================================
  //  - 17-01-2026
  // Mapa rápido para resolver reparto por id en la tabla
  // ======================================================
  const repartoById = useMemo(() => {
    const m = new Map();
    (Array.isArray(repartos) ? repartos : []).forEach((r) => {
      if (r?.id != null) m.set(Number(r.id), r);
    });
    return m;
  }, [repartos]);

  // ------------ render ------------
  return (
    <AppShell>
      <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Título + acción rápida */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <motion.h1
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 mb-1"
            >
              Historial de Ventas
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-sm text-slate-500 max-w-2xl"
            >
              Consultá tus ventas, filtrá por cliente, fechas, tipo y
              estado. Abrí el detalle para ver ítems, cliente y vendedor.
            </motion.p>
          </div>

          {/* Acciones centralizadas del módulo de Ventas */}
          <div className="flex flex-wrap gap-2 md:justify-end">
            <Link
              to="/dashboard/nueva-venta"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-orange-500 text-white font-semibold hover:bg-orange-600 transition"
            >
              <FaPlus /> Nueva venta
            </Link>
            <button
              type="button"
              onClick={() => setVentasRepartoModalOpen(true)}
              disabled={creatingMasiva}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 disabled:opacity-60 transition"
            >
              <FaCashRegister /> {creatingMasiva ? 'Generando…' : 'Carga masiva'}
            </button>
            <Link
              to="/dashboard/ventas/saldo-previo"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 transition"
            >
              <FaMoneyBillWave /> Saldo previo
            </Link>
            <Link
              to="/dashboard/ventas/deudas"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 transition"
            >
              <FaUsers /> Deudas
            </Link>
            <Link
              to="/dashboard/ventas/reportes"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 transition"
            >
              <FaChartLine /> Reportes
            </Link>
            <button
              type="button"
              onClick={() => setExportarModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 transition"
            >
              <FaFileExport /> Exportar
            </button>
          </div>
        </div>

            {/* KPIs */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.15 }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6"
            >
              <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center">
                  <FaFileInvoiceDollar className="text-orange-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">
                    Ventas (página)
                  </p>
                  <p className="text-xl font-bold text-gray-900">
                    {kpis.count}
                  </p>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center">
                  <FaMoneyBillWave className="text-emerald-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">
                    Total neto (página)
                  </p>
                  <p className="text-xl font-bold text-gray-900">
                    {moneyAR(kpis.total)}
                  </p>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center">
                  <FaExclamationTriangle className="text-amber-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">
                    Ventas fiado
                  </p>
                  <p className="text-xl font-bold text-gray-900">
                    {kpis.fiadas}
                  </p>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-sky-100 flex items-center justify-center">
                  <FaMoneyBillWave className="text-sky-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">
                    Ventas contado
                  </p>
                  <p className="text-xl font-bold text-gray-900">
                    {kpis.contado}
                  </p>
                </div>
              </div>
            </motion.div>
            {/* Filtros */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.2 }}
              className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-sm mb-6"
            >
              {/* Fila principal */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                {/* q */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide">
                    Buscar (cliente, documento, email)
                  </label>
                  <div className="relative">
                    <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600 text-sm" />
                    <input
                      type="text"
                      name="q"
                      value={filtros.q}
                      onChange={handleFiltroChange}
                      placeholder="Ej: Benjamín, 43849..., correo@..."
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 text-sm
                     bg-white focus:outline-none focus:ring-2 focus:ring-orange-400/60 focus:border-transparent"
                    />
                  </div>
                </div>

                {/* tipo */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide">
                    Tipo
                  </label>
                  <select
                    name="tipo"
                    value={filtros.tipo}
                    onChange={handleFiltroChange}
                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-800
                   focus:outline-none focus:ring-2 focus:ring-orange-400/60 focus:border-transparent"
                  >
                    <option value="">Todos</option>
                    <option value="contado">Contado</option>
                    <option value="fiado">Fiado</option>
                    <option value="a_cuenta">A cuenta</option>
                  </select>
                </div>

                {/* estado */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide">
                    Estado
                  </label>
                  <select
                    name="estado"
                    value={filtros.estado}
                    onChange={handleFiltroChange}
                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-800
                   focus:outline-none focus:ring-2 focus:ring-orange-400/60 focus:border-transparent"
                  >
                    <option value="">Todos</option>
                    <option value="confirmada">Confirmada</option>
                    <option value="anulada">Anulada</option>
                  </select>
                </div>
              </div>

              {/* Fila secundaria: fechas + acciones */}
              <div className="mt-4 flex flex-col md:flex-row md:items-end gap-3">
                {/* fechas */}
                <div className="w-full md:max-w-lg">
                  <DateRangeFilter desde={filtros.desde} hasta={filtros.hasta} onChange={handleFechaChange} />
                </div>

                {/* acciones */}
                <div className="flex-1" />
                <div className="flex flex-wrap gap-2 justify-end">
                  <button
                    type="button"
                    onClick={handleLimpiar}
                    className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-gray-200 text-xs sm:text-sm text-gray-700
                   hover:bg-gray-100 transition"
                  >
                    <FaTimes className="text-xs" />
                    Limpiar
                  </button>
                </div>
              </div>
            </motion.div>

            {/* Tabla */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.25 }}
              className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
            >
              {loading && (
                <div className="p-4 text-sm text-gray-600">
                  Cargando ventas...
                </div>
              )}
              {error && !loading && (
                <div className="p-4 text-sm text-rose-600">{error}</div>
              )}

              {!loading && !error && (
                <>
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead className="bg-gray-50/90 border-b border-gray-200">
                        <tr>
                          <th className="px-4 py-2 text-left font-semibold text-gray-600">
                            ID
                          </th>
                          <th className="px-4 py-2 text-left font-semibold text-gray-600">
                            Fecha
                          </th>
                          <th className="px-4 py-2 text-left font-semibold text-gray-600">
                            Cliente
                          </th>
                          <th className="px-4 py-2 text-left font-semibold text-gray-600">
                            Vendedor
                          </th>
                          <th className="px-4 py-2 text-left font-semibold text-gray-600">
                            Reparto
                          </th>
                          <th className="px-4 py-2 text-left font-semibold text-gray-600">
                            Tipo
                          </th>
                          <th className="px-4 py-2 text-left font-semibold text-gray-600">
                            Estado
                          </th>
                          <th className="px-4 py-2 text-right font-semibold text-gray-600">
                            Total neto
                          </th>

                          <th className="px-4 py-2 text-right font-semibold text-gray-600">
                            A cuenta
                          </th>

                          <th className="px-4 py-2 text-right font-semibold text-gray-600">
                            Saldo
                          </th>

                          <th className="px-4 py-2 text-center font-semibold text-gray-600">
                            Acciones
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {ventas.length === 0 && (
                          <tr>
                            <td
                              colSpan={11}
                              className="px-4 py-6 text-center text-gray-500"
                            >
                              No hay ventas para los filtros seleccionados.
                            </td>
                          </tr>
                        )}

                        {ventas.map((v) => {
                          const totalNeto = Number(v.total_neto ?? 0);
                          const aCuenta = Number(v.monto_a_cuenta ?? 0);
                          const notasCredito = Number(v.monto_notas_credito ?? 0);
                          const saldo = Math.max(0, totalNeto - aCuenta - notasCredito);

                          //  - 17-01-2026
                          // Mostrar como "a_cuenta" SOLO si es fiado con pago parcial (saldo pendiente).
                          // Si está totalmente saldada (saldo ~ 0), mantenemos el tipo real: "fiado".
                          const tipoUI =
                            v.tipo === 'fiado' && aCuenta > 0 && saldo > 0.01
                              ? 'a_cuenta'
                              : v.tipo;

                          return (
                            <tr
                              key={v.id}
                              className="border-b border-gray-100 hover:bg-orange-50/40 transition cursor-pointer"
                              onClick={() => abrirDetalle(v)}
                            >
                              <td className="px-4 py-2 text-gray-700">
                                #{v.id}
                              </td>

                              <td className="px-4 py-2 text-gray-700">
                                {fmtFecha(v.fecha)}
                              </td>

                              <td className="px-4 py-2 text-gray-800">
                                <div className="flex items-center gap-2">
                                  <FaUser className="text-slate-600 text-xs" />
                                  <div className="flex flex-col leading-tight">
                                    <span className="font-medium">
                                      {v.cliente?.nombre || '—'}
                                    </span>
                                    {v.cliente?.documento && (
                                      <span className="text-[11px] text-gray-500">
                                        {v.cliente.documento}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </td>

                              <td className="px-4 py-2 text-gray-800">
                                <div className="flex items-center gap-2">
                                  <FaUserTie className="text-slate-600 text-xs" />
                                  <span className="font-medium">
                                    {v.vendedor?.nombre || '—'}
                                  </span>
                                </div>
                              </td>

                              {/* Reparto */}
                              <td className="px-4 py-2 text-gray-800">
                                {(() => {
                                  const rid = Number(v.reparto_id || 0);
                                  if (!rid)
                                    return (
                                      <span className="text-slate-600">—</span>
                                    );

                                  const rep = repartoById.get(rid);
                                  if (!rep)
                                    return (
                                      <span className="text-gray-500">
                                        #{rid}
                                      </span>
                                    );

                                  return (
                                    <div className="flex flex-col leading-tight">
                                      <span className="font-medium">
                                        {rep.nombre}
                                      </span>
                                      {rep?.ciudad?.nombre && (
                                        <span className="text-[11px] text-gray-500">
                                          {rep.ciudad.nombre}
                                        </span>
                                      )}
                                    </div>
                                  );
                                })()}
                              </td>

                              <td className="px-4 py-2">
                                <span
                                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs border ${
                                    badgeTipoClasses[tipoUI] ||
                                    'bg-gray-100 text-gray-700 border-gray-200'
                                  }`}
                                >
                                  {tipoUI}
                                </span>
                              </td>

                              <td className="px-4 py-2">
                                <span
                                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs border ${
                                    badgeEstadoClasses[v.estado] ||
                                    'bg-gray-100 text-gray-700 border-gray-200'
                                  }`}
                                >
                                  {v.estado}
                                </span>
                                {(() => {
                                  const badge = FACTURACION_BADGE[estadoFacturacion(v)];
                                  if (!badge) return null;
                                  const abreDetalle = !!v.factura_id && !esVendedor;
                                  return (
                                    <span
                                      role={abreDetalle ? 'button' : undefined}
                                      title={abreDetalle ? 'Ver comprobante' : undefined}
                                      onClick={(e) => {
                                        if (!abreDetalle) return;
                                        e.stopPropagation();
                                        setComprobanteId(v.factura_id);
                                      }}
                                      className={`ml-1.5 inline-flex items-center whitespace-nowrap px-2.5 py-0.5 rounded-full text-xs border ${badge.cls} ${
                                        abreDetalle ? 'cursor-pointer hover:brightness-95 underline-offset-2 hover:underline' : ''
                                      }`}
                                    >
                                      {badge.label}
                                    </span>
                                  );
                                })()}
                              </td>

                              <td className="px-4 py-2 text-right font-semibold text-gray-900">
                                {moneyAR(totalNeto)}
                              </td>

                              <td className="px-4 py-2 text-right font-semibold text-gray-900">
                                {moneyAR(aCuenta)}
                              </td>

                              <td className="px-4 py-2 text-right font-semibold text-gray-900">
                                {moneyAR(saldo)}
                              </td>

                              <td
                                className="px-4 py-2 text-center"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <div className="inline-flex gap-2">
                                  <button
                                    type="button"
                                    onClick={() => abrirDetalle(v)}
                                    className="text-xs px-2.5 py-1 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-100 transition"
                                  >
                                    Ver
                                  </button>

                                  {v.estado !== 'anulada' && (
                                    <button
                                      type="button"
                                      onClick={() => setEditVenta(v)}
                                      className="text-xs px-2.5 py-1 rounded-lg border border-teal-200 text-teal-700 hover:bg-teal-50 transition"
                                    >
                                      Editar
                                    </button>
                                  )}

                                  {['facturada', 'anulada_por_nc'].includes(estadoFacturacion(v)) && v.factura_id && (
                                    <>
                                      <button
                                        type="button"
                                        onClick={() => imprimir.imprimirTicket(v.factura_id)}
                                        disabled={imprimir.imprimiendo === v.factura_id}
                                        title="Imprimir el ticket de la factura"
                                        className="text-xs px-2.5 py-1 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 disabled:opacity-50 transition"
                                      >
                                        Ticket
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => imprimir.abrirPdf(v.factura_id)}
                                        title="Ver la factura en PDF A4"
                                        className="text-xs px-2.5 py-1 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 transition"
                                      >
                                        PDF
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => imprimir.enviarWhatsApp(v.factura_id)}
                                        title="Enviar la factura al cliente por WhatsApp"
                                        className="text-xs px-2.5 py-1 rounded-lg border border-emerald-200 text-emerald-700 hover:bg-emerald-50 transition"
                                      >
                                        WhatsApp
                                      </button>
                                    </>
                                  )}

                                  {v.estado === 'confirmada' &&
                                    ['sin_facturar', 'error'].includes(estadoFacturacion(v)) &&
                                    !esVendedor && (
                                      <button
                                        type="button"
                                        disabled={facturandoId === v.id}
                                        onClick={() => handleFacturar(v)}
                                        className="text-xs px-2.5 py-1 rounded-lg border border-teal-200 text-teal-600 hover:bg-teal-50 disabled:opacity-50 transition whitespace-nowrap"
                                      >
                                        {facturandoId === v.id
                                          ? 'Enviando…'
                                          : estadoFacturacion(v) === 'error'
                                            ? 'Reintentar factura'
                                            : 'Facturar'}
                                      </button>
                                    )}

                                  {v.estado !== 'anulada' && !esVendedor && (
                                    <button
                                      type="button"
                                      onClick={() => handleAnular(v)}
                                      className="text-xs px-2.5 py-1 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 transition"
                                    >
                                      Anular
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Paginación */}
                  {meta && meta.totalPages > 1 && (
                    <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 text-xs sm:text-sm text-gray-600">
                      <div>
                        Página {meta.page} de {meta.totalPages} — {meta.total}{' '}
                        ventas
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => handlePageChange(-1)}
                          disabled={!meta.hasPrev}
                          className="px-3 py-1.5 rounded-lg border border-gray-200 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 transition"
                        >
                          Anterior
                        </button>
                        <button
                          type="button"
                          onClick={() => handlePageChange(1)}
                          disabled={!meta.hasNext}
                          className="px-3 py-1.5 rounded-lg border border-gray-200 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 transition"
                        >
                          Siguiente
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </motion.div>
          </div>

        {/* Drawer de detalle */}
        <AnimatePresence>
          {detalleOpen && (
            <motion.div
              className="fixed inset-0 z-50 flex justify-end"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className="flex-1 bg-slate-900/40" onClick={cerrarDetalle} />

              <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', stiffness: 260, damping: 30 }}
                className="w-full max-w-md sm:max-w-lg h-full bg-white text-slate-900 shadow-2xl border-l border-slate-200 flex flex-col"
              >
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
                  <div>
                    <p className="text-xs uppercase text-slate-600 tracking-wide">
                      Detalle de venta
                    </p>
                    <p className="text-lg font-semibold">
                      Venta #{detalle?.id ?? '—'}
                    </p>
                  </div>

                  <button
                    onClick={cerrarDetalle}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 transition"
                  >
                    <FaTimes className="text-sm" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
                  {detalleLoading && (
                    <p className="text-sm text-slate-500">Cargando detalle...</p>
                  )}

                  {!detalleLoading && detalle && (
                    <>
                      {/*  - 17/01/2026 - Mostrar A cuenta + Saldo y tipo UI "a_cuenta" si corresponde */}
                      {(() => {
                        const totalNeto = Number(detalle.total_neto ?? 0);
                        const aCuenta = Number(detalle.monto_a_cuenta ?? 0);
                        const notasCredito = Number(detalle.monto_notas_credito ?? 0);
                        const saldo = Math.max(0, totalNeto - aCuenta - notasCredito);
                        const tipoUI =
                          detalle.tipo === 'fiado' && aCuenta > 0
                            ? 'a_cuenta'
                            : detalle.tipo;

                        return (
                          <>
                            {/* Cabecera */}
                            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-2">
                              <div className="flex justify-between items-center">
                                <span className="text-sm text-slate-500">
                                  Fecha
                                </span>
                                <span className="text-sm font-medium">
                                  {fmtFecha(detalle.fecha)}
                                </span>
                              </div>

                              <div className="flex justify-between items-center">
                                <span className="text-sm text-slate-500">
                                  Tipo
                                </span>
                                <span
                                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs border ${
                                    badgeTipoClasses[tipoUI] ||
                                    'bg-gray-100 text-gray-700 border-gray-200'
                                  }`}
                                >
                                  {tipoUI}
                                </span>
                              </div>

                              <div className="flex justify-between items-center">
                                <span className="text-sm text-slate-500">
                                  Estado
                                </span>
                                <span
                                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs border ${
                                    badgeEstadoClasses[detalle.estado] ||
                                    'bg-gray-100 text-gray-700 border-gray-200'
                                  }`}
                                >
                                  {detalle.estado}
                                </span>
                              </div>

                              <div className="pt-2 border-t border-slate-200 mt-2 space-y-1.5">
                                <div className="flex justify-between items-center">
                                  <span className="text-sm text-slate-500">
                                    Total neto
                                  </span>
                                  <span className="text-lg font-bold text-emerald-600">
                                    {moneyAR(totalNeto)}
                                  </span>
                                </div>

                                <div className="flex justify-between items-center">
                                  <span className="text-sm text-slate-500">
                                    A cuenta
                                  </span>
                                  <span className="text-sm font-semibold text-slate-900">
                                    {moneyAR(aCuenta)}
                                  </span>
                                </div>

                                {notasCredito > 0 && (
                                  <div className="flex justify-between items-center">
                                    <span className="text-sm text-slate-500">
                                      Notas de crédito
                                    </span>
                                    <span className="text-sm font-semibold text-slate-900">
                                      {moneyAR(notasCredito)}
                                    </span>
                                  </div>
                                )}

                                <div className="flex justify-between items-center">
                                  <span className="text-sm text-slate-500">
                                    Saldo
                                  </span>
                                  <span className="text-sm font-semibold text-amber-700">
                                    {moneyAR(saldo)}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Cliente */}
                            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-1">
                              <div className="flex items-center gap-2 mb-1">
                                <FaUser className="text-slate-600" />
                                <span className="text-sm font-semibold">
                                  Cliente
                                </span>
                              </div>

                              <p className="text-sm">
                                {detalle.cliente?.nombre || '—'}
                              </p>

                              {detalle.cliente?.documento && (
                                <p className="text-xs text-slate-500">
                                  Doc: {detalle.cliente.documento}
                                </p>
                              )}

                              {detalle.cliente?.telefono && (
                                <p className="text-xs text-slate-500">
                                  Tel: {detalle.cliente.telefono}
                                </p>
                              )}

                              {detalle.cliente?.email && (
                                <p className="text-xs text-slate-500">
                                  Email: {detalle.cliente.email}
                                </p>
                              )}

                              {detalle.cliente?.barrio?.localidad?.ciudad && (
                                <p className="text-xs text-slate-600 mt-1">
                                  {
                                    detalle.cliente.barrio.localidad.ciudad
                                      .nombre
                                  }{' '}
                                  · {detalle.cliente.barrio.nombre}
                                </p>
                              )}
                            </div>

                            {/* Vendedor */}
                            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-1">
                              <div className="flex items-center gap-2 mb-1">
                                <FaUserTie className="text-slate-600" />
                                <span className="text-sm font-semibold">
                                  Vendedor
                                </span>
                              </div>

                              <p className="text-sm">
                                {detalle.vendedor?.nombre || '—'}
                              </p>

                              {detalle.vendedor?.telefono && (
                                <p className="text-xs text-slate-500">
                                  Tel: {detalle.vendedor.telefono}
                                </p>
                              )}

                              {detalle.vendedor?.email && (
                                <p className="text-xs text-slate-500">
                                  Email: {detalle.vendedor.email}
                                </p>
                              )}
                            </div>

                            {/* Ítems */}
                            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200">
                              <p className="text-sm font-semibold mb-3">
                                Ítems de la venta
                              </p>

                              {(!detalle.items ||
                                detalle.items.length === 0) && (
                                <p className="text-xs text-slate-500">
                                  No hay ítems registrados para esta venta.
                                </p>
                              )}

                              {detalle.items && detalle.items.length > 0 && (
                                <div className="space-y-2 text-xs">
                                  {detalle.items.map((it) => (
                                    <div
                                      key={it.id}
                                      className="flex justify-between gap-2 border-b border-slate-200 pb-1.5 last:border-0 last:pb-0"
                                    >
                                      <div className="flex-1">
                                        <p className="font-medium">
                                          {it.producto?.nombre
                                            ? `${it.producto.nombre} ${
                                                it.producto.codigo_sku
                                                  ? `(${it.producto.codigo_sku})`
                                                  : ''
                                              }`
                                            : `Producto #${it.producto_id}`}
                                        </p>

                                        {/*  - 17/01/2026 - Cantidad numérica (evita strings DECIMAL) */}
                                        <p className="text-slate-600">
                                          Cant: {Number(it.cantidad ?? 0)} · PU:{' '}
                                          {moneyAR(it.precio_unit)}
                                        </p>
                                      </div>

                                      <div className="text-right font-semibold">
                                        {moneyAR(it.subtotal)}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>

                            {/* Observaciones */}
                            {detalle.observaciones && (
                              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200">
                                <p className="text-sm font-semibold mb-1">
                                  Observaciones
                                </p>
                                <p className="text-xs text-slate-500">
                                  {detalle.observaciones}
                                </p>
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

      <VentaRepartoFormModal
        open={ventasRepartoModalOpen}
        onClose={() => setVentasRepartoModalOpen(false)}
        onSubmit={handleVentasRepartoMasiva}
      />

      <ExportarVentasModal
        open={exportarModalOpen}
        onClose={() => setExportarModalOpen(false)}
      />

      <EditarVentaModal
        open={editVenta != null}
        onClose={() => setEditVenta(null)}
        onSubmit={handleSubmitEditarVenta}
        venta={editVenta}
      />

      <ComprobanteDetalleModal
        open={comprobanteId != null}
        facturaId={comprobanteId}
        onClose={() => setComprobanteId(null)}
        onCambio={() => fetchVentas({ silent: true })}
        imprimir={imprimir}
      />
      {imprimir.modalImpresora}
    </AppShell>
  );
};

export default VentasHistorialPage;
