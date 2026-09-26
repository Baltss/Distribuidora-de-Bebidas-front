// src/Components/Reposicion/PedidosGuardadosPanel.jsx
// Pedidos de reposición guardados: pendientes (para pasar a compra, editar,
// exportar o anular), recibidos y anulados.
import React, { useCallback, useEffect, useState } from 'react';
import { FileSpreadsheet, FileText, ShoppingCart, Pencil, Ban, Truck } from 'lucide-react';
import {
  listPedidosReposicion,
  getPedidoReposicion,
  anularPedidoReposicion
} from '../../api/pedidosReposicion.js';
import { exportReposicionXlsx, exportReposicionPdf } from '../../api/productos.js';
import { showErrorSwal, showConfirmSwal, showSuccessToast } from '../../ui/swal';
import moneyAR from '../../utils/money';
import { formatFechaSolo } from '../../utils/fechaAR';

const btnCls =
  'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition disabled:opacity-60';

const ESTADOS = [
  { value: 'pendiente', label: 'Pendientes' },
  { value: 'recibido', label: 'Recibidos' },
  { value: 'anulado', label: 'Anulados' }
];

export default function PedidosGuardadosPanel({ onEditar, onPasarACompra, onCambio, recargar }) {
  const [estado, setEstado] = useState('pendiente');
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ocupado, setOcupado] = useState(null); // `${id}:${accion}`

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const resp = await listPedidosReposicion({ estado });
      setPedidos(resp?.data || []);
      onCambio?.(resp?.pendientes ?? 0);
    } catch (err) {
      setPedidos([]);
      showErrorSwal({
        title: 'No se pudieron cargar los pedidos',
        text: err?.mensajeError || 'Ocurrió un error inesperado'
      });
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estado]);

  useEffect(() => {
    cargar();
  }, [cargar, recargar]);

  // Trae el detalle (con datos actuales de cada producto) y ejecuta la acción
  const conDetalle = async (p, accion, fn) => {
    setOcupado(`${p.id}:${accion}`);
    try {
      const resp = await getPedidoReposicion(p.id);
      await fn(resp.pedido);
    } catch (err) {
      await showErrorSwal({
        title: 'No se pudo completar la acción',
        text:
          err?.details?.status === 404
            ? 'No hay productos para exportar en este pedido.'
            : err?.mensajeError || 'Ocurrió un error inesperado'
      });
    } finally {
      setOcupado(null);
    }
  };

  const exportar = (p, tipo) =>
    conDetalle(p, tipo, async (pedido) => {
      const items = pedido.items.map((it) => `${it.producto_id}:${it.cantidad}`).join(',');
      await (tipo === 'pdf' ? exportReposicionPdf({ items }) : exportReposicionXlsx({ items }));
    });

  const anular = async (p) => {
    const ok = await showConfirmSwal({
      title: `Anular pedido #${p.id}`,
      text: `¿Anular el pedido${p.proveedor ? ` a ${p.proveedor}` : ''}? No afecta stock ni compras.`,
      confirmText: 'Sí, anular',
      icon: 'warning'
    });
    if (!ok) return;
    setOcupado(`${p.id}:anular`);
    try {
      await anularPedidoReposicion(p.id);
      showSuccessToast('Pedido anulado');
      await cargar();
    } catch (err) {
      await showErrorSwal({
        title: 'No se pudo anular',
        text: err?.mensajeError || 'Ocurrió un error inesperado'
      });
      await cargar();
    } finally {
      setOcupado(null);
    }
  };

  const esOcupado = (p, accion) => ocupado === `${p.id}:${accion}`;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-slate-100 bg-slate-50">
        <div className="inline-flex rounded-xl border border-slate-200 bg-white p-0.5">
          {ESTADOS.map((e) => (
            <button
              key={e.value}
              onClick={() => setEstado(e.value)}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition ${
                estado === e.value ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              {e.label}
            </button>
          ))}
        </div>
        <span className="text-sm text-slate-500">
          {pedidos.length} pedido{pedidos.length === 1 ? '' : 's'}
        </span>
      </div>

      {loading ? (
        <div className="px-4 py-10 text-center text-slate-400">Cargando…</div>
      ) : pedidos.length === 0 ? (
        <div className="px-4 py-10 text-center text-slate-500">
          {estado === 'pendiente'
            ? 'No hay pedidos pendientes. Armá uno en “Armar pedido” y tocá “Guardar pedido”.'
            : `No hay pedidos ${estado === 'recibido' ? 'recibidos' : 'anulados'}.`}
        </div>
      ) : (
        <ul className="divide-y divide-slate-100">
          {pedidos.map((p) => (
            <li key={p.id} className="px-4 py-4 flex flex-col lg:flex-row lg:items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="font-bold text-slate-900">Pedido #{p.id}</span>
                  <span className="text-xs text-slate-400">{formatFechaSolo(p.created_at)}</span>
                  <span className="inline-flex items-center gap-1 text-sm text-slate-700">
                    <Truck className="h-3.5 w-3.5 text-slate-400" />
                    {p.proveedor || <span className="text-slate-400">Proveedor sin definir</span>}
                  </span>
                </div>
                <div className="mt-0.5 text-sm text-slate-600">
                  {p.cant_productos} producto{p.cant_productos === 1 ? '' : 's'} · {p.unidades}{' '}
                  unidad
                  {p.unidades === 1 ? '' : 'es'} · Total estimado{' '}
                  <span className="font-semibold text-slate-800">{moneyAR(p.total_estimado)}</span>
                  {p.sin_costo > 0 && (
                    <span className="text-xs text-amber-600"> ({p.sin_costo} sin costo)</span>
                  )}
                </div>
                {p.observaciones && (
                  <div className="mt-0.5 text-xs text-slate-500 italic">“{p.observaciones}”</div>
                )}
                {p.estado === 'recibido' && (
                  <div className="mt-0.5 text-xs text-emerald-700">
                    Recibido el {formatFechaSolo(p.fecha_recibido)}
                    {p.compra_id ? ` en la compra #${p.compra_id}` : ''}
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                {p.estado === 'pendiente' && (
                  <>
                    <button
                      onClick={() => conDetalle(p, 'compra', onPasarACompra)}
                      disabled={!!ocupado}
                      className={`${btnCls} border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700`}
                    >
                      <ShoppingCart className="h-3.5 w-3.5" />
                      {esOcupado(p, 'compra') ? 'Abriendo…' : 'Pasar a compra'}
                    </button>
                    <button
                      onClick={() => conDetalle(p, 'editar', onEditar)}
                      disabled={!!ocupado}
                      className={`${btnCls} border-slate-200 bg-white text-slate-700 hover:bg-slate-50`}
                    >
                      <Pencil className="h-3.5 w-3.5" /> Editar
                    </button>
                  </>
                )}
                <button
                  onClick={() => exportar(p, 'pdf')}
                  disabled={!!ocupado}
                  className={`${btnCls} border-slate-200 bg-white text-slate-700 hover:bg-slate-50`}
                >
                  <FileText className="h-3.5 w-3.5 text-blue-600" />
                  {esOcupado(p, 'pdf') ? 'Generando…' : 'PDF'}
                </button>
                <button
                  onClick={() => exportar(p, 'xlsx')}
                  disabled={!!ocupado}
                  className={`${btnCls} border-slate-200 bg-white text-slate-700 hover:bg-slate-50`}
                >
                  <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
                  {esOcupado(p, 'xlsx') ? 'Exportando…' : 'Excel'}
                </button>
                {p.estado === 'pendiente' && (
                  <button
                    onClick={() => anular(p)}
                    disabled={!!ocupado}
                    className={`${btnCls} border-rose-200 bg-white text-rose-600 hover:bg-rose-50`}
                  >
                    <Ban className="h-3.5 w-3.5" /> Anular
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
