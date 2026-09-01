// src/Components/Cobranzas/DeudaClienteModal.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, AlertTriangle, Clock, BadgeDollarSign } from 'lucide-react';

import { getCxcDeudaCliente } from '../../api/cxc';
import { createCobranzaCliente } from '../../api/cobranzasClientes';
import {
  backdropV,
  panelV,
  formContainerV,
  fieldV
} from '../../ui/animHelpers';

import Swal from 'sweetalert2';
import 'sweetalert2/dist/sweetalert2.min.css';
import { blockWheelChange } from '../../utils/numberInput';
import { API_BASE_URL as API_URL } from '../../api/apiBase';
import { MEDIOS_PAGO } from '../../utils/mediosPago';

function formatMoneyARS(value = 0) {
  return Number(value || 0).toLocaleString('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 2
  });
}

function formatFecha(fechaISO) {
  if (!fechaISO) return '—';
  const d = new Date(fechaISO);
  return d.toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit'
  });
}

export default function DeudaClienteModal({
  open,
  onClose,
  clienteId,
  onVerVenta // opcional: callback para abrir el detalle de venta
}) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null); // { cliente, total_deuda, ventas_pendientes, saldo_previo_total, saldos_previos }
  const [error, setError] = useState(null);

  // estados para COBRAR (VENTAS)
  const [cobros, setCobros] = useState({}); // { [ventaId]: monto }
  const [observaciones, setObservaciones] = useState('');
  const [medioPago, setMedioPago] = useState('');
  const [savingCobro, setSavingCobro] = useState(false);

  // ======================================================
  //   - 16-07-2026
  // NUEVO: modo "monto único" — el usuario tipea un solo monto y el
  // sistema lo reparte solo (ventas más antiguas primero, después saldo
  // previo, el resto queda como crédito a favor). 'detalle' es el modo
  // anterior, venta por venta.
  // ======================================================
  const [modoCobro, setModoCobro] = useState('unico'); // 'unico' | 'detalle'
  const [montoUnico, setMontoUnico] = useState('');

  // ======================================================
  //  - 25-02-2026
  // NUEVO: cobro para saldo previo (deuda histórica)
  // IMPORTANTE: se enviará como aplicación explícita { venta_id: null, monto_aplicado }
  // para evitar que el backend ejecute FIFO y toque ventas.
  // ======================================================
  const [cobroSaldoPrevio, setCobroSaldoPrevio] = useState('');

  // Fetch cuando se abre
  useEffect(() => {
    if (!open || !clienteId) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const resp = await getCxcDeudaCliente(clienteId);
        if (!cancelled) {
          setData(resp);
          setCobros({});
          setObservaciones('');
          setMedioPago('');
          setCobroSaldoPrevio('');
          setModoCobro('unico');
          setMontoUnico('');
        }
      } catch (err) {
        console.error('Error cargando deuda cliente:', err);
        if (!cancelled) {
          setError(
            err?.response?.data?.mensajeError ||
              'No se pudo obtener la deuda del cliente.'
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, clienteId]);

  const ventasPendientes = data?.ventas_pendientes || [];

  const saldosPrevios = data?.saldos_previos || [];
  const saldoPrevioTotal = Number(data?.saldo_previo_total || 0);

  const resumen = useMemo(() => {
    const totalDeuda = Number(data?.total_deuda || 0);

    const totalDeudaVentas = ventasPendientes.reduce(
      (acc, v) => acc + Number(v.saldo || 0),
      0
    );

    const maxDiasAtraso = ventasPendientes.reduce(
      (max, v) => Math.max(max, Number(v.dias_atraso || 0)),
      0
    );

    return {
      cantidadVentas: ventasPendientes.length,
      maxDiasAtraso,
      totalDeuda,
      totalDeudaVentas: Number(totalDeudaVentas.toFixed(2)),
      saldoPrevioTotal: Number(saldoPrevioTotal.toFixed(2))
    };
  }, [ventasPendientes, data?.total_deuda, saldoPrevioTotal]);

  // ======================================================
  //   - 16-07-2026
  // Reparto FIFO en el front (mismo orden que usa el backend cuando no
  // se mandan aplicaciones explícitas: fecha ASC, id ASC), extendido
  // para también cubrir saldo previo con lo que sobre. Se manda siempre
  // como aplicaciones explícitas para que el excedente no se pierda ni
  // quede fuera de saldo previo.
  // ======================================================
  const ventasOrdenadasFifo = useMemo(() => {
    return [...ventasPendientes].sort((a, b) => {
      const fa = new Date(a.fecha).getTime();
      const fb = new Date(b.fecha).getTime();
      if (fa !== fb) return fa - fb;
      return Number(a.id) - Number(b.id);
    });
  }, [ventasPendientes]);

  const montoUnicoNumber = useMemo(() => {
    const raw = String(montoUnico || '').replace(',', '.').trim();
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? Number(n.toFixed(2)) : 0;
  }, [montoUnico]);

  const allocation = useMemo(() => {
    const porVenta = new Map(); // ventaId -> monto
    let restante = montoUnicoNumber;

    for (const v of ventasOrdenadasFifo) {
      if (restante <= 0.009) break;
      const saldo = Number(v.saldo || 0);
      if (saldo <= 0) continue;
      const aplicar = Number(Math.min(restante, saldo).toFixed(2));
      if (aplicar <= 0) continue;
      porVenta.set(v.id, aplicar);
      restante = Number((restante - aplicar).toFixed(2));
    }

    const maxSaldoPrevio = Number(resumen.saldoPrevioTotal || 0);
    let aSaldoPrevio = 0;
    if (restante > 0.009 && maxSaldoPrevio > 0) {
      aSaldoPrevio = Number(Math.min(restante, maxSaldoPrevio).toFixed(2));
      restante = Number((restante - aSaldoPrevio).toFixed(2));
    }

    const excedente = restante > 0.009 ? Number(restante.toFixed(2)) : 0;

    const totalVentas = Number(
      Array.from(porVenta.values())
        .reduce((acc, m) => acc + m, 0)
        .toFixed(2)
    );

    const ventasCompletas = Array.from(porVenta.entries()).filter(
      ([ventaId, monto]) => {
        const v = ventasOrdenadasFifo.find((x) => x.id === ventaId);
        return v && Math.abs(Number(v.saldo || 0) - monto) < 0.01;
      }
    ).length;
    const ventasParciales = porVenta.size - ventasCompletas;

    return {
      porVenta,
      totalVentas,
      aSaldoPrevio,
      excedente,
      ventasCompletas,
      ventasParciales
    };
  }, [montoUnicoNumber, ventasOrdenadasFifo, resumen.saldoPrevioTotal]);

  // Total que el usuario decidió cobrar ahora (VENTAS)
  const totalCobrarVentasAhora = useMemo(() => {
    if (!ventasPendientes.length) return 0;
    return ventasPendientes.reduce((acc, v) => {
      const val = Number(cobros[v.id] || 0);
      return acc + (Number.isFinite(val) ? val : 0);
    }, 0);
  }, [ventasPendientes, cobros]);

  // Total a cobrar ahora (SALDO PREVIO)
  const totalCobrarSaldoPrevioAhora = useMemo(() => {
    const raw = String(cobroSaldoPrevio || '')
      .replace(',', '.')
      .trim();
    if (!raw) return 0;
    const n = Number(raw);
    if (!Number.isFinite(n) || n <= 0) return 0;

    // clamp a saldo previo total
    const max = Number(resumen.saldoPrevioTotal || 0);
    const clamped = n > max ? max : n;

    return Number(clamped.toFixed(2));
  }, [cobroSaldoPrevio, resumen.saldoPrevioTotal]);

  // Total a cobrar ahora (VENTAS + SALDO PREVIO)
  const totalCobrarAhora = useMemo(() => {
    return Number(
      (
        Number(totalCobrarVentasAhora || 0) +
        Number(totalCobrarSaldoPrevioAhora || 0)
      ).toFixed(2)
    );
  }, [totalCobrarVentasAhora, totalCobrarSaldoPrevioAhora]);

  // ======================================================
  //   - 16-07-2026
  // Valores "efectivos": según el modo activo, toman los del reparto
  // automático (monto único) o los del detalle manual venta por venta.
  // ======================================================
  const totalCobrarVentasEfectivo =
    modoCobro === 'unico' ? allocation.totalVentas : totalCobrarVentasAhora;
  const totalCobrarSaldoPrevioEfectivo =
    modoCobro === 'unico' ? allocation.aSaldoPrevio : totalCobrarSaldoPrevioAhora;
  const excedenteEfectivo = modoCobro === 'unico' ? allocation.excedente : 0;
  const totalCobrarAhoraEfectivo =
    modoCobro === 'unico' ? montoUnicoNumber : totalCobrarAhora;

  const saldoPostCobro = useMemo(() => {
    const aplicadoADeuda =
      Number(totalCobrarVentasEfectivo || 0) +
      Number(totalCobrarSaldoPrevioEfectivo || 0);
    const diff = Number(resumen.totalDeuda || 0) - aplicadoADeuda;
    return diff > 0 ? Number(diff.toFixed(2)) : 0;
  }, [resumen.totalDeuda, totalCobrarVentasEfectivo, totalCobrarSaldoPrevioEfectivo]);

  const hasVentasPendientes = !loading && !error && ventasPendientes.length > 0;
  const hasSaldoPrevio =
    !loading && !error && Number(resumen.saldoPrevioTotal || 0) > 0;

  const handleClose = () => {
    if (loading || savingCobro) return;
    onClose?.();
  };

  const handleChangeCobro = (ventaId, valorStr) => {
    let raw = (valorStr || '').replace(',', '.');
    let n = Number(raw);
    if (!Number.isFinite(n) || n < 0) n = 0;

    const venta = ventasPendientes.find((v) => v.id === ventaId);
    const max = Number(venta?.saldo || 0);
    if (n > max) n = max;

    setCobros((prev) => ({
      ...prev,
      [ventaId]: n
    }));
  };

  const handleCobrarTodo = () => {
    if (modoCobro === 'unico') {
      setMontoUnico(String(Number(resumen.totalDeuda || 0)));
      return;
    }

    const next = {};
    ventasPendientes.forEach((v) => {
      const saldo = Number(v.saldo || 0);
      if (saldo > 0) next[v.id] = saldo;
    });
    setCobros(next);

    //  - 25-02-2026 - Cobrar todo también incluye saldo previo (si existe)
    if (Number(resumen.saldoPrevioTotal || 0) > 0) {
      setCobroSaldoPrevio(String(Number(resumen.saldoPrevioTotal || 0)));
    }
  };

  const handleCobrarTodoSaldoPrevio = () => {
    const max = Number(resumen.saldoPrevioTotal || 0);
    if (max <= 0) return;
    setCobroSaldoPrevio(String(max));
  };

  const handleRegistrarCobranza = async () => {
    if (!clienteId) return;

    // guard anti-doble click
    if (savingCobro) return;

    const total = Number(totalCobrarAhoraEfectivo || 0);
    if (!total || total <= 0.009) return;

    const clienteNombre = data?.cliente?.nombre || 'el cliente seleccionado';

    // ======================================================
    //  - 25-02-2026 (modo detalle) /  - 16-07-2026 (modo único)
    // Siempre armamos aplicaciones EXPLÍCITAS (nunca dejamos que el
    // backend haga FIFO implícito) para tener control total y que el
    // preview que ve el usuario coincida exactamente con lo que se
    // registra:
    // - aplicaciones a ventas (venta_id)
    // - + una aplicación a saldo previo (venta_id: null, aplica_a: 'SALDO_PREVIO')
    // - + una aplicación "crédito suelto" (venta_id: null, aplica_a: 'CREDITO')
    // ======================================================
    let apps;
    if (modoCobro === 'unico') {
      apps = [
        ...Array.from(allocation.porVenta.entries()).map(
          ([venta_id, monto_aplicado]) => ({ venta_id, monto_aplicado })
        ),
        ...(allocation.aSaldoPrevio > 0
          ? [
              {
                venta_id: null,
                monto_aplicado: allocation.aSaldoPrevio,
                aplica_a: 'SALDO_PREVIO'
              }
            ]
          : []),
        ...(allocation.excedente > 0
          ? [
              {
                venta_id: null,
                monto_aplicado: allocation.excedente,
                aplica_a: 'CREDITO'
              }
            ]
          : [])
      ];
    } else {
      const appsVentas = ventasPendientes
        .map((v) => {
          const monto = Number(cobros[v.id] || 0);
          return {
            venta_id: v.id,
            monto_aplicado: Number.isFinite(monto)
              ? Number(monto.toFixed(2))
              : 0
          };
        })
        .filter((a) => a.monto_aplicado > 0);

      apps = [...appsVentas];

      if (totalCobrarSaldoPrevioAhora > 0) {
        apps.push({
          venta_id: null,
          monto_aplicado: Number(totalCobrarSaldoPrevioAhora.toFixed(2)),
          //  - 25-02-2026 - Distingue pago a saldo previo de crédito suelto en backend/GET deuda
          aplica_a: 'SALDO_PREVIO'
        });
      }
    }

    if (!apps.length) return;

    if (!medioPago) {
      await Swal.fire({
        title: 'Falta el medio de pago',
        text: 'Seleccioná el medio de pago del cobro antes de continuar.',
        icon: 'warning',
        confirmButtonColor: '#10b981'
      });
      return;
    }

    const totalFmt = formatMoneyARS(total);
    const totalVentasFmt = formatMoneyARS(totalCobrarVentasEfectivo);
    const totalSaldoPrevioFmt = formatMoneyARS(totalCobrarSaldoPrevioEfectivo);
    const excedenteFmt = formatMoneyARS(excedenteEfectivo);

    const result = await Swal.fire({
      title: 'Confirmar cobranza',
      html: `
      <div style="text-align:left; font-size: 13px;">
        <p>Vas a registrar una cobranza para <b>${clienteNombre}</b>.</p>
        <p>Monto a cobrar: <b>${totalFmt}</b></p>
        <p>Aplicado a ventas: <b>${totalVentasFmt}</b></p>
        <p>Aplicado a saldo previo: <b>${totalSaldoPrevioFmt}</b></p>
        ${
          excedenteEfectivo > 0
            ? `<p>Excedente (queda como crédito a favor del cliente): <b>${excedenteFmt}</b></p>`
            : ''
        }
        ${
          observaciones?.trim()
            ? `<p>Observaciones:<br/><i>${observaciones
                .trim()
                .replace(/</g, '&lt;')}</i></p>`
            : ''
        }
      </div>
    `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, registrar cobranza',
      cancelButtonText: 'Cancelar',
      reverseButtons: true,
      confirmButtonColor: '#10b981',
      cancelButtonColor: '#6b7280',
      focusCancel: true
    });

    if (!result.isConfirmed) return;

    try {
      setSavingCobro(true);
      setError(null);

      const payload = {
        cliente_id: clienteId,
        vendedor_id: null,
        fecha: new Date().toISOString().slice(0, 10), // YYYY-MM-DD
        total_cobrado: Number(total.toFixed(2)),
        medio_pago: medioPago,
        observaciones: observaciones?.trim() || null,
        aplicaciones: apps
      };

      const resp = await createCobranzaCliente(payload);

      const nuevaDeuda = await getCxcDeudaCliente(clienteId);
      setData(nuevaDeuda);
      setCobros({});
      setObservaciones('');
      setMedioPago('');
      setCobroSaldoPrevio('');
      setMontoUnico('');

      const saldoRestante = Number(nuevaDeuda?.total_deuda || 0);
      const saldoFmt = formatMoneyARS(saldoRestante);

      const resultOk = await Swal.fire({
        title: 'Cobranza registrada',
        icon: 'success',
        html: `
        <div style="text-align:left; font-size: 13px;">
          <p>Se registró correctamente la cobranza ${
            resp?.id ? `<b>#${resp.id}</b>` : ''
          } para <b>${clienteNombre}</b>.</p>
          <p>Monto cobrado: <b>${totalFmt}</b></p>
          <p>Saldo restante del cliente: <b>${saldoFmt}</b></p>
        </div>
      `,
        showDenyButton: !!resp?.id,
        denyButtonText: 'Imprimir recibo',
        denyButtonColor: '#0ea5e9',
        confirmButtonText: 'Aceptar',
        confirmButtonColor: '#10b981'
      });

      if (resultOk.isDenied && resp?.id) {
        window.open(`${API_URL}/cobranzas-clientes/${resp.id}/recibo-pdf`, '_blank');
      }
    } catch (err) {
      console.error('Error registrando cobranza:', err);
      const msg =
        err?.response?.data?.mensajeError ||
        'No se pudo registrar la cobranza.';

      setError(msg);

      await Swal.fire({
        title: 'Error al registrar la cobranza',
        icon: 'error',
        text: msg,
        confirmButtonText: 'Cerrar',
        confirmButtonColor: '#ef4444'
      });
    } finally {
      setSavingCobro(false);
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
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-slate-50/40 backdrop-blur-sm"
            onClick={handleClose}
          />

          {/* Panel */}
          <motion.div
            variants={panelV}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="relative w-full max-w-[94vw] sm:max-w-2xl lg:max-w-4xl max-h-[90vh]
                       overflow-y-auto overscroll-contain rounded-3xl border border-slate-200
                       bg-white
                       shadow-2xl"
          >
            {/* Cerrar */}
            <button
              onClick={handleClose}
              disabled={loading || savingCobro}
              className="absolute top-3 right-3 z-50 inline-flex h-9 w-9 items-center justify-center rounded-xl
                         bg-slate-100 border border-slate-200 hover:bg-slate-200 transition disabled:opacity-40"
              aria-label="Cerrar"
            >
              <X className="h-5 w-5 text-slate-500" />
            </button>

            <div className="relative z-10 p-4 sm:p-6 md:p-8">
              {/* Header */}
              <motion.div
                variants={formContainerV}
                initial="hidden"
                animate="visible"
                className="mb-4 sm:mb-6"
              >
                <motion.div
                  variants={fieldV}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                >
                  <div>
                    <div className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-300 mb-2">
                      <AlertTriangle className="h-4 w-4 text-emerald-600" />
                      <span className="text-[11px] font-semibold text-slate-500 tracking-wide uppercase">
                        Cliente con deuda
                      </span>
                    </div>
                    <h3 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight text-slate-800">
                      {data?.cliente?.nombre || 'Cliente'}
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-500/80 mt-1">
                      DNI/CUIT:{' '}
                      <span className="font-medium">
                        {data?.cliente?.documento || '—'}
                      </span>
                      {data?.cliente?.telefono && (
                        <>
                          {' · Tel: '}
                          <span className="font-medium">
                            {data.cliente.telefono}
                          </span>
                        </>
                      )}
                    </p>
                    {data?.cliente?.email && (
                      <p className="text-xs sm:text-sm text-slate-500/80">
                        Email:{' '}
                        <span className="font-medium">
                          {data.cliente.email}
                        </span>
                      </p>
                    )}
                  </div>

                  {/* Total deuda grande */}
                  <div className="flex flex-col items-end gap-2">
                    <span className="text-[11px] uppercase tracking-widest text-slate-600/70">
                      Deuda total
                    </span>
                    <div className="inline-flex items-center gap-2 rounded-2xl bg-emerald-100 border border-emerald-300 px-3.5 py-2.5 shadow-lg">
                      <BadgeDollarSign className="h-6 w-6 text-slate-600" />
                      <span className="text-xl sm:text-2xl md:text-3xl font-extrabold text-slate-800">
                        {formatMoneyARS(resumen.totalDeuda)}
                      </span>
                    </div>

                    {/*  - 25-02-2026 - Breakdown deuda */}
                    <span className="text-[11px] text-slate-500/80 text-right">
                      Ventas pendientes:{' '}
                      <span className="font-semibold">
                        {formatMoneyARS(resumen.totalDeudaVentas)}
                      </span>
                      {' · '}
                      Saldo previo:{' '}
                      <span className="font-semibold">
                        {formatMoneyARS(resumen.saldoPrevioTotal)}
                      </span>
                    </span>

                    <span className="text-[11px] text-slate-500/80">
                      {resumen.cantidadVentas} venta(s) pendientes
                    </span>
                  </div>
                </motion.div>

                {/* KPIs mini */}
                <motion.div
                  variants={fieldV}
                  className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs sm:text-sm"
                >
                  <div className="rounded-2xl border border-emerald-200 bg-slate-50 px-3 py-2.5 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-emerald-600" />
                      <span className="text-slate-500/85">
                        Venta más vieja
                      </span>
                    </div>
                    <span className="font-semibold text-slate-800">
                      {ventasPendientes.length
                        ? formatFecha(
                            ventasPendientes[ventasPendientes.length - 1]?.fecha
                          )
                        : '—'}
                    </span>
                  </div>
                  <div className="rounded-2xl border border-emerald-200 bg-slate-50 px-3 py-2.5 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-emerald-600" />
                      <span className="text-slate-500/85">
                        Máx. días de atraso
                      </span>
                    </div>
                    <span className="font-semibold text-slate-800">
                      {resumen.maxDiasAtraso} día(s)
                    </span>
                  </div>
                </motion.div>
              </motion.div>

              {/* Contenido principal */}
              <motion.div
                variants={formContainerV}
                initial="hidden"
                animate="visible"
                className="space-y-4"
              >
                {/* Mensajes de estado */}
                {loading && (
                  <div className="flex items-center justify-center py-10">
                    <div className="h-8 w-8 rounded-full border-2 border-emerald-300 border-t-transparent animate-spin" />
                  </div>
                )}

                {error && !loading && (
                  <div className="rounded-2xl border border-red-500/60 bg-red-500/10 px-3 py-2.5 text-xs sm:text-sm text-red-100">
                    {error}
                  </div>
                )}

                {!loading &&
                  !error &&
                  !hasVentasPendientes &&
                  !hasSaldoPrevio && (
                    <div className="rounded-2xl border border-emerald-300 bg-emerald-50 px-3 py-3 text-xs sm:text-sm text-slate-800 text-center">
                      Este cliente no tiene deuda pendiente.
                    </div>
                  )}

                {/* Selector de modo de cobro + monto único */}
                {!loading &&
                  !error &&
                  (hasVentasPendientes || hasSaldoPrevio) && (
                    <motion.div variants={fieldV} className="space-y-3">
                      <div className="inline-flex rounded-2xl border border-emerald-200 bg-slate-50 p-1 gap-1">
                        <button
                          type="button"
                          onClick={() => setModoCobro('unico')}
                          disabled={loading || savingCobro}
                          className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition disabled:opacity-50 ${
                            modoCobro === 'unico'
                              ? 'bg-emerald-500 text-slate-950'
                              : 'text-slate-500/80 hover:bg-emerald-50'
                          }`}
                        >
                          Monto único
                        </button>
                        <button
                          type="button"
                          onClick={() => setModoCobro('detalle')}
                          disabled={loading || savingCobro}
                          className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition disabled:opacity-50 ${
                            modoCobro === 'detalle'
                              ? 'bg-emerald-500 text-slate-950'
                              : 'text-slate-500/80 hover:bg-emerald-50'
                          }`}
                        >
                          Detalle por venta
                        </button>
                      </div>

                      {modoCobro === 'unico' && (
                        <div className="rounded-2xl border border-emerald-200 bg-slate-50 px-3.5 py-3 space-y-2.5">
                          <div className="flex flex-col sm:flex-row sm:items-center gap-2.5">
                            <label className="text-xs sm:text-sm text-slate-500/85 shrink-0">
                              Monto a cobrar:
                            </label>
                            <input
                              type="number"
                              onWheel={blockWheelChange}
                              min="0"
                              step="0.01"
                              value={montoUnico}
                              onChange={(e) => setMontoUnico(e.target.value)}
                              disabled={loading || savingCobro}
                              autoFocus
                              className="w-full sm:w-40 rounded-lg bg-slate-50 border border-emerald-200 px-2.5 py-1.5
                                         text-right text-slate-800 text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-400/70
                                         disabled:opacity-60 disabled:cursor-not-allowed"
                              placeholder="0.00"
                            />
                            <span className="text-[11px] text-slate-500/70">
                              Se aplica solo a las ventas más antiguas
                              primero, después a saldo previo.
                            </span>
                          </div>

                          {montoUnicoNumber > 0 && (
                            <div className="text-[11px] sm:text-xs text-slate-500/85 border-t border-emerald-100 pt-2 space-y-0.5">
                              {allocation.porVenta.size > 0 && (
                                <p>
                                  Cubre {allocation.ventasCompletas} venta
                                  {allocation.ventasCompletas === 1
                                    ? ''
                                    : 's'}{' '}
                                  completa
                                  {allocation.ventasCompletas === 1
                                    ? ''
                                    : 's'}
                                  {allocation.ventasParciales > 0
                                    ? ` + 1 parcial`
                                    : ''}{' '}
                                  · Total ventas:{' '}
                                  <span className="font-semibold text-slate-800">
                                    {formatMoneyARS(allocation.totalVentas)}
                                  </span>
                                </p>
                              )}
                              {allocation.aSaldoPrevio > 0 && (
                                <p>
                                  Aplicado a saldo previo:{' '}
                                  <span className="font-semibold text-slate-800">
                                    {formatMoneyARS(allocation.aSaldoPrevio)}
                                  </span>
                                </p>
                              )}
                              {allocation.excedente > 0 && (
                                <p className="text-amber-700">
                                  Excedente (sin deuda que cubrir, queda
                                  como crédito a favor):{' '}
                                  <span className="font-semibold">
                                    {formatMoneyARS(allocation.excedente)}
                                  </span>
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </motion.div>
                  )}

                {/* Saldos previos */}
                {!loading && !error && hasSaldoPrevio && (
                  <motion.div variants={fieldV} className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-sm sm:text-base font-semibold text-slate-800">
                        Saldos previos (deuda histórica)
                      </h4>

                      {modoCobro === 'detalle' && (
                        <button
                          type="button"
                          onClick={handleCobrarTodoSaldoPrevio}
                          disabled={loading || savingCobro}
                          className="text-[11px] sm:text-xs px-3 py-1 rounded-full border border-emerald-300
                                     text-slate-800 bg-slate-50 hover:bg-emerald-50 transition disabled:opacity-50"
                        >
                          Cobrar saldo previo
                        </button>
                      )}
                    </div>

                    <div className="rounded-2xl border border-emerald-200 bg-slate-50 overflow-hidden">
                      <div className="max-h-[22vh] overflow-y-auto">
                        <table className="min-w-full text-xs sm:text-sm">
                          <thead className="sticky top-0 bg-slate-50/95 backdrop-blur-sm">
                            <tr className="text-slate-500/80">
                              <th className="px-3 py-2 text-left font-medium">
                                Fecha
                              </th>
                              <th className="px-3 py-2 text-left font-medium">
                                Descripción
                              </th>
                              <th className="px-3 py-2 text-right font-medium">
                                Monto
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {saldosPrevios.map((sp) => (
                              <tr
                                key={sp.id}
                                className="border-t border-emerald-100 hover:bg-emerald-50 transition"
                              >
                                <td className="px-3 py-2 whitespace-nowrap text-slate-500/90">
                                  {formatFecha(sp.fecha)}
                                </td>
                                <td className="px-3 py-2 text-slate-500/85">
                                  {sp.descripcion || '—'}
                                </td>
                                <td className="px-3 py-2 whitespace-nowrap text-right text-slate-800 font-semibold">
                                  {formatMoneyARS(sp.monto || 0)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      <div className="border-t border-emerald-100 px-3 py-2.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <div className="text-[11px] text-slate-500/80">
                          Total saldo previo:{' '}
                          <span className="font-semibold text-slate-800">
                            {formatMoneyARS(resumen.saldoPrevioTotal)}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 justify-end">
                          <span className="text-[11px] text-slate-500/80">
                            Cobrar ahora:
                          </span>

                          {modoCobro === 'unico' ? (
                            <span className="w-28 text-right text-slate-800 text-xs font-semibold">
                              {formatMoneyARS(allocation.aSaldoPrevio)}
                            </span>
                          ) : (
                            <input
                              type="number"
                              onWheel={blockWheelChange}
                              min="0"
                              step="0.01"
                              value={cobroSaldoPrevio}
                              onChange={(e) =>
                                setCobroSaldoPrevio(e.target.value)
                              }
                              disabled={loading || savingCobro}
                              className="w-28 rounded-lg bg-slate-50 border border-emerald-200 px-2 py-1
                                         text-right text-slate-800 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-400/70
                                         disabled:opacity-60 disabled:cursor-not-allowed"
                              placeholder="0.00"
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Ventas pendientes */}
                {!loading && !error && hasVentasPendientes && (
                  <motion.div variants={fieldV}>
                    <h4 className="text-sm sm:text-base font-semibold text-slate-800 mb-2 flex items-center justify-between gap-2">
                      <span>Detalle de ventas fiadas pendientes</span>
                      <button
                        type="button"
                        onClick={handleCobrarTodo}
                        disabled={loading || savingCobro}
                        className="text-[11px] sm:text-xs px-3 py-1 rounded-full border border-emerald-300
                                   text-slate-800 bg-slate-50 hover:bg-emerald-50 transition disabled:opacity-50"
                      >
                        {modoCobro === 'unico' ? 'Cobrar deuda total' : 'Cobrar todo'}
                      </button>
                    </h4>
                    <div className="rounded-2xl border border-emerald-200 bg-slate-50 overflow-hidden">
                      <div className="max-h-[38vh] overflow-y-auto">
                        <table className="min-w-full text-xs sm:text-sm">
                          <thead className="sticky top-0 bg-slate-50/95 backdrop-blur-sm">
                            <tr className="text-slate-500/80">
                              <th className="px-3 py-2 text-left font-medium">
                                Venta
                              </th>
                              <th className="px-3 py-2 text-left font-medium">
                                Fecha
                              </th>
                              <th className="px-3 py-2 text-right font-medium">
                                Total
                              </th>
                              <th className="px-3 py-2 text-right font-medium">
                                Cobrado
                              </th>
                              <th className="px-3 py-2 text-right font-medium">
                                Saldo
                              </th>
                              <th className="px-3 py-2 text-right font-medium">
                                Cobrar ahora
                              </th>
                              <th className="px-3 py-2 text-center font-medium">
                                Atraso
                              </th>
                              <th className="px-3 py-2 text-center font-medium">
                                Acción
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {ventasPendientes.map((v) => (
                              <tr
                                key={v.id}
                                className="border-t border-emerald-100 hover:bg-emerald-50 transition"
                              >
                                <td className="px-3 py-2 whitespace-nowrap text-slate-800">
                                  #{v.id}
                                </td>
                                <td className="px-3 py-2 whitespace-nowrap text-slate-500/90">
                                  {formatFecha(v.fecha)}
                                </td>
                                <td className="px-3 py-2 whitespace-nowrap text-right text-slate-800">
                                  {formatMoneyARS(v.total_venta || 0)}
                                </td>
                                <td className="px-3 py-2 whitespace-nowrap text-right text-slate-500/85">
                                  {formatMoneyARS(v.cobrado || 0)}
                                </td>
                                <td className="px-3 py-2 whitespace-nowrap text-right text-slate-800 font-semibold">
                                  {formatMoneyARS(v.saldo || 0)}
                                </td>
                                <td className="px-3 py-2 whitespace-nowrap text-right">
                                  {modoCobro === 'unico' ? (
                                    <span className="inline-block w-24 text-right text-slate-800 text-xs font-semibold">
                                      {allocation.porVenta.get(v.id)
                                        ? formatMoneyARS(
                                            allocation.porVenta.get(v.id)
                                          )
                                        : '—'}
                                    </span>
                                  ) : (
                                    <input
                                      type="number"
                                      onWheel={blockWheelChange}
                                      min="0"
                                      step="0.01"
                                      value={
                                        cobros[v.id] === undefined
                                          ? ''
                                          : cobros[v.id]
                                      }
                                      onChange={(e) =>
                                        handleChangeCobro(v.id, e.target.value)
                                      }
                                      disabled={loading || savingCobro}
                                      className="w-24 rounded-lg bg-slate-50 border border-emerald-200 px-2 py-1
                                                 text-right text-slate-800 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-400/70
                                                 disabled:opacity-60 disabled:cursor-not-allowed"
                                    />
                                  )}
                                </td>
                                <td className="px-3 py-2 whitespace-nowrap text-center text-slate-500/85">
                                  {v.dias_atraso} día(s)
                                </td>
                                <td className="px-3 py-2 whitespace-nowrap text-center">
                                  <button
                                    type="button"
                                    onClick={() => onVerVenta?.(v.id)}
                                    className="inline-flex items-center justify-center px-3 py-1.5 rounded-xl text-[11px] sm:text-xs
                                               bg-emerald-600 hover:bg-emerald-400 text-slate-950 font-semibold transition"
                                  >
                                    Ver venta
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Resumen cobro + observaciones */}
                {!loading &&
                  !error &&
                  (hasVentasPendientes || hasSaldoPrevio) && (
                    <motion.div variants={fieldV} className="space-y-3 mt-2">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div>
                          <p className="text-[11px] text-slate-500/80 uppercase tracking-wide">
                            Monto a cobrar ahora
                          </p>
                          <p className="text-lg sm:text-xl font-bold text-slate-800">
                            {formatMoneyARS(totalCobrarAhoraEfectivo)}
                          </p>
                          <p className="text-[11px] text-slate-500/70">
                            Ventas: {formatMoneyARS(totalCobrarVentasEfectivo)} ·
                            Saldo previo:{' '}
                            {formatMoneyARS(totalCobrarSaldoPrevioEfectivo)}
                            {excedenteEfectivo > 0 && (
                              <>
                                {' · '}
                                <span className="text-amber-700">
                                  Excedente: {formatMoneyARS(excedenteEfectivo)}
                                </span>
                              </>
                            )}
                          </p>
                        </div>
                        <div className="text-left sm:text-right">
                          <p className="text-[11px] text-slate-500/70">
                            Saldo estimado luego del cobro
                          </p>
                          <p className="text-sm font-semibold text-slate-500">
                            {formatMoneyARS(saldoPostCobro)}
                          </p>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] sm:text-xs text-slate-500/80 mb-1">
                          Medio de pago <span className="text-rose-600">*</span>
                        </label>
                        <select
                          value={medioPago}
                          onChange={(e) => setMedioPago(e.target.value)}
                          disabled={loading || savingCobro}
                          className="w-full rounded-2xl bg-slate-50 border border-emerald-200 px-3 py-2 text-xs sm:text-sm
                                   text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-400/60
                                   disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          <option value="">Seleccionar…</option>
                          {MEDIOS_PAGO.map((m) => (
                            <option key={m.value} value={m.value}>
                              {m.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] sm:text-xs text-slate-500/80 mb-1">
                          Observaciones del cobro (opcional)
                        </label>
                        <textarea
                          rows={2}
                          value={observaciones}
                          onChange={(e) => setObservaciones(e.target.value)}
                          disabled={loading || savingCobro}
                          className="w-full rounded-2xl bg-slate-50 border border-emerald-200 px-3 py-2 text-xs sm:text-sm
                                   text-slate-800 resize-y focus:outline-none focus:ring-2 focus:ring-emerald-400/60
                                   disabled:opacity-60 disabled:cursor-not-allowed"
                          placeholder="Ej: Cobro en efectivo, saldo parcial..."
                        />
                      </div>
                    </motion.div>
                  )}

                {/* Footer acciones */}
                <motion.div
                  variants={fieldV}
                  className="mt-4 flex flex-col gap-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex flex-row gap-2">
                      <button
                        type="button"
                        onClick={handleClose}
                        disabled={loading || savingCobro}
                        className="px-4 py-2 rounded-xl border border-emerald-300 text-slate-800 text-sm
                                   bg-slate-50 hover:bg-slate-50 transition disabled:opacity-50"
                      >
                        Cerrar
                      </button>

                      {(hasVentasPendientes || hasSaldoPrevio) && (
                        <button
                          type="button"
                          onClick={handleRegistrarCobranza}
                          disabled={
                            savingCobro ||
                            loading ||
                            totalCobrarAhoraEfectivo <= 0 ||
                            !medioPago
                          }
                          className="px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 text-sm font-semibold
                                     hover:bg-emerald-400 transition disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          {savingCobro
                            ? 'Registrando cobranza…'
                            : 'Registrar cobranza'}
                        </button>
                      )}
                    </div>

                    <p className="text-[11px] sm:text-xs text-slate-500/80 text-right">
                      Recordá registrar las cobranzas para mantener actualizada
                      la cuenta corriente del cliente.
                    </p>
                  </div>
                </motion.div>
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
