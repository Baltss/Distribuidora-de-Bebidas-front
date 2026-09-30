// ===============================
// FILE: src/Pages/Ventas/NuevaVentaPage.jsx
// ===============================
/*
 * Venta rápida en el local: reemplaza al modal "Nueva Venta" como página
 * por defecto del atajo de Ventas. Misma lógica que VentaFormModal (canal
 * fijo "local", sin saldo previo en pantalla), pero con los productos
 * listados como filas de tabla para que cargue liviano con muchos ítems,
 * y foco automático en "Escanear producto" para seguir pistoleando sin
 * fricción entre una venta y la siguiente.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import Swal from 'sweetalert2';
import { Plus, Trash2, ScanLine } from 'lucide-react';
import {
  FaHistory,
  FaMoneyBillWave,
  FaUsers,
  FaFileExport
} from 'react-icons/fa';

import AppShell from '../../Components/Layout/AppShell';
import SearchableSelect from '../../Components/Common/SearchableSelect';
import ExportarVentasModal from '../../Components/Ventas/ExportarVentasModal';

import { useAuth } from '../../AuthContext';
import { listClientes } from '../../api/clientes';
import { listProductos } from '../../api/productos';
import { listVendedores } from '../../api/vendedores';
import { createVenta } from '../../api/ventas';
import { blockWheelChange } from '../../utils/numberInput';
import MedioPagoField from '../../Components/Common/MedioPagoField';
import useEstadoEmision from '../../hooks/useEstadoEmision';
import SelectorPuntoVenta from '../../Components/Facturacion/SelectorPuntoVenta';
import { opcionesPuntoVenta } from '../../utils/emisores';
import { abrirPdfAutenticado, previsualizarTributos } from '../../api/facturacion';
import useDebouncedValue from '../../hooks/useDebouncedValue';
import FacturaPostVentaModal from '../../Components/Facturacion/FacturaPostVentaModal';
import useImprimirComprobante from '../../hooks/useImprimirComprobante';
import { comprobantePrevisto } from '../../utils/comprobantes';
import useCatalogoFiscal from '../../hooks/useCatalogoFiscal';

const CONSUMIDOR_FINAL_DOCUMENTO = 'CONSUMIDOR_FINAL';

// Key estable por ítem (no el índice del array): evita que, al insertar un
// ítem nuevo arriba de la lista, React "recicle" el DOM/estado interno de
// un SearchableSelect que en realidad pertenece a otra fila.
let itemKeySeq = 0;
const makeEmptyItem = () => ({
  _key: ++itemKeySeq,
  producto_id: '',
  producto: null,
  cantidad: '',
  precio_unit: ''
});

// Normaliza un código escaneado para comparar EAN-13 vs UPC-A (12 dígitos)
// que a veces llegan con o sin el 0 inicial según la configuración del lector.
const normalizeScanCode = (raw) => String(raw || '').trim();
const scanVariants = (code) => {
  const c = normalizeScanCode(code);
  const variants = new Set([c]);
  if (/^\d+$/.test(c)) {
    if (c.length === 12) variants.add(`0${c}`);
    if (c.length === 13 && c.startsWith('0')) variants.add(c.slice(1));
  }
  return Array.from(variants);
};

const moneyRound = (n) =>
  Math.round((Number(n || 0) + Number.EPSILON) * 100) / 100;

const formatMoneyLabel = (n) =>
  Number(n || 0).toLocaleString('es-AR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

export default function NuevaVentaPage() {
  const { userId } = useAuth();

  const [form, setForm] = useState({
    fecha: new Date(),
    cliente_id: '',
    vendedor_id: '',
    tipo: 'contado', // contado | fiado | a_cuenta
    medio_pago: 'efectivo',
    medios_pago: null, // split de medios de pago: [{ medio_pago, monto }, ...] o null
    monto_a_cuenta: '',
    facturar: false
  });
  const [items, setItems] = useState([makeEmptyItem()]);
  const [saving, setSaving] = useState(false);

  const [productos, setProductos] = useState([]);
  const [vendedoresLocal, setVendedoresLocal] = useState([]);
  const [loadingVendedoresLocal, setLoadingVendedoresLocal] = useState(false);
  const [clientesLocal, setClientesLocal] = useState([]);
  const [loadingClientesLocal, setLoadingClientesLocal] = useState(false);
  const [selectedCliente, setSelectedCliente] = useState(null);

  const [scanValue, setScanValue] = useState('');
  const [scanError, setScanError] = useState('');
  const [scanLoading, setScanLoading] = useState(false);
  const scanInputRef = useRef(null);

  // Acción de la botonera (Exportar) — sin modificar.
  const [exportarModalOpen, setExportarModalOpen] = useState(false);

  // Facturación electrónica: si se puede facturar, qué comprobante sale, y
  // la espera del CAE + impresión después de confirmar.
  const estadoEmision = useEstadoEmision();
  const [puntoVentaId, setPuntoVentaId] = useState('');
  const catalogoFiscal = useCatalogoFiscal();
  const [postVenta, setPostVenta] = useState(null); // { ventaId, facturaId, errorInicio }
  const imprimir = useImprimirComprobante();

  // Punto de venta (CUIT) con que se factura: por defecto el que corresponde a este usuario.
  useEffect(() => {
    if (estadoEmision?.punto_venta_por_defecto_id) setPuntoVentaId(String(estadoEmision.punto_venta_por_defecto_id));
  }, [estadoEmision]);
  const puntoVentaElegido = useMemo(() => {
    const opciones = opcionesPuntoVenta(estadoEmision);
    return opciones.find((o) => String(o.id) === puntoVentaId) || opciones[0] || null;
  }, [estadoEmision, puntoVentaId]);

  // Percepciones que se le van a cobrar al cliente al facturar (si el CUIT es agente de percepción).
  const [tributosPrevistos, setTributosPrevistos] = useState(null);
  const pedidoTributos = useMemo(() => {
    const productos = items
      .filter((it) => Number(it.producto_id) > 0 && Number(it.cantidad) > 0)
      .map((it) => ({ producto_id: Number(it.producto_id), cantidad: Number(it.cantidad), precio_unit: Number(it.precio_unit) || 0 }));
    if (!form.facturar || !puntoVentaElegido || !form.cliente_id || !productos.length) return '';
    return JSON.stringify({ cliente_id: Number(form.cliente_id), punto_venta_id: puntoVentaElegido.id, items: productos });
  }, [items, form.facturar, form.cliente_id, puntoVentaElegido]);
  const pedidoTributosDiferido = useDebouncedValue(pedidoTributos, 500);
  useEffect(() => {
    if (!pedidoTributosDiferido) {
      setTributosPrevistos(null);
      return undefined;
    }
    let vigente = true;
    previsualizarTributos(JSON.parse(pedidoTributosDiferido))
      .then((r) => vigente && setTributosPrevistos(r))
      .catch(() => vigente && setTributosPrevistos(null)); // es informativo: si falla, no se muestra
    return () => {
      vigente = false;
    };
  }, [pedidoTributosDiferido]);

  // ---------- Carga de catálogos al montar ----------
  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        // Traemos el catálogo completo (no solo los primeros N) para que el
        // escaneo de código de barras y el selector manual encuentren
        // cualquier producto, no solo los más recientes.
        const pRes = await listProductos({
          orderBy: 'created_at',
          orderDir: 'DESC',
          limit: 20000
        });
        if (!alive) return;
        const prods = Array.isArray(pRes?.data) ? pRes.data : pRes || [];
        setProductos(prods);
      } catch (err) {
        console.error('Error cargando productos:', err);
      }
    })();

    (async () => {
      try {
        setLoadingVendedoresLocal(true);
        const vRes = await listVendedores({
          estado: 'activo',
          orderBy: 'nombre',
          orderDir: 'ASC',
          limit: 1000
        });
        if (!alive) return;
        const vs = Array.isArray(vRes?.data) ? vRes.data : vRes || [];
        setVendedoresLocal(Array.isArray(vs) ? vs : []);

        // Vendedor = usuario logueado (si tiene un vendedor vinculado).
        const own = vs.find((v) => String(v.usuario_id) === String(userId));
        if (own) {
          setForm((f) => (f.vendedor_id ? f : { ...f, vendedor_id: own.id }));
        }
      } catch (err) {
        console.error('Error cargando vendedores para venta local:', err);
        if (alive) setVendedoresLocal([]);
      } finally {
        if (alive) setLoadingVendedoresLocal(false);
      }
    })();

    (async () => {
      try {
        setLoadingClientesLocal(true);
        const cRes = await listClientes({
          estado: 'activo',
          orderBy: 'nombre',
          orderDir: 'ASC',
          limit: 2000
        });
        if (!alive) return;
        const cs = Array.isArray(cRes?.data) ? cRes.data : [];
        setClientesLocal(cs);

        const consumidorFinal = cs.find(
          (c) => c.documento === CONSUMIDOR_FINAL_DOCUMENTO
        );
        if (consumidorFinal) {
          setSelectedCliente(consumidorFinal);
          setForm((f) => ({ ...f, cliente_id: consumidorFinal.id }));
        }
      } catch (err) {
        console.error('Error cargando clientes para venta local:', err);
        if (alive) setClientesLocal([]);
      } finally {
        if (alive) setLoadingClientesLocal(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [userId]);

  // Vendedor vinculado al usuario logueado (si existe), para volver a
  // preseleccionarlo cada vez que se reinicia el formulario.
  const defaultVendedorId = useMemo(() => {
    const own = vendedoresLocal.find(
      (v) => String(v.usuario_id) === String(userId)
    );
    return own ? own.id : '';
  }, [vendedoresLocal, userId]);

  const defaultClienteId = useMemo(() => {
    const cf = clientesLocal.find(
      (c) => c.documento === CONSUMIDOR_FINAL_DOCUMENTO
    );
    return cf || null;
  }, [clientesLocal]);

  // ---------- Helpers ----------
  const getPrecioFromProducto = (p) => {
    if (!p) return null;
    const n = Number(p.pre_prod);
    return Number.isFinite(n) && n >= 0 ? moneyRound(n) : null;
  };

  const totalNeto = useMemo(() => {
    return items.reduce((acc, it) => {
      const cant = Number(it.cantidad);
      const pu = Number(it.precio_unit);
      if (!Number.isFinite(cant) || !Number.isFinite(pu)) return acc;
      return acc + cant * pu;
    }, 0);
  }, [items]);

  const totalLabel = useMemo(() => formatMoneyLabel(totalNeto), [totalNeto]);

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

  const saldoLabel = useMemo(() => formatMoneyLabel(saldoNumber), [saldoNumber]);

  // Consumidor Final nunca puede quedar fiado ni a cuenta.
  const esConsumidorFinal =
    selectedCliente?.documento === CONSUMIDOR_FINAL_DOCUMENTO;

  useEffect(() => {
    if (!esConsumidorFinal) return;
    setForm((f) =>
      f.tipo === 'contado'
        ? f
        : { ...f, tipo: 'contado', monto_a_cuenta: '' }
    );
  }, [esConsumidorFinal]);

  const canSave = useMemo(() => {
    const cliId = Number(form.cliente_id);
    const vendId = Number(form.vendedor_id);

    const hasCliente = Number.isFinite(cliId) && cliId > 0;
    const hasVendedor = Number.isFinite(vendId) && vendId > 0;

    const hasItemsValidos =
      Array.isArray(items) &&
      items.some((it) => {
        const pid = Number(it.producto_id);
        const cant = Number(it.cantidad);
        return (
          Number.isFinite(pid) && pid > 0 && Number.isFinite(cant) && cant > 0
        );
      });

    const aCuentaOk =
      form.tipo !== 'a_cuenta'
        ? true
        : Number.isFinite(aCuentaNumber) &&
          aCuentaNumber >= 0 &&
          aCuentaNumber <= moneyRound(totalNeto) + 0.01;

    const requiereMedioPago =
      form.tipo === 'contado' ||
      (form.tipo === 'a_cuenta' && aCuentaNumber > 0);
    const montoAPagar = form.tipo === 'a_cuenta' ? aCuentaNumber : totalNeto;
    const hasMedioPago = !requiereMedioPago
      ? true
      : Array.isArray(form.medios_pago)
        ? form.medios_pago.length > 0 &&
          form.medios_pago.every((t) => t.medio_pago && Number(t.monto) > 0) &&
          Math.abs(
            form.medios_pago.reduce((acc, t) => acc + (Number(t.monto) || 0), 0) - montoAPagar
          ) < 0.01
        : !!form.medio_pago;

    return (
      hasCliente && hasVendedor && hasItemsValidos && aCuentaOk && hasMedioPago
    );
  }, [
    form.cliente_id,
    form.vendedor_id,
    form.tipo,
    form.medio_pago,
    form.medios_pago,
    items,
    aCuentaNumber,
    totalNeto
  ]);

  // ---------- Handlers de campos ----------
  const handleVendedorLocal = (e) => {
    setForm((f) => ({ ...f, vendedor_id: e.target.value }));
  };

  const handleClienteLocalChange = (cliOrId) => {
    if (!cliOrId) {
      setSelectedCliente(null);
      setForm((f) => ({ ...f, cliente_id: '' }));
      return;
    }
    const cli =
      typeof cliOrId === 'object'
        ? cliOrId
        : clientesLocal.find((c) => c.id === Number(cliOrId));
    setSelectedCliente(cli || null);
    setForm((f) => ({
      ...f,
      cliente_id: cli ? cli.id : Number(cliOrId) || ''
    }));
  };

  const handleTipo = (tipo) => {
    if (esConsumidorFinal && tipo !== 'contado') return;
    setForm((f) => ({
      ...f,
      tipo,
      ...(tipo === 'a_cuenta' ? {} : { monto_a_cuenta: '' })
    }));
  };

  const handleMontoACuenta = (e) => {
    const raw = e.target.value;
    if (raw === '') {
      setForm((f) => ({ ...f, monto_a_cuenta: '' }));
      return;
    }
    const n = Number(raw);
    if (!Number.isFinite(n) || n < 0) return;
    const clamped = n > Number(totalNeto || 0) ? Number(totalNeto || 0) : n;
    setForm((f) => ({ ...f, monto_a_cuenta: String(moneyRound(clamped)) }));
  };

  // ---------- Items (detalle) ----------
  const handleItemChange = (index, field, value) => {
    setItems((prev) =>
      prev.map((it, i) => (i === index ? { ...it, [field]: value } : it))
    );
  };

  const handleProductoChange = (index, prodOrId) => {
    setItems((prev) =>
      prev.map((row, i) => {
        if (i !== index) return row;

        const prod =
          typeof prodOrId === 'object'
            ? prodOrId
            : productos.find((p) => p.id === Number(prodOrId));

        const id = prod ? prod.id : Number(prodOrId) || '';

        if (!id) {
          return { ...row, producto_id: '', producto: null };
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
    setItems((prev) => [makeEmptyItem(), ...prev]);
  };

  const removeItemRow = (index) => {
    setItems((prev) =>
      prev.length === 1 ? prev : prev.filter((_, i) => i !== index)
    );
  };

  const buscarProductoEnLista = (lista, code) => {
    const variants = scanVariants(code).map((v) => v.toUpperCase());
    return (
      (lista || []).find(
        (p) =>
          p?.barra_ean13 &&
          variants.includes(String(p.barra_ean13).toUpperCase())
      ) ||
      (lista || []).find(
        (p) =>
          p?.codigo_sku &&
          variants.includes(String(p.codigo_sku).toUpperCase())
      ) ||
      null
    );
  };

  const findProductoByScan = (code) => buscarProductoEnLista(productos, code);

  const agregarProductoEscaneado = (prod) => {
    setItems((prev) => {
      const idx = prev.findIndex(
        (it) => Number(it.producto_id) === Number(prod.id)
      );
      if (idx >= 0) {
        const actual = Number(prev[idx].cantidad) || 0;
        return prev.map((it, i) =>
          i === idx ? { ...it, cantidad: String(actual + 1) } : it
        );
      }

      const precioAuto = getPrecioFromProducto(prod);
      const nuevaLinea = {
        ...makeEmptyItem(),
        producto_id: prod.id,
        producto: prod,
        cantidad: '1',
        precio_unit: precioAuto === null ? '' : String(precioAuto)
      };

      const emptyIdx = prev.findIndex((it) => !it.producto_id);
      if (emptyIdx >= 0) {
        return prev.map((it, i) =>
          i === emptyIdx ? { ...nuevaLinea, _key: it._key } : it
        );
      }
      return [nuevaLinea, ...prev];
    });

    scanInputRef.current?.focus();
  };

  const handleScan = async () => {
    const code = normalizeScanCode(scanValue);
    setScanValue('');
    if (!code) return;

    const prod = findProductoByScan(code);
    if (prod) {
      setScanError('');
      agregarProductoEscaneado(prod);
      return;
    }

    // No está en el catálogo ya cargado en el navegador: antes de darlo
    // por no encontrado, lo buscamos directo contra el backend (cubre el
    // caso de un producto nuevo o un catálogo que superó lo precargado).
    setScanLoading(true);
    try {
      const resp = await listProductos({ q: code, limit: 5, estado: 'activo' });
      const candidatos = Array.isArray(resp) ? resp : resp?.data || [];
      const remoto = buscarProductoEnLista(candidatos, code);
      if (remoto) {
        setScanError('');
        setProductos((prev) =>
          prev.some((p) => Number(p.id) === Number(remoto.id)) ? prev : [remoto, ...prev]
        );
        agregarProductoEscaneado(remoto);
        return;
      }
    } catch {
      // Si falla la consulta de respaldo, seguimos al mensaje de no encontrado.
    } finally {
      setScanLoading(false);
    }

    setScanError(`Producto no encontrado (código: ${code})`);
    scanInputRef.current?.focus();
  };

  // ---------- Reset (después de confirmar una venta, o al cancelar) ----------
  const resetForm = () => {
    setForm({
      fecha: new Date(),
      cliente_id: defaultClienteId?.id || '',
      vendedor_id: defaultVendedorId || '',
      tipo: 'contado',
      medio_pago: 'efectivo',
      medios_pago: null,
      monto_a_cuenta: '',
      facturar: false
    });
    setSelectedCliente(defaultClienteId || null);
    setItems([makeEmptyItem()]);
    setScanValue('');
    setScanError('');
  };

  // ---------- Submit ----------
  const submit = async (e) => {
    e.preventDefault();
    if (!canSave) return;

    const fechaPayload =
      form.fecha instanceof Date ? form.fecha.toISOString() : form.fecha;

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

    const quiereFacturar = !!estadoEmision?.habilitada && form.facturar;

    try {
      setSaving(true);
      const creada = await createVenta({
        cliente_id: Number(form.cliente_id),
        vendedor_id: Number(form.vendedor_id),
        fecha: fechaPayload,
        tipo: form.tipo,
        canal: 'local',
        medio_pago: Array.isArray(form.medios_pago) ? null : form.medio_pago,
        medios_pago: Array.isArray(form.medios_pago) ? form.medios_pago : null,
        observaciones: null,
        reparto_id: null,
        monto_a_cuenta: moneyRound(Number(form.monto_a_cuenta || 0)),
        items: itemsPayload,
        facturar: quiereFacturar,
        punto_venta_id: quiereFacturar ? puntoVentaElegido?.id ?? null : null
      });

      if (quiereFacturar) {
        // Espera el CAE y ofrece imprimir la factura (ver FacturaPostVentaModal).
        resetForm();
        setPostVenta({
          ventaId: creada?.id,
          facturaId: creada?.facturacion?.ok ? creada.facturacion.factura_id : null,
          errorInicio: creada?.facturacion?.ok
            ? null
            : creada?.facturacion?.mensajeError || 'No se pudo iniciar la factura.'
        });
        return;
      }

      const result = await Swal.fire({
        icon: 'success',
        title: 'Venta creada',
        text: 'La venta se registró correctamente.',
        showDenyButton: !!creada?.id,
        denyButtonText: 'Imprimir comprobante',
        denyButtonColor: '#0ea5e9',
        confirmButtonText: 'Aceptar',
        confirmButtonColor: '#10b981'
      });
      if (result.isDenied && creada?.id) {
        abrirPdfAutenticado(`/ventas/${creada.id}/recibo-pdf`)
        .catch((e) => Swal.fire({ icon: 'error', title: 'No se pudo abrir el PDF', text: e?.mensajeError || 'Ocurrió un error inesperado.' }));
      }

      resetForm();
      requestAnimationFrame(() => scanInputRef.current?.focus());
    } catch (err) {
      console.error('Error creando venta:', err);
      const msg =
        err?.response?.data?.mensajeError ||
        err?.message ||
        'No se pudo crear la venta.';
      Swal.fire({ icon: 'error', title: 'Error', text: msg });
    } finally {
      setSaving(false);
    }
  };

  const handleCancelar = () => {
    resetForm();
    requestAnimationFrame(() => scanInputRef.current?.focus());
  };

  // ---------- Render ----------
  return (
    <AppShell>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Título + botonera del módulo (no se modifica) */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <motion.h1
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 mb-1"
            >
              Nueva Venta
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-sm text-slate-500 max-w-2xl"
            >
              Cargá la venta rápido: escaneá los productos y confirmá.
            </motion.p>
          </div>

          <div className="flex flex-wrap gap-2 md:justify-end">
            <Link
              to="/dashboard/ventas"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-orange-500 text-white font-semibold hover:bg-orange-600 transition"
            >
              <FaHistory /> Historial ventas
            </Link>
            <Link
              to="/dashboard/ventas/saldo-previo"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 transition"
            >
              <FaMoneyBillWave /> Saldo previo
            </Link>
            <Link
              to="/dashboard/ventas/deudas"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 transition"
            >
              <FaUsers /> Deudas
            </Link>
            <button
              type="button"
              onClick={() => setExportarModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 transition"
            >
              <FaFileExport /> Exportar
            </button>
          </div>
        </div>

        {/* Formulario de venta rápida */}
        <form onSubmit={submit} className="space-y-5">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-5 space-y-5">
            {/* Cliente + Tipo de venta + Medio de pago */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                  <label className="block text-sm font-medium text-slate-600 mb-2">
                    Cliente <span className="text-orange-600">*</span>
                  </label>
                  <SearchableSelect
                    items={clientesLocal}
                    value={form.cliente_id}
                    onChange={handleClienteLocalChange}
                    placeholder={
                      loadingClientesLocal ? 'Cargando clientes…' : 'Cliente…'
                    }
                    getOptionLabel={(c) =>
                      c ? `${c.nombre} (${c.documento || 's/ doc'})` : ''
                    }
                    getOptionValue={(c) => c.id}
                    portal
                    portalZIndex={1200}
                  />
                  <p className="mt-1 text-[11px] text-slate-600">
                    Por defecto queda "Consumidor Final" — elegí un cliente real
                    solo si la venta va a quedar fiada o a cuenta.
                  </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-600 mb-2">
                  Tipo de venta
                </label>
                <select
                  value={form.tipo}
                  onChange={(e) => handleTipo(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-slate-800
                             focus:outline-none focus:ring-2 focus:ring-orange-400/40 focus:border-transparent"
                >
                  <option value="contado">Contado</option>
                  <option value="fiado" disabled={esConsumidorFinal}>
                    Fiado
                  </option>
                  <option value="a_cuenta" disabled={esConsumidorFinal}>
                    A cuenta
                  </option>
                </select>
                {esConsumidorFinal && (
                  <p className="mt-2 text-xs text-slate-500">
                    Consumidor Final solo admite venta al contado.
                  </p>
                )}
              </div>

              <div>
                {form.tipo === 'fiado' ? (
                  <label className="block text-sm font-medium text-slate-600 mb-2">
                    Medio de pago{' '}
                    <span className="text-slate-500 font-normal">
                      (no aplica en fiado)
                    </span>
                  </label>
                ) : (
                  <MedioPagoField
                    value={{ medio_pago: form.medio_pago, medios_pago: form.medios_pago }}
                    onChange={(v) =>
                      setForm((f) => ({ ...f, medio_pago: v.medio_pago, medios_pago: v.medios_pago }))
                    }
                    total={form.tipo === 'a_cuenta' ? Number(form.monto_a_cuenta || 0) : totalNeto}
                  />
                )}
              </div>
            </div>

            {/* Vendedor (debajo, a la izquierda) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-2">
                  Vendedor <span className="text-orange-600">*</span>
                </label>
                <select
                  value={form.vendedor_id || ''}
                  onChange={handleVendedorLocal}
                  disabled={loadingVendedoresLocal}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-slate-800
                             focus:outline-none focus:ring-2 focus:ring-orange-400/40 focus:border-transparent
                             disabled:opacity-60"
                >
                  <option className="text-black" value="">
                    {loadingVendedoresLocal
                      ? 'Cargando vendedores…'
                      : 'Seleccioná quién atiende…'}
                  </option>
                  {vendedoresLocal.map((v) => (
                    <option className="text-black" key={v.id} value={v.id}>
                      {v.nombre}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Escanear producto */}
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-2">
                Escanear producto
              </label>
              <div className="relative">
                <ScanLine className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-600" />
                <input
                  ref={scanInputRef}
                  autoFocus
                  value={scanValue}
                  onChange={(e) => {
                    setScanValue(e.target.value);
                    if (scanError) setScanError('');
                  }}
                  onKeyDown={(e) => {
                    if (e.key !== 'Enter') return;
                    e.preventDefault();
                    e.stopPropagation();
                    handleScan();
                  }}
                  placeholder="Pasá el producto por el lector, o tipeá el código y Enter…"
                  className="w-full pl-9 pr-3.5 py-3 rounded-xl border border-slate-200 bg-white text-slate-800
                             placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-400/40 focus:border-transparent"
                />
              </div>
              {scanLoading && (
                <p className="mt-1 text-[12px] text-slate-500">Buscando producto…</p>
              )}
              {scanError && (
                <p className="mt-1 text-[12px] text-rose-600">{scanError}</p>
              )}
              <p className="mt-1 text-[11px] text-slate-600">
                Cada escaneo suma 1 unidad — si el producto ya está en la
                lista, se acumula en la misma línea.
              </p>
            </div>

            {/* Detalle de productos: cada producto es una fila de tabla */}
            <div className="space-y-3">
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

              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold text-slate-600 min-w-[220px]">
                        Producto
                      </th>
                      <th className="px-3 py-2 text-left font-semibold text-slate-600 w-28">
                        Cantidad
                      </th>
                      <th className="px-3 py-2 text-left font-semibold text-slate-600 w-32">
                        Precio unit.
                      </th>
                      <th className="px-3 py-2 text-right font-semibold text-slate-600 w-28">
                        Subtotal
                      </th>
                      <th className="px-3 py-2 w-10" />
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((it, index) => {
                      const subtotal =
                        Number(it.cantidad) > 0 && Number(it.precio_unit) >= 0
                          ? Number(it.cantidad) * Number(it.precio_unit)
                          : 0;
                      return (
                        <tr
                          key={it._key}
                          className="border-b border-slate-100 last:border-0 align-top"
                        >
                          <td className="px-3 py-2">
                            <SearchableSelect
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
                              portal
                              portalZIndex={1200}
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="number"
                              onWheel={blockWheelChange}
                              min="0"
                              step="0.001"
                              value={it.cantidad}
                              onChange={(e) =>
                                handleItemChange(index, 'cantidad', e.target.value)
                              }
                              className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-slate-800
                                         placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-400/40 focus:border-transparent text-sm"
                              placeholder="0"
                            />
                          </td>
                          <td className="px-3 py-2">
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
                              className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-slate-800
                                         placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-400/40 focus:border-transparent text-sm"
                              placeholder="0.00"
                            />
                          </td>
                          <td className="px-3 py-2 text-right font-semibold text-slate-800 whitespace-nowrap">
                            $ {formatMoneyLabel(subtotal)}
                          </td>
                          <td className="px-3 py-2 text-center">
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
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* A cuenta (solo fiado/a_cuenta) */}
              {(form.tipo === 'fiado' || form.tipo === 'a_cuenta') && (
                <div className="flex justify-end">
                  <div className="w-full sm:w-[260px]">
                    <p className="text-xs text-slate-500 mb-1">A cuenta</p>
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
                          setForm((prev) => ({ ...prev, tipo: 'a_cuenta' }));
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
                </div>
              )}
            </div>
          </div>

          {/* Facturación electrónica: elegir si esta venta se factura al confirmarla */}
          {(() => {
            const previsto = comprobantePrevisto(puntoVentaElegido?.emisor, selectedCliente, catalogoFiscal, totalNeto);
            const habilitada = !!estadoEmision?.habilitada;
            return (
              <div>
                <label
                  className={`flex items-start gap-2.5 rounded-2xl border bg-white px-4 py-3 ${
                    habilitada ? 'border-slate-200 cursor-pointer' : 'border-slate-100 opacity-70 cursor-not-allowed'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={habilitada && form.facturar}
                    disabled={!habilitada}
                    onChange={(e) => setForm((f) => ({ ...f, facturar: e.target.checked }))}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-400"
                  />
                  <span className="text-sm text-slate-700">
                    Facturar esta venta (emite el comprobante electrónico ante ARCA al confirmar)
                    {habilitada && previsto && (
                      <span className="block text-xs text-slate-500">
                        Va a salir: <strong className="text-slate-700">{previsto.texto}</strong>
                      </span>
                    )}
                    {habilitada && form.facturar && previsto?.advertencia && (
                      <span className="block text-xs text-amber-600">{previsto.advertencia}</span>
                    )}
                    {habilitada && form.facturar && tributosPrevistos?.total_tributos > 0 && (
                      <span className="block text-xs text-slate-600">
                        Con percepciones (
                        {tributosPrevistos.tributos.map((t) => `${t.descripcion} $ ${formatMoneyLabel(t.importe)}`).join(' · ')}) la
                        factura suma <strong>$ {formatMoneyLabel(tributosPrevistos.total)}</strong>. Las percepciones quedan en la
                        cuenta corriente del cliente.
                      </span>
                    )}
                    {estadoEmision && !habilitada && (
                      <span className="block text-xs text-slate-500">{estadoEmision.motivo}</span>
                    )}
                  </span>
                </label>
                {habilitada && form.facturar && (
                  <SelectorPuntoVenta
                    estadoEmision={estadoEmision}
                    value={puntoVentaId}
                    onChange={setPuntoVentaId}
                    className="mt-2 px-1"
                  />
                )}
              </div>
            );
          })()}

          {/* Total estimado + Acciones: fijo, no se pierde con muchos ítems */}
          <div className="sticky bottom-0 z-10 rounded-2xl border border-slate-200 bg-white shadow-lg px-4 sm:px-5 py-4
                           flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <p className="text-xs text-slate-500">Total estimado</p>
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
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={handleCancelar}
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
            </div>
          </div>
        </form>
      </div>

      <ExportarVentasModal
        open={exportarModalOpen}
        onClose={() => setExportarModalOpen(false)}
      />

      <FacturaPostVentaModal
        open={!!postVenta}
        ventaId={postVenta?.ventaId}
        facturaId={postVenta?.facturaId}
        errorInicio={postVenta?.errorInicio}
        imprimir={imprimir}
        onClose={() => {
          setPostVenta(null);
          requestAnimationFrame(() => scanInputRef.current?.focus());
        }}
      />
      {imprimir.modalImpresora}
    </AppShell>
  );
}
