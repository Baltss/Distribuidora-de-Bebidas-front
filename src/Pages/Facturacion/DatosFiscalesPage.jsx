// src/Pages/Facturacion/DatosFiscalesPage.jsx
//
// Pantalla para el rol 'socio': configurar cada CUIT (emisor) con el que el
// negocio factura —condición fiscal, certificado, datos del comprobante—
// y administrar sus Puntos de Venta. Los cambios de datos fiscales quedan
// pendientes hasta que Soldi los aprueba (ver AprobacionesPage).
import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { FaPlus, FaUpload } from 'react-icons/fa';
import { Landmark, Store, Pencil } from 'lucide-react';

import AppShell from '../../Components/Layout/AppShell';
import SolicitarConfiguracionFiscalModal from '../../Components/Facturacion/SolicitarConfiguracionFiscalModal';
import CargarCertificadoModal from '../../Components/Facturacion/CargarCertificadoModal';
import PuntoVentaFormModal from '../../Components/Facturacion/PuntoVentaFormModal';
import DatosEmisorCard from '../../Components/Facturacion/DatosEmisorCard';
import RegimenesTributoCard from '../../Components/Facturacion/RegimenesTributoCard';
import ParametrosFiscalesCard from '../../Components/Facturacion/ParametrosFiscalesCard';
import AuditoriaFiscalCard from '../../Components/Facturacion/AuditoriaFiscalCard';

