// src/Components/Facturacion/FacturaPostVentaModal.jsx
// Después de confirmar una venta con "Facturar": espera el CAE de ARCA y
// ofrece imprimir el ticket (o lo imprime solo) o ver el PDF A4.
import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Loader2, AlertTriangle, Printer, FileText, ShoppingCart, MessageCircle } from 'lucide-react';
import { backdropV, panelV } from '../../ui/animHelpers';
import { getFacturaEstado } from '../../api/facturacion';
import { impresoraConfigurada } from '../../utils/impresoraTicket';
import { nombreLargo, numeroComprobante } from '../../utils/comprobantes';

const ESPERA_MAX_MS = 90000;
const POLL_MS = 2000;
const KEY_AUTO = 'impresora-ticket:auto';

const leerAuto = () => {
  try {
    const v = window.localStorage.getItem(KEY_AUTO);
    return v == null ? impresoraConfigurada() : v === '1';
  } catch {
    return false;
  }
};

export default function FacturaPostVentaModal({ open, facturaId, ventaId, errorInicio, onClose, imprimir }) {
  const navigate = useNavigate();
  const [fase, setFase] = useState('esperando'); // esperando | autorizada | error | demorada
  const [factura, setFactura] = useState(null);
  const [auto, setAuto] = useState(leerAuto);
  const impreso = useRef(false);

  useEffect(() => {
    if (!open) return undefined;
    impreso.current = false;
    setFactura(null);
    setAuto(leerAuto());
    if (errorInicio || !facturaId) {
      setFase('error');
      return undefined;
    }
    setFase('esperando');
    const inicio = Date.now();
    let vivo = true;
    let timer;
    const consultar = async () => {
      try {
        const f = await getFacturaEstado(facturaId);
        if (!vivo) return;
        setFactura(f);
        if (f.estado === 'autorizada') return setFase('autorizada');
        if (f.estado === 'error') return setFase('error');
      } catch {
        // se reintenta
      }
      if (Date.now() - inicio > ESPERA_MAX_MS) return setFase('demorada');
      timer = setTimeout(consultar, POLL_MS);
    };
    consultar();
    return () => {
      vivo = false;
      clearTimeout(timer);
    };
  }, [open, facturaId, errorInicio]);

  useEffect(() => {
    if (fase === 'autorizada' && auto && !impreso.current) {
      impreso.current = true;
      imprimir.imprimirTicket(facturaId);
    }
  }, [fase, auto, facturaId, imprimir]);

  const cambiarAuto = (v) => {
    setAuto(v);
    try {
      window.localStorage.setItem(KEY_AUTO, v ? '1' : '0');
    } catch {
      // sin storage
    }
  };

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4"
          variants={backdropV}
          initial="hidden"
          animate="visible"
          exit="exit"
          role="dialog"
          aria-modal="true"
        >
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
          <motion.div
            variants={panelV}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-2xl p-6 text-center"
          >
            {fase === 'esperando' && (
              <>
                <Loader2 className="mx-auto h-10 w-10 animate-spin text-teal-500" />
                <h3 className="mt-3 text-lg font-bold text-slate-900">Venta #{ventaId} registrada</h3>
                <p className="mt-1 text-sm text-slate-500">Obteniendo el CAE de ARCA…</p>
              </>
            )}

            {fase === 'autorizada' && (
              <>
                <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-500" />
                <h3 className="mt-3 text-lg font-bold text-slate-900">
                  {nombreLargo(factura)} N° {numeroComprobante(factura)}
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  Autorizada por ARCA · CAE <span className="font-mono">{factura?.cae}</span>
                </p>
              </>
            )}

            {fase === 'demorada' && (
              <>
                <Loader2 className="mx-auto h-10 w-10 text-sky-500" />
                <h3 className="mt-3 text-lg font-bold text-slate-900">ARCA está tardando</h3>
                <p className="mt-1 text-sm text-slate-500">
                  La factura se sigue procesando. Podés seguir vendiendo e imprimirla después desde Historial de ventas o
                  Facturación.
                </p>
              </>
            )}

            {fase === 'error' && (
              <>
                <AlertTriangle className="mx-auto h-10 w-10 text-amber-500" />
                <h3 className="mt-3 text-lg font-bold text-slate-900">Venta #{ventaId} registrada, sin factura</h3>
                <p className="mt-1 text-sm text-rose-600">
                  {errorInicio || factura?.error_mensaje || 'No se pudo emitir la factura.'}
                </p>
                <p className="mt-1 text-xs text-slate-500">La podés reintentar desde Facturación o Historial de ventas.</p>
              </>
            )}

            <div className="mt-5 flex flex-col gap-2">
              {fase === 'autorizada' && (
                <>
                  <button
                    autoFocus
                    onClick={() => imprimir.imprimirTicket(facturaId)}
                    disabled={imprimir.imprimiendo === facturaId}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60"
                  >
                    <Printer className="h-4 w-4" /> {imprimir.imprimiendo === facturaId ? 'Imprimiendo…' : 'Imprimir ticket'}
                  </button>
                  <button
                    onClick={() => imprimir.abrirPdf(facturaId)}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    <FileText className="h-4 w-4" /> Ver PDF A4
                  </button>
                  <button
                    onClick={() => imprimir.enviarWhatsApp(facturaId)}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-200 px-4 py-2.5 text-sm font-semibold text-emerald-700 hover:bg-emerald-50"
                  >
                    <MessageCircle className="h-4 w-4" /> Enviar por WhatsApp
                  </button>
                </>
              )}
              {fase === 'error' && (
                <button
                  onClick={() => navigate('/dashboard/facturacion')}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Ir a Facturación
                </button>
              )}
              <button
                autoFocus={fase !== 'autorizada'}
                onClick={onClose}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                <ShoppingCart className="h-4 w-4" /> {fase === 'esperando' ? 'Seguir vendiendo' : 'Nueva venta'}
              </button>
            </div>

            <label className="mt-4 inline-flex items-center gap-2 text-xs text-slate-500 cursor-pointer">
              <input
                type="checkbox"
                checked={auto}
                onChange={(e) => cambiarAuto(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-slate-300 text-teal-600"
              />
              Imprimir el ticket automáticamente al obtener el CAE
            </label>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
