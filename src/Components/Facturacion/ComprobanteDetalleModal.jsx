// src/Components/Facturacion/ComprobanteDetalleModal.jsx
// Detalle de un comprobante (Factura / Nota de Crédito) con sus acciones:
// imprimir ticket, ver PDF A4, reintentar si tiene error.
import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Printer, FileText, RotateCcw, Receipt, Loader2 } from 'lucide-react';
import { backdropV, panelV } from '../../ui/animHelpers';
import { getFactura, reintentarFactura } from '../../api/facturacion';
import { showApiErrorSwal, showSuccessToast } from '../../ui/swal';
import moneyAR from '../../utils/money';
import { formatFechaCalendario } from '../../utils/fechaCalendario';
import {
  nombreLargo,
  numeroComprobante,
  ESTADO_COMPROBANTE,
  esImprimible,
  esNotaCredito
} from '../../utils/comprobantes';

const CONDICION_IVA = {
  1: 'IVA Responsable Inscripto',
  4: 'IVA Sujeto Exento',
  5: 'Consumidor Final',
  6: 'Responsable Monotributo',
  7: 'Sujeto No Categorizado',
  8: 'Proveedor del Exterior',
  9: 'Cliente del Exterior',
  10: 'IVA Liberado - Ley 19.640',
  13: 'Monotributista Social',
  15: 'IVA No Alcanzado',
  16: 'Monotributo Trabajador Independiente Promovido'
};
const DOCUMENTO = { 80: 'CUIT', 86: 'CUIL', 96: 'DNI' };
const CONDICION_VENTA = { contado: 'Contado', fiado: 'Cuenta corriente', a_cuenta: 'Cuenta corriente', mixta: 'Contado / Cta. cte.' };

const pct = (n) => `${Number(n).toLocaleString('es-AR')}%`;
const cant = (n) => Number(n).toLocaleString('es-AR', { maximumFractionDigits: 3 });

function Dato({ label, children }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wide text-slate-400">{label}</p>
      <p className="text-sm text-slate-800">{children || '—'}</p>
    </div>
  );
}

