// FILE: src/Components/Cobranzas/CobranzasClientesListado.jsx
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  FaSearch,
  FaFilter,
  FaMoneyBill,
  FaChevronLeft,
  FaChevronRight,
  FaTimes
} from 'react-icons/fa';

import {
  listCobranzasClientes,
  getCobranzaCliente,
  anularCobranzaCliente
} from '../../api/cobranzasClientes';
import { showConfirmSwal, showErrorSwal, showSuccessSwal } from '../../ui/swal';
import { medioPagoLabel } from '../../utils/mediosPago';

// Helpers locales
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

export default function CobranzasClientesListado() {
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 0
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // filtros
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');

  // detalle
  const [detalleOpen, setDetalleOpen] = useState(false);
  const [detalle, setDetalle] = useState(null);
  const [detalleLoading, setDetalleLoading] = useState(false);

  const limit = 20;

  const cargar = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const resp = await listCobranzasClientes({
        page,
        limit,
        q: q || undefined,
        fecha_desde: fechaDesde || undefined,
        fecha_hasta: fechaHasta || undefined
      });

      const data = Array.isArray(resp?.data) ? resp.data : resp || [];
      const metaResp = resp?.meta || {
        total: data.length,
        page,
        limit,
        totalPages: 1
      };

      setRows(data);
      setMeta(metaResp);
    } catch (err) {
      console.error('Error cargando cobranzas:', err);
      setError(
        err?.response?.data?.mensajeError ||
          'No se pudieron cargar las cobranzas.'
      );
      setRows([]);
      setMeta({ total: 0, page: 1, limit, totalPages: 0 });
    } finally {
      setLoading(false);
    }
  }, [page, q, fechaDesde, fechaHasta]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const totalPagina = useMemo(
    () => rows.reduce((acc, r) => acc + (Number(r.total_cobrado) || 0), 0),
    [rows]
  );

  const handleBuscarChange = (e) => {
    setQ(e.target.value);
    setPage(1);
  };

  const handleFechaDesdeChange = (e) => {
    setFechaDesde(e.target.value);
    setPage(1);
  };

  const handleFechaHastaChange = (e) => {
    setFechaHasta(e.target.value);
    setPage(1);
  };

  const handleVerDetalle = async (id) => {
    if (!id) return;
    setDetalleOpen(true);
    setDetalle(null);
    setDetalleLoading(true);

    try {
      const data = await getCobranzaCliente(id);
      setDetalle(data);
    } catch (err) {
      console.error('Error obteniendo cobranza:', err);
    } finally {
      setDetalleLoading(false);
    }
  };

  const handleCerrarDetalle = () => {
    setDetalleOpen(false);
    setDetalle(null);
  };

  const [anulandoId, setAnulandoId] = useState(null);

  const handleAnular = async (row) => {
    const ok = await showConfirmSwal({
      title: 'Anular cobro',
      text: `¿Anular el cobro de ${moneyAR(row.total_cobrado)} a ${
        row.cliente?.nombre || 'este cliente'
      }? Quedará marcado como anulado y el saldo adeudado se restablece.`
    });
    if (!ok) return;

    try {
      setAnulandoId(row.id);
      await anularCobranzaCliente(row.id);
      await showSuccessSwal({ title: 'Cobro anulado' });
      await cargar();
      if (detalleOpen && detalle?.id === row.id) {
        handleVerDetalle(row.id);
      }
    } catch (err) {
      const { mensajeError, tips } = err || {};
      await showErrorSwal({
        title: 'No se pudo anular',
        text: mensajeError || 'Ocurrió un error inesperado',
        tips
      });
    } finally {
      setAnulandoId(null);
    }
  };

  const canPrev = meta.page > 1;
  const canNext = meta.page < meta.totalPages;

  return (
    <div className="w-full h-full flex flex-col gap-4">
      {/* Header + KPIs */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center">
            <FaMoneyBill className="text-emerald-600" />
          </div>
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-slate-900">
              Cobranzas realizadas
            </h2>
            <p className="text-xs md:text-sm text-slate-500">
              Listado de todos los cobros registrados a clientes.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="px-3 py-2 rounded-2xl bg-slate-50 border border-slate-200">
            <p className="text-[11px] uppercase tracking-[0.16em] text-slate-600">
              Total cobranzas (página)
            </p>
            <p className="text-sm font-semibold text-emerald-600">
              {moneyAR(totalPagina)}
            </p>
          </div>
          <div className="px-3 py-2 rounded-2xl bg-slate-50 border border-slate-200">
            <p className="text-[11px] uppercase tracking-[0.16em] text-slate-600">
              Registros
            </p>
            <p className="text-sm font-semibold text-slate-700">
              {meta.total} total
              {meta.totalPages > 1 && (
                <span className="text-[11px] text-slate-600">
                  {' '}
                  · pág. {meta.page}/{meta.totalPages}
                </span>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="rounded-2xl bg-slate-50 border border-slate-200 px-4 py-3 md:px-5 md:py-4 flex flex-col md:flex-row md:items-end gap-3">
        <div className="flex-1">
          <label className="block text-xs font-medium text-slate-600 mb-1">
            Buscar
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600">
              <FaSearch className="h-4 w-4" />
            </span>
            <input
              type="text"
              value={q}
              onChange={handleBuscarChange}
              placeholder="Nombre o documento del cliente…"
              className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-800
                         placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/40 focus:border-transparent"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">
            Desde
          </label>
          <input
            type="date"
            value={fechaDesde}
            onChange={handleFechaDesdeChange}
            className="w-full md:w-40 px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-800
                       focus:outline-none focus:ring-2 focus:ring-emerald-400/40 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">
            Hasta
          </label>
          <input
            type="date"
            value={fechaHasta}
            onChange={handleFechaHastaChange}
            className="w-full md:w-40 px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-800
                       focus:outline-none focus:ring-2 focus:ring-emerald-400/40 focus:border-transparent"
          />
        </div>

        <div className="flex items-center gap-2 text-slate-600 text-[11px] md:ml-2">
          <FaFilter className="h-3 w-3" />
          Los filtros se aplican automáticamente.
        </div>
      </div>

      {/* Tabla / listado */}
      <div className="flex-1 rounded-2xl bg-white border border-slate-200 overflow-hidden flex flex-col">
        {loading && (
          <div className="flex-1 flex items-center justify-center text-sm text-slate-500">
            Cargando cobranzas…
          </div>
        )}

        {!loading && error && (
          <div className="flex-1 flex items-center justify-center text-sm text-rose-600 px-4 text-center">
            {error}
          </div>
        )}

        {!loading && !error && rows.length === 0 && (
          <div className="flex-1 flex items-center justify-center text-sm text-slate-500 px-4 text-center">
            No se encontraron cobranzas con los filtros actuales.
          </div>
        )}

        {!loading && !error && rows.length > 0 && (
          <>
            <div className="hidden md:grid grid-cols-[120px_minmax(0,1.3fr)_minmax(0,1fr)_120px_auto] gap-3 px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-600 border-b border-slate-200 bg-slate-50">
              <span>Fecha</span>
              <span>Cliente</span>
              <span>Observaciones</span>
              <span className="text-right">Total cobrado</span>
              <span className="text-right">Acciones</span>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
              {rows.map((row) => (
                <div
                  key={row.id}
                  className="px-4 py-3 hover:bg-slate-50 transition flex flex-col md:grid md:grid-cols-[120px_minmax(0,1.3fr)_minmax(0,1fr)_120px_auto] md:items-center gap-2 md:gap-3 text-xs text-slate-700"
                >
                  {/* Fecha */}
                  <div className="md:text-left text-[11px] text-slate-500">
                    {fmtFecha(row.fecha)}
                  </div>

                  {/* Cliente */}
                  <div className="flex flex-col">
                    <span className="font-semibold text-slate-800 inline-flex items-center gap-2">
                      {row.cliente?.nombre || '—'}
                      {row.estado === 'anulada' && (
                        <span className="inline-flex items-center rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-rose-700">
                          Anulada
                        </span>
                      )}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      {row.cliente?.documento
                        ? `DNI/CUIT: ${row.cliente.documento}`
                        : 'Sin documento'}
                      {row.medio_pago ? ` · ${medioPagoLabel(row.medio_pago)}` : ''}
                    </span>
                  </div>

                  {/* Observaciones */}
                  <div className="hidden md:block text-[11px] text-slate-500 truncate">
                    {row.observaciones || '—'}
                  </div>
                  <div className="md:hidden text-[11px] text-slate-500">
                    {row.observaciones || 'Sin observaciones'}
                  </div>

                  {/* Total cobrado */}
                  <div
                    className={`md:text-right font-semibold ${
                      row.estado === 'anulada'
                        ? 'text-slate-600 line-through'
                        : 'text-emerald-600'
                    }`}
                  >
                    {moneyAR(row.total_cobrado)}
                  </div>

                  {/* Acciones */}
                  <div className="flex md:justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => handleVerDetalle(row.id)}
                      className="inline-flex items-center justify-center px-3 py-1.5 rounded-xl text-[11px] sm:text-xs
                                 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 font-semibold transition"
                    >
                      Ver detalle
                    </button>
                    {row.estado !== 'anulada' && (
                      <button
                        type="button"
                        onClick={() => handleAnular(row)}
                        disabled={anulandoId === row.id}
                        className="inline-flex items-center justify-center px-3 py-1.5 rounded-xl text-[11px] sm:text-xs
                                   bg-rose-100 hover:bg-rose-200 text-rose-700 font-semibold transition
                                   disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {anulandoId === row.id ? 'Anulando…' : 'Anular'}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Paginación */}
            <div className="border-t border-slate-200 px-4 py-2 flex items-center justify-between text-[11px] text-slate-500">
              <span>
                Mostrando{' '}
                <strong>
                  {rows.length} / {meta.total}
                </strong>{' '}
                cobranzas
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={!canPrev}
                  onClick={() => canPrev && setPage((p) => p - 1)}
                  className="inline-flex items-center justify-center h-7 w-7 rounded-full border border-slate-200
                             hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  <FaChevronLeft className="h-3 w-3" />
                </button>
                <span>
                  pág. {meta.page || 1} / {meta.totalPages || 1}
                </span>
                <button
                  type="button"
                  disabled={!canNext}
                  onClick={() => canNext && setPage((p) => p + 1)}
                  className="inline-flex items-center justify-center h-7 w-7 rounded-full border border-slate-200
                             hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  <FaChevronRight className="h-3 w-3" />
                </button>
              </div>
            </div>
          </>
        )}
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
            <div className="flex-1 bg-slate-900/40" onClick={handleCerrarDetalle} />
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
                    Detalle de cobranza
                  </p>
                  <p className="text-lg font-semibold">
                    Cobranza #{detalle?.id ?? '—'}
                  </p>
                </div>
                <button
                  onClick={handleCerrarDetalle}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 transition"
                >
                  <FaTimes className="text-sm text-slate-500" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
                {detalleLoading && (
                  <p className="text-sm text-slate-500">Cargando detalle...</p>
                )}

                {!detalleLoading && detalle && (
                  <>
                    {/* Cabecera */}
                    <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-slate-500">Fecha</span>
                        <span className="text-sm font-medium">
                          {fmtFecha(detalle.fecha)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-slate-500">
                          Total cobrado
                        </span>
                        <span className="text-lg font-bold text-emerald-600">
                          {moneyAR(detalle.total_cobrado || 0)}
                        </span>
                      </div>
                      {detalle.observaciones && (
                        <div className="pt-2 border-t border-slate-200 mt-2">
                          <span className="text-xs text-slate-500">
                            Observaciones:
                          </span>
                          <p className="text-xs text-slate-700">
                            {detalle.observaciones}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Cliente */}
                    <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-1">
                      <p className="text-sm font-semibold mb-1">Cliente</p>
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
                    </div>

                    {/* Aplicaciones */}
                    <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200">
                      <p className="text-sm font-semibold mb-3">
                        Aplicaciones a ventas
                      </p>
                      {(!detalle.aplicaciones ||
                        detalle.aplicaciones.length === 0) && (
                        <p className="text-xs text-slate-500">
                          No hay aplicaciones registradas (crédito libre o sin
                          detalle).
                        </p>
                      )}
                      {detalle.aplicaciones &&
                        detalle.aplicaciones.length > 0 && (
                          <div className="space-y-2 text-xs">
                            {detalle.aplicaciones.map((app) => (
                              <div
                                key={app.id}
                                className="flex justify-between gap-2 border-b border-slate-200 pb-1.5 last:border-0 last:pb-0"
                              >
                                <div className="flex-1">
                                  <p className="font-medium">
                                    {app.venta
                                      ? `Venta #${app.venta.id} · ${fmtFecha(
                                          app.venta.fecha
                                        )}`
                                      : 'Crédito sin venta asociada'}
                                  </p>
                                  {app.venta && (
                                    <p className="text-slate-600">
                                      {app.venta.tipo || '—'} · Estado:{' '}
                                      {app.venta.estado || '—'} · Total venta:{' '}
                                      {moneyAR(app.venta.total_neto || 0)}
                                    </p>
                                  )}
                                </div>
                                <div className="text-right font-semibold text-emerald-600">
                                  {moneyAR(app.monto_aplicado)}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
