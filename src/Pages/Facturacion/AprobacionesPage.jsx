// src/Pages/Facturacion/AprobacionesPage.jsx
//
// Pantalla exclusiva del rol 'soldi_admin': revisa las solicitudes de
// Datos Fiscales pendientes y las aprueba o las rechaza con un motivo.
//
// "Aprobar" no espera a AFIP: el backend responde al toque con la fila en
// estado 'verificando' y la prueba real contra el certificado corre en
// background (puede tardar varios minutos, sobre todo en Homologación).
// Mientras haya alguna fila 'verificando', esta pantalla hace polling
// hasta que el backend la resuelva sola (aprobada, o vuelta a pendiente
// con el motivo del error) — o hasta que el admin la cancele a mano.
import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ClipboardCheck, Loader2 } from 'lucide-react';

import AppShell from '../../Components/Layout/AppShell';
import MotivoModal from '../../Components/Facturacion/MotivoModal';

import {
  listConfiguracionFiscalPendientes,
  aprobarConfiguracionFiscal,
  cancelarVerificacionConfiguracionFiscal,
  rechazarConfiguracionFiscal
} from '../../api/facturacion';
import { showApiErrorSwal, showSuccessSwal, showConfirmSwal } from '../../ui/swal';

const POLL_MS = 4000;

