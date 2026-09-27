// src/Components/Facturacion/ImpresoraTicketModal.jsx
// Configuración (por navegador) de la impresora térmica de tickets:
// cómo llegan los bytes ESC/POS a la impresora + ancho y acentos.
import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Printer, Download, RefreshCw, CheckCircle2, AlertTriangle, Usb, Cable, MonitorCog } from 'lucide-react';
import { backdropV, panelV } from '../../ui/animHelpers';
import {
  leerConfigImpresora,
  guardarConfigImpresora,
  estadoAgente,
  descargarInstaladorAgente,
  elegirImpresoraUSB,
  elegirPuertoSerie,
  imprimirBytes,
  ticketDePrueba,
  soportaUSB,
  soportaSerial
} from '../../utils/impresoraTicket';
import { showErrorSwal, showSuccessToast } from '../../ui/swal';

const inputCls =
  'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-400/40';

function Opcion({ activa, onClick, icon: Icon, titulo, subtitulo, children }) {
  return (
    <div
      className={`rounded-2xl border p-4 transition ${
        activa ? 'border-teal-400 bg-teal-50/40 ring-1 ring-teal-300' : 'border-slate-200 hover:border-slate-300'
      }`}
    >
      <button type="button" onClick={onClick} className="w-full text-left flex items-start gap-3">
        <span
          className={`mt-0.5 h-4 w-4 shrink-0 rounded-full border-2 ${activa ? 'border-teal-600 bg-teal-600 shadow-[inset_0_0_0_2px_white]' : 'border-slate-300'}`}
        />
        <Icon className="h-5 w-5 text-slate-500 shrink-0" />
        <span>
          <span className="block text-sm font-semibold text-slate-800">{titulo}</span>
          <span className="block text-xs text-slate-500">{subtitulo}</span>
        </span>
      </button>
      {activa && <div className="mt-3 pl-7">{children}</div>}
    </div>
  );
}

