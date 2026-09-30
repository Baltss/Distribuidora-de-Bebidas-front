// src/Components/Facturacion/ComprobanteDetalleModal.jsx
// Detalle de un comprobante (Factura / Nota de Crédito / Nota de Débito)
// con sus acciones: imprimir ticket, ver PDF A4, reintentar si tiene
// error y, sobre una factura autorizada, emitir una NC (devolución o
// bonificación) o una ND. Desde acá se navega entre la factura y sus
// notas asociadas.
import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Printer,
  FileText,
  RotateCcw,
  Receipt,
  Loader2,
  ArrowLeft,
  Undo2,
  PlusCircle,
  Trash2,
  CheckCircle2,
  MessageCircle
} from 'lucide-react';
import { backdropV, panelV } from '../../ui/animHelpers';
import { getFactura, reintentarFactura, descartarComprobante } from '../../api/facturacion';
import { showApiErrorSwal, showSuccessToast, showConfirmSwal } from '../../ui/swal';
import { medioPagoLabel } from '../../utils/mediosPago';
import NotaCreditoModal from './NotaCreditoModal';
import NotaDebitoModal from './NotaDebitoModal';
import moneyAR from '../../utils/money';
import { formatFechaCalendario } from '../../utils/fechaCalendario';
import {
  nombreLargo,
  numeroComprobante,
  ESTADO_COMPROBANTE,
  esImprimible,
  esFactura,
  esNotaCredito,
  esAjusteManual,
  MOTIVO_COMPROBANTE
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

// Qué se hizo al autorizarse una NC por devolución / bonificación o una ND.
function ResultadoAjuste({ f }) {
  const r = f.ajuste?.resultado;
  if (!r) return null;
  const lineas = [];
  if (r.stock?.length) lineas.push('La mercadería devuelta volvió al stock.');
  if (r.aplicado_deuda > 0) lineas.push(`Se descontaron ${moneyAR(r.aplicado_deuda)} de la deuda de la venta.`);
  if (r.reintegro > 0) lineas.push(`Se le devolvieron ${moneyAR(r.reintegro)} al cliente (${medioPagoLabel(f.ajuste?.medio_pago)}), registrado en caja.`);
  if (r.saldo_a_favor > 0) lineas.push(`Quedaron ${moneyAR(r.saldo_a_favor)} como saldo a favor del cliente.`);
  if (r.cobrado > 0) lineas.push(`Se cobraron ${moneyAR(r.cobrado)} (${medioPagoLabel(f.ajuste?.medio_pago)}), registrado en caja.`);
  if (r.a_cuenta_corriente > 0) lineas.push(`Se sumaron ${moneyAR(r.a_cuenta_corriente)} a la cuenta corriente del cliente.`);
  if (!lineas.length) return null;
  return (
    <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 space-y-0.5">
      {lineas.map((l) => (
        <p key={l} className="flex items-start gap-2">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> {l}
        </p>
      ))}
    </div>
  );
}

export default function ComprobanteDetalleModal({ open, facturaId, onClose, onCambio, imprimir }) {
  const navigate = useNavigate();
  // Comprobante que se está viendo (se puede navegar a sus NC/ND y volver).
  const [pila, setPila] = useState([]);
  const verId = pila[pila.length - 1] ?? facturaId;
  const [f, setF] = useState(null);
  const [loading, setLoading] = useState(false);
  const [reintentando, setReintentando] = useState(false);
  const [modalNota, setModalNota] = useState(null); // 'credito' | 'debito' | null

  const cargar = async (id = verId) => {
    setLoading(true);
    try {
      setF(await getFactura(id));
    } catch (err) {
      await showApiErrorSwal(err, { title: 'No se pudo cargar el comprobante' });
      onClose();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && facturaId) setPila([]);
  }, [open, facturaId]);

  useEffect(() => {
    if (open && verId) {
      setF(null);
      cargar(verId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, verId]);

  const ir = (id) => setPila((p) => [...p, id]);
  const volver = () => setPila((p) => p.slice(0, -1));

  // Efectos de una NC/ND recién autorizada todavía aplicándose (son segundos).
  const aplicandoEfectos =
    f && f.estado === 'autorizada' && esAjusteManual(f) && !f.efectos_aplicados_at && !f.error_mensaje;

  // Mientras se emite, se refresca solo.
  useEffect(() => {
    if (!open || !f || (f.estado !== 'pendiente' && !aplicandoEfectos)) return undefined;
    const t = setInterval(async () => {
      try {
        const nuevo = await getFactura(f.id);
        setF(nuevo);
        if (nuevo.estado !== 'pendiente') onCambio?.();
      } catch {
        // se reintenta en el próximo ciclo
      }
    }, aplicandoEfectos ? 1500 : 4000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, f?.id, f?.estado, aplicandoEfectos]);

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
      if (resp?.estado === 'autorizada') showSuccessToast(resp.message);
      onCambio?.();
      await cargar(f.id);
    } catch (err) {
      await showApiErrorSwal(err, { title: 'No se pudo reintentar' });
    } finally {
      setReintentando(false);
    }
  };

  const descartar = async () => {
    const ok = await showConfirmSwal({
      title: '¿Descartar este comprobante?',
      text: 'ARCA no lo autorizó, así que no tiene validez fiscal ni se aplicó en stock, cuenta corriente o caja.',
      confirmText: 'Sí, descartar',
      icon: 'warning'
    });
    if (!ok) return;
    try {
      await descartarComprobante(f.id);
      showSuccessToast('Comprobante descartado');
      onCambio?.();
      if (pila.length) volver();
      else onClose();
    } catch (err) {
      await showApiErrorSwal(err, { title: 'No se pudo descartar' });
    }
  };

  const notaCreada = (id) => {
    setModalNota(null);
    onCambio?.();
    ir(id);
  };

  const estado = f ? ESTADO_COMPROBANTE[f.estado] : null;
  const discrimina = f && [1, 2, 3].includes(Number(f.tipo_comprobante));
  const efectosPendientes = f && f.estado === 'autorizada' && esAjusteManual(f) && !f.efectos_aplicados_at && f.error_mensaje;
  const puedeAjustar = f && esFactura(f) && f.estado === 'autorizada' && !(f.ventas || []).some((v) => v.estado === 'anulada');
  const ivaDetalle = Array.isArray(f?.iva_detalle) ? f.iva_detalle : [];

  return (
    <>
      {createPortal(
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
                      {pila.length > 0 && (
                        <button
                          onClick={volver}
                          className="mb-2 inline-flex items-center gap-1 text-xs font-semibold text-teal-700 hover:underline"
                        >
                          <ArrowLeft className="h-3.5 w-3.5" /> Volver
                        </button>
                      )}
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
                          {f.motivo === 'nota_debito'
                          ? 'Sobre '
                          : esAjusteManual(f)
                            ? `${MOTIVO_COMPROBANTE[f.motivo]} · sobre `
                            : 'Anula '}
                          <button
                            onClick={() => ir(f.comprobante_asociado.id)}
                            className="font-medium text-teal-700 hover:underline"
                          >
                            {nombreLargo(f.comprobante_asociado)} N° {numeroComprobante(f.comprobante_asociado)}
                          </button>
                        </p>
                      )}
                    </div>

                    <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
                      {f.estado === 'error' && f.error_mensaje && (
                        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                          {f.error_mensaje}
                        </div>
                      )}
                      {efectosPendientes && (
                        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                          {f.error_mensaje}
                        </div>
                      )}
                      {aplicandoEfectos && (
                        <div className="flex items-center gap-2 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-700">
                          <Loader2 className="h-4 w-4 animate-spin" /> Aplicando en stock, cuenta corriente y caja…
                        </div>
                      )}
                      {f.estado === 'pendiente' && esAjusteManual(f) && (
                        <p className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-700">
                          Esperando la autorización de ARCA. Cuando llegue, se aplica solo en stock, cuenta corriente y caja.
                        </p>
                      )}
                      {f.estado === 'autorizada' && <ResultadoAjuste f={f} />}

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
                              <p className="text-[11px] uppercase tracking-wide text-slate-400">Notas de crédito y débito</p>
                              {[...f.notas_credito]
                                .sort((a, b) => a.id - b.id)
                                .map((nc) => (
                                  <button
                                    key={nc.id}
                                    onClick={() => ir(nc.id)}
                                    className="block text-left text-xs text-slate-600 hover:text-teal-700 hover:underline"
                                  >
                                    {nombreLargo(nc)} N° {numeroComprobante(nc) || '(en proceso)'} · {moneyAR(nc.importe_total)}
                                    {nc.motivo && MOTIVO_COMPROBANTE[nc.motivo] && nc.motivo !== 'nota_debito'
                                      ? ` · ${MOTIVO_COMPROBANTE[nc.motivo]}`
                                      : ''}{' '}
                                    · {ESTADO_COMPROBANTE[nc.estado]?.label}
                                  </button>
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
                          {(f.tributos || []).map((t) => (
                            <div key={t.id} className="flex justify-between">
                              <span className="text-slate-500">{t.descripcion} ({pct(t.alicuota)})</span>
                              <span>{moneyAR(t.importe)}</span>
                            </div>
                          ))}
                          <div className="flex justify-between border-t border-slate-100 pt-1 text-base font-bold">
                            <span>Total</span>
                            <span>{moneyAR(f.importe_total)}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0 border-t border-slate-200 px-5 sm:px-6 py-4 flex flex-wrap justify-end gap-2">
                      {puedeAjustar && (
                        <div className="flex flex-wrap gap-2 sm:mr-auto">
                          <button
                            onClick={() => setModalNota('credito')}
                            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                          >
                            <Undo2 className="h-4 w-4" /> Nota de crédito
                          </button>
                          <button
                            onClick={() => setModalNota('debito')}
                            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                          >
                            <PlusCircle className="h-4 w-4" /> Nota de débito
                          </button>
                        </div>
                      )}
                      {f.estado === 'error' && esAjusteManual(f) && f.numero_intentado == null && (
                        <button
                          onClick={descartar}
                          className="inline-flex items-center gap-2 rounded-xl border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-50"
                        >
                          <Trash2 className="h-4 w-4" /> Descartar
                        </button>
                      )}
                      {(f.estado === 'error' || efectosPendientes) && (
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
                            onClick={() => imprimir.enviarWhatsApp(f.id)}
                            className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-50"
                          >
                            <MessageCircle className="h-4 w-4" /> WhatsApp
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
      )}
      <NotaCreditoModal
        open={open && modalNota === 'credito'}
        facturaId={f?.id}
        onClose={() => setModalNota(null)}
        onCreada={notaCreada}
      />
      <NotaDebitoModal
        open={open && modalNota === 'debito'}
        facturaId={f?.id}
        onClose={() => setModalNota(null)}
        onCreada={notaCreada}
      />
    </>
  );
}