export default function AprobacionesPage() {
  const [pendientes, setPendientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [aprobandoId, setAprobandoId] = useState(null);
  const [cancelandoId, setCancelandoId] = useState(null);
  const [rechazarTarget, setRechazarTarget] = useState(null);

  const fetchPendientes = async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    try {
      const data = await listConfiguracionFiscalPendientes();
      const nueva = Array.isArray(data) ? data : [];

      // Compara contra lo que había antes de este fetch para avisar apenas
      // una verificación en curso termina sola (aprobada, o rechazada por AFIP).
      const veniaVerificando = pendientes.filter((p) => p.estado === 'verificando');
      for (const anterior of veniaVerificando) {
        const actual = nueva.find((p) => p.id === anterior.id);
        if (!actual) {
          showSuccessSwal({ title: 'Aprobada', text: `CUIT ${anterior.cuit} quedó activa.` });
        } else if (actual.estado === 'pendiente_aprobacion' && actual.motivo_error_verificacion) {
          showApiErrorSwal(
            { mensajeError: actual.motivo_error_verificacion },
            { title: 'No se pudo aprobar' }
          );
        }
      }

      setPendientes(nueva);
    } catch (err) {
      if (!silent) await showApiErrorSwal(err, { title: 'No se pudieron cargar las solicitudes' });
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendientes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Mientras haya alguna fila 'verificando', reconsulta cada POLL_MS hasta
  // que el backend la resuelva (o el admin la cancele).
  useEffect(() => {
    const hayVerificando = pendientes.some((p) => p.estado === 'verificando');
    if (!hayVerificando) return undefined;
    const interval = setInterval(() => fetchPendientes({ silent: true }), POLL_MS);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendientes]);

  const handleAprobar = async (config) => {
    if (!config.tiene_certificado) {
      await showApiErrorSwal(
        { mensajeError: 'Todavía no se cargó el certificado de AFIP para esta solicitud.' },
        { title: 'Falta el certificado' }
      );
      return;
    }
    const confirmed = await showConfirmSwal({
      title: '¿Aprobar esta Configuración Fiscal?',
      text: `CUIT ${config.cuit} — la verificación contra AFIP corre en segundo plano y puede tardar unos minutos.`,
      icon: 'question',
      confirmText: 'Sí, aprobar'
    });
    if (!confirmed) return;

    try {
      setAprobandoId(config.id);
      await aprobarConfiguracionFiscal(config.id);
      await fetchPendientes();
    } catch (err) {
      await showApiErrorSwal(err, { title: 'No se pudo iniciar la aprobación' });
    } finally {
      setAprobandoId(null);
    }
  };

  const handleCancelarVerificacion = async (config) => {
    const confirmed = await showConfirmSwal({
      title: '¿Cancelar la verificación?',
      text: `CUIT ${config.cuit} — vas a poder reintentar la aprobación después.`,
      icon: 'warning',
      confirmText: 'Sí, cancelar'
    });
    if (!confirmed) return;

    try {
      setCancelandoId(config.id);
      await cancelarVerificacionConfiguracionFiscal(config.id);
      await fetchPendientes();
    } catch (err) {
      await showApiErrorSwal(err, { title: 'No se pudo cancelar' });
    } finally {
      setCancelandoId(null);
    }
  };

  const handleRechazar = async (motivo) => {
    try {
      await rechazarConfiguracionFiscal(rechazarTarget.id, motivo);
      await showSuccessSwal({ title: 'Rechazada', text: 'La solicitud fue rechazada.' });
      fetchPendientes();
    } catch (err) {
      await showApiErrorSwal(err, { title: 'No se pudo rechazar' });
    }
  };

  return (
    <AppShell>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.h1
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 flex items-center gap-2.5"
        >
          <ClipboardCheck className="h-7 w-7 text-teal-600" /> Aprobaciones de Datos Fiscales
        </motion.h1>
        <p className="mt-1 text-sm text-slate-500">
          Solicitudes de configuración fiscal pendientes de revisión.
        </p>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="mt-6 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
        >
          {loading ? (
            <div className="flex items-center justify-center py-24">
              <div className="h-10 w-10 border-4 border-slate-200 border-t-teal-500 rounded-full animate-spin" />
            </div>
          ) : pendientes.length === 0 ? (
            <div className="px-4 py-10 text-center text-gray-500">
              No hay solicitudes pendientes por ahora.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50/90 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-2 text-left font-semibold text-gray-600">CUIT</th>
                    <th className="px-4 py-2 text-left font-semibold text-gray-600">Razón social</th>
                    <th className="px-4 py-2 text-left font-semibold text-gray-600">Condición</th>
                    <th className="px-4 py-2 text-left font-semibold text-gray-600">Ambiente</th>
                    <th className="px-4 py-2 text-left font-semibold text-gray-600">Certificado</th>
                    <th className="px-4 py-2 text-left font-semibold text-gray-600">Solicitado por</th>
                    <th className="px-4 py-2 text-center font-semibold text-gray-600">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {pendientes.map((p) => {
                    const verificando = p.estado === 'verificando';
                    return (
                      <tr key={p.id} className="border-b border-gray-100">
                        <td className="px-4 py-2 text-gray-800">{p.cuit}</td>
                        <td className="px-4 py-2 text-gray-700">{p.razon_social || '—'}</td>
                        <td className="px-4 py-2 capitalize text-gray-700">{p.condicion_fiscal?.replace('_', ' ')}</td>
                        <td className="px-4 py-2 capitalize text-gray-700">{p.ambiente}</td>
                        <td className="px-4 py-2">
                          {p.tiene_certificado ? (
                            <span className="inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                              Cargado
                            </span>
                          ) : (
                            <span className="inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                              Falta
                            </span>
                          )}
                          {p.motivo_error_verificacion && (
                            <p className="mt-1 text-[11px] text-rose-600 max-w-[220px]">
                              Último intento falló: {p.motivo_error_verificacion}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-2 text-gray-700">{p.solicitado_por?.nombre || '—'}</td>
                        <td className="px-4 py-2">
                          {verificando ? (
                            <div className="flex items-center justify-center gap-2">
                              <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-sky-50 text-sky-700 border border-sky-200">
                                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Verificando…
                              </span>
                              <button
                                onClick={() => handleCancelarVerificacion(p)}
                                disabled={cancelandoId === p.id}
                                className="text-xs font-semibold text-slate-500 hover:text-slate-700 disabled:opacity-50 transition"
                              >
                                {cancelandoId === p.id ? 'Cancelando…' : 'Cancelar / Reintentar'}
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-center gap-3">
                              <button
                                onClick={() => handleAprobar(p)}
                                disabled={aprobandoId === p.id}
                                className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 disabled:opacity-50 transition"
                              >
                                {aprobandoId === p.id ? 'Iniciando…' : 'Aprobar'}
                              </button>
                              <button
                                onClick={() => setRechazarTarget(p)}
                                className="text-xs font-semibold text-rose-600 hover:text-rose-700 transition"
                              >
                                Rechazar
                              </button>
                            </div>
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
      </div>

      <MotivoModal
        open={!!rechazarTarget}
        onClose={() => setRechazarTarget(null)}
        title={`Rechazar solicitud — CUIT ${rechazarTarget?.cuit || ''}`}
        confirmText="Rechazar"
        onConfirm={handleRechazar}
      />
    </AppShell>
  );
}
