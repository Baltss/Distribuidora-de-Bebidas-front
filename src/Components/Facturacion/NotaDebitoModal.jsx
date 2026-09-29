// src/Components/Facturacion/NotaDebitoModal.jsx
// Nota de Débito sobre una factura autorizada: un cargo posterior
// (intereses, flete, diferencia de precio…). Se cobra en el momento o
// queda en la cuenta corriente del cliente (se cobra desde Cobranzas).
import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2, Info, Banknote, BookOpen } from 'lucide-react';
import { backdropV, panelV } from '../../ui/animHelpers';
import { getAjustesFactura, crearNotaDebito } from '../../api/facturacion';
import { showApiErrorSwal, showConfirmSwal } from '../../ui/swal';
import moneyAR from '../../utils/money';
import { MEDIOS_PAGO } from '../../utils/mediosPago';

const inputCls =
  'w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-400/40';

// value = condición|porcentaje
const OPCIONES_IVA = [
  { value: 'gravado|21', label: 'IVA 21%' },
  { value: 'gravado|10.5', label: 'IVA 10,5%' },
  { value: 'gravado|27', label: 'IVA 27%' },
  { value: 'gravado|5', label: 'IVA 5%' },
  { value: 'gravado|2.5', label: 'IVA 2,5%' },
  { value: 'gravado|0', label: 'IVA 0%' },
  { value: 'exento|0', label: 'Exento' },
  { value: 'no_gravado|0', label: 'No gravado' }
];

const SUGERENCIAS = ['Intereses por pago fuera de término', 'Flete', 'Diferencia de precio'];

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

export default function NotaDebitoModal({ open, facturaId, onClose, onCreada }) {
  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [concepto, setConcepto] = useState('');
  const [monto, setMonto] = useState('');
  const [iva, setIva] = useState('gravado|21');
  const [destino, setDestino] = useState('cobrar_ahora');
  const [medioPago, setMedioPago] = useState('efectivo');
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (!open || !facturaId) return;
    setDatos(null);
    setConcepto('');
    setMonto('');
    setIva('gravado|21');
    setMedioPago('efectivo');
    setCargando(true);
    getAjustesFactura(facturaId)
      .then((d) => {
        setDatos(d);
        setDestino(d.es_consumidor_final ? 'cobrar_ahora' : 'cuenta_corriente');
      })
      .catch(async (err) => {
        await showApiErrorSwal(err, { title: 'No se pudo preparar la nota de débito' });
        onClose();
      })
      .finally(() => setCargando(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, facturaId]);

  const importe = Number(String(monto).replace(',', '.'));
  const importeValido = Number.isFinite(importe) && importe > 0;
  const puedeEmitir = datos && !datos.bloqueo && importeValido && concepto.trim() && !enviando;

  const emitir = async () => {
    const ok = await showConfirmSwal({
      title: '¿Emitir la nota de débito?',
      html:
        `Nota de débito por <b>${moneyAR(importe)}</b> (${concepto.trim()}) ante ARCA. Un comprobante fiscal no se puede borrar.<br/>` +
        (destino === 'cobrar_ahora'
          ? `Se cobra ahora en ${MEDIOS_PAGO.find((m) => m.value === medioPago)?.label || medioPago}.`
          : 'Queda en la cuenta corriente del cliente.'),
      confirmText: 'Sí, emitir'
    });
    if (!ok) return;
    const [ivaCondicion, ivaPorcentaje] = iva.split('|');
    try {
      setEnviando(true);
      const r = await crearNotaDebito(facturaId, {
        concepto: concepto.trim(),
        monto: Math.round(importe * 100) / 100,
        iva_condicion: ivaCondicion,
        iva_porcentaje: Number(ivaPorcentaje),
        destino,
        ...(destino === 'cobrar_ahora' ? { medio_pago: medioPago } : {})
      });
      onCreada?.(r.factura_id);
    } catch (err) {
      await showApiErrorSwal(err, { title: 'No se pudo emitir la nota de débito' });
    } finally {
      setEnviando(false);
    }
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
          aria-label="Nota de débito"
        >
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            variants={panelV}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="relative w-full max-w-xl max-h-[92vh] flex flex-col rounded-2xl border border-slate-200 bg-white shadow-2xl"
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
                  <h3 className="text-xl font-bold text-slate-900">Nota de débito</h3>
                  <p className="mt-0.5 text-sm text-slate-500">
                    Sobre {datos.factura.nombre} · {datos.factura.receptor_nombre}
                  </p>
                </div>

                <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
                  {datos.bloqueo ? (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                      {datos.bloqueo}
                    </div>
                  ) : (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-slate-600 mb-1">Concepto</label>
                        <input
                          value={concepto}
                          onChange={(e) => setConcepto(e.target.value)}
                          maxLength={200}
                          className={inputCls}
                          placeholder="¿Qué se le cobra?"
                        />
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                          {SUGERENCIAS.map((s) => (
                            <button
                              key={s}
                              type="button"
                              onClick={() => setConcepto(s)}
                              className="rounded-full border border-slate-200 px-2.5 py-0.5 text-xs text-slate-600 hover:bg-slate-50"
                            >
                              {s}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-600 mb-1">Importe (IVA incluido)</label>
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
                        </div>
                        {datos.factura.discrimina_iva ? (
                          <div>
                            <label className="block text-sm font-medium text-slate-600 mb-1">IVA</label>
                            <select value={iva} onChange={(e) => setIva(e.target.value)} className={inputCls}>
                              {OPCIONES_IVA.map((o) => (
                                <option key={o.value} value={o.value}>
                                  {o.label}
                                </option>
                              ))}
                            </select>
                          </div>
                        ) : (
                          <p className="self-end pb-2 text-xs text-slate-500">Comprobante C: no discrimina IVA.</p>
                        )}
                      </div>

                      <div>
                        <p className="text-sm font-medium text-slate-600 mb-1.5">¿Cómo se cobra?</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <Opcion
                            activa={destino === 'cobrar_ahora'}
                            onClick={() => setDestino('cobrar_ahora')}
                            icon={Banknote}
                            titulo="Cobrar ahora"
                          >
                            Entra en la caja de hoy.
                          </Opcion>
                          <Opcion
                            activa={destino === 'cuenta_corriente'}
                            disabled={datos.es_consumidor_final}
                            onClick={() => setDestino('cuenta_corriente')}
                            icon={BookOpen}
                            titulo="A cuenta corriente"
                          >
                            {datos.es_consumidor_final
                              ? 'No disponible para Consumidor Final.'
                              : 'Suma a su deuda; se cobra después desde Cobranzas.'}
                          </Opcion>
                        </div>
                        {destino === 'cobrar_ahora' && (
                          <div className="mt-2 max-w-xs">
                            <label className="block text-xs font-medium text-slate-600 mb-1">Medio de pago</label>
                            <select value={medioPago} onChange={(e) => setMedioPago(e.target.value)} className={inputCls}>
                              {MEDIOS_PAGO.map((m) => (
                                <option key={m.value} value={m.value}>
                                  {m.label}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>

                      <p className="flex items-start gap-2 text-xs text-slate-500">
                        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                        La nota de débito se emite ante ARCA; cuando queda autorizada se registra sola
                        {destino === 'cobrar_ahora' ? ' el cobro en la caja.' : ' la deuda en la cuenta corriente.'}
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
                      Emitir nota de débito {importeValido ? `por ${moneyAR(importe)}` : ''}
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
