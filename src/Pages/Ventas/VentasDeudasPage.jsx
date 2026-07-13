// ===============================
// FILE: src/Pages/Ventas/VentasDeudasPage.jsx
// ===============================
/*
 *
 * Fecha: 14 / 11 / 2025
 * Versión: 1.2
 *
 * Descripción:
 *  Gestión de Deudas (ventas tipo 'fiado' o 'a_cuenta'):
 *  - Filtros por texto (cliente), vendedor, tipo, estado, fechas
 *  - Filtros geográficos (ciudad, localidad, barrio) según el cliente
 *  - Listado de ventas con badge de tipo/estado
 *  - KPIs arriba: total adeudado, cantidad de ventas, ticket promedio
 */

import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import NavbarStaff from '../Dash/NavbarStaff';
import '../../Styles/staff/dashboard.css';
import '../../Styles/staff/background.css';
import { useAuth } from '../../AuthContext';
import ParticlesBackground from '../../Components/ParticlesBackground';
import { motion, AnimatePresence } from 'framer-motion';
import ButtonBack from '../../Components/ButtonBack';
import {
  FaUser,
  FaUserTie,
  FaSearch,
  FaFilter,
  FaTruck,
  FaMoneyBill,
  FaHistory
} from 'react-icons/fa';
import { X } from 'lucide-react';

// Unificación Deudas + Cobranzas en una sola pantalla   - 14-07-2026
import DeudaClienteModal from '../../Components/Cobranzas/DeudaClienteModal';
import SeleccionarClienteDeudaModal from '../../Components/Cobranzas/SeleccionarClienteDeudaModal';
import CobranzasClientesListado from '../../Components/Cobranzas/CobranzasClientesListado';

import { listVentas } from '../../api/ventas';
import { listVendedores } from '../../api/vendedores';
import { listCiudades } from '../../api/ciudades';
import { listLocalidades } from '../../api/localidades';
import { listBarrios } from '../../api/barrios';

// ======================================================
//  - 17-01-2026
// Nuevo: Repartos (filtro por reparto en deudas)
// ======================================================
import { listRepartos } from '../../api/repartos';

import SearchableSelect from '../../Components/Common/SearchableSelect';
import { moneyAR } from '../../utils/money';

//  - 25-02-2026 - http client para consumir GET /cxc/deudas (deuda real por cliente, incluye saldo_previo).
import http from '../../api/http';

