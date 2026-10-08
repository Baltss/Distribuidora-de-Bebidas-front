// src/Pages/Facturacion/FacturacionPage.jsx
//
// Sección "Facturación":
// - Por facturar: ventas confirmadas sin comprobante (se pueden agrupar
//   varias del mismo cliente en uno solo).
// - Comprobantes: todo lo emitido (Facturas, Notas de Crédito y de Débito)
//   con filtros, detalle, impresión (ticket ESC/POS o PDF A4) y reintento.
// - Para el contador: resumen de IVA Ventas del mes y descargas (Libro IVA
//   en Excel, archivo para el Libro IVA Digital de ARCA, PDFs del mes).
//
// La emisión corre en segundo plano en el backend: mientras haya algún
// comprobante 'pendiente' en pantalla, la lista se refresca sola.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { FileText, Receipt, Loader2, Printer, Search, AlertTriangle, RotateCcw } from 'lucide-react';

import AppShell from '../../Components/Layout/AppShell';
import DateRangeFilter, { getRangoPreset, DEFAULT_PRESET } from '../../Components/Common/DateRangeFilter';
import ComprobanteDetalleModal from '../../Components/Facturacion/ComprobanteDetalleModal';
import ReportesContadorPanel from '../../Components/Facturacion/ReportesContadorPanel';
import ComprobantesRecibidosPanel from '../../Components/Facturacion/ComprobantesRecibidosPanel';
import AvisoCertificadoArca from '../../Components/Facturacion/AvisoCertificadoArca';
import useImprimirComprobante from '../../hooks/useImprimirComprobante';
import useDebouncedValue from '../../hooks/useDebouncedValue';
import useEstadoEmision from '../../hooks/useEstadoEmision';
import SelectorPuntoVenta from '../../Components/Facturacion/SelectorPuntoVenta';
import OpcionesComprobante, { OPCIONES_VACIAS, opcionesParaEnviar } from '../../Components/Facturacion/OpcionesComprobante';
import { nombreEmisor } from '../../utils/emisores';
import {
  listVentasPendientesFacturar,
  facturarVentas,
  cancelarFactura,
  reintentarFactura,
  listFacturas
} from '../../api/facturacion';
import { showApiErrorSwal, showSuccessSwal, showConfirmSwal } from '../../ui/swal';
import { formatFechaCalendario } from '../../utils/fechaCalendario';
import {
  nombreCorto,
  numeroComprobante,
  ESTADO_COMPROBANTE,
  esImprimible,
  esAjusteManual,
  MOTIVO_COMPROBANTE
} from '../../utils/comprobantes';
import { useAuth } from '../../AuthContext';
import { veTodasLasSucursales } from '../../utils/sucursalActiva';

