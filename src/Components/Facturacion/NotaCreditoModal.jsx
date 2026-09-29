// src/Components/Facturacion/NotaCreditoModal.jsx
// Nota de Crédito sobre una factura autorizada:
// - Devolución de productos: se eligen cantidades (nunca más de lo
//   facturado); la mercadería vuelve al stock.
// - Bonificación: un monto de descuento, repartido entre las alícuotas.
// El importe cancela primero lo que el cliente debe de esa venta; lo que
// sobra se le devuelve en dinero o queda como saldo a favor.
import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2, PackageOpen, Percent, Info, Wallet, PiggyBank } from 'lucide-react';
import { backdropV, panelV } from '../../ui/animHelpers';
import { getAjustesFactura, crearNotaCredito } from '../../api/facturacion';
import { showApiErrorSwal, showConfirmSwal } from '../../ui/swal';
import moneyAR from '../../utils/money';
import { MEDIOS_PAGO } from '../../utils/mediosPago';

const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;
const cant = (n) => Number(n).toLocaleString('es-AR', { maximumFractionDigits: 3 });
const aNumero = (v) => Number(String(v ?? '').replace(',', '.'));

const inputCls =
  'w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-400/40';

// Mismo cálculo que el backend: si devuelve todo lo que quedaba, el
// importe es exactamente el resto; si no, proporcional.
function importeDevolucion(it, cantidad) {
  if (!(cantidad > 0)) return 0;
  if (Math.abs(cantidad - it.disponible) < 0.0005) return round2(it.subtotal - it.subtotal_devuelto);
  return round2((it.subtotal * cantidad) / it.cantidad);
}

function Opcion({ activa, disabled, onClick, icon: Icon, titulo, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`w-full text-left rounded-xl border px-3.5 py-3 transition ${
        activa ? 'border-teal-500 bg-teal-50 ring-2 ring-teal-400/30' : 'border-slate-200 hover:bg-slate-50'
      } disabled:opacity-50 disabled:cursor-not-allowed`}
    >
      <span className="flex items-center gap-2 text-sm font-semibold text-slate-800">
        <Icon className="h-4 w-4 text-teal-600" /> {titulo}
      </span>
      {children && <span className="mt-0.5 block text-xs text-slate-500">{children}</span>}
    </button>
  );
}

