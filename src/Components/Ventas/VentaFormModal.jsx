// ===============================
// FILE: src/Components/Ventas/VentaFormModal.jsx
// ===============================
import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Trash2 } from 'lucide-react';
import {
  backdropV,
  panelV,
  formContainerV,
  fieldV
} from '../../ui/animHelpers';

import { listCiudades } from '../../api/ciudades';
import { listClientes } from '../../api/clientes';
import { listProductos } from '../../api/productos';
import SearchableSelect from '../Common/SearchableSelect';
import http from '../../api/http';
import { blockWheelChange } from '../../utils/numberInput';
export default function VentaFormModal({ open, onClose, onSubmit }) {
  const [form, setForm] = useState({
    fecha: new Date(),
    ciudad_id: '',
    cliente_id: '',
    vendedor_id: '',
    tipo: 'fiado', // contado | fiado | a_cuenta
    observaciones: '',
    // ======================================================
    //  - 17-01-2026
    // Monto a cuenta para ventas tipo "a_cuenta"
    // ======================================================
    monto_a_cuenta: '',
    // ======================================================
    //  - 25-02-2026
    // Saldo previo (deuda histórica) sin registrar productos
    // ======================================================
    saldo_previo: ''
  });

  const [saving, setSaving] = useState(false);

  // ======================================================
  //  - 25-02-2026
  // Estados UI para carga de saldo previo (unitario)
  // ======================================================
  const [savingSaldoPrevio, setSavingSaldoPrevio] = useState(false);
  const [saldoPrevioCargado, setSaldoPrevioCargado] = useState(false);
  // Catálogos
  const [ciudades, setCiudades] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [productos, setProductos] = useState([]);

  // Selección actual
  const [selectedCliente, setSelectedCliente] = useState(null);
  const [vendedorLabel, setVendedorLabel] = useState('');

  // ======================================================
  //  - 17-01-2026
  // Repartos (para selector reparto_id en ventas)
  // ======================================================
  const [repartos, setRepartos] = useState([]);
  const [loadingRepartos, setLoadingRepartos] = useState(false);
  const [repartosError, setRepartosError] = useState(null);

  useEffect(() => {
    if (!open) return;

    let alive = true;

    (async () => {
      try {
        setLoadingRepartos(true);
        setRepartosError(null);

        // Endpoint: https://vps-5697083-x.dattaweb.com/repartos
        const r = await http.get('/repartos', {
          params: {
            limit: 9999,
            offset: 0,
            orderBy: 'created_at',
            orderDir: 'DESC'
          }
        });

        const data = r?.data?.data || [];
        if (alive) setRepartos(Array.isArray(data) ? data : []);
      } catch (e) {
        if (alive) {
          setRepartos([]);
          setRepartosError('No se pudieron cargar los repartos.');
        }
      } finally {
        if (alive) setLoadingRepartos(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [open]);

  // ======================================================
  //  - 17-01-2026
  // Repartos filtrados por ciudad seleccionada
  // ======================================================
  const repartosByCiudad = useMemo(() => {
    const list = Array.isArray(repartos) ? repartos : [];
    const ciudadId = Number(form.ciudad_id || 0);

    const filtered =
      ciudadId > 0 ? list.filter((r) => Number(r.ciudad_id) === ciudadId) : [];

    // Orden por nombre (estable)
    return filtered.sort((a, b) =>
      String(a?.nombre || '').localeCompare(String(b?.nombre || ''))
    );
  }, [repartos, form.ciudad_id]);

  // ======================================================
  //  - 17-01-2026
  // Handler reparto
  // ======================================================
  const handleReparto = (e) => {
    const v = e.target.value;

    //  - 25-02-2026 - Reset de saldo previo al cambiar reparto
    setSaldoPrevioCargado(false);
    setSavingSaldoPrevio(false);

    setForm((prev) => ({
      ...prev,
      reparto_id: v === '' ? '' : v,
      saldo_previo: ''
    }));
  };

  // Items (detalle)
  const [items, setItems] = useState([
    { producto_id: '', producto: null, cantidad: '', precio_unit: '' }
  ]);

  // ---------- Helpers ----------
  const resetState = () => {
    setForm({
      fecha: new Date(),
      ciudad_id: '',
      cliente_id: '',
      vendedor_id: '',
      tipo: 'fiado',
      observaciones: '',
      //  - 17-01-2026
      monto_a_cuenta: '',
      //  - 25-02-2026
      saldo_previo: ''
    });
    setSelectedCliente(null);
    setVendedorLabel('');
    setItems([
      { producto_id: '', producto: null, cantidad: '', precio_unit: '' }
    ]);

    //  - 25-02-2026 - Resetea estado visual de saldo previo al reabrir modal
    setSavingSaldoPrevio(false);
    setSaldoPrevioCargado(false);
  };

  const moneyRound = (n) =>
    Math.round((Number(n || 0) + Number.EPSILON) * 100) / 100;

  // ======================================================
  //  - 17-01-2026
  // Resolver "precio" de producto
  // ======================================================
  const getPrecioFromProducto = (p) => {
    if (!p) return null;

    // Tu API expone el precio en pre_prod (string)
    const n = Number(p.pre_prod);

    return Number.isFinite(n) && n >= 0 ? moneyRound(n) : null;
  };

  // Formateo de fecha para mostrar (bloqueada)
  const fechaLabel = useMemo(() => {
    const d = form.fecha instanceof Date ? form.fecha : new Date(form.fecha);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleString('es-AR', {
      dateStyle: 'short',
      timeStyle: 'short'
    });
  }, [form.fecha]);

  const formatMoneyLabel = (n) =>
    Number(n || 0).toLocaleString('es-AR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });

  // Total calculado (preview)
  const totalNeto = useMemo(() => {
    return items.reduce((acc, it) => {
      const cant = Number(it.cantidad);
      const pu = Number(it.precio_unit);
      if (!Number.isFinite(cant) || !Number.isFinite(pu)) return acc;
      return acc + cant * pu;
    }, 0);
  }, [items]);

  const totalLabel = useMemo(() => formatMoneyLabel(totalNeto), [totalNeto]);

  // ======================================================
  //  - 17-01-2026
  // A cuenta y saldo (solo aplica si tipo === 'a_cuenta')
  // ======================================================
  const aCuentaNumber = useMemo(() => {
    const n = Number(form.monto_a_cuenta);
    return Number.isFinite(n) ? moneyRound(n) : 0;
  }, [form.monto_a_cuenta]);

  const saldoNumber = useMemo(() => {
    const saldo = moneyRound(
      Number(totalNeto || 0) - Number(aCuentaNumber || 0)
    );
    return saldo < 0 ? 0 : saldo;
  }, [totalNeto, aCuentaNumber]);

  const saldoLabel = useMemo(
    () => formatMoneyLabel(saldoNumber),
    [saldoNumber]
  );

  // ======================================================
  //  - 25-02-2026
  // Saldo previo (deuda histórica) - cálculo y validación UI
  // ======================================================
  const saldoPrevioNumber = useMemo(() => {
    const n = Number(form.saldo_previo);
    return Number.isFinite(n) ? moneyRound(n) : 0;
  }, [form.saldo_previo]);

  const canSubmitSaldoPrevio = useMemo(() => {
    const cliId = Number(form.cliente_id);
    const vendId = Number(form.vendedor_id);

    const hasCliente = Number.isFinite(cliId) && cliId > 0;
    const hasVendedor = Number.isFinite(vendId) && vendId > 0;
    const montoOk = Number.isFinite(saldoPrevioNumber) && saldoPrevioNumber > 0;

    return (
      hasCliente &&
      hasVendedor &&
      montoOk &&
      !savingSaldoPrevio &&
      !saldoPrevioCargado
    );
  }, [
    form.cliente_id,
    form.vendedor_id,
    saldoPrevioNumber,
    savingSaldoPrevio,
    saldoPrevioCargado
  ]);

  // Puede guardar: cliente + vendedor + al menos un ítem válido
  const canSave = useMemo(() => {
    const cliId = Number(form.cliente_id);
    const vendId = Number(form.vendedor_id);

    const hasCliente = Number.isFinite(cliId) && cliId > 0;
    const hasVendedor = Number.isFinite(vendId) && vendId > 0;

    const hasItemsValidos =
      Array.isArray(items) &&
      items.some((it) => {
        const pid = Number(it.producto_id ?? it.productoId ?? it.id_producto);
        const cant = Number(it.cantidad ?? it.qty ?? it.cant);
        return (
          Number.isFinite(pid) && pid > 0 && Number.isFinite(cant) && cant > 0
        );
      });

    //  - 17-01-2026
    // Si es "a_cuenta", validamos que a_cuenta no supere total
    const aCuentaOk =
      form.tipo !== 'a_cuenta'
        ? true
        : Number.isFinite(aCuentaNumber) &&
          aCuentaNumber >= 0 &&
          aCuentaNumber <= moneyRound(totalNeto) + 0.01;

    return hasCliente && hasVendedor && hasItemsValidos && aCuentaOk;
  }, [
    form.cliente_id,
    form.vendedor_id,
    form.tipo,
    items,
    aCuentaNumber,
    totalNeto
  ]);

  /* descomentar para seguimiento
  useEffect(() => {
    const cliId = Number(form.cliente_id);
    const vendId = Number(form.vendedor_id);
    const hasCliente = Number.isFinite(cliId) && cliId > 0;
    const hasVendedor = Number.isFinite(vendId) && vendId > 0;
    const hasItemsValidos =
      Array.isArray(items) &&
      items.some((it) => {
        const pid = Number(it.producto_id ?? it.productoId);
        const cant = Number(it.cantidad ?? it.qty);
        return pid > 0 && cant > 0;
      });

    console.log('canSave deps =>', {
      form,
      items,
      hasCliente,
      hasVendedor,
      hasItemsValidos
    });
  }, [form, items]);
*/
  // ---------- Carga de catálogos al abrir ----------
  useEffect(() => {
    if (!open) return;
    resetState();

    (async () => {
      try {
        const [cRes, pRes] = await Promise.all([
          listCiudades({ orderBy: 'nombre', orderDir: 'ASC', limit: 1000 }),
          listProductos({
            orderBy: 'created_at',
            orderDir: 'DESC',
            limit: 1000
          })
        ]);

        const ciuds = Array.isArray(cRes) ? cRes : cRes?.data || [];
        const prods = Array.isArray(pRes?.data) ? pRes.data : pRes || [];

        setCiudades(ciuds);
        setProductos(prods);
      } catch (err) {
        console.error('Error cargando catálogos para venta:', err);
      }
    })();
  }, [open]);

  // ======================================================
  //  - 17-01-2026
  // Cargar clientes al elegir reparto (fuente de verdad)
  // ======================================================
  useEffect(() => {
    if (!open) return;

    // si no hay reparto, no hacemos nada (queda el fallback por ciudad)
    if (!form.reparto_id) return;

    // cada vez que cambia reparto, reseteamos selección de cliente/vendedor
    setClientes([]);
    setSelectedCliente(null);
    setVendedorLabel('');
    setForm((f) => ({
      ...f,
      cliente_id: '',
      vendedor_id: ''
    }));

    (async () => {
      try {
        const cRes = await listClientes({
          reparto_id: Number(form.reparto_id),
          estado: 'activo',
          limit: 1000
        });

        const cls = Array.isArray(cRes?.data) ? cRes.data : [];
        setClientes(cls);
      } catch (err) {
        console.error('Error cargando clientes por reparto:', err);
        setClientes([]);
      }
    })();
  }, [open, form.reparto_id]);

  // ---------- Handlers de campos simples ----------
  const handleTipo = (tipo) =>
    setForm((f) => ({
      ...f,
      tipo,
      // ======================================================
      //  - 17-01-2026
      // Si cambia a contado/fiado, limpiamos monto_a_cuenta
      // ======================================================
      ...(tipo === 'a_cuenta' ? {} : { monto_a_cuenta: '' })
    }));

  const handleObservaciones = (e) => {
    const { value } = e.target;
    setForm((f) => ({ ...f, observaciones: value }));
  };

  const handleCiudad = (e) => {
    const v = e.target.value;

    // ======================================================
    //  - 17-01-2026
    // Reset duro al cambiar ciudad para evitar clientes "pegados"
    // ======================================================
    setClientes([]);
    setSelectedCliente(null);
    setVendedorLabel('');
    setSaldoPrevioCargado(false);
    setSavingSaldoPrevio(false);
    setForm((prev) => ({
      ...prev,
      ciudad_id: v,

      // al cambiar ciudad, limpiamos selección y dependencias
      reparto_id: '',
      cliente_id: '',
      vendedor_id: '',

      localidad_id: '',
      barrio_id: '',
      saldo_previo: ''
    }));
  };

  // ======================================================
  //  - 17-01-2026
  // Handler de A cuenta
  // ======================================================
  const handleMontoACuenta = (e) => {
    const raw = e.target.value;

    // Permitimos '' para UX; se interpreta como 0
    if (raw === '') {
      setForm((f) => ({ ...f, monto_a_cuenta: '' }));
      return;
    }

    const n = Number(raw);
    if (!Number.isFinite(n) || n < 0) return;

    // Clamp a totalNeto (no permitir pagar más que el total)
    const clamped = n > Number(totalNeto || 0) ? Number(totalNeto || 0) : n;

    setForm((f) => ({ ...f, monto_a_cuenta: String(moneyRound(clamped)) }));
  };

  // ======================================================
  //  - 25-02-2026
  // Handler de saldo previo (deuda histórica)
  // ======================================================
  const handleSaldoPrevio = (e) => {
    const raw = e.target.value;

    if (saldoPrevioCargado) return; // bloquea edición si ya fue cargado

    if (raw === '') {
      setForm((f) => ({ ...f, saldo_previo: '' }));
      return;
    }

    const n = Number(raw);
    if (!Number.isFinite(n) || n < 0) return;

    setForm((f) => ({ ...f, saldo_previo: String(moneyRound(n)) }));
  };
  // ---------- Cliente & vendedor ----------
  const handleClienteChange = (cliOrId) => {
    if (!cliOrId) {
      setSelectedCliente(null);
      setVendedorLabel('');
      setForm((f) => ({
        ...f,
        cliente_id: '',
        vendedor_id: ''
      }));
      return;
    }

    const cli =
      typeof cliOrId === 'object'
        ? cliOrId
        : clientes.find((c) => c.id === Number(cliOrId));

    if (!cli) {
      setSelectedCliente(null);
      setVendedorLabel('Sin vendedor asignado');
      setForm((f) => ({
        ...f,
        cliente_id: Number(cliOrId) || '',
        vendedor_id: ''
      }));
      return;
    }
    //  - 25-02-2026 - Al cambiar cliente, reseteamos estado visual de saldo previo
    setSaldoPrevioCargado(false);
    setSavingSaldoPrevio(false);
    setForm((prev) => ({ ...prev, saldo_previo: '' }));

    setSelectedCliente(cli);
    setForm((f) => ({
      ...f,
      cliente_id: cli.id,
      vendedor_id: cli.vendedor_preferido_id || '' // <- acá se setea
    }));

    if (cli.vendedor_preferido?.nombre) {
      setVendedorLabel(cli.vendedor_preferido.nombre);
    } else if (cli.vendedor_preferido_id) {
      setVendedorLabel(`Vendedor ID: ${cli.vendedor_preferido_id}`);
    } else {
      setVendedorLabel('Sin vendedor asignado');
    }
  };

  // ---------- Items (detalle) ----------
  const handleItemChange = (index, field, value) => {
    setItems((prev) =>
      prev.map((it, i) =>
        i === index
          ? {
              ...it,
              [field]: value
            }
          : it
      )
    );
  };

  const handleProductoChange = (index, prodOrId) => {
    setItems((prev) =>
      prev.map((row, i) => {
        if (i !== index) return row;

        // ======================================================
        //  - 17-01-2026
        // Al seleccionar producto:
        // - Setea cantidad por defecto = 1 (si estaba vacía/0)
        // - Setea precio_unit automáticamente (si el producto trae precio)
        // ======================================================
        const prod =
          typeof prodOrId === 'object'
            ? prodOrId
            : productos.find((p) => p.id === Number(prodOrId));

        const id = prod ? prod.id : Number(prodOrId) || '';

        if (!id) {
          return {
            ...row,
            producto_id: '',
            producto: null
          };
        }

        const precioAuto = getPrecioFromProducto(prod);
        const cantActual = Number(row.cantidad);

        return {
          ...row,
          producto_id: id,
          producto: prod || null,
          cantidad:
            !Number.isFinite(cantActual) || cantActual <= 0
              ? '1'
              : row.cantidad,
          precio_unit:
            precioAuto === null || precioAuto === undefined
              ? row.precio_unit
              : String(precioAuto)
        };
      })
    );
  };

  const addItemRow = () => {
    setItems((prev) => [
      ...prev,
      { producto_id: '', producto: null, cantidad: '', precio_unit: '' }
    ]);
  };

  const removeItemRow = (index) => {
    setItems((prev) =>
      prev.length === 1 ? prev : prev.filter((_, i) => i !== index)
    );
  };

  // ---------- Submit ----------
  const submit = async (e) => {
    e.preventDefault();
    if (!canSave) return;

    const fechaPayload =
      form.fecha instanceof Date ? form.fecha.toISOString() : form.fecha;

    // Normalizamos items
    const itemsPayload = items
      .filter((it) => Number(it.producto_id) > 0 && Number(it.cantidad) > 0)
      .map((it) => ({
        producto_id: Number(it.producto_id),
        cantidad: Number(it.cantidad),
        precio_unit:
          it.precio_unit === '' || it.precio_unit === null
            ? 0
            : Number(it.precio_unit)
      }));

    try {
      setSaving(true);
      await onSubmit({
        venta: {
          cliente_id: Number(form.cliente_id),
          vendedor_id: Number(form.vendedor_id),
          fecha: fechaPayload,
          tipo: form.tipo,
          observaciones: form.observaciones?.trim() || null,

          // ======================================================
          //  - 17-01-2026
          // Nuevo: reparto_id (snapshot para filtrar por reparto)
          // ======================================================
          reparto_id:
            form.reparto_id === '' ||
            form.reparto_id === null ||
            form.reparto_id === undefined
              ? null
              : Number(form.reparto_id),

          // ======================================================
          //  - 17-01-2026
          // Enviamos monto_a_cuenta
          // ======================================================
          monto_a_cuenta: moneyRound(Number(form.monto_a_cuenta || 0))
        },
        items: itemsPayload
      });

      // onClose();
    } finally {
      setSaving(false);
    }
  };

  // ======================================================
  //  - 25-02-2026
  // Registrar saldo previo (deuda histórica) sin crear venta
  // ======================================================
  const submitSaldoPrevio = async () => {
    if (!canSubmitSaldoPrevio) return;

    try {
      setSavingSaldoPrevio(true);

      const fechaPayload =
        form.fecha instanceof Date ? form.fecha.toISOString() : form.fecha;

      const payload = {
        cliente_id: Number(form.cliente_id),
        vendedor_id: Number(form.vendedor_id),
        fecha: fechaPayload,
        monto: moneyRound(saldoPrevioNumber),
        // opcional: guardar contexto
        reparto_id:
          form.reparto_id === '' ||
          form.reparto_id === null ||
          form.reparto_id === undefined
            ? null
            : Number(form.reparto_id),
        observaciones:
          form.observaciones?.trim() ||
          (selectedCliente?.nombre
            ? `Saldo previo cargado desde venta individual (${selectedCliente.nombre})`
            : 'Saldo previo cargado desde venta individual')
      };

      // Ajustar endpoint si tu ruta final difiere
      await http.post('/ventas/saldo-previo', payload);

      // bloqueo en UI para evitar doble click / duplicado accidental
      setSaldoPrevioCargado(true);
    } catch (err) {
      console.error('Error cargando saldo previo (unitario):', err);
      // Si usás Swal global, acá podés reemplazar por tu showErrorSwal(...)
      const msg =
        err?.response?.data?.mensajeError ||
        'No se pudo registrar el saldo previo.';
      window.alert(msg);
    } finally {
      setSavingSaldoPrevio(false);
    }
  };
  // ---------- Render ----------
  return (
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
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            variants={panelV}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="relative w-full max-w-[92vw] sm:max-w-2xl md:max-w-4xl
                       max-h-[90vh] overflow-y-auto overscroll-contain
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

            <div className="relative z-10 p-5 sm:p-6 md:p-8">
              <motion.h3
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 260, damping: 24 }}
                className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 mb-5"
              >
                Nueva Venta
              </motion.h3>

              <motion.form
                onSubmit={submit}
                variants={formContainerV}
                initial="hidden"
                animate="visible"
                className="space-y-5 sm:space-y-6"
              >
                {/* Fecha (solo lectura) */}
                <motion.div variants={fieldV}>
                  <label className="block text-sm font-medium text-slate-600 mb-2">
                    Fecha
                  </label>
                  <input
                    value={fechaLabel}
                    readOnly
                    disabled
                    className="w-full rounded-xl border border-slate-200 bg-slate-100 px-3.5 py-3 text-slate-500
                               cursor-not-allowed"
                  />
                  <p className="mt-1 text-[11px] text-slate-400">
                    La fecha se toma automáticamente (no editable).
                  </p>
                </motion.div>

                {/* Ciudad + Reparto + Cliente */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {/* Ciudad */}
                  <motion.div variants={fieldV}>
                    <label className="block text-sm font-medium text-slate-600 mb-2">
                      Ciudad
                    </label>
                    <select
                      name="ciudad_id"
                      value={form.ciudad_id}
                      onChange={handleCiudad}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-slate-800
                 focus:outline-none focus:ring-2 focus:ring-orange-400/40 focus:border-transparent"
                    >
                      <option className="text-black" value="">
                        Seleccionar…
                      </option>
                      {ciudades.map((c) => (
                        <option className="text-black" key={c.id} value={c.id}>
                          {c.nombre}
                        </option>
                      ))}
                    </select>
                    <p className="mt-1 text-[11px] text-slate-400">
                      Usamos la ciudad para filtrar los clientes.
                    </p>
                  </motion.div>

                  {/* Reparto */}
                  <motion.div variants={fieldV}>
                    <label className="block text-sm font-medium text-slate-600 mb-2">
                      Reparto
                    </label>

                    <select
                      name="reparto_id"
                      value={form.reparto_id ?? ''}
                      onChange={handleReparto}
                      disabled={!form.ciudad_id || loadingRepartos}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-slate-800
                 focus:outline-none focus:ring-2 focus:ring-orange-400/40 focus:border-transparent
                 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      <option className="text-black" value="">
                        {loadingRepartos
                          ? 'Cargando repartos…'
                          : !form.ciudad_id
                            ? 'Seleccioná ciudad primero…'
                            : 'Sin reparto (opcional)…'}
                      </option>

                      {repartosByCiudad.map((r) => {
                        const inactivo = r?.estado !== 'activo';
                        const rangoTxt =
                          r?.rango_min != null || r?.rango_max != null
                            ? ` · (${r?.rango_min ?? ''}-${r?.rango_max ?? ''})`
                            : '';

                        return (
                          <option
                            className="text-black"
                            key={r.id}
                            value={r.id}
                            disabled={inactivo}
                          >
                            {r.nombre}
                            {rangoTxt}
                            {inactivo ? ' [inactivo]' : ''}
                          </option>
                        );
                      })}
                    </select>

                    <p className="mt-1 text-[11px] text-slate-400">
                      Opcional. Se guarda en la venta para filtrar por reparto.
                      Solo se listan los de la ciudad seleccionada.
                    </p>

                    {repartosError && (
                      <p className="mt-1 text-[11px] text-rose-600">
                        {repartosError}
                      </p>
                    )}
                  </motion.div>

                  {/* Cliente (SearchableSelect) */}
                  <motion.div variants={fieldV} className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-600 mb-2">
                      Cliente <span className="text-orange-600">*</span>
                    </label>
                    <SearchableSelect
                      items={clientes}
                      value={form.cliente_id}
                      onChange={handleClienteChange}
                      getOptionLabel={(c) =>
                        c ? `${c.nombre} (${c.documento || 's/ doc'})` : ''
                      }
                      getOptionValue={(c) => c.id}
                    />

                    {selectedCliente && (
                      <p className="mt-1 text-[11px] text-slate-400">
                        {selectedCliente.direccion_calle
                          ? `Dirección: ${selectedCliente.direccion_calle} ${
                              selectedCliente.direccion_numero || ''
                            } - ${selectedCliente.barrio?.nombre || ''}`
                          : ''}
                      </p>
                    )}
                  </motion.div>
                </div>

                {/* Vendedor asociado (solo lectura, desde cliente) */}
                <motion.div variants={fieldV}>
                  <label className="block text-sm font-medium text-slate-600 mb-2">
                    Vendedor asignado
                  </label>
                  <input
                    value={vendedorLabel || 'Sin vendedor asociado al cliente…'}
                    readOnly
                    className="w-full rounded-xl border border-slate-200 bg-slate-100 px-3.5 py-3 text-slate-500
                               placeholder-gray-400 focus:outline-none focus:ring-0 focus:border-transparent"
                    placeholder="Sin vendedor asociado"
                  />
                  {/* <p className="mt-1 text-[11px] text-slate-400">
                    Se toma automáticamente del campo{' '}
                    <span className="font-semibold">
                      vendedor_preferido del cliente
                    </span>
                    .
                  </p> */}
                </motion.div>

                {/* Tipo de venta */}
                <motion.div variants={fieldV}>
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
                </motion.div>

                {/* Observaciones */}
                <motion.div variants={fieldV}>
                  <label className="block text-sm font-medium text-slate-600 mb-2">
                    Observaciones
                  </label>
                  <textarea
                    name="observaciones"
                    value={form.observaciones}
                    onChange={handleObservaciones}
                    rows={3}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-slate-800
                               placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-400/40 focus:border-transparent"
                    placeholder="Notas internas de la operación (opcional)"
                  />
                </motion.div>

                {/* Detalle de productos */}
                <motion.div variants={fieldV} className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-slate-600">
                      Productos de la venta
                    </span>
                    <button
                      type="button"
                      onClick={addItemRow}
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm
                                 bg-emerald-500/80 hover:bg-emerald-500 text-white font-medium transition"
                    >
                      <Plus className="h-4 w-4" />
                      Agregar ítem
                    </button>
                  </div>

                  <div className="space-y-2">
                    {items.map((it, index) => (
                      <div
                        key={index}
                        className="grid grid-cols-1 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_auto] gap-3
                                   items-center bg-slate-50 rounded-xl border border-slate-200 p-3"
                      >
                        {/* Producto */}

                        <div className="md:col-span-1">
                          <label className="block text-sm font-medium text-slate-600 mb-2">
                            Producto <span className="text-orange-600">*</span>
                          </label>
                          <SearchableSelect
                            label=""
                            items={productos}
                            value={it.producto_id}
                            onChange={(prod) =>
                              handleProductoChange(index, prod)
                            }
                            placeholder="Producto…"
                            getOptionLabel={(p) =>
                              p
                                ? `${p.nombre} ${
                                    p.codigo_sku ? `(${p.codigo_sku})` : ''
                                  }`
                                : ''
                            }
                            getOptionValue={(p) => p?.id}
                            getOptionSearchText={(p) =>
                              [
                                p?.nombre || '',
                                p?.codigo_sku || '',
                                p?.barra_ean13 || ''
                              ].join(' ')
                            }
                          />
                        </div>

                        {/* Cantidad */}
                        <div>
                          <label className="block text-[11px] font-medium text-slate-500 mb-1">
                            Cantidad
                          </label>
                          <input
                            type="number"
                            onWheel={blockWheelChange}
                            min="0"
                            step="0.001"
                            value={it.cantidad}
                            onChange={(e) =>
                              handleItemChange(
                                index,
                                'cantidad',
                                e.target.value
                              )
                            }
                            className="w-full rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-slate-800
                                       placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-400/40 focus:border-transparent text-sm"
                            placeholder="0"
                          />
                        </div>

                        {/* Precio unitario */}
                        <div>
                          <label className="block text-[11px] font-medium text-slate-500 mb-1">
                            Precio unitario ($)
                          </label>
                          <input
                            type="number"
                            onWheel={blockWheelChange}
                            min="0"
                            step="0.01"
                            value={it.precio_unit}
                            onChange={(e) =>
                              handleItemChange(
                                index,
                                'precio_unit',
                                e.target.value
                              )
                            }
                            className="w-full rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-slate-800
                                       placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-400/40 focus:border-transparent text-sm"
                            placeholder="0.00"
                          />
                        </div>

                        {/* Botón eliminar */}
                        <div className="flex justify-end items-center">
                          <button
                            type="button"
                            onClick={() => removeItemRow(index)}
                            disabled={items.length === 1}
                            className="inline-flex items-center justify-center rounded-full p-2
                                       border border-rose-300 text-rose-500 hover:bg-rose-50
                                       disabled:opacity-40 disabled:cursor-not-allowed transition"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Total + A cuenta (derecha) */}
                  <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-3 pt-2">
                    <div className="text-[11px] text-slate-400">
                      {form.tipo === 'a_cuenta'
                        ? 'Ingresá el monto cobrado hoy. El saldo quedará como deuda.'
                        : 'Al seleccionar un producto, se carga automáticamente el precio y cantidad 1.'}
                    </div>

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3">
                      {/*  - 17-01-2026 / 25-02-2026: A cuenta + Saldo previo (debajo) */}
                      <div className="w-full sm:w-[260px]">
                        {/* A cuenta */}
                        <div className="mb-2.5">
                          <p className="text-xs text-slate-500 mb-1">
                            A cuenta
                          </p>

                          <input
                            type="number"
                            onWheel={blockWheelChange}
                            min="0"
                            step="0.01"
                            value={form.monto_a_cuenta ?? ''}
                            onChange={(e) => {
                              handleMontoACuenta(e);
                              const n = Number(e.target.value);
                              if (
                                Number.isFinite(n) &&
                                n > 0 &&
                                form.tipo !== 'a_cuenta'
                              ) {
                                setForm((prev) => ({
                                  ...prev,
                                  tipo: 'a_cuenta'
                                }));
                              }
                            }}
                            className="w-full rounded-xl border px-2.5 py-2 text-slate-800 text-sm
                 border-slate-200 bg-white
                 focus:outline-none focus:ring-2 focus:ring-orange-400/40 focus:border-transparent"
                            placeholder="0.00"
                          />

                          {aCuentaNumber > moneyRound(totalNeto) + 0.01 && (
                            <p className="mt-1 text-[11px] text-rose-600">
                              El monto a cuenta no puede superar el total.
                            </p>
                          )}
                        </div>

                        {/* Saldo previo (deuda histórica) - debajo de A cuenta */}
                        <div>
                          <p className="text-xs text-amber-700 mb-1">
                            Saldo previo
                          </p>

                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              onWheel={blockWheelChange}
                              min="0"
                              step="0.01"
                              value={form.saldo_previo ?? ''}
                              onChange={handleSaldoPrevio}
                              disabled={savingSaldoPrevio || saldoPrevioCargado}
                              className="flex-1 rounded-xl border px-2.5 py-2 text-slate-800 text-sm
                   border-amber-200 bg-amber-50
                   focus:outline-none focus:ring-2 focus:ring-amber-300/30 focus:border-transparent
                   disabled:opacity-60 disabled:cursor-not-allowed"
                              placeholder="0.00"
                            />

                            <button
                              type="button"
                              onClick={submitSaldoPrevio}
                              disabled={!canSubmitSaldoPrevio}
                              className="inline-flex items-center justify-center rounded-xl px-3 py-2 text-xs font-semibold transition
                   border border-amber-300 bg-amber-100 text-amber-700
                   hover:bg-amber-200 hover:border-amber-400
                   disabled:opacity-50 disabled:cursor-not-allowed"
                              title={
                                saldoPrevioCargado
                                  ? 'Saldo previo ya cargado'
                                  : 'Registrar saldo previo (deuda histórica)'
                              }
                            >
                              {savingSaldoPrevio
                                ? 'Guardando…'
                                : saldoPrevioCargado
                                  ? 'Cargada'
                                  : 'OK'}
                            </button>
                          </div>

                          <p className="mt-1 text-[11px] text-amber-500">
                            Carga deuda histórica sin registrar productos.
                          </p>
                        </div>
                      </div>

                      {/* Totales */}
                      <div className="text-right ml-5">
                        <p className="text-xs text-slate-500">
                          Total estimado
                        </p>
                        <p className="text-lg font-semibold text-emerald-600">
                          $ {totalLabel}
                        </p>

                        {form.tipo === 'a_cuenta' && (
                          <p className="text-xs text-slate-500">
                            Saldo:{' '}
                            <span className="font-semibold text-amber-600">
                              $ {saldoLabel}
                            </span>
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>

                {/* Acciones */}
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
                    disabled={!canSave || saving}
                    className="px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-semibold
                               hover:brightness-110 disabled:opacity-60 disabled:cursor-not-allowed transition"
                  >
                    {saving ? 'Guardando…' : 'Confirmar venta'}
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