export default function ComprobanteDetalleModal({ open, facturaId, onClose, onCambio, imprimir }) {
  const navigate = useNavigate();
  const [f, setF] = useState(null);
  const [loading, setLoading] = useState(false);
  const [reintentando, setReintentando] = useState(false);

  const cargar = async () => {
    setLoading(true);
    try {
      setF(await getFactura(facturaId));
    } catch (err) {
      await showApiErrorSwal(err, { title: 'No se pudo cargar el comprobante' });
      onClose();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && facturaId) {
      setF(null);
      cargar();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, facturaId]);

  // Mientras se emite, se refresca solo.
  useEffect(() => {
    if (!open || f?.estado !== 'pendiente') return undefined;
    const t = setInterval(async () => {
      try {
        const nuevo = await getFactura(facturaId);
        setF(nuevo);
        if (nuevo.estado !== 'pendiente') onCambio?.();
      } catch {
        // se reintenta en el próximo ciclo
      }
    }, 4000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, f?.estado, facturaId]);

  const reintentar = async () => {
    try {
      setReintentando(true);
      const resp = await reintentarFactura(f.id);
      if (resp?.descartada) {
        showSuccessToast(resp.message);
        onCambio?.();
        onClose();
        return;
      }
      onCambio?.();
      await cargar();
    } catch (err) {
      await showApiErrorSwal(err, { title: 'No se pudo reintentar' });
    } finally {
      setReintentando(false);
    }
  };

  const estado = f ? ESTADO_COMPROBANTE[f.estado] : null;
  const discrimina = f && [1, 3].includes(Number(f.tipo_comprobante));
  const ivaDetalle = Array.isArray(f?.iva_detalle) ? f.iva_detalle : [];

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
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            variants={panelV}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="relative w-full max-w-3xl max-h-[90vh] flex flex-col rounded-2xl border border-slate-200 bg-white shadow-2xl"
          >
            <button
              onClick={onClose}
              className="absolute z-10 top-2.5 right-2.5 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 border border-slate-200 hover:bg-slate-200"
              aria-label="Cerrar"
            >
              <X className="h-5 w-5 text-slate-500" />
            </button>

            {loading || !f ? (
              <div className="flex items-center justify-center py-24">
                <Loader2 className="h-8 w-8 animate-spin text-teal-500" />
              </div>
            ) : (
              <>
                <div className="p-5 sm:p-6 border-b border-slate-100 pr-14">
                  <div className="flex flex-wrap items-center gap-2">
                    <Receipt className="h-6 w-6 text-teal-600" />
                    <h3 className="text-xl font-bold text-slate-900">
                      {nombreLargo(f)} {numeroComprobante(f) ? `N° ${numeroComprobante(f)}` : '(sin número)'}
                    </h3>
                    {estado && (
                      <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${estado.cls}`}>
                        {f.estado === 'pendiente' && <Loader2 className="h-3 w-3 animate-spin" />}
                        {estado.label}
                      </span>
                    )}
                  </div>
                  {f.comprobante_asociado && (
                    <p className="mt-1 text-sm text-slate-500">
                      Anula {nombreLargo(f.comprobante_asociado)} N° {numeroComprobante(f.comprobante_asociado)}
                    </p>
                  )}
                </div>

                <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
                  {f.estado === 'error' && f.error_mensaje && (
                    <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                      {f.error_mensaje}
                    </div>
                  )}

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    <Dato label="Fecha">{f.fecha_comprobante ? formatFechaCalendario(f.fecha_comprobante) : 'Todavía sin emitir'}</Dato>
                    <Dato label="Cliente">{f.receptor_nombre || f.cliente?.nombre}</Dato>
                    <Dato label={DOCUMENTO[f.documento_tipo] || 'Documento'}>
                      {Number(f.documento_nro) ? f.documento_nro : 'Sin identificar'}
                    </Dato>
                    <Dato label="Condición IVA">{CONDICION_IVA[f.condicion_iva_receptor_id]}</Dato>
                    <Dato label="Condición de venta">{CONDICION_VENTA[f.condicion_venta]}</Dato>
                    <Dato label="CAE">
                      {f.cae ? (
                        <span className="font-mono">
                          {f.cae}
                          <span className="block font-sans text-xs text-slate-500">
                            Vence {formatFechaCalendario(f.cae_vencimiento)}
                          </span>
                        </span>
                      ) : null}
                    </Dato>
                  </div>

                  <div className="overflow-x-auto rounded-xl border border-slate-200">
                    <table className="min-w-full text-sm">
                      <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                        <tr>
                          <th className="px-3 py-2 text-left">Descripción</th>
                          <th className="px-3 py-2 text-right">Cant.</th>
                          <th className="px-3 py-2 text-right">P. Unit.</th>
                          <th className="px-3 py-2 text-right">IVA</th>
                          <th className="px-3 py-2 text-right">Subtotal</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(f.items || []).map((it) => (
                          <tr key={it.id} className="border-t border-slate-100">
                            <td className="px-3 py-2 text-slate-800">{it.descripcion}</td>
                            <td className="px-3 py-2 text-right">{cant(it.cantidad)}</td>
                            <td className="px-3 py-2 text-right">{moneyAR(it.precio_unit)}</td>
                            <td className="px-3 py-2 text-right text-slate-500">
                              {it.iva_condicion === 'exento' ? 'Exento' : it.iva_condicion === 'no_gravado' ? 'No grav.' : pct(it.iva_porcentaje)}
                            </td>
                            <td className="px-3 py-2 text-right font-medium">{moneyAR(it.subtotal)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:justify-between gap-4">
                    <div className="space-y-2 text-sm">
                      {(f.ventas || []).length > 0 && (
                        <div>
                          <p className="text-[11px] uppercase tracking-wide text-slate-400">Ventas</p>
                          <div className="flex flex-wrap gap-1.5">
                            {f.ventas.map((v) => (
                              <button
                                key={v.id}
                                onClick={() => navigate('/dashboard/ventas', { state: { ventaIdDetalle: v.id } })}
                                className="rounded-lg border border-slate-200 px-2 py-0.5 text-xs text-teal-700 hover:bg-teal-50"
                              >
                                Venta #{v.id}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                      {(f.notas_credito || []).length > 0 && (
                        <div>
                          <p className="text-[11px] uppercase tracking-wide text-slate-400">Notas de crédito</p>
                          {f.notas_credito.map((nc) => (
                            <p key={nc.id} className="text-xs text-slate-600">
                              {nombreLargo(nc)} N° {numeroComprobante(nc) || '(en proceso)'} · {moneyAR(nc.importe_total)} ·{' '}
                              {ESTADO_COMPROBANTE[nc.estado]?.label}
                            </p>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="min-w-[240px] rounded-xl border border-slate-200 p-3 text-sm space-y-1">
                      {discrimina && (
                        <>
                          <div className="flex justify-between"><span className="text-slate-500">Neto gravado</span><span>{moneyAR(f.importe_neto)}</span></div>
                          {ivaDetalle.map((a) => (
                            <div key={a.alicuota_id} className="flex justify-between">
                              <span className="text-slate-500">IVA {pct(a.porcentaje)}</span>
                              <span>{moneyAR(a.importe)}</span>
                            </div>
                          ))}
                          {Number(f.importe_exento) > 0 && (
                            <div className="flex justify-between"><span className="text-slate-500">Exento</span><span>{moneyAR(f.importe_exento)}</span></div>
                          )}
                          {Number(f.importe_no_gravado) > 0 && (
                            <div className="flex justify-between"><span className="text-slate-500">No gravado</span><span>{moneyAR(f.importe_no_gravado)}</span></div>
                          )}
                        </>
                      )}
                      {!discrimina && Number(f.importe_iva) > 0 && (
                        <div className="flex justify-between text-xs"><span className="text-slate-500">IVA contenido</span><span>{moneyAR(f.importe_iva)}</span></div>
                      )}
                      <div className="flex justify-between border-t border-slate-100 pt-1 text-base font-bold">
                        <span>Total</span>
                        <span>{moneyAR(f.importe_total)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="shrink-0 border-t border-slate-200 px-5 sm:px-6 py-4 flex flex-wrap justify-end gap-2">
                  {f.estado === 'error' && (
                    <button
                      onClick={reintentar}
                      disabled={reintentando}
                      className="inline-flex items-center gap-2 rounded-xl border border-teal-200 px-4 py-2 text-sm font-semibold text-teal-700 hover:bg-teal-50 disabled:opacity-60"
                    >
                      <RotateCcw className="h-4 w-4" /> {reintentando ? 'Reintentando…' : 'Reintentar'}
                    </button>
                  )}
                  {esImprimible(f) && (
                    <>
                      <button
                        onClick={() => imprimir.abrirPdf(f.id)}
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        <FileText className="h-4 w-4" /> Ver PDF A4
                      </button>
                      <button
                        onClick={() => imprimir.imprimirTicket(f.id)}
                        disabled={imprimir.imprimiendo === f.id}
                        className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60"
                      >
                        <Printer className="h-4 w-4" /> {imprimir.imprimiendo === f.id ? 'Imprimiendo…' : 'Imprimir ticket'}
                      </button>
                    </>
                  )}
                  {!esImprimible(f) && !esNotaCredito(f) && f.estado !== 'error' && (
                    <p className="text-xs text-slate-500 self-center">Se puede imprimir cuando ARCA lo autorice.</p>
                  )}
                </div>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