import {
  listConfiguracionFiscal,
  listEmisores,
  updateEmisor,
  listPuntosVenta,
  createPuntoVenta,
  updatePuntoVentaEstado
} from '../../api/facturacion';
import { listLocales } from '../../api/locales';
import { baseSwal, showApiErrorSwal, showSuccessSwal, showConfirmSwal } from '../../ui/swal';
import AvisoCertificadoArca from '../../Components/Facturacion/AvisoCertificadoArca';
import useCatalogoFiscal, { etiquetaCondicionEmisor } from '../../hooks/useCatalogoFiscal';
import { formatearCuit, nombreEmisor } from '../../utils/emisores';

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
  const [emisores, setEmisores] = useState([]);
  const [emisorId, setEmisorId] = useState(null);
  const [historial, setHistorial] = useState([]);
  const [puntosVenta, setPuntosVenta] = useState([]);
  const [locales, setLocales] = useState([]);
  const [loading, setLoading] = useState(true);

  const [solicitarOpen, setSolicitarOpen] = useState(false);
  const [solicitarEmisor, setSolicitarEmisor] = useState(null); // null = CUIT nuevo
  const [certificadoTarget, setCertificadoTarget] = useState(null);
  const [puntoVentaOpen, setPuntoVentaOpen] = useState(false);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [ems, hist, pv, loc] = await Promise.all([
        listEmisores(),
        listConfiguracionFiscal(),
        listPuntosVenta(),
        listLocales().catch(() => [])
      ]);
      setEmisores(Array.isArray(ems) ? ems : []);
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

  // CUIT que se está viendo: el elegido o, por defecto, el primero.
  const emisor = emisores.find((e) => e.id === emisorId) || emisores[0] || null;
  const historialDelEmisor = historial.filter((h) => h.emisor_id === emisor?.id);
  const puntosVentaDelEmisor = puntosVenta.filter((pv) => pv.emisor_id === emisor?.id);

  const abrirSolicitud = (paraEmisor) => {
    setSolicitarEmisor(paraEmisor);
    setSolicitarOpen(true);
  };

  const handleRenombrarEmisor = async () => {
    const { isConfirmed, value } = await baseSwal.fire({
      title: 'Nombre del CUIT',
      text: 'Un nombre interno para reconocerlo (por ejemplo «Sociedad» o «Personal»).',
      input: 'text',
      inputValue: emisor.alias || '',
      inputAttributes: { maxlength: 100 },
      showCancelButton: true,
      confirmButtonText: 'Guardar',
      cancelButtonText: 'Cancelar'
    });
    if (!isConfirmed) return;
    try {
      await updateEmisor(emisor.id, { alias: value });
      fetchAll();
    } catch (err) {
      await showApiErrorSwal(err, { title: 'No se pudo guardar el nombre' });
    }
  };

  const handleToggleEmisor = async () => {
    const activar = emisor.estado !== 'activo';
    const confirmed = await showConfirmSwal({
      title: activar ? '¿Activar este CUIT?' : '¿Desactivar este CUIT?',
      text: activar
        ? 'Vuelve a estar disponible para facturar.'
        : 'No se va a poder facturar con este CUIT. Sus comprobantes y su historial se conservan.',
      icon: 'warning'
    });
    if (!confirmed) return;
    try {
      await updateEmisor(emisor.id, { estado: activar ? 'activo' : 'inactivo' });
      fetchAll();
    } catch (err) {
      await showApiErrorSwal(err, { title: 'No se pudo cambiar el estado' });
    }
  };

  const handleCrearPuntoVenta = async (payload) => {
    try {
      await createPuntoVenta({ ...payload, emisor_id: emisor.id });
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
          Configurá cada CUIT con el que factura el negocio (condición fiscal, certificado y datos del
          comprobante). Los cambios quedan pendientes hasta que Soldi los apruebe.
        </p>

        <AvisoCertificadoArca className="mt-4" enDatosFiscales />

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="h-10 w-10 border-4 border-slate-200 border-t-teal-500 rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* CUIT con los que se factura */}
            {emisores.length > 1 && (
              <div className="mt-6 flex flex-wrap items-center gap-2">
                {emisores.map((e) => (
                  <button
                    key={e.id}
                    onClick={() => setEmisorId(e.id)}
                    className={`px-3.5 py-2 rounded-xl border text-sm font-medium transition ${
                      emisor?.id === e.id
                        ? 'border-teal-300 bg-teal-50 text-teal-700'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    } ${e.estado !== 'activo' ? 'opacity-60' : ''}`}
                  >
                    {nombreEmisor(e)}
                    <span className="ml-1.5 text-xs text-slate-400">{formatearCuit(e.cuit)}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Estado actual del CUIT */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="mt-6 bg-white rounded-2xl border border-slate-200 shadow-sm p-5 sm:p-6"
            >
              {emisor ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-slate-500">CUIT</p>
                    <p className="font-semibold text-slate-800">
                      {formatearCuit(emisor.cuit)}
                      {emisor.estado !== 'activo' && (
                        <span className="ml-2 text-xs font-semibold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                          Inactivo
                        </span>
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-500">Nombre interno</p>
                    <p className="font-semibold text-slate-800 flex items-center gap-2">
                      {emisor.alias || '—'}
                      <button
                        onClick={handleRenombrarEmisor}
                        className="text-slate-400 hover:text-slate-600 transition"
                        aria-label="Editar nombre interno"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                    </p>
                  </div>
                  {emisor.condicion_fiscal ? (
                    <>
                      <div>
                        <p className="text-slate-500">Razón social</p>
                        <p className="font-semibold text-slate-800">{emisor.razon_social || '—'}</p>
                      </div>
                      <div>
                        <p className="text-slate-500">Condición frente al IVA</p>
                        <p className="font-semibold text-slate-800">
                          {etiquetaCondicionEmisor(catalogo, emisor.condicion_fiscal)}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-500">Ambiente</p>
                        <p className="font-semibold text-slate-800 capitalize">{emisor.ambiente}</p>
                      </div>
                      {emisor.certificado && (
                        <div>
                          <p className="text-slate-500">Certificado de ARCA</p>
                          <p className="font-semibold text-slate-800">
                            {emisor.certificado.estado === 'vencido' ? 'Venció el ' : 'Vence el '}
                            {new Date(emisor.certificado.vence).toLocaleDateString('es-AR', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                              timeZone: 'America/Argentina/Buenos_Aires'
                            })}
                          </p>
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="sm:col-span-2 text-slate-500">
                      Este CUIT todavía no tiene Datos Fiscales activos. No se va a poder facturar con él hasta que se
                      apruebe una solicitud.
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-slate-500">
                  Todavía no hay ningún CUIT configurado. Facturar no va a estar disponible hasta que se apruebe una
                  solicitud.
                </p>
              )}
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  onClick={() => abrirSolicitud(emisor)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-600 text-white font-semibold hover:bg-teal-700 transition"
                >
                  <FaPlus /> {emisor?.condicion_fiscal ? 'Solicitar cambio' : 'Solicitar configuración'}
                </button>
                {emisor && (
                  <button
                    onClick={handleToggleEmisor}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-medium hover:bg-slate-50 transition"
                  >
                    {emisor.estado === 'activo' ? 'Desactivar CUIT' : 'Activar CUIT'}
                  </button>
                )}
                {emisor && (
                  <button
                    onClick={() => abrirSolicitud(null)}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-teal-200 text-teal-700 font-medium hover:bg-teal-50 transition"
                  >
                    <FaPlus /> Agregar otro CUIT
                  </button>
                )}
              </div>
            </motion.div>

            {emisor && <DatosEmisorCard key={emisor.id} emisorId={emisor.id} />}
            {emisor && <RegimenesTributoCard key={`regimenes-${emisor.id}`} emisorId={emisor.id} />}

            {/* Historial de solicitudes */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.15 }}
              className="mt-6 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
            >
              <div className="px-5 py-4 border-b border-slate-200">
                <h2 className="font-semibold text-slate-800">Historial de solicitudes{emisor ? ` · ${nombreEmisor(emisor)}` : ''}</h2>
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
                    {historialDelEmisor.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-4 py-6 text-center text-gray-500">
                          Todavía no hay solicitudes.
                        </td>
                      </tr>
                    )}
                    {historialDelEmisor.map((h) => (
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
                  <Store className="h-4.5 w-4.5 text-teal-600" /> Puntos de Venta{emisor ? ` · ${nombreEmisor(emisor)}` : ''}
                </h2>
                <button
                  onClick={() => setPuntoVentaOpen(true)}
                  disabled={!emisor}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-teal-600 text-white text-sm font-semibold hover:bg-teal-700 disabled:opacity-50 transition"
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
                    {puntosVentaDelEmisor.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-4 py-6 text-center text-gray-500">
                          Todavía no hay puntos de venta configurados.
                        </td>
                      </tr>
                    )}
                    {puntosVentaDelEmisor.map((pv) => (
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

            <ParametrosFiscalesCard />
            <AuditoriaFiscalCard />
          </>
        )}
      </div>

      <SolicitarConfiguracionFiscalModal
        open={solicitarOpen}
        onClose={() => setSolicitarOpen(false)}
        onSolicitado={fetchAll}
        emisor={solicitarEmisor}
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