const money = (n) =>
  `$ ${Number(n || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// `global`: son libros del CUIT completo, no de una sucursal; solo los ven quienes ven todas las sucursales.
const TABS = [
  { key: 'pendientes', label: 'Por facturar' },
  { key: 'emitidos', label: 'Comprobantes' },
  { key: 'compras', label: 'Compras', global: true },
  { key: 'contador', label: 'Para el contador', global: true }
];

const POLL_MS = 4000;
const selectCls =
  'rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-400/40';

export default function FacturacionPage() {
  const { userLevel } = useAuth();
  const tabs = TABS.filter((t) => !t.global || veTodasLasSucursales(userLevel));
  const [tab, setTab] = useState('pendientes');
  const imprimir = useImprimirComprobante();

  // ---------- Por facturar ----------
  const [pendientes, setPendientes] = useState([]);
  const [loadingPendientes, setLoadingPendientes] = useState(true);
  const [seleccion, setSeleccion] = useState(new Set());
  const [facturando, setFacturando] = useState(false);

  // ---------- Comprobantes ----------
  const [facturas, setFacturas] = useState([]);
  const [meta, setMeta] = useState(null);
  const [resumen, setResumen] = useState({ pendientes: 0, errores: 0 });
  const [loadingFacturas, setLoadingFacturas] = useState(true);
  const [accionId, setAccionId] = useState(null);
  const [detalleId, setDetalleId] = useState(null);

  const [rango, setRango] = useState(() => getRangoPreset(DEFAULT_PRESET));
  const [tipo, setTipo] = useState('');
  const [estado, setEstado] = useState('');
  const [q, setQ] = useState('');
  const dq = useDebouncedValue(q, 400);
  const [page, setPage] = useState(1);

  // CUIT: con cuál se factura lo pendiente y qué CUIT se muestra en Comprobantes.
  const estadoEmision = useEstadoEmision();
  const variosEmisores = (estadoEmision?.emisores || []).length > 1;
  const [puntoVentaId, setPuntoVentaId] = useState('');
  const [opciones, setOpciones] = useState(OPCIONES_VACIAS);
  const [emisorFiltro, setEmisorFiltro] = useState('');
  useEffect(() => {
    if (estadoEmision?.punto_venta_por_defecto_id) setPuntoVentaId(String(estadoEmision.punto_venta_por_defecto_id));
  }, [estadoEmision]);

  const filtros = useMemo(
    () => ({ desde: rango.desde, hasta: rango.hasta, tipo, estado, emisor_id: emisorFiltro, q: dq.trim(), page, limit: 20 }),
    [rango, tipo, estado, emisorFiltro, dq, page]
  );

  const fetchPendientes = async () => {
    setLoadingPendientes(true);
    try {
      const data = await listVentasPendientesFacturar();
      setPendientes(Array.isArray(data) ? data : []);
      setSeleccion(new Set());
    } catch (err) {
      await showApiErrorSwal(err, { title: 'No se pudieron cargar las ventas pendientes' });
    } finally {
      setLoadingPendientes(false);
    }
  };

  const facturasRef = useRef([]);
  const fetchFacturas = async ({ silent = false } = {}) => {
    if (!silent) setLoadingFacturas(true);
    try {
      const resp = await listFacturas(filtros);
      const nueva = resp?.data || [];

      // Avisa apenas una emisión en curso termina sola.
      for (const anterior of facturasRef.current.filter((f) => f.estado === 'pendiente')) {
        const actual = nueva.find((f) => f.id === anterior.id);
        if (actual?.estado === 'autorizada') {
          showSuccessSwal({
            title: 'Comprobante emitido',
            text: `${nombreCorto(actual)} N° ${numeroComprobante(actual)} — CAE ${actual.cae}`
          });
        } else if (actual?.estado === 'error') {
          showApiErrorSwal({ mensajeError: actual.error_mensaje }, { title: 'No se pudo emitir el comprobante' });
        }
      }

      facturasRef.current = nueva;
      setFacturas(nueva);
      setMeta(resp?.meta || null);
      setResumen(resp?.resumen || { pendientes: 0, errores: 0 });
    } catch (err) {
      if (!silent) await showApiErrorSwal(err, { title: 'No se pudieron cargar los comprobantes' });
    } finally {
      if (!silent) setLoadingFacturas(false);
    }
  };

  useEffect(() => {
    fetchPendientes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchFacturas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtros]);

  // Al cambiar un filtro, volver a la página 1.
  useEffect(() => {
    setPage(1);
  }, [rango, tipo, estado, emisorFiltro, dq]);

  const fetchRef = useRef(fetchFacturas);
  fetchRef.current = fetchFacturas;
  const hayPendiente = facturas.some((f) => f.estado === 'pendiente');
  useEffect(() => {
    if (!hayPendiente) return undefined;
    const interval = setInterval(() => fetchRef.current({ silent: true }), POLL_MS);
    return () => clearInterval(interval);
  }, [hayPendiente]);

  const refrescarTodo = () => {
    fetchFacturas({ silent: true });
    fetchPendientes();
  };

  // ---------- Por facturar: selección ----------
  const toggleSeleccion = (venta) => {
    setSeleccion((prev) => {
      const next = new Set(prev);
      if (next.has(venta.id)) next.delete(venta.id);
      else next.add(venta.id);
      return next;
    });
  };

  const ventasSeleccionadas = useMemo(() => pendientes.filter((v) => seleccion.has(v.id)), [pendientes, seleccion]);
  const clientesDistintos = useMemo(
    () => new Set(ventasSeleccionadas.map((v) => v.cliente_id)).size,
    [ventasSeleccionadas]
  );
  const totalSeleccion = ventasSeleccionadas.reduce((acc, v) => acc + Number(v.total_neto || 0), 0);

  const handleFacturar = async () => {
    if (ventasSeleccionadas.length === 0) return;
    if (clientesDistintos > 1) {
      await showApiErrorSwal(
        { mensajeError: 'Para agrupar varias ventas en un mismo comprobante, todas deben ser del mismo cliente.' },
        { title: 'Clientes distintos' }
      );
      return;
    }
    const confirmed = await showConfirmSwal({
      title: '¿Facturar las ventas seleccionadas?',
      text: `Se emite un comprobante por ${ventasSeleccionadas.length} venta(s), total ${money(totalSeleccion)}.`,
      icon: 'question',
      confirmText: 'Sí, facturar'
    });
    if (!confirmed) return;

    try {
      setFacturando(true);
      await facturarVentas([...seleccion], puntoVentaId ? Number(puntoVentaId) : null, opcionesParaEnviar(opciones));
      setOpciones(OPCIONES_VACIAS);
      await showSuccessSwal({
        title: 'En proceso',
        text: 'El comprobante se está emitiendo ante ARCA. Lo ves en "Comprobantes" apenas termine.'
      });
      fetchPendientes();
      setEstado('');
      setTab('emitidos');
      fetchFacturas({ silent: true });
    } catch (err) {
      await showApiErrorSwal(err, { title: 'No se pudo iniciar la facturación' });
    } finally {
      setFacturando(false);
    }
  };

  // ---------- Comprobantes: acciones ----------
  const handleReintentar = async (factura) => {
    try {
      setAccionId(factura.id);
      const resp = await reintentarFactura(factura.id);
      if (resp?.descartada) await showSuccessSwal({ title: 'Intento descartado', text: resp.message });
      refrescarTodo();
    } catch (err) {
      await showApiErrorSwal(err, { title: 'No se pudo reintentar' });
    } finally {
      setAccionId(null);
    }
  };

  const handleCancelar = async (factura) => {
    const confirmed = await showConfirmSwal({
      title: '¿Dejar de esperar a ARCA?',
      text: 'El comprobante queda con error y lo podés reintentar. Si ARCA ya lo había autorizado, se recupera al reintentar (no se factura dos veces).',
      icon: 'warning',
      confirmText: 'Sí, dejar de esperar'
    });
    if (!confirmed) return;
    try {
      setAccionId(factura.id);
      await cancelarFactura(factura.id);
      refrescarTodo();
    } catch (err) {
      await showApiErrorSwal(err, { title: 'No se pudo cancelar' });
    } finally {
      setAccionId(null);
    }
  };

  const errorPrevio = (venta) => (venta.facturas || []).find((f) => f.estado === 'error');

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <motion.h1
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 flex items-center gap-2.5"
            >
              <FileText className="h-7 w-7 text-teal-600" /> Facturación
            </motion.h1>
            <p className="mt-1 text-sm text-slate-500">
              Facturá las ventas que todavía no tienen comprobante y consultá, imprimí o reintentá lo emitido.
            </p>
          </div>
          <button
            onClick={imprimir.configurarImpresora}
            className="inline-flex items-center gap-2 self-start rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            <Printer className="h-4 w-4" /> Impresora de tickets
          </button>
        </div>

        <AvisoCertificadoArca className="mt-4" />

        {resumen.errores > 0 && (
          <button
            onClick={() => {
              setTab('emitidos');
              setEstado('error');
              setRango({ desde: '', hasta: '' });
            }}
            className="mt-4 w-full text-left flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 hover:bg-rose-100"
          >
            <AlertTriangle className="h-4 w-4 shrink-0" />
            Hay {resumen.errores} comprobante{resumen.errores === 1 ? '' : 's'} con error. Tocá acá para verlos y reintentarlos.
          </button>
        )}

        <div className="mt-6 flex gap-2 border-b border-slate-200">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition ${
                tab === t.key ? 'border-teal-600 text-teal-700' : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              {t.label}
              {t.key === 'pendientes' && pendientes.length > 0 && (
                <span className="ml-1.5 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-700">
                  {pendientes.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {tab === 'pendientes' && (
          <div className="mt-6 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between flex-wrap gap-2">
              <p className="text-sm text-slate-500">
                {ventasSeleccionadas.length > 0
                  ? `${ventasSeleccionadas.length} venta(s) seleccionada(s) · ${money(totalSeleccion)}${
                      clientesDistintos > 1 ? ' — ¡son de clientes distintos!' : ''
                    }`
                  : 'Seleccioná una o varias ventas del mismo cliente para agruparlas en un comprobante.'}
              </p>
              <SelectorPuntoVenta estadoEmision={estadoEmision} value={puntoVentaId} onChange={setPuntoVentaId} />
              <div className="basis-full">
                <OpcionesComprobante value={opciones} onChange={setOpciones} disabled={facturando} />
              </div>
              <button
                onClick={handleFacturar}
                disabled={ventasSeleccionadas.length === 0 || facturando}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-600 text-white font-semibold hover:bg-teal-700 disabled:opacity-50 transition"
              >
                {facturando ? 'Iniciando…' : 'Facturar seleccionadas'}
              </button>
            </div>
            {loadingPendientes ? (
              <div className="flex items-center justify-center py-24">
                <div className="h-10 w-10 border-4 border-slate-200 border-t-teal-500 rounded-full animate-spin" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50/90 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-2" />
                      <th className="px-4 py-2 text-left font-semibold text-gray-600">Venta</th>
                      <th className="px-4 py-2 text-left font-semibold text-gray-600">Fecha</th>
                      <th className="px-4 py-2 text-left font-semibold text-gray-600">Cliente</th>
                      <th className="px-4 py-2 text-left font-semibold text-gray-600">Tipo</th>
                      <th className="px-4 py-2 text-right font-semibold text-gray-600">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendientes.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-4 py-6 text-center text-gray-500">
                          No hay ventas pendientes de facturar.
                        </td>
                      </tr>
                    )}
                    {pendientes.map((v) => {
                      const previo = errorPrevio(v);
                      return (
                        <tr
                          key={v.id}
                          className="border-b border-gray-100 hover:bg-teal-50/40 transition cursor-pointer"
                          onClick={() => toggleSeleccion(v)}
                        >
                          <td className="px-4 py-2">
                            <input
                              type="checkbox"
                              checked={seleccion.has(v.id)}
                              onChange={() => toggleSeleccion(v)}
                              onClick={(e) => e.stopPropagation()}
                              className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-400"
                            />
                          </td>
                          <td className="px-4 py-2 text-gray-500">#{v.id}</td>
                          <td className="px-4 py-2 text-gray-700">{new Date(v.fecha).toLocaleDateString('es-AR')}</td>
                          <td className="px-4 py-2 text-gray-800">
                            {v.cliente?.nombre || '—'}
                            {previo && (
                              <p className="text-[11px] text-rose-600">
                                Último intento con error{previo.numero_intentado ? ' (sin confirmar con ARCA)' : ''}
                              </p>
                            )}
                          </td>
                          <td className="px-4 py-2 capitalize text-gray-700">{String(v.tipo).replace('_', ' ')}</td>
                          <td className="px-4 py-2 text-right font-medium text-gray-800">{money(v.total_neto)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {tab === 'emitidos' && (
          <div className="mt-6 space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-end gap-3">
              <DateRangeFilter desde={rango.desde} hasta={rango.hasta} onChange={setRango} />
              <select value={tipo} onChange={(e) => setTipo(e.target.value)} className={selectCls}>
                <option value="">Todos los comprobantes</option>
                <option value="factura">Sólo facturas</option>
                <option value="nota_credito">Sólo notas de crédito</option>
                <option value="nota_debito">Sólo notas de débito</option>
              </select>
              {variosEmisores && (
                <select value={emisorFiltro} onChange={(e) => setEmisorFiltro(e.target.value)} className={selectCls} aria-label="CUIT">
                  <option value="">Todos los CUIT</option>
                  {estadoEmision.emisores.map((e) => (
                    <option key={e.id} value={e.id}>
                      {nombreEmisor(e)}
                    </option>
                  ))}
                </select>
              )}
              <select value={estado} onChange={(e) => setEstado(e.target.value)} className={selectCls}>
                <option value="">Todos los estados</option>
                <option value="autorizada">Autorizadas</option>
                <option value="pendiente">Emitiendo</option>
                <option value="error">Con error</option>
                <option value="anulada_por_nc">Anuladas por NC</option>
              </select>
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="N° (0001-00000123), CAE, cliente o CUIT/DNI…"
                  className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400/40"
                />
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              {loadingFacturas ? (
                <div className="flex items-center justify-center py-24">
                  <div className="h-10 w-10 border-4 border-slate-200 border-t-teal-500 rounded-full animate-spin" />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-50/90 border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-2 text-left font-semibold text-gray-600">Fecha</th>
                        <th className="px-4 py-2 text-left font-semibold text-gray-600">Comprobante</th>
                        <th className="px-4 py-2 text-left font-semibold text-gray-600">Cliente</th>
                        <th className="px-4 py-2 text-right font-semibold text-gray-600">Total</th>
                        <th className="px-4 py-2 text-left font-semibold text-gray-600">Estado</th>
                        <th className="px-4 py-2 text-right font-semibold text-gray-600">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {facturas.length === 0 && (
                        <tr>
                          <td colSpan={6} className="px-4 py-6 text-center text-gray-500">
                            No hay comprobantes con esos filtros.
                          </td>
                        </tr>
                      )}
                      {facturas.map((f) => {
                        const est = ESTADO_COMPROBANTE[f.estado];
                        const asociada = f.comprobante_asociado;
                        const ocupado = accionId === f.id;
                        return (
                          <tr
                            key={f.id}
                            onClick={() => setDetalleId(f.id)}
                            className="border-b border-gray-100 hover:bg-slate-50 cursor-pointer"
                          >
                            <td className="px-4 py-2 text-gray-700 whitespace-nowrap">
                              {f.fecha_comprobante
                                ? formatFechaCalendario(f.fecha_comprobante)
                                : new Date(f.created_at).toLocaleDateString('es-AR')}
                            </td>
                            <td className="px-4 py-2 text-gray-800">
                              <div className="flex items-center gap-1.5 whitespace-nowrap">
                                <Receipt className="h-4 w-4 text-slate-400" />
                                {nombreCorto(f)} {numeroComprobante(f) ? `N° ${numeroComprobante(f)}` : '(sin número)'}
                              </div>
                              {variosEmisores && f.punto_venta?.emisor && (
                                <p className="text-[11px] text-slate-500">{nombreEmisor(f.punto_venta.emisor)}</p>
                              )}
                              {asociada && (
                                <p className="text-[11px] text-slate-500">
                                  {f.motivo === 'nota_debito'
                                    ? 'Sobre'
                                    : esAjusteManual(f)
                                      ? `${MOTIVO_COMPROBANTE[f.motivo]} · sobre`
                                      : 'Anula'}{' '}
                                  {nombreCorto(asociada)} N° {numeroComprobante(asociada)}
                                </p>
                              )}
                            </td>
                            <td className="px-4 py-2 text-gray-700">{f.receptor_nombre || f.cliente?.nombre || '—'}</td>
                            <td className="px-4 py-2 text-right font-medium text-gray-800">{money(f.importe_total)}</td>
                            <td className="px-4 py-2">
                              <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${est?.cls || ''}`}>
                                {f.estado === 'pendiente' && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                                {est?.label || f.estado}
                              </span>
                              {f.estado === 'error' && f.error_mensaje && (
                                <p className="mt-1 text-[11px] text-rose-600 max-w-[260px] line-clamp-2">{f.error_mensaje}</p>
                              )}
                            </td>
                            <td className="px-4 py-2 text-right" onClick={(e) => e.stopPropagation()}>
                              <div className="inline-flex gap-1.5">
                                {esImprimible(f) && (
                                  <>
                                    <button
                                      onClick={() => imprimir.imprimirTicket(f.id)}
                                      disabled={imprimir.imprimiendo === f.id}
                                      title="Imprimir ticket"
                                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                                    >
                                      <Printer className="h-3.5 w-3.5" /> Ticket
                                    </button>
                                    <button
                                      onClick={() => imprimir.abrirPdf(f.id)}
                                      title="Ver PDF A4"
                                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                                    >
                                      <FileText className="h-3.5 w-3.5" /> PDF
                                    </button>
                                  </>
                                )}
                                {f.estado === 'error' && (
                                  <button
                                    onClick={() => handleReintentar(f)}
                                    disabled={ocupado}
                                    className="inline-flex items-center gap-1 rounded-lg border border-teal-200 px-2 py-1 text-xs font-semibold text-teal-700 hover:bg-teal-50 disabled:opacity-50"
                                  >
                                    <RotateCcw className="h-3.5 w-3.5" /> {ocupado ? 'Reintentando…' : 'Reintentar'}
                                  </button>
                                )}
                                {f.estado === 'pendiente' && (
                                  <button
                                    onClick={() => handleCancelar(f)}
                                    disabled={ocupado}
                                    className="rounded-lg px-2 py-1 text-xs font-semibold text-slate-500 hover:text-slate-700 disabled:opacity-50"
                                  >
                                    {ocupado ? 'Cancelando…' : 'Dejar de esperar'}
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
              )}
            </div>

            {meta && meta.totalPages > 1 && (
              <div className="flex items-center justify-center gap-3">
                <button
                  disabled={!meta.hasPrev}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                >
                  Anterior
                </button>
                <span className="text-sm text-slate-500">
                  Página {meta.page} de {meta.totalPages} · {meta.total} comprobantes
                </span>
                <button
                  disabled={!meta.hasNext}
                  onClick={() => setPage((p) => p + 1)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                >
                  Siguiente
                </button>
              </div>
            )}
          </div>
        )}

        {tab === 'compras' && <ComprobantesRecibidosPanel />}

        {tab === 'contador' && (
          <ReportesContadorPanel
            onVerSinAutorizar={() => {
              setTab('emitidos');
              setEstado('');
              setRango({ desde: '', hasta: '' });
            }}
          />
        )}
      </div>

      <ComprobanteDetalleModal
        open={detalleId != null}
        facturaId={detalleId}
        onClose={() => setDetalleId(null)}
        onCambio={refrescarTodo}
        imprimir={imprimir}
      />
      {imprimir.modalImpresora}
    </AppShell>
  );
}
