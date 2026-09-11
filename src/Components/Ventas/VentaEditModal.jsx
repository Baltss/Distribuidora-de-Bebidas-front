// ===============================
// FILE: src/Components/Ventas/VentaEditModal.jsx
// Edición de una venta ya existente (cliente, vendedor, fecha, tipo,
// observaciones y medio de pago). Disponible para cualquier usuario
// autenticado que pueda ver el Historial de Ventas (admin y vendedor
// por igual) — no hay gating de rol acá.
// ===============================
import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Trash2 } from 'lucide-react';

import { listClientes } from '../../api/clientes';
import { listVendedores } from '../../api/vendedores';
import SearchableSelect from '../Common/SearchableSelect';
import { blockWheelChange } from '../../utils/numberInput';
import { MEDIOS_PAGO } from '../../utils/mediosPago';

const moneyRound = (n) =>
  Math.round((Number(n || 0) + Number.EPSILON) * 100) / 100;

let splitKeySeq = 0;
const makeEmptySplit = () => ({ _key: ++splitKeySeq, medio_pago: '', monto: '' });

const toDateInputValue = (v) => {
  if (!v) return '';
  const d = new Date(v);
  if (isNaN(d.getTime())) return '';
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

export default function VentaEditModal({ open, venta, onClose, onSubmit }) {
  const [form, setForm] = useState({
    cliente_id: '',
    vendedor_id: '',
    fecha: '',
    tipo: 'contado',
    observaciones: '',
    medio_pago: ''
  });
  const [dividirPago, setDividirPago] = useState(false);
  const [splits, setSplits] = useState([makeEmptySplit()]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [clientes, setClientes] = useState([]);
  const [loadingClientes, setLoadingClientes] = useState(false);
  const [vendedores, setVendedores] = useState([]);
  const [loadingVendedores, setLoadingVendedores] = useState(false);

  // ---------- Precarga con los valores actuales de la venta ----------
  useEffect(() => {
    if (!open || !venta) return;

    setError('');

    const medios = Array.isArray(venta.medios_pago) ? venta.medios_pago : null;
    const esDividido = !!medios && medios.length > 1;

    setForm({
      cliente_id: venta.cliente_id ?? venta.cliente?.id ?? '',
      vendedor_id: venta.vendedor_id ?? venta.vendedor?.id ?? '',
      fecha: toDateInputValue(venta.fecha),
      tipo: venta.tipo || 'contado',
      observaciones: venta.observaciones || '',
      medio_pago: esDividido ? '' : venta.medio_pago || medios?.[0]?.medio_pago || ''
    });

    setDividirPago(esDividido);
    setSplits(
      esDividido
        ? medios.map((m) => ({
            _key: ++splitKeySeq,
            medio_pago: m.medio_pago || '',
            monto: m.monto != null ? String(m.monto) : ''
          }))
        : [makeEmptySplit()]
    );
  }, [open, venta]);

  // ---------- Catálogos ----------
  useEffect(() => {
    if (!open) return;
    let alive = true;

    (async () => {
      try {
        setLoadingClientes(true);
        const cRes = await listClientes({
          estado: 'activo',
          orderBy: 'nombre',
          orderDir: 'ASC',
          limit: 2000
        });
        const cs = Array.isArray(cRes?.data) ? cRes.data : [];
        if (alive) setClientes(cs);
      } catch (err) {
        console.error('Error cargando clientes para edición de venta:', err);
        if (alive) setClientes([]);
      } finally {
        if (alive) setLoadingClientes(false);
      }

      try {
        setLoadingVendedores(true);
        const vRes = await listVendedores({
          estado: 'activo',
          orderBy: 'nombre',
          orderDir: 'ASC',
          limit: 1000
        });
        const vs = Array.isArray(vRes?.data) ? vRes.data : vRes || [];
        if (alive) setVendedores(Array.isArray(vs) ? vs : []);
      } catch (err) {
        console.error('Error cargando vendedores para edición de venta:', err);
        if (alive) setVendedores([]);
      } finally {
        if (alive) setLoadingVendedores(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [open]);

  const totalNeto = Number(venta?.total_neto ?? 0);

  const requiereMedioPago = form.tipo === 'contado';

  const splitsTotal = useMemo(
    () => moneyRound(splits.reduce((acc, s) => acc + Number(s.monto || 0), 0)),
    [splits]
  );

  const splitsOk = useMemo(() => {
    if (!dividirPago || !requiereMedioPago) return true;
    const validos = splits.every(
      (s) => s.medio_pago && Number(s.monto) > 0
    );
    return validos && Math.abs(splitsTotal - moneyRound(totalNeto)) <= 0.01;
  }, [dividirPago, requiereMedioPago, splits, splitsTotal, totalNeto]);

  const canSave = useMemo(() => {
    const cliId = Number(form.cliente_id);
    const vendId = Number(form.vendedor_id);
    const hasCliente = Number.isFinite(cliId) && cliId > 0;
    const hasVendedor = Number.isFinite(vendId) && vendId > 0;
    const hasFecha = !!form.fecha;

    const hasMedioPago = !requiereMedioPago
      ? true
      : dividirPago
        ? splitsOk
        : !!form.medio_pago;

    return hasCliente && hasVendedor && hasFecha && hasMedioPago && !saving;
  }, [form, requiereMedioPago, dividirPago, splitsOk, saving]);

  // ---------- Handlers ----------
  const handleTipo = (tipo) => {
    setForm((f) => ({ ...f, tipo }));
  };

  const handleSplitChange = (index, field, value) => {
    setSplits((prev) =>
      prev.map((s, i) => (i === index ? { ...s, [field]: value } : s))
    );
  };

  const addSplitRow = () => setSplits((prev) => [...prev, makeEmptySplit()]);

  const removeSplitRow = (index) =>
    setSplits((prev) => (prev.length === 1 ? prev : prev.filter((_, i) => i !== index)));

  const handleDividirToggle = (v) => {
    setDividirPago(v);
    if (v) {
      // Al activar, arrancamos con un split precargado con el medio simple actual.
      setSplits([
        {
          _key: ++splitKeySeq,
          medio_pago: form.medio_pago || '',
          monto: totalNeto ? String(moneyRound(totalNeto)) : ''
        }
      ]);
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!canSave || !venta) return;

    setError('');

    const payload = {
      cliente_id: Number(form.cliente_id),
      vendedor_id: Number(form.vendedor_id),
      fecha: form.fecha,
      tipo: form.tipo,
      observaciones: form.observaciones?.trim() || null
    };

    if (requiereMedioPago) {
      if (dividirPago) {
        payload.medios_pago = splits.map((s) => ({
          medio_pago: s.medio_pago,
          monto: moneyRound(Number(s.monto || 0))
        }));
      } else {
        payload.medio_pago = form.medio_pago;
      }
    }

    try {
      setSaving(true);
      await onSubmit(venta.id, payload);
    } catch (err) {
      const msg =
        err?.response?.data?.mensajeError ||
        err?.mensajeError ||
        err?.message ||
        'No se pudo actualizar la venta.';
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {open && venta && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 260, damping: 24 }}
            className="relative w-full max-w-[92vw] sm:max-w-xl md:max-w-2xl
                       max-h-[90vh] flex flex-col overscroll-contain
                       rounded-2xl border border-slate-200 bg-white shadow-2xl"
          >
            <button
              onClick={onClose}
              className="absolute z-50 top-2.5 right-2.5 inline-flex h-9 w-9 items-center justify-center rounded-lg
                         bg-slate-100 border border-slate-200 hover:bg-slate-200 transition"
              aria-label="Cerrar"
            >
              <X className="h-5 w-5 text-slate-500" />
            </button>

            <div className="relative z-10 flex flex-col flex-1 min-h-0">
              <h3 className="shrink-0 px-5 sm:px-6 md:px-8 pt-5 sm:pt-6 md:pt-8 text-xl sm:text-2xl font-bold tracking-tight text-slate-900 mb-1">
                Editar venta #{venta.id}
              </h3>
              <p className="shrink-0 px-5 sm:px-6 md:px-8 text-sm text-slate-500 mb-5">
                Total neto: <span className="font-semibold">$ {moneyRound(totalNeto).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </p>

              <form onSubmit={submit} className="flex flex-col flex-1 min-h-0">
                <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-5 sm:px-6 md:px-8 space-y-5">
                  {error && (
                    <div className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm text-rose-700">
                      {error}
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-600 mb-2">
                        Cliente <span className="text-orange-600">*</span>
                      </label>
                      <SearchableSelect
                        items={clientes}
                        value={form.cliente_id}
                        onChange={(cliOrId) => {
                          const id =
                            typeof cliOrId === 'object'
                              ? cliOrId?.id
                              : cliOrId;
                          setForm((f) => ({ ...f, cliente_id: id || '' }));
                        }}
                        placeholder={loadingClientes ? 'Cargando…' : 'Cliente…'}
                        getOptionLabel={(c) =>
                          c ? `${c.nombre} (${c.documento || 's/ doc'})` : ''
                        }
                        getOptionValue={(c) => c.id}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-600 mb-2">
                        Vendedor <span className="text-orange-600">*</span>
                      </label>
                      <select
                        value={form.vendedor_id || ''}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, vendedor_id: e.target.value }))
                        }
                        disabled={loadingVendedores}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-slate-800
                                   focus:outline-none focus:ring-2 focus:ring-orange-400/40 focus:border-transparent
                                   disabled:opacity-60"
                      >
                        <option value="">
                          {loadingVendedores ? 'Cargando…' : 'Seleccionar…'}
                        </option>
                        {vendedores.map((v) => (
                          <option key={v.id} value={v.id}>
                            {v.nombre}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-600 mb-2">
                        Fecha <span className="text-orange-600">*</span>
                      </label>
                      <input
                        type="date"
                        value={form.fecha}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, fecha: e.target.value }))
                        }
                        className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-slate-800
                                   focus:outline-none focus:ring-2 focus:ring-orange-400/40 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-600 mb-2">
                        Tipo de venta
                      </label>
                      <div className="inline-flex rounded-xl bg-slate-100 border border-slate-200 p-1">
                        {[
                          { key: 'contado', label: 'Contado' },
                          { key: 'fiado', label: 'Fiado' },
                          { key: 'a_cuenta', label: 'A cuenta' }
                        ].map((opt) => (
                          <button
                            key={opt.key}
                            type="button"
                            onClick={() => handleTipo(opt.key)}
                            className={`px-3.5 py-1.5 text-sm rounded-lg transition
                              ${
                                form.tipo === opt.key
                                  ? 'bg-orange-500 text-white shadow'
                                  : 'text-slate-500 hover:bg-slate-100'
                              }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Medio de pago */}
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <label className="block text-sm font-medium text-slate-600">
                        Medio de pago{' '}
                        {!requiereMedioPago && (
                          <span className="text-slate-500 font-normal">
                            (no aplica en {form.tipo})
                          </span>
                        )}
                      </label>

                      {requiereMedioPago && (
                        <label className="inline-flex items-center gap-2 text-xs text-slate-600 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={dividirPago}
                            onChange={(e) => handleDividirToggle(e.target.checked)}
                            className="rounded border-slate-300"
                          />
                          Dividir en varios medios de pago
                        </label>
                      )}
                    </div>

                    {requiereMedioPago && !dividirPago && (
                      <select
                        value={form.medio_pago}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, medio_pago: e.target.value }))
                        }
                        className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-slate-800
                                   focus:outline-none focus:ring-2 focus:ring-orange-400/40 focus:border-transparent"
                      >
                        <option value="">Seleccionar…</option>
                        {MEDIOS_PAGO.map((m) => (
                          <option key={m.value} value={m.value}>
                            {m.label}
                          </option>
                        ))}
                      </select>
                    )}

                    {requiereMedioPago && dividirPago && (
                      <div className="space-y-2">
                        {splits.map((s, index) => (
                          <div
                            key={s._key}
                            className="grid grid-cols-1 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_auto] gap-3
                                       items-center bg-slate-50 rounded-xl border border-slate-200 p-3"
                          >
                            <select
                              value={s.medio_pago}
                              onChange={(e) =>
                                handleSplitChange(index, 'medio_pago', e.target.value)
                              }
                              className="w-full rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-sm text-slate-800
                                         focus:outline-none focus:ring-2 focus:ring-orange-400/40 focus:border-transparent"
                            >
                              <option value="">Medio de pago…</option>
                              {MEDIOS_PAGO.map((m) => (
                                <option key={m.value} value={m.value}>
                                  {m.label}
                                </option>
                              ))}
                            </select>

                            <input
                              type="number"
                              onWheel={blockWheelChange}
                              min="0"
                              step="0.01"
                              value={s.monto}
                              onChange={(e) =>
                                handleSplitChange(index, 'monto', e.target.value)
                              }
                              placeholder="0.00"
                              className="w-full rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-sm text-slate-800
                                         focus:outline-none focus:ring-2 focus:ring-orange-400/40 focus:border-transparent"
                            />

                            <button
                              type="button"
                              onClick={() => removeSplitRow(index)}
                              disabled={splits.length === 1}
                              className="inline-flex items-center justify-center rounded-full p-2
                                         border border-rose-300 text-rose-500 hover:bg-rose-50
                                         disabled:opacity-40 disabled:cursor-not-allowed transition"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        ))}

                        <div className="flex items-center justify-between gap-3">
                          <button
                            type="button"
                            onClick={addSplitRow}
                            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm
                                       bg-emerald-500/80 hover:bg-emerald-500 text-white font-medium transition"
                          >
                            <Plus className="h-4 w-4" />
                            Agregar medio
                          </button>

                          <p
                            className={`text-xs font-medium ${
                              Math.abs(splitsTotal - moneyRound(totalNeto)) <= 0.01
                                ? 'text-emerald-600'
                                : 'text-rose-600'
                            }`}
                          >
                            Suma: $ {splitsTotal.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            {' '}/ $ {moneyRound(totalNeto).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Observaciones */}
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-2">
                      Observaciones
                    </label>
                    <textarea
                      value={form.observaciones}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, observaciones: e.target.value }))
                      }
                      rows={3}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-slate-800
                                 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-400/40 focus:border-transparent"
                      placeholder="Notas internas de la operación (opcional)"
                    />
                  </div>
                </div>

                <div className="shrink-0 border-t border-slate-200 bg-white px-5 sm:px-6 md:px-8 py-4
                                 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={!canSave}
                    className="px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-semibold
                               hover:brightness-110 disabled:opacity-60 disabled:cursor-not-allowed transition"
                  >
                    {saving ? 'Guardando…' : 'Guardar cambios'}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
