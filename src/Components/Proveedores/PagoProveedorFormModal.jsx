// src/Components/Proveedores/PagoProveedorFormModal.jsx
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  backdropV,
  panelV,
  formContainerV,
  fieldV
} from '../../ui/animHelpers';
import { X, Wallet, Calendar, StickyNote } from 'lucide-react';
import { createPagoProveedor } from '../../api/pagosProveedores.js';
import { abrirCertificadoRetencion } from '../../api/facturacion';
import { baseSwal, showErrorSwal, showWarnSwal } from '../../ui/swal';
import { blockWheelChange } from '../../utils/numberInput';
import { API_BASE_URL as API_URL } from '../../api/apiBase';
import MedioPagoField from '../Common/MedioPagoField';
import RetencionesEditor from '../Facturacion/RetencionesEditor';
import useCatalogoFiscal from '../../hooks/useCatalogoFiscal';
import useEstadoEmision from '../../hooks/useEstadoEmision';
import { errorRetenciones, retencionesParaEnviar, totalRetenciones } from '../../utils/retenciones';

const inputCls =
  'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/40 focus:border-transparent';
const labelCls = 'flex items-center gap-2 text-sm font-medium text-slate-600 mb-2';

const todayISO = () => new Date().toISOString().slice(0, 10);

export default function PagoProveedorFormModal({
  open,
  onClose,
  proveedor,
  totalDeuda,
  onPagoRegistrado
}) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    monto: '',
    fecha: todayISO(),
    medio_pago: '',
    medios_pago: null, // split de medios de pago: [{ medio_pago, monto }, ...] o null
    observaciones: ''
  });
  const [errors, setErrors] = useState({});
  const [retenciones, setRetenciones] = useState([]); // retenciones que se le practican al proveedor
  const catalogoFiscal = useCatalogoFiscal();
  const cantidadCuits = useEstadoEmision()?.emisores?.length || 1;

  useEffect(() => {
    if (open) {
      setForm({
        monto: totalDeuda ? String(totalDeuda) : '',
        fecha: todayISO(),
        medio_pago: '',
        medios_pago: null,
        observaciones: ''
      });
      setErrors({});
      setRetenciones([]);
    }
  }, [open, totalDeuda]);

  const handle = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const validate = () => {
    const e = {};
    const monto = Number(form.monto);
    if (!Number.isFinite(monto) || monto <= 0) {
      e.monto = 'El monto debe ser mayor a 0';
    }
    if (!form.fecha) e.fecha = 'La fecha es obligatoria';
    if (Array.isArray(form.medios_pago)) {
      const sumaSplit = form.medios_pago.reduce((acc, t) => acc + (Number(t.monto) || 0), 0);
      const splitOk =
        form.medios_pago.length > 0 &&
        form.medios_pago.every((t) => t.medio_pago && Number(t.monto) > 0) &&
        Math.abs(sumaSplit - monto) < 0.01;
      if (!splitOk) {
        e.medio_pago = 'Los medios de pago tienen que sumar exactamente el monto.';
      }
    } else if (!form.medio_pago) {
      e.medio_pago = 'El medio de pago es obligatorio';
    }
    const errorRet = errorRetenciones(retenciones, catalogoFiscal, cantidadCuits);
    if (errorRet) e.retenciones = errorRet;
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      setSaving(true);
      const resp = await createPagoProveedor({
        proveedor_id: proveedor.id,
        fecha: form.fecha,
        total_pagado: Number(form.monto),
        medio_pago: Array.isArray(form.medios_pago) ? null : form.medio_pago?.trim() || null,
        medios_pago: Array.isArray(form.medios_pago) ? form.medios_pago : null,
        retenciones: retencionesParaEnviar(retenciones),
        observaciones: form.observaciones?.trim() || null
      });
      const pagoId = resp?.pago?.id;
      const certificados = resp?.retenciones || [];
      const result = await baseSwal.fire({
        icon: 'success',
        title: 'Pago registrado',
        text: 'El pago se aplicó correctamente.',
        showDenyButton: !!pagoId,
        denyButtonText: 'Imprimir recibo',
        denyButtonColor: '#0ea5e9',
        showCancelButton: certificados.length > 0,
        cancelButtonText: certificados.length === 1 ? 'Ver certificado de retención' : 'Ver certificados de retención',
        confirmButtonText: 'Ok'
      });
      if (result.dismiss === 'cancel') {
        for (const c of certificados) await abrirCertificadoRetencion(c.id).catch(() => {});
      }
      if (result.isDenied && pagoId) {
        window.open(`${API_URL}/pagos-proveedores/${pagoId}/recibo-pdf`, '_blank');
      }
      onPagoRegistrado?.();
      onClose();
    } catch (err) {
      const { code, mensajeError, tips } = err || {};
      if (code === 'BAD_REQUEST') {
        return showWarnSwal({ title: 'Datos inválidos', text: mensajeError, tips });
      }
      return showErrorSwal({
        title: 'No se pudo registrar el pago',
        text: mensajeError || 'Ocurrió un error inesperado',
        tips
      });
    } finally {
      setSaving(false);
    }
  };

  return (
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
              <motion.div
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-5 flex items-center gap-3"
              >
                <Wallet className="h-6 w-6 text-emerald-600 shrink-0" />
                <h3 className="text-xl font-bold tracking-tight text-slate-900">
                  Registrar pago
                </h3>
              </motion.div>

              <p className="text-sm text-slate-500 mb-4">
                Proveedor: <strong className="text-slate-700">{proveedor?.razon_social}</strong>
              </p>

              <motion.form
                onSubmit={submit}
                variants={formContainerV}
                initial="hidden"
                animate="visible"
                className="space-y-4"
              >
                <motion.div variants={fieldV}>
                  <label className={labelCls}>
                    <Wallet className="h-4 w-4 text-slate-600" />
                    Monto a pagar <span className="text-emerald-600">*</span>
                  </label>
                  <input
                    name="monto"
                    type="number"
                    onWheel={blockWheelChange}
                    step="0.01"
                    value={form.monto}
                    onChange={handle}
                    className={inputCls}
                    placeholder="0.00"
                  />
                  {errors.monto && (
                    <p className="mt-1 text-sm text-rose-600">{errors.monto}</p>
                  )}
                </motion.div>

                <motion.div variants={fieldV}>
                  <label className={labelCls}>
                    <Calendar className="h-4 w-4 text-slate-600" />
                    Fecha <span className="text-emerald-600">*</span>
                  </label>
                  <input
                    name="fecha"
                    type="date"
                    value={form.fecha}
                    onChange={handle}
                    className={inputCls}
                  />
                  {errors.fecha && (
                    <p className="mt-1 text-sm text-rose-600">{errors.fecha}</p>
                  )}
                </motion.div>

                <motion.div variants={fieldV}>
                  <MedioPagoField
                    value={{ medio_pago: form.medio_pago, medios_pago: form.medios_pago }}
                    onChange={(v) =>
                      setForm((f) => ({ ...f, medio_pago: v.medio_pago, medios_pago: v.medios_pago }))
                    }
                    total={Number(form.monto) || 0}
                  />
                  {errors.medio_pago && (
                    <p className="mt-1 text-sm text-rose-600">{errors.medio_pago}</p>
                  )}
                </motion.div>

                <motion.div variants={fieldV}>
                  <RetencionesEditor value={retenciones} onChange={setRetenciones} tipo="practicadas" disabled={saving} />
                  {errors.retenciones && <p className="mt-1 text-sm text-rose-600">{errors.retenciones}</p>}
                  {totalRetenciones(retenciones) > 0 && (
                    <p className="mt-1 text-[11px] text-slate-500">
                      Se cancelan $ {(Number(form.monto || 0) + totalRetenciones(retenciones)).toLocaleString('es-AR', { minimumFractionDigits: 2 })} de deuda:
                      lo que sale de la caja más las retenciones.
                    </p>
                  )}
                </motion.div>

                <motion.div variants={fieldV}>
                  <label className={labelCls}>
                    <StickyNote className="h-4 w-4 text-slate-600" />
                    Observaciones (opcional)
                  </label>
                  <textarea
                    name="observaciones"
                    rows={2}
                    value={form.observaciones}
                    onChange={handle}
                    className={`${inputCls} resize-y`}
                  />
                </motion.div>

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
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold
                               disabled:opacity-60 disabled:cursor-not-allowed transition"
                  >
                    {saving ? 'Guardando…' : 'Registrar pago'}
                  </button>
                </motion.div>
              </motion.form>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