export default function NotaCreditoModal({ open, facturaId, onClose, onCreada }) {
  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [motivo, setMotivo] = useState('devolucion');
  const [cantidades, setCantidades] = useState({});
  const [monto, setMonto] = useState('');
  const [descripcion, setDescripcion] = useState('Bonificación');
  const [destino, setDestino] = useState('reintegro');
  const [medioPago, setMedioPago] = useState('efectivo');
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (!open || !facturaId) return;
    setDatos(null);
    setMotivo('devolucion');
    setCantidades({});
    setMonto('');
    setDescripcion('Bonificación');
    setMedioPago('efectivo');
    setCargando(true);
    getAjustesFactura(facturaId)
      .then((d) => {
        setDatos(d);
        // Si el cliente tiene cuenta corriente, por defecto el sobrante queda a favor.
        setDestino(d.es_consumidor_final ? 'reintegro' : 'saldo_a_favor');
      })
      .catch(async (err) => {
        await showApiErrorSwal(err, { title: 'No se pudo preparar la nota de crédito' });
        onClose();
      })
      .finally(() => setCargando(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, facturaId]);

  const items = useMemo(() => datos?.items || [], [datos]);

  const total = useMemo(() => {
    if (motivo === 'bonificacion') {
      const n = aNumero(monto);
      return Number.isFinite(n) && n > 0 ? round2(n) : 0;
    }
    return round2(items.reduce((acc, it) => acc + importeDevolucion(it, aNumero(cantidades[it.id] || 0)), 0));
  }, [motivo, monto, cantidades, items]);

  const errorCantidad = items.find((it) => {
    const c = aNumero(cantidades[it.id] || 0);
    return !Number.isFinite(c) || c < 0 || c - it.disponible > 0.0005;
  });
  const disponible = datos?.disponible_nc ?? 0;
  const excede = total - disponible > 0.005;
  const aDeuda = round2(Math.min(total, datos?.deuda_ventas ?? 0));
  const sobrante = round2(total - aDeuda);

  const setCantidad = (id, v) => setCantidades((c) => ({ ...c, [id]: v }));

  const emitir = async () => {
    const detalleDestino =
      sobrante > 0
        ? destino === 'reintegro'
          ? `<br/>Se le devuelven <b>${moneyAR(sobrante)}</b> (${
              MEDIOS_PAGO.find((m) => m.value === medioPago)?.label || medioPago
            }).`
          : `<br/><b>${moneyAR(sobrante)}</b> quedan como saldo a favor del cliente.`
        : '';
    const ok = await showConfirmSwal({
      title: '¿Emitir la nota de crédito?',
      html:
        `Nota de crédito por <b>${moneyAR(total)}</b> ante ARCA. Un comprobante fiscal no se puede borrar.` +
        (aDeuda > 0 ? `<br/>Se descuentan <b>${moneyAR(aDeuda)}</b> de lo que debe de esta venta.` : '') +
        detalleDestino,
      confirmText: 'Sí, emitir'
    });
    if (!ok) return;

    const payload =
      motivo === 'devolucion'
        ? {
            motivo,
            items: items
              .map((it) => ({ item_id: it.id, cantidad: aNumero(cantidades[it.id] || 0) }))
              .filter((x) => x.cantidad > 0)
          }
        : { motivo, monto: total, descripcion: descripcion.trim() || 'Bonificación' };
    payload.destino_excedente = destino;
    if (destino === 'reintegro') payload.medio_pago = medioPago;

    try {
      setEnviando(true);
      const r = await crearNotaCredito(facturaId, payload);
      onCreada?.(r.factura_id);
    } catch (err) {
      await showApiErrorSwal(err, { title: 'No se pudo emitir la nota de crédito' });
    } finally {
      setEnviando(false);
    }
  };

  const puedeEmitir = datos && !datos.bloqueo && total > 0 && !excede && !errorCantidad && !enviando;

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
          aria-label="Nota de crédito"
        >
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            variants={panelV}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="relative w-full max-w-3xl max-h-[92vh] flex flex-col rounded-2xl border border-slate-200 bg-white shadow-2xl"
          >
            <button
              onClick={onClose}
              className="absolute z-10 top-2.5 right-2.5 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 border border-slate-200 hover:bg-slate-200"
              aria-label="Cerrar"
            >
              <X className="h-5 w-5 text-slate-500" />
            </button>

            {cargando || !datos ? (
              <div className="flex items-center justify-center py-24">
                <Loader2 className="h-8 w-8 animate-spin text-teal-500" />
              </div>
            ) : (
              <>
                <div className="p-5 sm:p-6 border-b border-slate-100 pr-14">
                  <h3 className="text-xl font-bold text-slate-900">Nota de crédito</h3>
                  <p className="mt-0.5 text-sm text-slate-500">
                    Sobre {datos.factura.nombre} · {datos.factura.receptor_nombre} · Total {moneyAR(datos.factura.importe_total)}
                  </p>
                </div>

                <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
                  {datos.bloqueo ? (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                      {datos.bloqueo}
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <Opcion
                          activa={motivo === 'devolucion'}
                          onClick={() => setMotivo('devolucion')}
                          icon={PackageOpen}
                          titulo="Devolución de productos"
                        >
                          El cliente devuelve mercadería: vuelve al stock.
                        </Opcion>
                        <Opcion
                          activa={motivo === 'bonificacion'}
                          onClick={() => setMotivo('bonificacion')}
                          icon={Percent}
                          titulo="Bonificación o descuento"
                        >
                          Un descuento posterior, sin devolución de mercadería.
                        </Opcion>
                      </div>

                      {motivo === 'devolucion' ? (
                        <div className="overflow-x-auto rounded-xl border border-slate-200">
                          <table className="min-w-full text-sm">
                            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                              <tr>
                                <th className="px-3 py-2 text-left">Producto</th>
                                <th className="px-3 py-2 text-right">Facturado</th>
                                <th className="px-3 py-2 text-right">Ya devuelto</th>
                                <th className="px-3 py-2 text-center">Devuelve</th>
                                <th className="px-3 py-2 text-right">Importe</th>
                              </tr>
                            </thead>
                            <tbody>
                              {items.map((it) => {
                                const valor = cantidades[it.id] ?? '';
                                const c = aNumero(valor || 0);
                                const invalido = !Number.isFinite(c) || c < 0 || c - it.disponible > 0.0005;
                                const agotado = it.disponible <= 0;
                                return (
                                  <tr key={it.id} className={`border-t border-slate-100 ${agotado ? 'opacity-50' : ''}`}>
                                    <td className="px-3 py-2 text-slate-800">
                                      {it.descripcion}
                                      <span className="block text-xs text-slate-400">{moneyAR(it.precio_unit)} c/u</span>
                                    </td>
                                    <td className="px-3 py-2 text-right">{cant(it.cantidad)}</td>
                                    <td className="px-3 py-2 text-right text-slate-500">{it.devuelto ? cant(it.devuelto) : '—'}</td>
                                    <td className="px-3 py-2">
                                      {agotado ? (
                                        <p className="text-center text-xs text-slate-400">Devuelto todo</p>
                                      ) : (
                                        <div className="flex items-center justify-center gap-1.5">
                                          <input
                                            type="number"
                                            inputMode="decimal"
                                            min="0"
                                            max={it.disponible}
                                            step="any"
                                            value={valor}
                                            onChange={(e) => setCantidad(it.id, e.target.value)}
                                            placeholder="0"
                                            aria-label={`Cantidad a devolver de ${it.descripcion}`}
                                            className={`w-20 rounded-lg border px-2 py-1 text-right text-sm focus:outline-none focus:ring-2 ${
                                              invalido
                                                ? 'border-rose-300 focus:ring-rose-300/40'
                                                : 'border-slate-200 focus:ring-teal-400/40'
                                            }`}
                                          />
                                          <button
                                            type="button"
                                            onClick={() => setCantidad(it.id, String(it.disponible))}
                                            className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50"
                                          >
                                            Todo ({cant(it.disponible)})
                                          </button>
                                        </div>
                                      )}
                                      {invalido && !agotado && (
                                        <p className="mt-0.5 text-center text-[11px] text-rose-600">Máximo {cant(it.disponible)}</p>
                                      )}
                                    </td>
                                    <td className="px-3 py-2 text-right font-medium">
                                      {c > 0 && !invalido ? moneyAR(importeDevolucion(it, c)) : '—'}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-slate-600 mb-1">Importe a bonificar (IVA incluido)</label>
                            <input
                              type="number"
                              inputMode="decimal"
                              min="0"
                              step="0.01"
                              value={monto}
                              onChange={(e) => setMonto(e.target.value)}
                              placeholder="0,00"
                              className={inputCls}
                            />
                            <p className="mt-1 text-[11px] text-slate-400">
                              Se reparte entre las alícuotas de IVA de la factura en la misma proporción.
                            </p>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-slate-600 mb-1">Concepto</label>
                            <input
                              value={descripcion}
                              onChange={(e) => setDescripcion(e.target.value)}
                              maxLength={180}
                              className={inputCls}
                              placeholder="Ej.: Bonificación por volumen"
                            />
                          </div>
                        </div>
                      )}

                      <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 space-y-3">
                        <div className="flex items-baseline justify-between">
                          <span className="text-sm text-slate-600">Total de la nota de crédito</span>
                          <span className="text-xl font-bold text-slate-900">{moneyAR(total)}</span>
                        </div>
                        <p className={`text-xs ${excede ? 'text-rose-600 font-semibold' : 'text-slate-500'}`}>
                          {excede
                            ? `Supera lo que queda por acreditar de esta factura (${moneyAR(disponible)}).`
                            : `Queda por acreditar de esta factura: ${moneyAR(disponible)}`}
                          {datos.total_nc > 0 && !excede && ` (ya se acreditaron ${moneyAR(datos.total_nc)})`}
                        </p>

                        {total > 0 && !excede && (
                          <div className="space-y-2 border-t border-slate-200 pt-3 text-sm">
                            {aDeuda > 0 && (
                              <p className="text-slate-700">
                                Se descuenta de lo que debe de esta venta: <b>{moneyAR(aDeuda)}</b>
                              </p>
                            )}
                            {sobrante > 0 ? (
                              <>
                                <p className="text-slate-700">
                                  {aDeuda > 0 ? 'Sobran' : 'El cliente no debe nada de esta venta. Hay que resolver'}{' '}
                                  <b>{moneyAR(sobrante)}</b>:
                                </p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  <Opcion
                                    activa={destino === 'reintegro'}
                                    onClick={() => setDestino('reintegro')}
                                    icon={Wallet}
                                    titulo="Devolverle el dinero"
                                  >
                                    Sale de la caja de hoy.
                                  </Opcion>
                                  <Opcion
                                    activa={destino === 'saldo_a_favor'}
                                    disabled={datos.es_consumidor_final}
                                    onClick={() => setDestino('saldo_a_favor')}
                                    icon={PiggyBank}
                                    titulo="Dejarlo como saldo a favor"
                                  >
                                    {datos.es_consumidor_final
                                      ? 'No disponible para Consumidor Final.'
                                      : 'Se descuenta solo de lo que deba o de su próxima compra a cuenta.'}
                                  </Opcion>
                                </div>
                                {destino === 'reintegro' && (
                                  <div className="max-w-xs">
                                    <label className="block text-xs font-medium text-slate-600 mb-1">¿Cómo se lo devolvés?</label>
                                    <select value={medioPago} onChange={(e) => setMedioPago(e.target.value)} className={inputCls}>
                                      {MEDIOS_PAGO.map((m) => (
                                        <option key={m.value} value={m.value}>
                                          {m.label}
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                )}
                              </>
                            ) : (
                              <p className="text-slate-500">Todo el importe se descuenta de la deuda: no hay que devolver dinero.</p>
                            )}
                          </div>
                        )}
                      </div>

                      <p className="flex items-start gap-2 text-xs text-slate-500">
                        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                        La nota de crédito se emite ante ARCA y, cuando queda autorizada, se aplica sola
                        {motivo === 'devolucion' ? ': la mercadería vuelve al stock, ' : ': '}
                        se descuenta la deuda
                        {destino === 'reintegro' ? ' y la devolución de dinero se registra en la caja.' : ' y el sobrante queda a favor del cliente.'}
                      </p>
                    </>
                  )}
                </div>

                <div className="shrink-0 border-t border-slate-200 px-5 sm:px-6 py-4 flex flex-wrap justify-end gap-2">
                  <button
                    onClick={onClose}
                    className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Cancelar
                  </button>
                  {!datos.bloqueo && (
                    <button
                      onClick={emitir}
                      disabled={!puedeEmitir}
                      className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-50"
                    >
                      {enviando && <Loader2 className="h-4 w-4 animate-spin" />}
                      Emitir nota de crédito {total > 0 ? `por ${moneyAR(total)}` : ''}
                    </button>
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
