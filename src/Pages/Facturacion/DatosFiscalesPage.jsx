// src/Pages/Facturacion/DatosFiscalesPage.jsx
//
// Pantalla para el rol 'socio': configurar el CUIT/condición fiscal del
// negocio para poder emitir Facturación Electrónica, y administrar los
// Puntos de Venta. Los cambios de datos fiscales quedan pendientes hasta
// que Soldi los aprueba (ver AprobacionesPage).
import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { FaPlus, FaUpload } from 'react-icons/fa';
import { Landmark, Store } from 'lucide-react';

import AppShell from '../../Components/Layout/AppShell';
import SolicitarConfiguracionFiscalModal from '../../Components/Facturacion/SolicitarConfiguracionFiscalModal';
import CargarCertificadoModal from '../../Components/Facturacion/CargarCertificadoModal';
import PuntoVentaFormModal from '../../Components/Facturacion/PuntoVentaFormModal';
import DatosEmisorCard from '../../Components/Facturacion/DatosEmisorCard';

import {
  listConfiguracionFiscal,
  listPuntosVenta,
  createPuntoVenta,
  updatePuntoVentaEstado
} from '../../api/facturacion';
import { listLocales } from '../../api/locales';
import { showApiErrorSwal, showSuccessSwal, showConfirmSwal } from '../../ui/swal';
import AvisoCertificadoArca from '../../Components/Facturacion/AvisoCertificadoArca';
import useCatalogoFiscal, { etiquetaCondicionEmisor } from '../../hooks/useCatalogoFiscal';

const ESTADO_BADGE = {
  activo: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  pendiente_aprobacion: 'bg-amber-50 text-amber-700 border-amber-200',
  verificando: 'bg-sky-50 text-sky-700 border-sky-200',
  rechazado: 'bg-rose-50 text-rose-700 border-rose-200',
  reemplazada: 'bg-slate-100 text-slate-500 border-slate-200'
};

const ESTADO_LABEL = {
  activo: 'Activa',
  pendiente_aprobacion: 'Pendiente de aprobación',
  verificando: 'Verificando con AFIP…',
  rechazado: 'Rechazada',
  reemplazada: 'Reemplazada'
};

