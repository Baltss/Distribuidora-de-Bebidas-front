// src/Pages/Facturacion/FacturacionPage.jsx
//
// Sección "Facturación": ventas confirmadas que todavía no se facturaron
// (se pueden seleccionar varias del mismo cliente y agruparlas en un
// solo comprobante) y el listado de comprobantes ya emitidos (Facturas
// y Notas de Crédito).
//
// "Facturar seleccionadas" no espera a AFIP: el backend responde al
// toque con la factura en estado 'pendiente' (emitir un comprobante hace
// dos llamadas seguidas a AFIP que pueden tardar varios minutos, sobre
// todo en Homologación) y la emisión real corre en background. Mientras
// haya una factura 'pendiente', esta pantalla hace polling hasta que el
// backend la resuelva sola (autorizada, o vuelta a error con el motivo)
// — o hasta que se cancele a mano.
import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { FileText, Receipt, Loader2 } from 'lucide-react';

import AppShell from '../../Components/Layout/AppShell';
import {
  listVentasPendientesFacturar,
  facturarVentas,
  cancelarFactura,
  listFacturas
} from '../../api/facturacion';
import { showApiErrorSwal, showSuccessSwal, showConfirmSwal } from '../../ui/swal';

const money = (n) =>
  `$ ${Number(n || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const TIPO_COMPROBANTE_LETRA = { 1: 'A', 3: 'A', 6: 'B', 8: 'B', 11: 'C', 13: 'C' };
const TIPOS_NOTA_CREDITO = new Set([3, 8, 13]);

const ESTADO_FACTURA_BADGE = {
  autorizada: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  pendiente: 'bg-sky-50 text-sky-700 border-sky-200',
  error: 'bg-rose-50 text-rose-700 border-rose-200',
  anulada_por_nc: 'bg-slate-100 text-slate-500 border-slate-200'
};

const ESTADO_FACTURA_LABEL = {
  autorizada: 'Autorizada',
  pendiente: 'Emitiendo…',
  error: 'Error',
  anulada_por_nc: 'Anulada por NC'
};

const TABS = [
  { key: 'pendientes', label: 'Pendientes de facturar' },
  { key: 'emitidos', label: 'Comprobantes emitidos' }
];

const POLL_MS = 4000;

export default function FacturacionPage() {
  const [tab, setTab] = useState('pendientes');

  const [pendientes, setPendientes] = useState([]);
  const [loadingPendientes, setLoadingPendientes] = useState(true);
  const [seleccion, setSeleccion] = useState(new Set());
  const [facturando, setFacturando] = useState(false);

  const [facturas, setFacturas] = useState([]);
  const [loadingFacturas, setLoadingFacturas] = useState(true);
  const [cancelandoId, setCancelandoId] = useState(null);

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

  const fetchFacturas = async ({ silent = false } = {}) => {
    if (!silent) setLoadingFacturas(true);
    try {
      const data = await listFacturas();
      const nueva = Array.isArray(data) ? data : [];

      // Avisa apenas una emisión en curso termina sola (autorizada, o
      // vuelta a error) — comparando contra lo que había antes de este fetch.
      const veniaPendiente = facturas.filter((f) => f.estado === 'pendiente');
      for (const anterior of veniaPendiente) {
        const actual = nueva.find((f) => f.id === anterior.id);
        if (actual?.estado === 'autorizada') {
          showSuccessSwal({ title: 'Comprobante emitido', text: `CAE: ${actual.cae} — N° ${actual.numero}` });
        } else if (actual?.estado === 'error') {
          showApiErrorSwal({ mensajeError: actual.error_mensaje }, { title: 'No se pudo facturar' });
        }
      }

      setFacturas(nueva);
    } catch (err) {
      if (!silent) await showApiErrorSwal(err, { title: 'No se pudieron cargar los comprobantes' });
    } finally {
      if (!silent) setLoadingFacturas(false);
    }
  };

  useEffect(() => {
    fetchPendientes();
    fetchFacturas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Mientras haya algún comprobante 'pendiente', reconsulta cada POLL_MS
  // hasta que el backend lo resuelva (o se cancele a mano).
  useEffect(() => {
    const hayPendiente = facturas.some((f) => f.estado === 'pendiente');
    if (!hayPendiente) return undefined;
    const interval = setInterval(() => fetchFacturas({ silent: true }), POLL_MS);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facturas]);

  const toggleSeleccion = (venta) => {
    setSeleccion((prev) => {
      const next = new Set(prev);
      if (next.has(venta.id)) {
        next.delete(venta.id);
      } else {
        next.add(venta.id);
      }
      return next;
    });
  };

  const ventasSeleccionadas = useMemo(
    () => pendientes.filter((v) => seleccion.has(v.id)),
    [pendientes, seleccion]
  );

  const clientesDistintos = useMemo(
    () => new Set(ventasSeleccionadas.map((v) => v.cliente_id)).size,
    [ventasSeleccionadas]
  );

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
      text: `Se va a emitir un comprobante por ${ventasSeleccionadas.length} venta(s) — la emisión corre en segundo plano y puede tardar unos minutos.`,
      icon: 'question',
      confirmText: 'Sí, facturar'
    });
    if (!confirmed) return;

    try {
      setFacturando(true);
      await facturarVentas([...seleccion]);
      await showSuccessSwal({
        title: 'En proceso',
        text: 'El comprobante se está emitiendo — mirá la pestaña "Comprobantes emitidos" para ver cuándo termina.'
      });
      fetchPendientes();
      fetchFacturas();
      setTab('emitidos');
    } catch (err) {
      await showApiErrorSwal(err, { title: 'No se pudo iniciar la facturación' });
    } finally {
      setFacturando(false);
    }
  };

  const handleCancelarFactura = async (factura) => {
    const confirmed = await showConfirmSwal({
      title: '¿Cancelar la emisión?',
      text: 'Vas a poder reintentar facturar la venta después.',
      icon: 'warning',
      confirmText: 'Sí, cancelar'
    });
    if (!confirmed) return;

    try {
      setCancelandoId(factura.id);
      await cancelarFactura(factura.id);
      await fetchFacturas();
      fetchPendientes();
    } catch (err) {
      await showApiErrorSwal(err, { title: 'No se pudo cancelar' });
    } finally {
      setCancelandoId(null);
    }
  };

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.h1
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 flex items-center gap-2.5"
        >
          <FileText className="h-7 w-7 text-teal-600" /> Facturación
        </motion.h1>
        <p className="mt-1 text-sm text-slate-500">
          Facturá manualmente las ventas que todavía no tienen comprobante, y consultá lo ya emitido.
        </p>

        {/* Tabs */}
        <div className="mt-6 flex gap-2 border-b border-slate-200">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition ${
                tab === t.key
                  ? 'border-teal-600 text-teal-700'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'pendientes' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="mt-6 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
          >
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between flex-wrap gap-2">
              <p className="text-sm text-slate-500">
                {ventasSeleccionadas.length > 0
                  ? `${ventasSeleccionadas.length} venta(s) seleccionada(s)${
                      clientesDistintos > 1 ? ' — ¡son de clientes distintos!' : ''
                    }`
                  : 'Seleccioná una o varias ventas del mismo cliente para agruparlas en un comprobante.'}
              </p>
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
                      <th className="px-4 py-2 text-left font-semibold text-gray-600">Fecha</th>
                      <th className="px-4 py-2 text-left font-semibold text-gray-600">Cliente</th>
                      <th className="px-4 py-2 text-left font-semibold text-gray-600">Tipo</th>
                      <th className="px-4 py-2 text-right font-semibold text-gray-600">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendientes.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-4 py-6 text-center text-gray-500">
                          No hay ventas pendientes de facturar.
                        </td>
                      </tr>
                    )}
                    {pendientes.map((v) => (
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
                        <td className="px-4 py-2 text-gray-700">
                          {new Date(v.fecha).toLocaleDateString('es-AR')}
                        </td>
                        <td className="px-4 py-2 text-gray-800">{v.cliente?.nombre || '—'}</td>
                        <td className="px-4 py-2 capitalize text-gray-700">{v.tipo}</td>
                        <td className="px-4 py-2 text-right font-medium text-gray-800">
                          {money(v.total_neto)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </motion.div>
        )}

        {tab === 'emitidos' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="mt-6 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
          >
            {loadingFacturas ? (
              <div className="flex items-center justify-center py-24">
                <div className="h-10 w-10 border-4 border-slate-200 border-t-teal-500 rounded-full animate-spin" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50/90 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-2 text-left font-semibold text-gray-600">Comprobante</th>
                      <th className="px-4 py-2 text-left font-semibold text-gray-600">Cliente</th>
                      <th className="px-4 py-2 text-left font-semibold text-gray-600">CAE</th>
                      <th className="px-4 py-2 text-right font-semibold text-gray-600">Total</th>
                      <th className="px-4 py-2 text-left font-semibold text-gray-600">Estado</th>
                      <th className="px-4 py-2 text-center font-semibold text-gray-600">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {facturas.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-4 py-6 text-center text-gray-500">
                          Todavía no se emitió ningún comprobante.
                        </td>
                      </tr>
                    )}
                    {facturas.map((f) => {
                      const letra = TIPO_COMPROBANTE_LETRA[f.tipo_comprobante] || '?';
                      const esNc = TIPOS_NOTA_CREDITO.has(f.tipo_comprobante);
                      const enProceso = f.estado === 'pendiente';
                      return (
                        <tr key={f.id} className="border-b border-gray-100">
                          <td className="px-4 py-2 text-gray-800 flex items-center gap-1.5">
                            <Receipt className="h-4 w-4 text-slate-400" />
                            {esNc ? 'NC' : 'Fact.'} {letra} {f.numero ? `N° ${f.numero}` : '(sin número)'}
                          </td>
                          <td className="px-4 py-2 text-gray-700">{f.cliente?.nombre || '—'}</td>
                          <td className="px-4 py-2 text-gray-600 font-mono text-xs">{f.cae || '—'}</td>
                          <td className="px-4 py-2 text-right font-medium text-gray-800">
                            {money(f.importe_total)}
                          </td>
                          <td className="px-4 py-2">
                            <span
                              className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${
                                ESTADO_FACTURA_BADGE[f.estado] || ''
                              }`}
                            >
                              {enProceso && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                              {ESTADO_FACTURA_LABEL[f.estado] || f.estado}
                            </span>
                            {f.estado === 'error' && f.error_mensaje && (
                              <p className="mt-1 text-[11px] text-rose-600 max-w-[240px]">{f.error_mensaje}</p>
                            )}
                          </td>
                          <td className="px-4 py-2 text-center">
                            {enProceso && (
                              <button
                                onClick={() => handleCancelarFactura(f)}
                                disabled={cancelandoId === f.id}
                                className="text-xs font-semibold text-slate-500 hover:text-slate-700 disabled:opacity-50 transition"
                              >
                                {cancelandoId === f.id ? 'Cancelando…' : 'Cancelar / Reintentar'}
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
          </motion.div>
        )}
      </div>
    </AppShell>
  );
}
