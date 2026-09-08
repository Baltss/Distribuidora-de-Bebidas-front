// src/Pages/Facturacion/AprobacionesPage.jsx
//
// Pantalla exclusiva del rol 'soldi_admin': revisa las solicitudes de
// Datos Fiscales pendientes y las aprueba (el backend prueba el
// certificado contra AFIP antes de activar nada) o las rechaza con un
// motivo.
import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ClipboardCheck } from 'lucide-react';

import AppShell from '../../Components/Layout/AppShell';
import MotivoModal from '../../Components/Facturacion/MotivoModal';

import {
  listConfiguracionFiscalPendientes,
  aprobarConfiguracionFiscal,
  rechazarConfiguracionFiscal
} from '../../api/facturacion';
import { showApiErrorSwal, showSuccessSwal, showConfirmSwal } from '../../ui/swal';

export default function AprobacionesPage() {
  const [pendientes, setPendientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [aprobandoId, setAprobandoId] = useState(null);
  const [rechazarTarget, setRechazarTarget] = useState(null);

  const fetchPendientes = async () => {
    setLoading(true);
    try {
      const data = await listConfiguracionFiscalPendientes();
      setPendientes(Array.isArray(data) ? data : []);
    } catch (err) {
      await showApiErrorSwal(err, { title: 'No se pudieron cargar las solicitudes' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendientes();
  }, []);

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
      text: `CUIT ${config.cuit} — se va a probar el certificado contra AFIP antes de activarla.`,
      icon: 'question',
      confirmText: 'Sí, aprobar'
    });
    if (!confirmed) return;

    try {
      setAprobandoId(config.id);
      await aprobarConfiguracionFiscal(config.id);
      await showSuccessSwal({ title: 'Aprobada', text: 'La Configuración Fiscal quedó activa.' });
      fetchPendientes();
    } catch (err) {
      await showApiErrorSwal(err, { title: 'No se pudo aprobar' });
    } finally {
      setAprobandoId(null);
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
                  {pendientes.map((p) => (
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
                      </td>
                      <td className="px-4 py-2 text-gray-700">{p.solicitado_por?.nombre || '—'}</td>
                      <td className="px-4 py-2">
                        <div className="flex items-center justify-center gap-3">
                          <button
                            onClick={() => handleAprobar(p)}
                            disabled={aprobandoId === p.id}
                            className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 disabled:opacity-50 transition"
                          >
                            {aprobandoId === p.id ? 'Probando…' : 'Aprobar'}
                          </button>
                          <button
                            onClick={() => setRechazarTarget(p)}
                            className="text-xs font-semibold text-rose-600 hover:text-rose-700 transition"
                          >
                            Rechazar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
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