export default function DatosFiscalesPage() {
  const catalogo = useCatalogoFiscal();
  const [historial, setHistorial] = useState([]);
  const [puntosVenta, setPuntosVenta] = useState([]);
  const [locales, setLocales] = useState([]);
  const [loading, setLoading] = useState(true);

  const [solicitarOpen, setSolicitarOpen] = useState(false);
  const [certificadoTarget, setCertificadoTarget] = useState(null);
  const [puntoVentaOpen, setPuntoVentaOpen] = useState(false);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [hist, pv, loc] = await Promise.all([
        listConfiguracionFiscal(),
        listPuntosVenta(),
        listLocales().catch(() => [])
      ]);
      setHistorial(Array.isArray(hist) ? hist : []);
      setPuntosVenta(Array.isArray(pv) ? pv : []);
      setLocales(Array.isArray(loc) ? loc : loc?.data || []);
    } catch (err) {
      await showApiErrorSwal(err, { title: 'No se pudieron cargar los Datos Fiscales' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const activa = historial.find((h) => h.estado === 'activo');

  const handleCrearPuntoVenta = async (payload) => {
    try {
      await createPuntoVenta(payload);
      await showSuccessSwal({ title: 'Creado', text: 'Punto de venta creado correctamente.' });
      fetchAll();
    } catch (err) {
      await showApiErrorSwal(err, { title: 'No se pudo crear el punto de venta' });
    }
  };

  const handleTogglePuntoVenta = async (pv) => {
    const activar = pv.estado !== 'activo';
    const confirmed = await showConfirmSwal({
      title: activar ? '¿Activar punto de venta?' : '¿Desactivar punto de venta?',
      text: `Punto de venta N° ${pv.numero}`,
      icon: 'warning'
    });
    if (!confirmed) return;
    try {
      await updatePuntoVentaEstado(pv.id, activar ? 'activo' : 'inactivo');
      fetchAll();
    } catch (err) {
      await showApiErrorSwal(err, { title: 'No se pudo cambiar el estado' });
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
          <Landmark className="h-7 w-7 text-teal-600" /> Datos Fiscales
        </motion.h1>
        <p className="mt-1 text-sm text-slate-500">
          Configurá el CUIT y la condición fiscal del negocio para poder emitir Facturación
          Electrónica. Los cambios quedan pendientes hasta que Soldi los apruebe.
        </p>

        <AvisoCertificadoArca className="mt-4" enDatosFiscales />

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="h-10 w-10 border-4 border-slate-200 border-t-teal-500 rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Estado actual */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="mt-6 bg-white rounded-2xl border border-slate-200 shadow-sm p-5 sm:p-6"
            >
              {activa ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-slate-500">CUIT</p>
                    <p className="font-semibold text-slate-800">{activa.cuit}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Razón social</p>
                    <p className="font-semibold text-slate-800">{activa.razon_social || '—'}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Condición frente al IVA</p>
                    <p className="font-semibold text-slate-800">
                      {etiquetaCondicionEmisor(catalogo, activa.condicion_fiscal)}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-500">Ambiente</p>
                    <p className="font-semibold text-slate-800 capitalize">{activa.ambiente}</p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-slate-500">
                  Todavía no hay una Configuración Fiscal activa. Facturar no va a estar disponible
                  hasta que se apruebe una.
                </p>
              )}
              <div className="mt-4">
                <button
                  onClick={() => setSolicitarOpen(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-600 text-white font-semibold hover:bg-teal-700 transition"
                >
                  <FaPlus /> {activa ? 'Solicitar cambio' : 'Solicitar configuración'}
                </button>
              </div>
            </motion.div>

            <DatosEmisorCard />

            {/* Historial de solicitudes */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.15 }}
              className="mt-6 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
            >
              <div className="px-5 py-4 border-b border-slate-200">
                <h2 className="font-semibold text-slate-800">Historial de solicitudes</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50/90 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-2 text-left font-semibold text-gray-600">CUIT</th>
                      <th className="px-4 py-2 text-left font-semibold text-gray-600">Condición</th>
                      <th className="px-4 py-2 text-left font-semibold text-gray-600">Ambiente</th>
                      <th className="px-4 py-2 text-left font-semibold text-gray-600">Estado</th>
                      <th className="px-4 py-2 text-left font-semibold text-gray-600">Motivo rechazo</th>
                      <th className="px-4 py-2 text-center font-semibold text-gray-600">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historial.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-4 py-6 text-center text-gray-500">
                          Todavía no hay solicitudes.
                        </td>
                      </tr>
                    )}
                    {historial.map((h) => (
                      <tr key={h.id} className="border-b border-gray-100">
                        <td className="px-4 py-2 text-gray-800">{h.cuit}</td>
                        <td className="px-4 py-2 text-gray-700">{etiquetaCondicionEmisor(catalogo, h.condicion_fiscal)}</td>
                        <td className="px-4 py-2 capitalize text-gray-700">{h.ambiente}</td>
                        <td className="px-4 py-2">
                          <span className={`inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-full border ${ESTADO_BADGE[h.estado] || ''}`}>
                            {ESTADO_LABEL[h.estado] || h.estado}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-gray-600">{h.motivo_rechazo || h.motivo_error_verificacion || '—'}</td>
                        <td className="px-4 py-2 text-center">
                          {h.estado === 'pendiente_aprobacion' && !h.tiene_certificado && (
                            <button
                              onClick={() => setCertificadoTarget(h)}
                              className="inline-flex items-center gap-1.5 text-teal-600 hover:text-teal-700 transition text-xs font-semibold"
                            >
                              <FaUpload /> Cargar certificado
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>

            {/* Puntos de Venta */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.2 }}
              className="mt-6 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
            >
              <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
                <h2 className="font-semibold text-slate-800 flex items-center gap-2">
                  <Store className="h-4.5 w-4.5 text-teal-600" /> Puntos de Venta
                </h2>
                <button
                  onClick={() => setPuntoVentaOpen(true)}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-teal-600 text-white text-sm font-semibold hover:bg-teal-700 transition"
                >
                  <FaPlus /> Nuevo
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50/90 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-2 text-left font-semibold text-gray-600">N°</th>
                      <th className="px-4 py-2 text-left font-semibold text-gray-600">Descripción</th>
                      <th className="px-4 py-2 text-left font-semibold text-gray-600">Local</th>
                      <th className="px-4 py-2 text-left font-semibold text-gray-600">Estado</th>
                      <th className="px-4 py-2 text-center font-semibold text-gray-600">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {puntosVenta.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-4 py-6 text-center text-gray-500">
                          Todavía no hay puntos de venta configurados.
                        </td>
                      </tr>
                    )}
                    {puntosVenta.map((pv) => (
                      <tr key={pv.id} className="border-b border-gray-100">
                        <td className="px-4 py-2 font-medium text-gray-800">{pv.numero}</td>
                        <td className="px-4 py-2 text-gray-700">{pv.descripcion || '—'}</td>
                        <td className="px-4 py-2 text-gray-700">{pv.local?.nombre || 'Todos'}</td>
                        <td className="px-4 py-2">
                          {pv.estado === 'activo' ? (
                            <span className="inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                              Activo
                            </span>
                          ) : (
                            <span className="inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                              Inactivo
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2 text-center">
                          <button
                            onClick={() => handleTogglePuntoVenta(pv)}
                            className="text-xs font-semibold text-slate-500 hover:text-slate-700 transition"
                          >
                            {pv.estado === 'activo' ? 'Desactivar' : 'Activar'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          </>
        )}
      </div>

      <SolicitarConfiguracionFiscalModal
        open={solicitarOpen}
        onClose={() => setSolicitarOpen(false)}
        onSolicitado={fetchAll}
      />
      <CargarCertificadoModal
        open={!!certificadoTarget}
        onClose={() => setCertificadoTarget(null)}
        configuracion={certificadoTarget}
        onCargado={fetchAll}
      />
      <PuntoVentaFormModal
        open={puntoVentaOpen}
        onClose={() => setPuntoVentaOpen(false)}
        onSubmit={handleCrearPuntoVenta}
        locales={locales}
      />
    </AppShell>
  );
}
