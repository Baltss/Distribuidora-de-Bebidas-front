// src/Components/Caja/CerrarCajaModal.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { backdropV, panelV, formContainerV, fieldV } from '../../ui/animHelpers';
import { X, Lock, Wallet, StickyNote, AlertTriangle } from 'lucide-react';
import { blockWheelChange } from '../../utils/numberInput';
import moneyAR from '../../utils/money';
import { medioPagoLabel } from '../../utils/mediosPago';

const inputCls =
  'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-400/40 focus:border-transparent';
const labelCls = 'flex items-center gap-2 text-sm font-medium text-slate-600 mb-2';

const estadoDiferenciaColor = (diferencia, base) => {
  if (diferencia === 0) return 'text-emerald-600';
  const umbral = Math.max(500, Math.abs(base) * 0.02);
  return Math.abs(diferencia) <= umbral ? 'text-amber-600' : 'text-rose-600';
};

// Cierre de una caja (la de hoy, o una pendiente del historial): sólo
// Administrador. Pide declarar cada medio de pago que tuvo movimiento en
// la jornada (efectivo siempre; el resto sólo si tuvo saldo distinto de
// 0), compara contra lo esperado y exige observación si hay diferencia.
export default function CerrarCajaModal({ open, onClose, onSubmit, caja }) {
  const [saving, setSaving] = useState(false);
  const [efectivoContado, setEfectivoContado] = useState('');
  const [montosPorMedio, setMontosPorMedio] = useState({});
  const [observaciones, setObservaciones] = useState('');
  const [error, setError] = useState('');
  const [requiereObservacion, setRequiereObservacion] = useState(false);

  const mediosNoEfectivo = useMemo(
    () =>
      Object.entries(caja?.por_medio_pago || {})
        .filter(([, v]) => Number(v?.total) !== 0)
        .map(([medio, v]) => ({ medio, esperado: Number(v.total) })),
    [caja]
  );

  useEffect(() => {
    if (open) {
      setEfectivoContado('');
      setMontosPorMedio({});
      setObservaciones('');
      setError('');
      setRequiereObservacion(false);
    }
  }, [open, caja?.id]);

  const esperadoEfectivo = Number(caja?.efectivo_esperado_actual ?? 0);
  const contadoNum = Number(efectivoContado);
  const diferenciaEfectivo =
    efectivoContado !== '' && Number.isFinite(contadoNum)
      ? Math.round((contadoNum - esperadoEfectivo) * 100) / 100
      : null;

  const submit = async (e) => {
    e.preventDefault();
    setError('');

    if (!Number.isFinite(contadoNum) || contadoNum < 0) {
      setError('Ingresá el efectivo contado (mayor o igual a 0).');
      return;
    }

    const medios_contados = {};
    for (const { medio } of mediosNoEfectivo) {
      const val = montosPorMedio[medio];
      const num = Number(val);
      if (val === undefined || val === '' || !Number.isFinite(num) || num < 0) {
        setError(`Falta declarar cuánto hay de ${medioPagoLabel(medio)} (hubo movimientos con ese medio).`);
        return;
      }
      medios_contados[medio] = num;
    }

    const hayDiferencia =
      diferenciaEfectivo !== 0 ||
      mediosNoEfectivo.some(({ medio, esperado }) => Math.round((Number(montosPorMedio[medio]) - esperado) * 100) / 100 !== 0);

    if (hayDiferencia && !observaciones.trim()) {
      setRequiereObservacion(true);
      setError('Hay una diferencia entre lo contado y lo esperado: contá el motivo antes de cerrar.');
      return;
    }

    try {
      setSaving(true);
      await onSubmit({
        efectivo_contado: contadoNum,
        medios_contados,
        observaciones: observaciones.trim() || undefined
      });
      onClose();
    } catch (err) {
      if (err?.code === 'OBSERVACION_REQUERIDA' || err?.code === 'MEDIO_PAGO_REQUERIDO') {
        setRequiereObservacion(true);
        setError(err.mensajeError);
      } else {
        setError(err?.mensajeError || 'No se pudo cerrar la caja.');
      }
    } finally {
      setSaving(false);
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
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />

          <motion.div
            variants={panelV}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="relative w-full max-w-[92vw] sm:max-w-md
                       max-h-[85vh] overflow-y-auto overscroll-contain
                       rounded-2xl border border-slate-200 bg-white shadow-2xl"
          >
            <button
              onClick={onClose}
              className="absolute z-50 top-2.5 right-2.5 inline-flex h-9 w-9 items-center justify-center rounded-lg
                         bg-slate-100 border border-slate-200 text-slate-500 hover:bg-slate-200 transition"
              aria-label="Cerrar"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="relative z-10 p-5 sm:p-6">
              <div className="mb-5 flex items-center gap-3">
                <Lock className="h-6 w-6 text-teal-600 shrink-0" />
                <h3 className="text-xl font-bold tracking-tight text-slate-900">
                  Cerrar caja {caja?.fecha_jornada ? `del ${new Date(caja.fecha_jornada).toLocaleDateString('es-AR')}` : ''}
                </h3>
              </div>

              <motion.form
                onSubmit={submit}
                variants={formContainerV}
                initial="hidden"
                animate="visible"
                className="space-y-4"
              >
                <motion.div variants={fieldV}>
                  <label className={labelCls}>
                    <Wallet className="h-4 w-4 text-slate-400" />
                    Efectivo esperado: <span className="font-semibold text-slate-800">{moneyAR(esperadoEfectivo)}</span>
                  </label>
                  <label className={labelCls}>
                    Efectivo contado <span className="text-teal-600">*</span>
                  </label>
                  <input
                    type="number"
                    onWheel={blockWheelChange}
                    step="0.01"
                    value={efectivoContado}
                    onChange={(e) => setEfectivoContado(e.target.value)}
                    className={inputCls}
                    placeholder="0.00"
                  />
                  {diferenciaEfectivo !== null && (
                    <p className={`mt-1.5 text-sm font-medium ${estadoDiferenciaColor(diferenciaEfectivo, esperadoEfectivo)}`}>
                      Diferencia: {moneyAR(diferenciaEfectivo)}
                      {diferenciaEfectivo === 0 ? ' (cuadra)' : diferenciaEfectivo > 0 ? ' (sobra)' : ' (falta)'}
                    </p>
                  )}
                </motion.div>

                {mediosNoEfectivo.map(({ medio, esperado }) => {
                  const valor = montosPorMedio[medio] ?? '';
                  const num = Number(valor);
                  const diferencia = valor !== '' && Number.isFinite(num) ? Math.round((num - esperado) * 100) / 100 : null;
                  return (
                    <motion.div variants={fieldV} key={medio}>
                      <label className={labelCls}>
                        {medioPagoLabel(medio)} esperado: <span className="font-semibold text-slate-800">{moneyAR(esperado)}</span>
                      </label>
                      <label className={labelCls}>
                        {medioPagoLabel(medio)} declarado <span className="text-teal-600">*</span>
                      </label>
                      <input
                        type="number"
                        onWheel={blockWheelChange}
                        step="0.01"
                        value={valor}
                        onChange={(e) =>
                          setMontosPorMedio((m) => ({ ...m, [medio]: e.target.value }))
                        }
                        className={inputCls}
                        placeholder="0.00"
                      />
                      {diferencia !== null && (
                        <p className={`mt-1.5 text-sm font-medium ${estadoDiferenciaColor(diferencia, esperado)}`}>
                          Diferencia: {moneyAR(diferencia)}
                          {diferencia === 0 ? ' (cuadra)' : diferencia > 0 ? ' (sobra)' : ' (falta)'}
                        </p>
                      )}
                    </motion.div>
                  );
                })}

                <motion.div variants={fieldV}>
                  <label className={labelCls}>
                    <StickyNote className="h-4 w-4 text-slate-400" />
                    Observaciones {requiereObservacion && <span className="text-rose-600">*</span>}
                  </label>
                  <textarea
                    rows={3}
                    value={observaciones}
                    onChange={(e) => setObservaciones(e.target.value)}
                    className={`${inputCls} resize-y`}
                    placeholder="Ej: faltante por vuelto mal dado, sobrante sin explicación…"
                  />
                </motion.div>

                {error && (
                  <motion.div
                    variants={fieldV}
                    className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-3 text-sm text-rose-700"
                  >
                    <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </motion.div>
                )}

                <motion.div
                  variants={fieldV}
                  className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-1"
                >
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold
                               disabled:opacity-60 disabled:cursor-not-allowed transition"
                  >
                    {saving ? 'Cerrando…' : 'Cerrar caja'}
                  </button>
                </motion.div>
              </motion.form>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