export default function ImpresoraTicketModal({ open, onClose, onGuardado }) {
  const [config, setConfig] = useState(leerConfigImpresora());
  const [agente, setAgente] = useState(null); // estado del agente o null
  const [buscandoAgente, setBuscandoAgente] = useState(false);
  const [probando, setProbando] = useState(false);

  const buscarAgente = async () => {
    setBuscandoAgente(true);
    const estado = await estadoAgente();
    setAgente(estado);
    if (estado) {
      setConfig((c) =>
        c.impresora && estado.impresoras.includes(c.impresora)
          ? c
          : { ...c, impresora: estado.predeterminada || estado.impresoras[0] || '' }
      );
    }
    setBuscandoAgente(false);
  };

  useEffect(() => {
    if (!open) return;
    const c = leerConfigImpresora();
    setConfig({ ...c, metodo: c.metodo || 'agente' });
    setAgente(null);
    buscarAgente();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const set = (patch) => setConfig((c) => ({ ...c, ...patch }));

  const accion = async (fn) => {
    try {
      await fn();
    } catch (err) {
      if (err?.name === 'NotFoundError') return; // canceló el selector del navegador
      await showErrorSwal({ title: 'Impresora', text: err?.message || 'Ocurrió un error.' });
    }
  };

  const listo =
    (config.metodo === 'agente' && !!agente) ||
    (config.metodo === 'usb' && !!config.usb) ||
    (config.metodo === 'serial' && !!config.serial);

  const probar = () =>
    accion(async () => {
      setProbando(true);
      try {
        await imprimirBytes(ticketDePrueba(config), config);
        showSuccessToast('Prueba enviada a la impresora');
      } finally {
        setProbando(false);
      }
    });

  const guardar = () => {
    guardarConfigImpresora(config);
    showSuccessToast('Impresora guardada');
    onGuardado?.(config);
    onClose();
  };

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4"
          variants={backdropV}
          initial="hidden"
          animate="visible"
          exit="exit"
          role="dialog"
          aria-modal="true"
        >
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            variants={panelV}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl"
          >
            <button
              onClick={onClose}
              className="absolute top-2.5 right-2.5 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 border border-slate-200 hover:bg-slate-200"
              aria-label="Cerrar"
            >
              <X className="h-5 w-5 text-slate-500" />
            </button>

            <div className="p-5 sm:p-6 space-y-4">
              <div className="flex items-center gap-3 pr-10">
                <Printer className="h-6 w-6 text-teal-600 shrink-0" />
                <div>
                  <h3 className="text-xl font-bold text-slate-900">Impresora de tickets (80 mm)</h3>
                  <p className="text-xs text-slate-500">Se configura una sola vez en esta computadora.</p>
                </div>
              </div>

              <p className="text-sm font-semibold text-slate-700">¿Cómo se conecta el sistema con la impresora?</p>

              <Opcion
                activa={config.metodo === 'agente'}
                onClick={() => set({ metodo: 'agente' })}
                icon={MonitorCog}
                titulo="Agente de impresión para Windows (recomendado)"
                subtitulo="Funciona con cualquier impresora instalada en Windows: USB, red o Bluetooth."
              >
                {agente ? (
                  <div className="space-y-2">
                    <p className="flex items-center gap-1.5 text-sm text-emerald-700">
                      <CheckCircle2 className="h-4 w-4" /> Agente funcionando en esta PC.
                    </p>
                    <label className="block text-xs font-semibold text-slate-600">Impresora</label>
                    <select value={config.impresora} onChange={(e) => set({ impresora: e.target.value })} className={inputCls}>
                      {agente.impresoras.length === 0 && <option value="">(No hay impresoras instaladas)</option>}
                      {agente.impresoras.map((n) => (
                        <option key={n} value={n}>
                          {n}
                          {n === agente.predeterminada ? ' (predeterminada)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="space-y-2 text-sm text-slate-600">
                    <p className="flex items-center gap-1.5 text-amber-700">
                      <AlertTriangle className="h-4 w-4" />
                      {buscandoAgente ? 'Buscando el agente…' : 'No se encontró el agente en esta PC.'}
                    </p>
                    <ol className="list-decimal pl-5 space-y-1 text-xs">
                      <li>Descargá el instalador y abrilo (si Windows avisa que protegió tu PC, tocá «Más información» → «Ejecutar de todas formas»).</li>
                      <li>Cuando diga «Listo», volvé acá y tocá «Buscar agente».</li>
                      <li>Si Chrome pregunta si permitís el acceso a dispositivos de la red local, tocá «Permitir».</li>
                    </ol>
                    <div className="flex flex-wrap gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => accion(descargarInstaladorAgente)}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-700"
                      >
                        <Download className="h-3.5 w-3.5" /> Descargar instalador
                      </button>
                      <button
                        type="button"
                        onClick={buscarAgente}
                        disabled={buscandoAgente}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                      >
                        <RefreshCw className={`h-3.5 w-3.5 ${buscandoAgente ? 'animate-spin' : ''}`} /> Buscar agente
                      </button>
                    </div>
                  </div>
                )}
              </Opcion>

              <Opcion
                activa={config.metodo === 'usb'}
                onClick={() => set({ metodo: 'usb' })}
                icon={Usb}
                titulo="USB directo desde Chrome"
                subtitulo="Sin instalar nada. En Windows sólo funciona si la impresora no usa driver propio."
              >
                {soportaUSB() ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => accion(async () => set({ usb: await elegirImpresoraUSB() }))}
                      className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      Elegir impresora USB
                    </button>
                    <span className="text-xs text-slate-500">{config.usb ? `Elegida: ${config.usb.nombre}` : 'Ninguna elegida'}</span>
                  </div>
                ) : (
                  <p className="text-xs text-rose-600">Este navegador no permite USB directo (usá Chrome o Edge).</p>
                )}
              </Opcion>

              <Opcion
                activa={config.metodo === 'serial'}
                onClick={() => set({ metodo: 'serial' })}
                icon={Cable}
                titulo="Puerto serie / Bluetooth desde Chrome"
                subtitulo="Para impresoras conectadas a un puerto COM o emparejadas por Bluetooth."
              >
                {soportaSerial() ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => accion(async () => set({ serial: await elegirPuertoSerie() }))}
                      className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      Elegir puerto
                    </button>
                    <select
                      value={config.baudRate}
                      onChange={(e) => set({ baudRate: Number(e.target.value) })}
                      className="rounded-lg border border-slate-200 px-2 py-1.5 text-xs"
                      title="Velocidad del puerto"
                    >
                      {[9600, 19200, 38400, 115200].map((b) => (
                        <option key={b} value={b}>
                          {b} baudios
                        </option>
                      ))}
                    </select>
                    <span className="text-xs text-slate-500">{config.serial ? 'Puerto elegido' : 'Ningún puerto elegido'}</span>
                  </div>
                ) : (
                  <p className="text-xs text-rose-600">Este navegador no permite puertos serie (usá Chrome o Edge).</p>
                )}
              </Opcion>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Ancho de impresión</label>
                  <select value={config.columnas} onChange={(e) => set({ columnas: Number(e.target.value) })} className={inputCls}>
                    <option value={48}>48 columnas (80 mm estándar)</option>
                    <option value={42}>42 columnas (algunos modelos)</option>
                  </select>
                </div>
                <label className="flex items-center gap-2 text-sm text-slate-700 sm:mt-6 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.sinAcentos}
                    onChange={(e) => set({ sinAcentos: e.target.checked })}
                    className="h-4 w-4 rounded border-slate-300 text-teal-600"
                  />
                  Imprimir sin acentos (si salen caracteres raros)
                </label>
              </div>

              <div className="flex flex-col-reverse sm:flex-row justify-between gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={probar}
                  disabled={!listo || probando}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  <Printer className="h-4 w-4" /> {probando ? 'Imprimiendo…' : 'Imprimir prueba'}
                </button>
                <div className="flex gap-2 justify-end">
                  <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={guardar}
                    disabled={!listo}
                    className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-50"
                  >
                    Guardar
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
