// src/Pages/Stock/TransferenciasPage.jsx
// Transferencias de stock entre sucursales: las enviadas y recibidas por la sucursal activa (el administrador
// y el contador ven todas si no eligen una). Se crean desde la sucursal de origen y se pueden anular mientras
// la sucursal de destino conserve el stock.
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowLeftRight, Plus, Eye, Ban } from 'lucide-react';
import AppShell from '../../Components/Layout/AppShell';
import NuevaTransferenciaModal from '../../Components/Stock/NuevaTransferenciaModal';
import { listTransferencias, getTransferencia, anularTransferencia } from '../../api/stock.js';
import { listLocales } from '../../api/locales.js';
import { useAuth } from '../../AuthContext';
import { getSucursalActivaId, veTodasLasSucursales } from '../../utils/sucursalActiva';
import { showErrorSwal, showConfirmSwal, showSuccessSwal, baseSwal } from '../../ui/swal';

const fechaCorta = (f) => (f ? new Date(f).toLocaleDateString('es-AR') : '—');
const aLista = (r) => (Array.isArray(r) ? r : r?.data || []);

export default function TransferenciasPage() {
  const { userLevel, userLocalId } = useAuth();
  const puedeEscribir = String(userLevel || '').toLowerCase() !== 'vendedor';
  const veTodas = veTodasLasSucursales(userLevel);
  const elegida = getSucursalActivaId();
  const miSucursalId = veTodas ? (/^\d+$/.test(elegida) ? Number(elegida) : null) : Number(userLocalId);

  const [filas, setFilas] = useState([]);
  const [locales, setLocales] = useState([]);
  const [direccion, setDireccion] = useState('');
  const [estado, setEstado] = useState('');
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const r = await listTransferencias({ direccion, estado, limit: 100 });
      setFilas(r?.data || []);
    } catch (err) {
      await showErrorSwal({ title: 'No se pudieron obtener las transferencias', text: err?.mensajeError || 'Ocurrió un error inesperado', tips: err?.tips });
    } finally {
      setLoading(false);
    }
  }, [direccion, estado]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  useEffect(() => {
    (async () => {
      try {
        setLocales(aLista(await listLocales({ limit: 200 })));
      } catch {
        setLocales([]);
      }
    })();
  }, []);

  const destinos = useMemo(() => locales.filter((l) => l.estado === 'activo' && l.id !== miSucursalId), [locales, miSucursalId]);

  const verDetalle = async (t) => {
    try {
      const d = await getTransferencia(t.id);
      await baseSwal.fire({
        title: `Transferencia #${d.id}`,
        html: `<div style="text-align:left;font-size:14px">
          <p><b>${d.origen_nombre}</b> → <b>${d.destino_nombre}</b> · ${fechaCorta(d.fecha)}</p>
          ${d.observaciones ? `<p>${String(d.observaciones).replace(/</g, '&lt;')}</p>` : ''}
          <ul style="margin-top:8px">${(d.items || []).map((i) => `<li>${Number(i.cantidad)} × ${String(i.producto).replace(/</g, '&lt;')}</li>`).join('')}</ul>
          ${d.estado === 'anulada' ? `<p style="margin-top:8px;color:#b91c1c">Anulada${d.motivo_anulacion ? `: ${String(d.motivo_anulacion).replace(/</g, '&lt;')}` : ''}</p>` : ''}
        </div>`,
        confirmButtonText: 'Cerrar'
      });
    } catch (err) {
      await showErrorSwal({ title: 'No se pudo abrir la transferencia', text: err?.mensajeError || 'Ocurrió un error inesperado' });
    }
  };

  const anular = async (t) => {
    const ok = await showConfirmSwal({
      title: `¿Anular la transferencia #${t.id}?`,
      text: `El stock vuelve a ${t.origen_nombre}. Solo se puede si ${t.destino_nombre} todavía lo tiene.`,
      confirmText: 'Sí, anular'
    });
    if (!ok) return;
    try {
      await anularTransferencia(t.id, 'Anulada desde el sistema');
      await showSuccessSwal({ title: 'Transferencia anulada', text: 'El stock volvió a la sucursal de origen.' });
      cargar();
    } catch (err) {
      await showErrorSwal({ title: 'No se pudo anular', text: err?.mensajeError || 'Ocurrió un error inesperado', tips: err?.tips });
    }
  };

  const puedeAnular = (t) => puedeEscribir && t.estado === 'confirmada' && (veTodas ? true : Number(t.origen_local_id) === miSucursalId);

  return (
    <AppShell>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold uppercase tracking-tight text-slate-900 flex items-center gap-2.5">
              <ArrowLeftRight className="h-7 w-7 text-teal-600 shrink-0" /> Transferencias de stock
            </h1>
            <p className="mt-1 text-sm text-slate-500">Mové mercadería de una sucursal a otra: sale del origen y entra al destino en el acto.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link to="/dashboard" className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50 transition">
              <ArrowLeft className="h-4 w-4" /> Volver
            </Link>
            {puedeEscribir && (
              <button
                onClick={() => setModalOpen(true)}
                disabled={miSucursalId == null}
                title={miSucursalId == null ? 'Elegí una sucursal de origen arriba a la izquierda' : undefined}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-teal-600 text-sm font-semibold text-white hover:bg-teal-700 transition disabled:opacity-50"
              >
                <Plus className="h-4 w-4" /> Nueva transferencia
              </button>
            )}
          </div>
        </div>

        {miSucursalId == null && puedeEscribir && (
          <p className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Estás viendo todas las sucursales. Para transferir, elegí la sucursal de origen en el selector del menú.
          </p>
        )}

        <div className="mb-4 flex flex-wrap gap-2">
          <select value={direccion} onChange={(e) => setDireccion(e.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" aria-label="Dirección">
            <option value="">Enviadas y recibidas</option>
            <option value="enviadas">Enviadas</option>
            <option value="recibidas">Recibidas</option>
          </select>
          <select value={estado} onChange={(e) => setEstado(e.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" aria-label="Estado">
            <option value="">Todos los estados</option>
            <option value="confirmada">Confirmadas</option>
            <option value="anulada">Anuladas</option>
          </select>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
          <table className="w-full text-sm text-left text-slate-700">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">#</th>
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3">Origen</th>
                <th className="px-4 py-3">Destino</th>
                <th className="px-4 py-3 text-right">Productos</th>
                <th className="px-4 py-3 text-right">Unidades</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="px-4 py-10 text-center text-slate-500">Cargando…</td></tr>
              ) : filas.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-10 text-center text-slate-500">No hay transferencias.</td></tr>
              ) : (
                filas.map((t) => (
                  <tr key={t.id} className="border-t border-slate-100">
                    <td className="px-4 py-3 font-semibold">{t.id}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{fechaCorta(t.fecha)}</td>
                    <td className="px-4 py-3">{t.origen_nombre}</td>
                    <td className="px-4 py-3">{t.destino_nombre}</td>
                    <td className="px-4 py-3 text-right">{t.productos}</td>
                    <td className="px-4 py-3 text-right">{t.unidades}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${t.estado === 'anulada' ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'}`}>
                        {t.estado === 'anulada' ? 'Anulada' : 'Confirmada'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => verDetalle(t)} title="Ver detalle" className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100">
                          <Eye className="h-4 w-4" />
                        </button>
                        {puedeAnular(t) && (
                          <button onClick={() => anular(t)} title="Anular" className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 hover:bg-rose-50 hover:text-rose-600">
                            <Ban className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <NuevaTransferenciaModal
        open={modalOpen}
        destinos={destinos}
        onClose={() => setModalOpen(false)}
        onCreada={() => {
          setModalOpen(false);
          cargar();
        }}
      />
    </AppShell>
  );
}