// Util formatear fecha
const fmtFecha = (v) => {
  if (!v) return '—';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return String(v);
  return d.toLocaleDateString('es-AR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
};

// Badges compartidos
const badgeTipoClasses = {
  contado: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  fiado: 'bg-amber-50 text-amber-700 border-amber-200',
  a_cuenta: 'bg-cyan-50 text-cyan-700 border-cyan-200'
};

const badgeEstadoClasses = {
  confirmada: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  anulada: 'bg-rose-50 text-rose-700 border-rose-200'
};

const VentasDeudasPage = () => {
  const { userLevel } = useAuth(); // por si después limitás acceso
  const navigate = useNavigate();

  // ======================================================
  //   - 14-07-2026
  // Acciones de cobranza unificadas en esta misma pantalla
  // (antes vivían en AdminPageCobranzas, ahora fusionadas acá).
  // ======================================================
  const [selectClienteModalOpen, setSelectClienteModalOpen] = useState(false);
  const [deudaModalOpen, setDeudaModalOpen] = useState(false);
  const [deudaClienteId, setDeudaClienteId] = useState(null);
  const [cobranzasListadoOpen, setCobranzasListadoOpen] = useState(false);

  // ======================================================
  //  - 25-02-2026
  // Fuente de datos:
  // - 'ventas': deudas calculadas desde ventas (total_neto - monto_a_cuenta)
  // - 'cxc': deuda real por cliente desde ledger cxc_movimientos (incluye saldo_previo)
  // ======================================================
  const [fuente, setFuente] = useState('cxc');

  // --------- Filtros ---------
  const [q, setQ] = useState('');
  const [tipo, setTipo] = useState('a_cuenta'); // 'fiado' | 'a_cuenta'
  const [estado, setEstado] = useState('confirmada'); // normalmente deudas = confirmada

  // AHORA guardamos IDs numéricos, no objetos
  const [vendedorId, setVendedorId] = useState(null);
  const [ciudadId, setCiudadId] = useState(null);
  const [localidadId, setLocalidadId] = useState(null);
  const [barrioId, setBarrioId] = useState(null);

  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');

  const [error, setError] = useState('');

  // Listas para selects
  const [vendedores, setVendedores] = useState([]);
  const [ciudades, setCiudades] = useState([]);
  const [localidades, setLocalidades] = useState([]);
  const [barrios, setBarrios] = useState([]);

  // Datos
  const [ventas, setVentas] = useState([]);

  //  - 25-02-2026 - Dataset para fuente CxC (GET /cxc/deudas): deuda real por cliente.
  const [cxcDeudas, setCxcDeudas] = useState([]);

  const [meta, setMeta] = useState({
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 1,
    hasPrev: false,
    hasNext: false
  });
  const [loading, setLoading] = useState(false);

  // ======================================================
  //  - 17-01-2026
  // Nuevo: filtro reparto
  // ======================================================
  const [repartoId, setRepartoId] = useState(null);

  const [repartos, setRepartos] = useState([]);
  const [repartosLoading, setRepartosLoading] = useState(false);
  const [repartosError, setRepartosError] = useState('');

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

  // Ciudades
  useEffect(() => {
    (async () => {
      try {
        const res = await listCiudades({ estado: 'activa', limit: 200 });
        const arr = Array.isArray(res?.data)
          ? res.data
          : Array.isArray(res)
            ? res
            : [];
        setCiudades(arr);
      } catch (err) {
        console.error('Error cargando ciudades:', err);
      }
    })();
  }, []);

  // ======================================================
  //  - 17-01-2026
  // Cargar repartos (activos) para filtro
  // Nota: traemos todos y filtramos en front por ciudadId si aplica.
  // ======================================================
  useEffect(() => {
    (async () => {
      try {
        setRepartosLoading(true);
        setRepartosError('');

        const res = await listRepartos({ limit: 500 }); // si soporta estado: 'activo', podés agregarlo
        const arr = Array.isArray(res?.data)
          ? res.data
          : Array.isArray(res)
            ? res
            : [];

        // si tu endpoint devuelve inactivos, podés filtrar acá:
        // const activos = arr.filter((r) => r.estado === 'activo');
        setRepartos(arr);
      } catch (err) {
        console.error('Error cargando repartos:', err);
        setRepartosError('No se pudieron cargar los repartos.');
      } finally {
        setRepartosLoading(false);
      }
    })();
  }, []);

  // Localidades cuando cambia ciudadId
  useEffect(() => {
    //  - 25-02-2026 - En fuente CxC, la geografía disponible es ciudad (clientes.ciudad_id). Localidad/Barrio no aplican.
    if (fuente === 'cxc') {
      setLocalidades([]);
      setLocalidadId(null);
      setBarrios([]);
      setBarrioId(null);
      return;
    }

    if (!ciudadId) {
      setLocalidades([]);
      setLocalidadId(null);
      setBarrios([]);
      setBarrioId(null);
      return;
    }
    (async () => {
      try {
        const res = await listLocalidades({
          ciudad_id: ciudadId,
          estado: 'activa',
          limit: 200
        });
        const arr = Array.isArray(res?.data)
          ? res.data
          : Array.isArray(res)
            ? res
            : [];
        setLocalidades(arr);
        setLocalidadId(null);
        setBarrios([]);
        setBarrioId(null);
      } catch (err) {
        console.error('Error cargando localidades:', err);
      }
    })();
  }, [ciudadId, fuente]);

  // Barrios cuando cambia localidadId
  useEffect(() => {
    if (fuente === 'cxc') {
      setBarrios([]);
      setBarrioId(null);
      return;
    }

    if (!localidadId) {
      setBarrios([]);
      setBarrioId(null);
      return;
    }
    (async () => {
      try {
        const res = await listBarrios({
          localidad_id: localidadId,
          estado: 'activa',
          limit: 300
        });
        const arr = Array.isArray(res?.data)
          ? res.data
          : Array.isArray(res)
            ? res
            : [];
        setBarrios(arr);
        setBarrioId(null);
      } catch (err) {
        console.error('Error cargando barrios:', err);
      }
    })();
  }, [localidadId, fuente]);

  // --------- Fetch ventas (deudas desde Ventas) ---------
  const fetchVentas = async (page = 1) => {
    try {
      setLoading(true);
      setError('');

      // -----------------------------
      //  - 17-01-2026
      // Sanitizar filtros para que "Todos" / "" no rompa deuda
      // -----------------------------
      const safeTipo = ['fiado', 'a_cuenta', 'contado'].includes(
        String(tipo || '')
      )
        ? String(tipo)
        : undefined;

      const safeEstado = ['confirmada', 'anulada'].includes(
        String(estado || '')
      )
        ? String(estado)
        : undefined;

      const safeVendedorId =
        vendedorId !== null && vendedorId !== undefined && vendedorId !== ''
          ? Number(vendedorId)
          : undefined;

      const safeCiudadId =
        ciudadId !== null && ciudadId !== undefined && ciudadId !== ''
          ? Number(ciudadId)
          : undefined;

      const safeLocalidadId =
        localidadId !== null && localidadId !== undefined && localidadId !== ''
          ? Number(localidadId)
          : undefined;

      const safeBarrioId =
        barrioId !== null && barrioId !== undefined && barrioId !== ''
          ? Number(barrioId)
          : undefined;

      const safeRepartoId =
        repartoId !== null && repartoId !== undefined && repartoId !== ''
          ? Number(repartoId)
          : undefined;

      const params = {
        // sólo ventas con saldo pendiente
        deuda: '1',
        saldo_min: '0.01',

        q: q?.trim() ? q.trim() : undefined,
        tipo: safeTipo,
        estado: safeEstado,
        vendedor_id: Number.isFinite(safeVendedorId)
          ? safeVendedorId
          : undefined,
        desde: fechaDesde || undefined,
        hasta: fechaHasta || undefined,

        // Geografía
        ciudad_id: Number.isFinite(safeCiudadId) ? safeCiudadId : undefined,
        localidad_id: Number.isFinite(safeLocalidadId)
          ? safeLocalidadId
          : undefined,
        barrio_id: Number.isFinite(safeBarrioId) ? safeBarrioId : undefined,
        // ======================================================
        //  - 17-01-2026
        // Filtro por reparto
        // ======================================================
        reparto_id: Number.isFinite(safeRepartoId) ? safeRepartoId : undefined,

        page,
        limit: 20
      };

      console.log('Params de búsqueda (deudas - ventas):', params);

      const res = await listVentas(params);

      const rows = Array.isArray(res?.data)
        ? res.data
        : Array.isArray(res)
          ? res
          : [];

      const metaRes = res?.meta || {};

      setVentas(rows);
      setCxcDeudas([]); //  - 25-02-2026 - Evita mezclar datasets en UI
      setMeta({
        total: metaRes.total ?? rows.length,
        page: metaRes.page ?? page,
        limit: metaRes.limit ?? 20,
        totalPages: metaRes.totalPages ?? 1,
        hasPrev: metaRes.hasPrev ?? page > 1,
        hasNext:
          metaRes.hasNext ??
          (metaRes.total ? page * (metaRes.limit ?? 20) < metaRes.total : false)
      });
    } catch (err) {
      console.error('Error listando ventas:', err);
      setError('No se pudieron cargar las ventas.');
    } finally {
      setLoading(false);
    }
  };

  // ======================================================
  //  - 25-02-2026
  // Fetch deudas desde CxC (ledger): GET /cxc/deudas
  // Nota: este modo incluye saldos previos y deuda real consolidada por cliente.
  // ======================================================
  const fetchCxCDeudas = async (page = 1) => {
    try {
      setLoading(true);
      setError('');

      const safeCiudadId =
        ciudadId !== null && ciudadId !== undefined && ciudadId !== ''
          ? Number(ciudadId)
          : undefined;

      const params = {
        q: q?.trim() ? q.trim() : undefined,
        ciudad_id: Number.isFinite(safeCiudadId) ? safeCiudadId : undefined,
        desde: fechaDesde || undefined,
        hasta: fechaHasta || undefined,
        saldo_min: '0.01',
        page,
        limit: 20
      };

      console.log('Params de búsqueda (deudas - cxc):', params);

      const { data } = await http.get('/cxc/deudas', { params });

      const rows = Array.isArray(data?.data) ? data.data : [];
      const metaRes = data?.meta || {};

      setCxcDeudas(rows);
      setVentas([]); //  - 25-02-2026 - Evita mezclar datasets en UI
      setMeta({
        total: metaRes.total ?? rows.length,
        page: metaRes.page ?? page,
        limit: metaRes.limit ?? 20,
        totalPages: metaRes.totalPages ?? 1,
        hasPrev: metaRes.hasPrev ?? page > 1,
        hasNext:
          metaRes.hasNext ??
          (metaRes.total ? page * (metaRes.limit ?? 20) < metaRes.total : false)
      });
    } catch (err) {
      console.error('Error listando CxC deudas:', err);
      setError('No se pudieron cargar las deudas (CxC).');
    } finally {
      setLoading(false);
    }
  };

  // Carga inicial / cambio de fuente
  useEffect(() => {
    //  - 25-02-2026 - Al cambiar fuente, volvemos a página 1 y refrescamos según origen.
    if (fuente === 'cxc') fetchCxCDeudas(1);
    else fetchVentas(1);
  }, [fuente]); // eslint-disable-line

  const handleBuscar = () => {
    //  - 25-02-2026 - Buscar respeta la fuente seleccionada.
    if (fuente === 'cxc') fetchCxCDeudas(1);
    else fetchVentas(1);
  };

  const handlePageChange = (nextPage) => {
    if (nextPage < 1 || nextPage > meta.totalPages) return;
    if (fuente === 'cxc') fetchCxCDeudas(nextPage);
    else fetchVentas(nextPage);
  };

  // --------- KPIs calculados en front ---------
  const kpis = useMemo(() => {
    //  - 25-02-2026 - KPIs calculados sobre el dataset cargado (página actual).
    // En caso de requerir KPIs globales (todas las páginas), conviene devolverlos desde el backend.
    if (fuente === 'cxc') {
      if (!cxcDeudas || cxcDeudas.length === 0) {
        return {
          totalDeudas: 0,
          cantidad: 0,
          ticketPromedio: 0
        };
      }

      const totalDeudas = cxcDeudas.reduce(
        (acc, r) => acc + Number(r.saldo_total || 0),
        0
      );
      const cantidad = cxcDeudas.length;
      const ticketPromedio = cantidad > 0 ? totalDeudas / cantidad : 0;
      return { totalDeudas, cantidad, ticketPromedio };
    }

    // fuente ventas
    if (!ventas || ventas.length === 0) {
      return {
        totalDeudas: 0,
        cantidad: 0,
        ticketPromedio: 0
      };
    }

    //  - 25-02-2026 - Total adeudado debe ser el saldo (total_neto - a_cuenta), no el total_neto.
    const totalDeudas = ventas.reduce((acc, v) => {
      const totalNeto = Number(v.total_neto ?? 0);
      const aCuenta = Number(v.monto_a_cuenta ?? 0);
      const saldo = Math.max(0, totalNeto - aCuenta);
      return acc + saldo;
    }, 0);

    const cantidad = ventas.length;
    const ticketPromedio = cantidad > 0 ? totalDeudas / cantidad : 0;
    return { totalDeudas, cantidad, ticketPromedio };
  }, [ventas, cxcDeudas, fuente]);

  // ======================================================
  //  - 17-01-2026
  // Repartos filtrados por ciudad (si hay ciudadId seleccionado)
  // ======================================================
  const repartosFiltrados = useMemo(() => {
    const base = Array.isArray(repartos) ? repartos : [];
    if (!ciudadId) return base;
    return base.filter((r) => Number(r?.ciudad_id) === Number(ciudadId));
  }, [repartos, ciudadId]);

  // Mapa rápido para resolver reparto por id en la tabla
  const repartoById = useMemo(() => {
    const m = new Map();
    (Array.isArray(repartos) ? repartos : []).forEach((r) => {
      if (r?.id != null) m.set(Number(r.id), r);
    });
    return m;
  }, [repartos]);

  const fuenteLabel = fuente === 'cxc' ? 'Cuenta Corriente (CxC)' : 'Ventas';
  const tablaTitle =
    fuente === 'cxc'
      ? `Clientes con deuda (${meta.total} registros)`
      : `Ventas con deuda (${meta.total} registros)`;

  return (
    <>
      <NavbarStaff />
      <section className="relative w-full min-h-screen bg-white">
        {/* Fondo tipo ventas / caja */}
        <div className="min-h-screen bg-gradient-to-b from-[#1b1b2f] via-[#3b1f3f] to-[#b53a1d]">
          <ParticlesBackground />
          <ButtonBack />

          {/* Título + descripción */}
          <div className="text-center pt-24 px-4">
            <motion.h1
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-3xl sm:text-4xl titulo uppercase font-bold text-white mb-3 drop-shadow-md"
            >
              Gestión de Deudas y Cobranzas
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-sm sm:text-base text-gray-200/80 max-w-2xl mx-auto"
            >
              Consultá clientes con deuda, visualizá el saldo pendiente,
              registrá cobros y revisá el historial de cobranzas, todo desde
              un mismo lugar. Podés alternar la fuente:
              <span className="font-semibold text-white"> Ventas</span> (saldo
              por venta) o{' '}
              <span className="font-semibold text-white">
                Cuenta Corriente (CxC)
              </span>{' '}
              (deuda real consolidada, incluye saldo previo).
            </motion.p>

            <div className="mt-5 flex flex-wrap justify-center gap-2">
              <button
                type="button"
                onClick={() => setSelectClienteModalOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-orange-500 text-white font-semibold hover:bg-orange-600 transition"
              >
                <FaMoneyBill /> Registrar cobro
              </button>
              <button
                type="button"
                onClick={() => setCobranzasListadoOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white font-semibold hover:bg-white/20 transition"
              >
                <FaHistory /> Historial de cobranzas
              </button>
            </div>
          </div>

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
            {/* KPIs */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.15 }}
              className="grid grid-cols-1 sm:grid-cols-3 gap-4"
            >
              <div className="rounded-2xl bg-white/90 backdrop-blur-xl border border-white/40 p-4 flex flex-col">
                <span className="text-xs uppercase tracking-wide text-gray-500 mb-1">
                  Total adeudado
                </span>
                <span className="text-2xl font-semibold text-gray-900">
                  {moneyAR(kpis.totalDeudas)}
                </span>
              </div>

              <div className="rounded-2xl bg-white/90 backdrop-blur-xl border border-white/40 p-4 flex flex-col">
                <span className="text-xs uppercase tracking-wide text-gray-500 mb-1">
                  {fuente === 'cxc'
                    ? 'Cantidad de clientes'
                    : 'Cantidad de ventas'}
                </span>
                <span className="text-2xl font-semibold text-gray-900">
                  {kpis.cantidad}
                </span>
              </div>

              <div className="rounded-2xl bg-white/90 backdrop-blur-xl border border-white/40 p-4 flex flex-col">
                <span className="text-xs uppercase tracking-wide text-gray-500 mb-1">
                  {fuente === 'cxc' ? 'Deuda promedio' : 'Ticket promedio'}
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
              className="rounded-2xl bg-white/95 backdrop-blur-xl border border-white/40 p-4 sm:p-5 space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-gray-700 mb-1">
                <div className="flex items-center gap-2">
                  <FaFilter className="text-xs" />
                  <span className="text-sm font-semibold">Filtros</span>
                </div>

                {/*  - 25-02-2026 - Selector de fuente de datos */}
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-gray-500">
                    Fuente
                  </span>
                  <select
                    value={fuente}
                    onChange={(e) => {
                      const v = String(e.target.value || 'ventas');
                      setFuente(v);
                    }}
                    className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800
                               focus:outline-none focus:ring-2 focus:ring-orange-400/60 focus:border-transparent"
                  >
                    <option value="cxc">Cuenta Corriente (CxC)</option>
                    <option value="ventas">Ventas</option>
                  </select>

                  <span className="text-[11px] text-gray-500 hidden md:inline">
                    {fuenteLabel}
                  </span>
                </div>
              </div>

              {fuente === 'cxc' && (
                <div className="text-[11px] text-gray-600">
                  En modo CxC se filtra por{' '}
                  <span className="font-semibold">cliente/city/fechas</span>.
                  Los filtros de{' '}
                  <span className="font-semibold">
                    tipo/estado/vendedor/reparto/localidad/barrio
                  </span>{' '}
                  no aplican.
                </div>
              )}

              {/* Primera fila: texto, reparto, tipo, estado, vendedor */}
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
                {/* Búsqueda texto */}
                <div className="sm:col-span-2">
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
                    <FaSearch className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs" />
                  </div>
                </div>

                {/* ======================================================
                     - 17-01-2026
                    Filtro Reparto
                  ====================================================== */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    <span className="inline-flex items-center gap-2">
                      <FaTruck className="text-gray-500" />
                      Reparto
                    </span>
                  </label>

                  <select
                    value={repartoId ?? ''}
                    onChange={(e) => setRepartoId(e.target.value || null)}
                    disabled={repartosLoading || fuente === 'cxc'}
                    className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-800
                 focus:outline-none focus:ring-2 focus:ring-orange-400/60 focus:border-transparent
                 disabled:opacity-60 disabled:cursor-not-allowed"
                    title={
                      fuente === 'cxc'
                        ? 'Filtro no disponible en modo CxC'
                        : undefined
                    }
                  >
                    <option value="">
                      {repartosLoading
                        ? 'Cargando…'
                        : ciudadId
                          ? 'Todos (de esta ciudad)'
                          : 'Todos'}
                    </option>

                    {repartosFiltrados.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.nombre}{' '}
                        {r?.ciudad?.nombre ? `· ${r.ciudad.nombre}` : ''}
                      </option>
                    ))}
                  </select>

                  {repartosError && (
                    <p className="mt-1 text-[11px] text-rose-600/90">
                      {repartosError}
                    </p>
                  )}
                </div>

                {/* Tipo */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    Tipo
                  </label>
                  <select
                    value={tipo}
                    onChange={(e) => setTipo(e.target.value)}
                    disabled={fuente === 'cxc'}
                    className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-800
                 focus:outline-none focus:ring-2 focus:ring-orange-400/60 focus:border-transparent
                 disabled:opacity-60 disabled:cursor-not-allowed"
                    title={
                      fuente === 'cxc'
                        ? 'Filtro no disponible en modo CxC'
                        : undefined
                    }
                  >
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
                    disabled={fuente === 'cxc'}
                    className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-800
                 focus:outline-none focus:ring-2 focus:ring-orange-400/60 focus:border-transparent
                 disabled:opacity-60 disabled:cursor-not-allowed"
                    title={
                      fuente === 'cxc'
                        ? 'Filtro no disponible en modo CxC'
                        : undefined
                    }
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
                      console.log('Vendedor seleccionado:', val);
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
                    disabled={fuente === 'cxc'}
                    title={
                      fuente === 'cxc'
                        ? 'Filtro no disponible en modo CxC'
                        : undefined
                    }
                  />
                </div>
              </div>

              {/* Segunda fila: Ciudad / Localidad / Barrio */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Ciudad */}
                <div className="relative z-20">
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    Ciudad
                  </label>
                  <SearchableSelect
                    items={ciudades}
                    value={ciudadId}
                    onChange={(val) => {
                      console.log('Ciudad seleccionada:', val);
                      setCiudadId(val || null);

                      //  - 25-02-2026 - Si cambia ciudad, limpiamos reparto para evitar filtros inconsistentes.
                      setRepartoId(null);
                    }}
                    placeholder="Todas"
                    getOptionLabel={(c) => c?.nombre || ''}
                    getOptionValue={(c) => c?.id}
                    getOptionSearchText={(c) => c?.nombre || ''}
                    portal
                    portalZIndex={2800}
                    dropdownMaxHeight="40vh"
                    menuPlacement="bottom"
                  />
                </div>

                {/* Localidad */}
                <div className="relative z-10">
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    Localidad
                  </label>
                  <SearchableSelect
                    items={localidades}
                    value={localidadId}
                    onChange={(val) => {
                      console.log('Localidad seleccionada:', val);
                      setLocalidadId(val || null);
                    }}
                    placeholder={
                      fuente === 'cxc'
                        ? 'No disponible en CxC'
                        : ciudadId
                          ? 'Todas'
                          : 'Seleccioná una ciudad primero'
                    }
                    disabled={!ciudadId || fuente === 'cxc'}
                    getOptionLabel={(l) => l?.nombre || ''}
                    getOptionValue={(l) => l?.id}
                    getOptionSearchText={(l) => l?.nombre || ''}
                    portal
                    portalZIndex={2800}
                    dropdownMaxHeight="40vh"
                    menuPlacement="bottom"
                  />
                </div>

                {/* Barrio */}
                <div className="relative z-10">
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    Barrio
                  </label>
                  <SearchableSelect
                    items={barrios}
                    value={barrioId}
                    onChange={(val) => {
                      console.log('Barrio seleccionado:', val);
                      setBarrioId(val || null);
                    }}
                    placeholder={
                      fuente === 'cxc'
                        ? 'No disponible en CxC'
                        : localidadId
                          ? 'Todos'
                          : 'Seleccioná una localidad'
                    }
                    disabled={!localidadId || fuente === 'cxc'}
                    getOptionLabel={(b) => b?.nombre || ''}
                    getOptionValue={(b) => b?.id}
                    getOptionSearchText={(b) => b?.nombre || ''}
                    portal
                    portalZIndex={2800}
                    dropdownMaxHeight="40vh"
                    menuPlacement="bottom"
                  />
                </div>
              </div>

              {/* Rango fechas */}
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
                    onClick={handleBuscar}
                    className="w-full inline-flex justify-center items-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-rose-500
                               text-white text-sm font-semibold px-4 py-2.5 shadow-md hover:brightness-110 transition disabled:opacity-60"
                    disabled={loading}
                  >
                    {loading ? 'Buscando…' : 'Aplicar filtros'}
                  </button>
                </div>
              </div>
            </motion.div>

            {/* Tabla de deudas */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.25 }}
              className="rounded-2xl bg-white/95 backdrop-blur-xl border border-white/40 p-4 sm:p-5"
            >
              <div className="flex justify-between items-center mb-3">
                <h2 className="text-sm sm:text-base font-semibold text-gray-800">
                  {tablaTitle}
                </h2>
              </div>

              <div className="overflow-x-auto">
                {fuente === 'cxc' ? (
                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-50/90 border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-2 text-left font-semibold text-gray-600">
                          Cliente
                        </th>
                        <th className="px-4 py-2 text-left font-semibold text-gray-600">
                          Último mov.
                        </th>
                        <th className="px-4 py-2 text-right font-semibold text-gray-600">
                          Saldo previo
                        </th>
                        <th className="px-4 py-2 text-right font-semibold text-gray-600">
                          Ventas
                        </th>
                        <th className="px-4 py-2 text-right font-semibold text-gray-600">
                          Pagos
                        </th>
                        <th className="px-4 py-2 text-right font-semibold text-gray-600">
                          Saldo total
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {cxcDeudas.length === 0 && (
                        <tr>
                          <td
                            colSpan={6}
                            className="px-4 py-6 text-center text-gray-500"
                          >
                            No hay deudas para los filtros seleccionados.
                          </td>
                        </tr>
                      )}

                      {cxcDeudas.map((r) => {
                        const saldoTotal = Number(r.saldo_total ?? 0);
                        const saldoPrev = Number(r.saldo_previo_total ?? 0);
                        const ventasTotal = Number(r.ventas_total ?? 0);
                        const pagosTotal = Number(r.pagos_total ?? 0);

                        return (
                          <tr
                            key={r.cliente_id}
                            className="border-b border-gray-100 hover:bg-orange-50/40 transition"
                          >
                            <td className="px-4 py-2 text-gray-800">
                              <div className="flex items-center gap-2">
                                <FaUser className="text-gray-400 text-xs" />
                                <div className="flex flex-col leading-tight">
                                  <span className="font-medium">
                                    {r.nombre || '—'}
                                  </span>
                                  <span className="text-[11px] text-gray-500">
                                    {r.documento || '—'}
                                  </span>
                                </div>
                              </div>
                            </td>

                            <td className="px-4 py-2 text-gray-700">
                              {fmtFecha(r.ultima_fecha_mov)}
                            </td>

                            <td className="px-4 py-2 text-right font-semibold text-gray-900">
                              {moneyAR(saldoPrev)}
                            </td>

                            <td className="px-4 py-2 text-right font-semibold text-gray-900">
                              {moneyAR(ventasTotal)}
                            </td>

                            <td className="px-4 py-2 text-right font-semibold text-gray-900">
                              {moneyAR(pagosTotal)}
                            </td>

                            <td className="px-4 py-2 text-right font-semibold text-gray-900">
                              {moneyAR(saldoTotal)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                ) : (
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
                      </tr>
                    </thead>
                    <tbody>
                      {ventas.length === 0 && (
                        <tr>
                          <td
                            //  - 25-02-2026 - Corrige colSpan para coincidir con la cantidad real de columnas
                            colSpan={10}
                            className="px-4 py-6 text-center text-gray-500"
                          >
                            No hay deudas para los filtros seleccionados.
                          </td>
                        </tr>
                      )}

                      {ventas.map((v) => {
                        const totalNeto = Number(v.total_neto ?? 0);
                        const aCuenta = Number(v.monto_a_cuenta ?? 0);
                        const saldo = Math.max(0, totalNeto - aCuenta);

                        const tipoUI =
                          v.tipo === 'fiado' && aCuenta > 0
                            ? 'a_cuenta'
                            : v.tipo;

                        return (
                          <tr
                            key={v.id}
                            className="border-b border-gray-100 hover:bg-orange-50/40 transition"
                          >
                            <td className="px-4 py-2 text-gray-700">#{v.id}</td>

                            <td className="px-4 py-2 text-gray-700">
                              {fmtFecha(v.fecha)}
                            </td>

                            {/* Cliente */}
                            <td className="px-4 py-2 text-gray-800">
                              <div className="flex items-center gap-2">
                                <FaUser className="text-gray-400 text-xs" />
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

                            {/* Vendedor */}
                            <td className="px-4 py-2 text-gray-800">
                              <div className="flex items-center gap-2">
                                <FaUserTie className="text-gray-400 text-xs" />
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
                                    <span className="text-gray-400">—</span>
                                  );

                                const rep = repartoById.get(rid);
                                if (!rep) {
                                  return (
                                    <span className="text-gray-500">
                                      #{rid}
                                    </span>
                                  );
                                }

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
                            </td>

                            {/* Total neto */}
                            <td className="px-4 py-2 text-right font-semibold text-gray-900">
                              {moneyAR(totalNeto)}
                            </td>

                            {/* A cuenta */}
                            <td className="px-4 py-2 text-right font-semibold text-gray-900">
                              {moneyAR(aCuenta)}
                            </td>

                            {/* Saldo (lo que debe) */}
                            <td className="px-4 py-2 text-right font-semibold text-gray-900">
                              {moneyAR(saldo)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Paginación simple */}
              {meta.totalPages > 1 && (
                <div className="mt-4 flex justify-end items-center gap-2 text-xs sm:text-sm">
                  <button
                    type="button"
                    onClick={() => handlePageChange(meta.page - 1)}
                    disabled={!meta.hasPrev}
                    className="px-3 py-1.5 rounded-lg border border-gray-200 text-gray-700
                               disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition"
                  >
                    Anterior
                  </button>
                  <span className="text-gray-600">
                    Página {meta.page} de {meta.totalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => handlePageChange(meta.page + 1)}
                    disabled={!meta.hasNext}
                    className="px-3 py-1.5 rounded-lg border border-gray-200 text-gray-700
                               disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition"
                  >
                    Siguiente
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </section>

      {/* Modal para seleccionar cliente con deuda (registrar cobro) */}
      <SeleccionarClienteDeudaModal
        open={selectClienteModalOpen}
        onClose={() => setSelectClienteModalOpen(false)}
        onSelect={(clienteId) => {
          setDeudaClienteId(clienteId);
          setSelectClienteModalOpen(false);
          setDeudaModalOpen(true);
        }}
      />

      {/* Modal: detalle de deuda del cliente y registro de cobranza */}
      <DeudaClienteModal
        open={deudaModalOpen}
        clienteId={deudaClienteId}
        onClose={() => {
          setDeudaModalOpen(false);
          setDeudaClienteId(null);
        }}
        onVerVenta={(ventaId) => {
          if (!ventaId) return;
          setDeudaModalOpen(false);
          navigate('/dashboard/ventas/ventas', {
            state: { ventaIdDetalle: ventaId, from: 'cobranzas' }
          });
        }}
      />

      {/* Modal fullscreen para listado de cobranzas */}
      <AnimatePresence>
        {cobranzasListadoOpen && (
          <motion.div
            className="fixed inset-0 z-[58] flex items-center justify-center p-3 sm:p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div
              className="absolute inset-0 bg-black/75 backdrop-blur-md"
              onClick={() => setCobranzasListadoOpen(false)}
            />
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 230, damping: 26 }}
              className="relative w-full max-w-6xl max-h-[90vh] rounded-3xl border border-white/15
                         bg-slate-950/95 shadow-[0_0_50px_rgba(248,250,252,0.15)] flex flex-col overflow-hidden"
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-slate-900/80">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.16em] text-orange-300/80">
                    Cobranzas
                  </p>
                  <h2 className="text-lg sm:text-xl font-semibold text-slate-50">
                    Historial de Cobranzas
                  </h2>
                  <p className="text-[11px] text-slate-300/80">
                    Revisá todas las cobranzas registradas, filtrá por cliente y
                    fecha, y abrí el detalle cuando lo necesites.
                  </p>
                </div>
                <button
                  onClick={() => setCobranzasListadoOpen(false)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-2xl
                             bg-white/5 border border-white/20 hover:bg-white/10 transition"
                  aria-label="Cerrar historial de cobranzas"
                >
                  <X className="h-5 w-5 text-slate-100" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-3 sm:px-5 py-4">
                <CobranzasClientesListado />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default VentasDeudasPage;
