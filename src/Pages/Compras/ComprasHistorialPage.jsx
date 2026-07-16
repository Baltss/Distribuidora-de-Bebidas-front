// src/Pages/Compras/ComprasHistorialPage.jsx
import React, { useEffect, useState } from 'react';
import NavbarStaff from '../Dash/NavbarStaff';
import '../../Styles/staff/dashboard.css';
import '../../Styles/staff/background.css';
import ParticlesBackground from '../../Components/ParticlesBackground';
import ButtonBack from '../../Components/ButtonBack';
import { motion } from 'framer-motion';
import { FaPlus, FaBan, FaSearch } from 'react-icons/fa';

import CompraFormModal from '../../Components/Compras/CompraFormModal';
import { listCompras, createCompra, anularCompra } from '../../api/compras.js';
import {
  showErrorSwal,
  showWarnSwal,
  showSuccessSwal,
  showConfirmSwal
} from '../../ui/swal';
import moneyAR from '../../utils/money';
import useDebouncedValue from '../../hooks/useDebouncedValue';

export default function ComprasHistorialPage() {
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);

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
      await createCompra(payload);
      await showSuccessSwal({ title: 'Compra registrada', text: 'Stock y cuenta corriente actualizados.' });
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
    <>
      <NavbarStaff />
      <section className="relative w-full min-h-screen bg-white">
        <div className="min-h-screen bg-gradient-to-b from-[#001219] via-[#013a2e] to-[#05684f]">
          <ParticlesBackground />
          <ButtonBack />

          <div className="text-center pt-24 px-4">
            <motion.h1
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-4xl titulo uppercase font-bold text-white mb-3 drop-shadow-md"
            >
              Compras a proveedores
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-sm sm:text-base text-gray-200/80 max-w-2xl mx-auto"
            >
              Cada compra suma stock automáticamente y, si es a cuenta corriente, genera deuda con el proveedor.
            </motion.p>
          </div>

          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
            {/* Filtros + acción */}
            <div className="flex flex-col lg:flex-row gap-3 lg:items-end lg:justify-between">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 flex-1">
                <div className="relative sm:col-span-2 lg:col-span-1">
                  <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="N° factura o proveedor…"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-white/10 bg-white/10 text-white
                               placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-cyan-300/40"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-wide text-gray-300 mb-1">Desde</label>
                  <input
                    type="date"
                    value={desde}
                    onChange={(e) => setDesde(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-white/10 bg-white/10 text-white focus:outline-none focus:ring-2 focus:ring-cyan-300/40"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-wide text-gray-300 mb-1">Hasta</label>
                  <input
                    type="date"
                    value={hasta}
                    onChange={(e) => setHasta(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-white/10 bg-white/10 text-white focus:outline-none focus:ring-2 focus:ring-cyan-300/40"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-wide text-gray-300 mb-1">Tipo de pago</label>
                  <select
                    value={tipoPago}
                    onChange={(e) => setTipoPago(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-white/10 bg-white/10 text-white focus:outline-none focus:ring-2 focus:ring-cyan-300/40"
                  >
                    <option value="" className="text-black">Todos</option>
                    <option value="contado" className="text-black">Contado</option>
                    <option value="cuenta_corriente" className="text-black">Cuenta corriente</option>
                  </select>
                </div>
              </div>

              <button
                onClick={() => setModalOpen(true)}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-500 text-white font-semibold hover:brightness-110 transition shrink-0"
              >
                <FaPlus /> Nueva compra
              </button>
            </div>

            {loading ? (
              <div className="text-center text-white/80 py-16">Cargando…</div>
            ) : rows.length === 0 ? (
              <div className="text-center text-white/80 py-16">No hay compras registradas.</div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl">
                <table className="w-full text-sm text-left text-gray-100">
                  <thead className="bg-white/10 text-xs uppercase text-gray-300">
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
                      <tr key={c.id} className="border-t border-white/10">
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
                            className={`px-2 py-1 rounded-full text-xs ${
                              c.estado === 'anulada'
                                ? 'bg-rose-500/20 text-rose-300'
                                : 'bg-emerald-500/20 text-emerald-300'
                            }`}
                          >
                            {c.estado === 'anulada' ? 'Anulada' : 'Confirmada'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          {c.estado !== 'anulada' && (
                            <button
                              onClick={() => onAnular(c)}
                              className="inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border border-rose-300/30 text-rose-300 hover:bg-rose-500/10 transition"
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
                  className="px-4 py-2 rounded-xl border border-white/10 text-white disabled:opacity-40"
                >
                  Anterior
                </button>
                <span className="text-white/80 text-sm">
                  Página {meta.page} de {meta.totalPages}
                </span>
                <button
                  disabled={!meta.hasNext}
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

      <CompraFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={onSubmit}
      />
    </>
  );
}
