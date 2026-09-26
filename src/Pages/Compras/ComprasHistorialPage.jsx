// src/Pages/Compras/ComprasHistorialPage.jsx
import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import AppShell from '../../Components/Layout/AppShell';
import { motion } from 'framer-motion';
import { FaPlus, FaBan, FaSearch, FaArrowLeft } from 'react-icons/fa';

import CompraFormModal from '../../Components/Compras/CompraFormModal';
import CompraDetalleModal from '../../Components/Compras/CompraDetalleModal';
import { listCompras, createCompra, anularCompra } from '../../api/compras.js';
import {
  showErrorSwal,
  showWarnSwal,
  showSuccessSwal,
  showConfirmSwal
} from '../../ui/swal';
import moneyAR from '../../utils/money';
import useDebouncedValue from '../../hooks/useDebouncedValue';
import { quitarDelBorrador } from '../../utils/pedidoReposicionBorrador';

export default function ComprasHistorialPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [detalleCompraId, setDetalleCompraId] = useState(null);
  // Compra precargada que llega desde el listado de reposición ("Pasar a compra")
  const location = useLocation();
  const [precarga, setPrecarga] = useState(null);

  useEffect(() => {
    const data = location.state?.compraPrecargada;
    if (!data) return;
    setPrecarga(data);
    setModalOpen(true);
    // Limpiamos el state para que al recargar la página no se vuelva a abrir
    navigate(location.pathname, { replace: true, state: null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Filtros de búsqueda
  const [q, setQ] = useState('');
  const dq = useDebouncedValue(q, 500);
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [tipoPago, setTipoPago] = useState(''); // '' | contado | cuenta_corriente

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = { page, limit: 15 };
      if (dq) params.q = dq;
      if (desde) params.desde = desde;
      if (hasta) params.hasta = hasta;
      if (tipoPago) params.tipo_pago = tipoPago;

      const resp = await listCompras(params);
      setRows(resp?.data || []);
      setMeta(resp?.meta || null);
    } catch (e) {
      console.error(e);
      await showErrorSwal({ title: 'Error', text: 'No se pudieron cargar las compras' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(); // eslint-disable-next-line
  }, [page, dq, desde, hasta, tipoPago]);

  // Al cambiar un filtro, volvemos a la página 1
  useEffect(() => {
    setPage(1);
  }, [dq, desde, hasta, tipoPago]);

  const onSubmit = async (payload) => {
    try {
      // Compra de un pedido de reposición guardado → el backend lo marca "recibido"
      const pedidoId = precarga?.origen === 'pedido' ? precarga.pedido_id : null;
      await createCompra(pedidoId ? { ...payload, pedido_reposicion_id: pedidoId } : payload);
      // Lo que se compró sale del pedido de reposición en armado
      if (precarga?.origen === 'reposicion') {
        quitarDelBorrador(payload.items.map((it) => it.producto_id));
      }
      await showSuccessSwal({
        title: 'Compra registrada',
        text: pedidoId
          ? `Stock y cuenta corriente actualizados. El pedido de reposición #${pedidoId} quedó como recibido.`
          : 'Stock y cuenta corriente actualizados.'
      });
      await fetchData();
      setModalOpen(false);
    } catch (err) {
      const { code, mensajeError, tips } = err || {};
      if (code === 'BAD_REQUEST' || code === 'NOT_FOUND') {
        return showWarnSwal({ title: 'Datos inválidos', text: mensajeError, tips });
      }
      return showErrorSwal({
        title: 'No se pudo registrar la compra',
        text: mensajeError || 'Ocurrió un error inesperado',
        tips
      });
    }
  };

  const onAnular = async (compra) => {
    const ok = await showConfirmSwal({
      title: 'Anular compra',
      text: `¿Anular la compra #${compra.id}? Se revertirá el stock ingresado.`
    });
    if (!ok) return;

    try {
      await anularCompra(compra.id);
      await showSuccessSwal({ title: 'Compra anulada', text: 'Stock y cuenta corriente revertidos.' });
      await fetchData();
    } catch (err) {
      const { code, mensajeError, tips } = err || {};
      if (code === 'PURCHASE_HAS_PAYMENTS') {
        return showWarnSwal({ title: 'No se puede anular', text: mensajeError, tips });
      }
      return showErrorSwal({
        title: 'No se pudo anular',
        text: mensajeError || 'Ocurrió un error inesperado',
        tips
      });
    }
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
          Compras a proveedores
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mt-1 text-sm text-slate-500"
        >
          Cada compra suma stock automáticamente y, si es a cuenta corriente, genera deuda con el proveedor.
        </motion.p>

        <div className="mt-6 space-y-6">
          {/* Filtros + acción */}
          <div className="flex flex-col lg:flex-row gap-3 lg:items-end lg:justify-between">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 flex-1">
              <div className="relative sm:col-span-2 lg:col-span-1">
                <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="N° factura o proveedor…"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-800
                             placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-400/40"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-wide text-slate-600 mb-1">Desde</label>
                <input
                  type="date"
                  value={desde}
                  onChange={(e) => setDesde(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-400/40"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-wide text-slate-600 mb-1">Hasta</label>
                <input
                  type="date"
                  value={hasta}
                  onChange={(e) => setHasta(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-400/40"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-wide text-slate-600 mb-1">Tipo de pago</label>
                <select
                  value={tipoPago}
                  onChange={(e) => setTipoPago(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-400/40"
                >
                  <option value="">Todos</option>
                  <option value="contado">Contado</option>
                  <option value="cuenta_corriente">Cuenta corriente</option>
                </select>
              </div>
            </div>

            <button
              onClick={() => setModalOpen(true)}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold transition shrink-0"
            >
              <FaPlus /> Nueva compra
            </button>
          </div>

          {loading ? (
            <div className="text-center text-slate-600 py-16">Cargando…</div>
          ) : rows.length === 0 ? (
            <div className="text-center text-slate-600 py-16">No hay compras registradas.</div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
              <table className="w-full text-sm text-left text-slate-700">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-3">#</th>
                    <th className="px-4 py-3">Proveedor</th>
                    <th className="px-4 py-3">Fecha</th>
                    <th className="px-4 py-3">Factura</th>
                    <th className="px-4 py-3">Pago</th>
                    <th className="px-4 py-3 text-right">Total</th>
                    <th className="px-4 py-3">Estado</th>
                    <th className="px-4 py-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((c) => (
                    <tr
                      key={c.id}
                      onClick={() => setDetalleCompraId(c.id)}
                      className="border-t border-slate-200 hover:bg-slate-50 cursor-pointer transition"
                    >
                      <td className="px-4 py-3">{c.id}</td>
                      <td className="px-4 py-3">{c.proveedor?.razon_social || '—'}</td>
                      <td className="px-4 py-3">
                        {c.fecha ? new Date(c.fecha).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-4 py-3">{c.nro_factura || '—'}</td>
                      <td className="px-4 py-3">
                        {c.tipo_pago === 'contado' ? 'Contado' : 'Cta. cte.'}
                      </td>
                      <td className="px-4 py-3 text-right">{moneyAR(c.total)}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-1 rounded-full text-xs border ${
                            c.estado === 'anulada'
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          }`}
                        >
                          {c.estado === 'anulada' ? 'Anulada' : 'Confirmada'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {c.estado !== 'anulada' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onAnular(c);
                            }}
                            className="inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 transition"
                          >
                            <FaBan /> Anular
                          </button>
                        )}
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
                disabled={!meta.hasPrev}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
              >
                Anterior
              </button>
              <span className="text-slate-500 text-sm">
                Página {meta.page} de {meta.totalPages}
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
      </div>

      <CompraFormModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setPrecarga(null);
        }}
        onSubmit={onSubmit}
        initialData={precarga}
      />

      <CompraDetalleModal
        open={detalleCompraId != null}
        onClose={() => setDetalleCompraId(null)}
        compraId={detalleCompraId}
      />
    </AppShell>
  );
}
