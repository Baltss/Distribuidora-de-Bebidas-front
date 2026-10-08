// FILE: src/Components/Ventas/VentaRepartoFormModal.jsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Search,
  ShoppingCart,
  CalendarDays,
  BadgeDollarSign,
  Truck,
  Trash2
} from 'lucide-react';

import {
  backdropV,
  panelV,
  formContainerV,
  fieldV
} from '../../ui/animHelpers';

import { useAuth } from '../../AuthContext';
import { listRepartos } from '../../api/repartos';
import { listClientesDeReparto } from '../../api/repartosClientes';
import { listProductos } from '../../api/productos';
import { listVendedores } from '../../api/vendedores';
import {
  createVentasRepartoMasiva,
  createSaldoPrevioCliente
} from '../../api/ventas';
import { blockWheelChange } from '../../utils/numberInput';

import { showErrorSwal, showWarnSwal, showSuccessSwal } from '../../ui/swal';

function todayISODate() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

// Saca precio de venta desde el producto
function getPrecioVenta(prod) {
  if (!prod) return 0;
  if (prod.precio_venta != null) return Number(prod.precio_venta) || 0;
  if (prod.precio != null) return Number(prod.precio) || 0; // el de la sucursal activa
  if (prod.pre_prod != null) return Number(prod.pre_prod) || 0;
  return 0;
}

export default function VentaRepartoFormModal({
  open,
  onClose,
  onCreated, // callback al terminar
  initialReparto // opcional: reparto preseleccionado
}) {
  const { user } = useAuth?.() || {};

  const [saving, setSaving] = useState(false);

  // Repartos
  const [repartos, setRepartos] = useState([]);
  const [repartoId, setRepartoId] = useState(initialReparto?.id || '');
  const repartoSelected = useMemo(
    () =>
      repartos.find((r) => Number(r.id) === Number(repartoId)) ||
      initialReparto ||
      null,
    [repartos, repartoId, initialReparto]
  );

  // Clientes del reparto
  const [clientes, setClientes] = useState([]);
  const [loadingClientes, setLoadingClientes] = useState(false);

  // Clientes excluidos SOLO en este modal (no persiste)
  const [clientesExcluidos, setClientesExcluidos] = useState([]);

  const clientesVisibles = useMemo(
    () =>
      (clientes || []).filter((c) => !clientesExcluidos.includes(Number(c.id))),
    [clientes, clientesExcluidos]
  );

  //  - 17/01/2026 - Buscador por cliente (nombre/rango) + selección rápida para enfocar "A cuenta"
  const [clienteSearch, setClienteSearch] = useState('');
  const [clienteSelectedId, setClienteSelectedId] = useState(null);

  // Refs para scrollear y hacer focus directo al "A cuenta" del cliente seleccionado
  const clienteCardRefs = useRef({});
  const aCuentaInputRefs = useRef({});

  const setClienteCardRef = (clienteId) => (el) => {
    const idNum = Number(clienteId);
    if (!Number.isFinite(idNum) || idNum <= 0) return;
    if (el) clienteCardRefs.current[idNum] = el;
    else delete clienteCardRefs.current[idNum];
  };

  const setACuentaInputRef = (clienteId) => (el) => {
    const idNum = Number(clienteId);
    if (!Number.isFinite(idNum) || idNum <= 0) return;
    if (el) aCuentaInputRefs.current[idNum] = el;
    else delete aCuentaInputRefs.current[idNum];
  };

  const clientesUI = useMemo(() => {
    const q = String(clienteSearch || '')
      .trim()
      .toLowerCase();
    if (!q) return clientesVisibles || [];

    const isNum = /^[0-9]+$/.test(q);
    const qNumStr = isNum ? q : null;

    return (clientesVisibles || []).filter((c) => {
      const nombre = String(c?.nombre || '').toLowerCase();
      const rango = c?.rango != null ? String(c.rango) : '';
      if (isNum) return rango.startsWith(qNumStr);
      return nombre.includes(q);
    });
  }, [clientesVisibles, clienteSearch]);

  useEffect(() => {
    if (!clienteSearch?.trim()) return;
    if (clienteSelectedId == null) return;
    const stillVisible = (clientesUI || []).some(
      (c) => Number(c.id) === Number(clienteSelectedId)
    );
    if (!stillVisible) setClienteSelectedId(null);
  }, [clientesUI, clienteSelectedId, clienteSearch]);

  useEffect(() => {
    //  - 25/02/2026 - Limpia saldos previos cargados al cambiar reparto, ya que cambia el conjunto de clientes.
    setSaldoPrevioPorCliente({});
    setSavingSaldoPrevioByCliente({});
    setSaldoPrevioCargadoByCliente({});
  }, [repartoId]);

  const handleSelectCliente = (clienteId) => {
    const idNum = Number(clienteId);
    if (!Number.isFinite(idNum) || idNum <= 0) return;
    setClienteSelectedId(idNum);

    // Focus inmediato al "A cuenta" del cliente y scroll suave al bloque derecho
    requestAnimationFrame(() => {
      const card = clienteCardRefs.current[idNum];
      if (card?.scrollIntoView) {
        card.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      const input = aCuentaInputRefs.current[idNum];
      if (input?.focus) {
        input.focus();
        if (input?.select) input.select();
      }
    });
  };

  const [aCuentaPorCliente, setACuentaPorCliente] = useState({});

  const handleACuentaChange = (clienteId, rawValue) => {
    const str = String(rawValue ?? '').replace(',', '.');
    const num = Number(str);

    setACuentaPorCliente((prev) => ({
      ...prev,
      [clienteId]: Number.isFinite(num) && num >= 0 ? num : 0
    }));
    //  - 24/02/2026 - Si cambia el a cuenta, invalidamos la marca de venta cargada del cliente
    setSavedByCliente((prev) => ({ ...prev, [clienteId]: false }));
  };

  const handleOcultarCliente = (clienteId) => {
    const idNum = Number(clienteId);
    setClientesExcluidos((prev) =>
      prev.includes(idNum) ? prev : [...prev, idNum]
    );
  };

  useEffect(() => {
    if (!open) return;
    setClientesExcluidos([]);
    setClienteSearch('');
    setClienteSelectedId(null);
    clienteCardRefs.current = {};
    aCuentaInputRefs.current = {};
  }, [open, repartoId]);

  // Productos
  const [productos, setProductos] = useState([]);
  const [loadingProductos, setLoadingProductos] = useState(false);

  // Vendedores
  const [vendedores, setVendedores] = useState([]);
  const [loadingVendedores, setLoadingVendedores] = useState(false);
  const [vendedorId, setVendedorId] = useState(user?.id || ''); // id seleccionado

  // Datos generales de la venta
  const [fecha, setFecha] = useState(todayISODate());
  const [tipoVenta, setTipoVenta] = useState('fiado'); // contado | fiado | a_cuenta

  // Cantidades por cliente-producto: { `${clienteId}-${productoId}`: number }
  const [cantidades, setCantidades] = useState({});

  //  - 25/02/2026 - Estado local para cargar deuda histórica (saldo previo) por cliente en venta masiva.
  const [saldoPrevioPorCliente, setSaldoPrevioPorCliente] = useState({});

  // Controla loading del botón OK de saldo previo por cliente.
  const [savingSaldoPrevioByCliente, setSavingSaldoPrevioByCliente] = useState(
    {}
  );

  // Marca visualmente qué clientes ya registraron saldo previo en esta sesión del modal.
  const [saldoPrevioCargadoByCliente, setSaldoPrevioCargadoByCliente] =
    useState({});

  //  - 25/02/2026 - Normaliza monto de saldo previo por cliente (permite string del input y devuelve número válido o null).
  const getSaldoPrevioClienteNum = (clienteId) => {
    const raw = saldoPrevioPorCliente?.[clienteId];
    if (raw === '' || raw === undefined || raw === null) return null;
    const n = Number(raw);
    if (!Number.isFinite(n) || n <= 0) return null;
    return n;
  };

  //  - 25/02/2026 - Actualiza input de saldo previo por cliente permitiendo edición controlada.
  const handleSaldoPrevioChange = (clienteId, value) => {
    setSaldoPrevioPorCliente((prev) => ({
      ...prev,
      [clienteId]: value
    }));

    // Si el usuario cambia el valor luego de una carga, se desmarca "cargado" visual para evitar falsas confirmaciones.
    setSaldoPrevioCargadoByCliente((prev) => ({
      ...prev,
      [clienteId]: false
    }));
  };
  // Reseteo general al abrir/cerrar
  useEffect(() => {
    if (!open) return;
    setSaving(false);
    setFecha(todayISODate());
    setTipoVenta('fiado');
    setCantidades({});
    setVendedorId(user?.id || ''); //  default = usuario logueado
    setClienteSearch('');
    setClienteSelectedId(null);
  }, [open, user]);

  // Cargar repartos cuando se abre
  useEffect(() => {
    if (!open) return;
    (async () => {
      try {
        const resp = await listRepartos({
          estado: 'activo',
          page: 1,
          limit: 300,
          orderBy: 'nombre',
          orderDir: 'ASC'
        });
        const data = Array.isArray(resp) ? resp : resp?.data || [];
        setRepartos(data);
        if (!repartoId && initialReparto?.id) {
          setRepartoId(initialReparto.id);
        }
      } catch (err) {
        console.error('Error cargando repartos:', err);
        setRepartos([]);
        await showErrorSwal({
          title: 'Error',
          text: 'No se pudieron cargar los repartos.'
        });
      }
    })();
  }, [open]);

  // Cargar clientes del reparto
  useEffect(() => {
    if (!open) return;
    if (!repartoSelected?.id) {
      setClientes([]);
      return;
    }
    (async () => {
      setLoadingClientes(true);
      try {
        const resp = await listClientesDeReparto(repartoSelected.id, {
          page: 1,
          limit: 500
        });
        const rows = resp?.data || resp || [];
        const cli = rows.map((rc, idx) => {
          const base = rc?.cliente || rc || {};

          // Intentamos preservar el "rango"/orden del cliente dentro del reparto.
          // Si no viene desde el backend, caemos al índice + 1 (orden recibido).
          const rangoRaw =
            rc?.rango ??
            rc?.rango_cliente ??
            rc?.numero_rango ??
            rc?.orden ??
            rc?.posicion ??
            base?.rango ??
            base?.orden ??
            null;

          const rangoNum = Number(rangoRaw);
          const rango =
            rangoRaw == null || rangoRaw === '' || !Number.isFinite(rangoNum)
              ? idx + 1
              : rangoNum;

          return { ...base, rango };
        });
        setClientes(cli);
      } catch (err) {
        console.error('Error cargando clientes de reparto:', err);
        setClientes([]);
        await showErrorSwal({
          title: 'Error',
          text: 'No se pudieron cargar los clientes del reparto.'
        });
      } finally {
        setLoadingClientes(false);
      }
    })();
  }, [open, repartoSelected?.id]);

  // Cargar productos
  useEffect(() => {
    if (!open) return;
    (async () => {
      setLoadingProductos(true);
      try {
        const resp = await listProductos({
          estado: 'activo',
          page: 1,
          limit: 200,
          orderBy: 'nombre',
          orderDir: 'ASC'
        });
        const data = Array.isArray(resp) ? resp : resp?.data || [];
        setProductos(data);
      } catch (err) {
        console.error('Error cargando productos:', err);
        setProductos([]);
        await showErrorSwal({
          title: 'Error',
          text: 'No se pudieron cargar los productos.'
        });
      } finally {
        setLoadingProductos(false);
      }
    })();
  }, [open]);

  // Cargar vendedores
  useEffect(() => {
    if (!open) return;
    (async () => {
      setLoadingVendedores(true);
      try {
        const resp = await listVendedores({
          estado: 'activo',
          page: 1,
          limit: 300,
          orderBy: 'nombre',
          orderDir: 'ASC'
        });
        let data = Array.isArray(resp) ? resp : resp?.data || [];

        // Aseguramos que el user actual esté en la lista si viene de otro lado
        if (user?.id && !data.some((v) => Number(v.id) === Number(user.id))) {
          data = [
            {
              id: user.id,
              nombre: user.nombre || user.name || 'Usuario actual',
              email: user.email,
              estado: 'activo'
            },
            ...data
          ];
        }
        setVendedores(data);
      } catch (err) {
        console.error('Error cargando vendedores:', err);
        setVendedores([]);
        await showErrorSwal({
          title: 'Error',
          text: 'No se pudieron cargar los vendedores.'
        });
      } finally {
        setLoadingVendedores(false);
      }
    })();
  }, [open, user]);

  const handleClose = () => {
    if (saving) return;
    onClose?.();
  };

  const handleCantidadChange = (clienteId, productoId, value) => {
    const num = Number(value);
    const clean = !Number.isFinite(num) || num < 0 ? '' : num;
    const key = `${clienteId}-${productoId}`;
    setCantidades((prev) => ({
      ...prev,
      [key]: clean
    }));
    //  - 24/02/2026 - Si cambia la cantidad, invalidamos la marca de venta cargada del cliente
    setSavedByCliente((prev) => ({ ...prev, [clienteId]: false }));
  };

  // Subtotales por cliente y total general
  const subtotalesPorCliente = useMemo(() => {
    const map = {};
    for (const cli of clientesVisibles || []) {
      let subtotal = 0;
      for (const prod of productos || []) {
        const key = `${cli.id}-${prod.id}`;
        const cant = Number(cantidades[key] || 0);
        if (!cant || cant <= 0) continue;
        const precio = getPrecioVenta(prod);
        subtotal += cant * precio;
      }
      map[cli.id] = Number(subtotal.toFixed(2));
    }
    return map;
  }, [clientesVisibles, productos, cantidades]);

  // const totalGeneral = useMemo(
  //   () =>
  //     Object.values(subtotalesPorCliente).reduce(
  //       (acc, v) => acc + (Number(v) || 0),
  //       0
  //     ),
  //   [subtotalesPorCliente]
  // );

  const totalGeneralConACuenta = useMemo(() => {
    return (clientesVisibles || []).reduce((acc, cli) => {
      const subtotalCli = subtotalesPorCliente[cli.id] ?? 0;
      const aCuentaCli = Number(aCuentaPorCliente[cli.id] ?? 0);
      const saldoCli = Math.max(0, subtotalCli - aCuentaCli);
      return acc + saldoCli;
    }, 0);
  }, [clientesVisibles, subtotalesPorCliente, aCuentaPorCliente]);

  const ciudadNombre =
    repartoSelected?.ciudad?.nombre || repartoSelected?.ciudad_nombre || '—';

  const selectedReparto = useMemo(() => {
    const idNum = Number(repartoId);
    return repartos.find((r) => Number(r.id) === idNum) || null;
  }, [repartoId, repartos]);

  const rangoText = useMemo(() => {
    const min = selectedReparto?.rango_min;
    const max = selectedReparto?.rango_max;
    if (min == null || max == null) return null;
    return `${min} – ${max}`;
  }, [selectedReparto]);

  const capacidad = useMemo(() => {
    const min = selectedReparto?.rango_min;
    const max = selectedReparto?.rango_max;
    if (min == null || max == null) return null;
    return Number(max) - Number(min) + 1;
  }, [selectedReparto]);

  const ciudadNombreSafe =
    ciudadNombre ||
    selectedReparto?.ciudad_nombre ||
    selectedReparto?.ciudad?.nombre ||
    '—';

  const tipoVentaLabel = {
    contado: 'Contado',
    fiado: 'Fiado',
    a_cuenta: 'A cuenta'
  }[tipoVenta];

  const vendedorSeleccionado =
    vendedores.find((v) => Number(v.id) === Number(vendedorId)) || null;

  const vendedorNombreUI =
    vendedorSeleccionado?.nombre ||
    user?.nombre ||
    user?.name ||
    'Seleccioná un vendedor';

  //  - 24/02/2026 - Estado por cliente para guardar ventas individuales sin cerrar el modal
  const [savingByCliente, setSavingByCliente] = useState({});
  const [savedByCliente, setSavedByCliente] = useState({});

  //  - 24/02/2026 - Construye una venta individual (1 cliente) reutilizando la misma lógica del submit masivo
  const buildVentaItemByCliente = (cli) => {
    if (!cli?.id) return null;

    const lineas = [];
    for (const prod of productos || []) {
      const key = `${cli.id}-${prod.id}`;
      const cant = Number(cantidades[key] || 0);
      if (!cant || cant <= 0) continue;

      const precio_unit = getPrecioVenta(prod);
      lineas.push({
        producto_id: prod.id,
        cantidad: cant,
        precio_unit
      });
    }

    if (!lineas.length) return null;

    const aCuentaRaw = Number(aCuentaPorCliente?.[cli.id] ?? 0);
    const monto_a_cuenta =
      Number.isFinite(aCuentaRaw) && aCuentaRaw > 0 ? aCuentaRaw : 0;

    return {
      cliente_id: cli.id,
      monto_a_cuenta,
      lineas
    };
  };

  //  - 24/02/2026 - Validaciones de cabecera reutilizables para submit global e individual
  const validarCabeceraVentasMasivas = () => {
    if (!repartoSelected?.id) {
      showWarnSwal({
        title: 'Falta reparto',
        text: 'Seleccioná un reparto para continuar.'
      });
      return false;
    }

    const vendedorIdNum = Number(vendedorId);
    if (!Number.isFinite(vendedorIdNum) || vendedorIdNum <= 0) {
      showWarnSwal({
        title: 'Vendedor requerido',
        text: 'Seleccioná un vendedor para registrar las ventas.'
      });
      return false;
    }

    return true;
  };

  //  - 24/02/2026 - Guarda una sola venta (por cliente) y notifica éxito sin cerrar el modal
  const handleSubmitCliente = async (cli) => {
    if (!cli?.id) return;
    if (!validarCabeceraVentasMasivas()) return;

    const item = buildVentaItemByCliente(cli);

    if (!item) {
      return showWarnSwal({
        title: 'Sin productos',
        text: `No cargaste cantidades para ${cli.nombre || 'este cliente'}.`
      });
    }

    const vendedorIdNum = Number(vendedorId);

    const payload = {
      fecha: `${fecha}T00:00:00`,
      tipo: tipoVenta,
      vendedor_id: vendedorIdNum,
      reparto_id: repartoId,
      observaciones: null,
      items: [item] // 1 sola venta
    };

    try {
      setSavingByCliente((prev) => ({ ...prev, [cli.id]: true }));

      const resp = await createVentasRepartoMasiva(payload);

      setSavedByCliente((prev) => ({ ...prev, [cli.id]: true }));

      await showSuccessSwal({
        title: 'Venta cargada',
        text:
          resp?.mensaje ||
          `La venta de ${cli.nombre || 'cliente'} se cargó exitosamente.`
      });

      onCreated?.(resp);
      // NO cerrar modal por pedido del cliente
      // onClose?.();
    } catch (err) {
      console.error(`Error creando venta individual (cliente ${cli.id}):`, err);
      const { mensajeError, tips } = err || {};

      await showErrorSwal({
        title: 'No se pudo cargar la venta',
        text:
          mensajeError ||
          `Ocurrió un error al guardar la venta de ${cli.nombre || 'cliente'}.`,
        tips
      });
    } finally {
      setSavingByCliente((prev) => ({ ...prev, [cli.id]: false }));
    }
  };

  // Construir payload y enviar
  const handleSubmit = async (e) => {
    e?.preventDefault?.();

    if (!validarCabeceraVentasMasivas()) return;

    const vendedorIdNum = Number(vendedorId);

    //  - 24/02/2026 - En el submit global se envían SOLO ventas pendientes (clientes no cargados con OK individual)
    const items = [];
    for (const cli of clientesVisibles || []) {
      if (savedByCliente?.[cli.id]) continue; // ya cargado, no reenviar

      const item = buildVentaItemByCliente(cli);
      if (item) items.push(item);
    }

    if (!items.length) {
      return showWarnSwal({
        title: 'Sin ventas pendientes',
        text: 'Todos los clientes visibles ya fueron cargados o no tienen productos con cantidad.'
      });
    }

    const payload = {
      fecha: `${fecha}T00:00:00`,
      tipo: tipoVenta, // contado | fiado | a_cuenta (para este caso, "fiado")
      vendedor_id: vendedorIdNum,
      reparto_id: repartoId,
      observaciones: null,
      items
    };

    console.log(
      '[REPARTO-MASIVA] Payload enviado:',
      JSON.stringify(payload, null, 2)
    );

    try {
      setSaving(true);
      const resp = await createVentasRepartoMasiva(payload);

      //  - 24/02/2026 - Marca como cargados los clientes incluidos en el submit global
      setSavedByCliente((prev) => {
        const next = { ...prev };
        for (const it of items) {
          next[it.cliente_id] = true;
        }
        return next;
      });

      await showSuccessSwal({
        title: 'Ventas creadas',
        text:
          resp?.mensaje ||
          `Se generaron las ventas para ${items.length} cliente(s) del reparto.`
      });

      onCreated?.(resp);

      //  - 24/02/2026 - Se mantiene abierto el modal por pedido del cliente
      // onClose?.();
    } catch (err) {
      console.error('Error creando ventas por reparto:', err);
      const { mensajeError, tips } = err || {};
      await showErrorSwal({
        title: 'No se pudieron crear las ventas',
        text: mensajeError || 'Ocurrió un error al guardar las ventas.',
        tips
      });
    } finally {
      setSaving(false);
    }
  };

  //  - 25/02/2026 - Registra saldo previo de un cliente desde la venta masiva sin crear productos/ventas nuevas.
  const handleSubmitSaldoPrevioCliente = async (cli) => {
    try {
      if (!repartoSelected?.id) {
        return showWarnSwal({
          title: 'Falta reparto',
          text: 'Seleccioná un reparto para continuar.'
        });
      }

      const vendedorIdNum = Number(vendedorId);
      if (!Number.isFinite(vendedorIdNum) || vendedorIdNum <= 0) {
        return showWarnSwal({
          title: 'Vendedor requerido',
          text: 'Seleccioná un vendedor para registrar el saldo previo.'
        });
      }

      const montoSaldoPrevio = getSaldoPrevioClienteNum(cli.id);
      if (!montoSaldoPrevio) {
        return showWarnSwal({
          title: 'Saldo previo inválido',
          text: 'Ingresá un monto mayor a 0 para cargar la deuda previa.'
        });
      }

      setSavingSaldoPrevioByCliente((prev) => ({
        ...prev,
        [cli.id]: true
      }));

      const payload = {
        cliente_id: cli.id,
        fecha: `${fecha}T00:00:00`,
        monto: montoSaldoPrevio,
        vendedor_id: vendedorIdNum,
        reparto_id: repartoId ? Number(repartoId) : null,
        descripcion: `Saldo previo cargado desde venta masiva por reparto (${repartoSelected?.nombre || 'sin nombre'})`
      };

      console.log(
        '[REPARTO-MASIVA][SALDO-PREVIO] Payload enviado:',
        JSON.stringify(payload, null, 2)
      );

      const resp = await createSaldoPrevioCliente(payload);

      setSaldoPrevioCargadoByCliente((prev) => ({
        ...prev,
        [cli.id]: true
      }));

      await showSuccessSwal({
        title: 'Saldo previo cargado',
        text:
          resp?.mensaje ||
          `Se registró un saldo previo de ${formatArMoney(montoSaldoPrevio)} para ${cli.nombre}.`
      });

      // Si tu pantalla resumen depende de alguna recarga externa:
      onCreated?.(resp);
    } catch (err) {
      console.error('Error cargando saldo previo por cliente:', err);
      const { mensajeError, tips } = err || {};
      await showErrorSwal({
        title: 'No se pudo cargar el saldo previo',
        text:
          mensajeError || 'Ocurrió un error al registrar la deuda histórica.',
        tips
      });
    } finally {
      setSavingSaldoPrevioByCliente((prev) => ({
        ...prev,
        [cli.id]: false
      }));
    }
  };
  //  - 17/01/2026 - Helper: formato moneda AR (miles '.' y decimales ',')
  function formatArMoney(value, opts = {}) {
    const {
      currency = 'ARS',
      minimumFractionDigits = 2,
      maximumFractionDigits = 2,
      withSymbol = true
    } = opts;

    // Normaliza: number | string | null
    let n;
    if (typeof value === 'number') n = value;
    else if (typeof value === 'string') {
      // Permite "$ 1.234,56" o "1234,56" o "1234.56"
      const cleaned = value
        .trim()
        .replace(/\$/g, '')
        .replace(/\s/g, '')
        .replace(/\./g, '') // quita miles
        .replace(',', '.'); // decimal AR -> decimal JS
      n = Number(cleaned);
    } else {
      n = Number(value);
    }

    if (!Number.isFinite(n)) n = 0;

    const formatter = new Intl.NumberFormat('es-AR', {
      style: withSymbol ? 'currency' : 'decimal',
      currency,
      minimumFractionDigits,
      maximumFractionDigits
    });

    return formatter.format(n);
  }

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
            onClick={handleClose}
          />
          <motion.div
            variants={panelV}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="relative w-full max-w-[96vw] sm:max-w-7xl max-h-[92vh]
                       overflow-y-auto overscroll-contain rounded-3xl border border-slate-200
                       bg-white
                       shadow-2xl"
          >
            {/* Botón cerrar */}
            <button
              onClick={handleClose}
              disabled={saving}
              className="sticky top-2.5 ml-auto mr-2.5 z-50 inline-flex h-9 w-9 items-center justify-center rounded-xl
                         bg-slate-100 border border-slate-200 hover:bg-slate-200 transition disabled:opacity-40"
              aria-label="Cerrar"
            >
              <X className="h-5 w-5 text-slate-500" />
            </button>

            <div className="relative z-10 px-4 pb-5 pt-1 sm:px-6 sm:pb-6 md:px-8">
              {/* Header */}
              <motion.div
                variants={formContainerV}
                initial="hidden"
                animate="visible"
                className="mb-5 sm:mb-6"
              >
                <motion.h3
                  variants={fieldV}
                  className="text-xl titulo uppercase mb-2 sm:text-2xl md:text-3xl font-bold tracking-tight text-slate-900 flex flex-wrap items-center gap-2"
                >
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-teal-50 border border-teal-200">
                    <ShoppingCart className="h-5 w-5 text-teal-600" />
                  </span>
                  Nueva venta por reparto
                  {repartoSelected?.nombre && (
                    <span className="text-teal-600 truncate">
                      “{repartoSelected.nombre}”
                    </span>
                  )}
                </motion.h3>

                {/* Info superior */}
                <motion.div
                  variants={fieldV}
                  className="grid w-full items-start
             gap-3 sm:gap-4 lg:gap-5
             sm:grid-cols-2 lg:grid-cols-12
             text-xs sm:text-sm text-slate-600
             px-1 sm:px-2 lg:px-3"
                >
                  {/* Reparto select */}
                  <div className="flex flex-col gap-1 min-w-0 lg:col-span-4">
                    <span className="uppercase text-[10px] tracking-widest text-slate-600">
                      Reparto
                    </span>

                    <div className="flex items-center gap-2 min-w-0">
                      <Truck className="h-4 w-4 text-slate-600 shrink-0" />

                      <select
                        value={repartoId}
                        onChange={(e) => setRepartoId(e.target.value)}
                        className="flex-1 min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs sm:text-sm text-slate-800
                 focus:outline-none focus:ring-2 focus:ring-teal-400/60"
                      >
                        <option value="">Seleccionar reparto…</option>

                        {repartos.map((r) => {
                          const c = r?.ciudad_nombre || r?.ciudad?.nombre;
                          const min = r?.rango_min;
                          const max = r?.rango_max;
                          const rango =
                            min != null && max != null
                              ? ` • ${min}–${max}`
                              : '';

                          return (
                            <option
                              key={r.id}
                              value={r.id}
                              className="text-black"
                            >
                              {r.nombre}
                              {c ? ` (${c})` : ''}
                              {rango}
                            </option>
                          );
                        })}
                      </select>
                    </div>

                    {/* Resumen contextual */}
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500">
                      <span>Ciudad: {ciudadNombreSafe}</span>

                      {rangoText && (
                        <>
                          <span className="opacity-40">•</span>
                          <span>
                            Rango:{' '}
                            <span className="text-slate-800 font-semibold">
                              {rangoText}
                            </span>
                          </span>
                        </>
                      )}

                      {capacidad != null && (
                        <>
                          <span className="opacity-40">•</span>
                          <span>
                            Capacidad:{' '}
                            <span className="text-slate-800 font-semibold">
                              {capacidad}
                            </span>
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Fecha */}
                  <div className="flex flex-col gap-1 min-w-0 lg:col-span-3">
                    <span className="uppercase text-[10px] tracking-widest text-slate-600">
                      Fecha de venta
                    </span>
                    <div className="flex items-center gap-2 min-w-0">
                      <CalendarDays className="h-4 w-4 text-slate-600 shrink-0" />
                      <input
                        type="date"
                        value={fecha}
                        onChange={(e) => setFecha(e.target.value)}
                        className="flex-1 min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs sm:text-sm text-slate-800
                   focus:outline-none focus:ring-2 focus:ring-teal-400/60"
                      />
                    </div>
                  </div>

                  {/* Tipo de venta */}
                  {/* <div className="flex flex-col gap-1">
    <span className="uppercase text-[10px] tracking-widest text-slate-600">
      Tipo de venta
    </span>
    <div className="inline-flex rounded-full bg-slate-950/70 border border-teal-500/40 p-1">
      {[
        { value: 'contado', label: 'Contado' },
        { value: 'fiado', label: 'Fiado' },
        { value: 'a_cuenta', label: 'A cuenta' }
      ].map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => setTipoVenta(opt.value)}
          className={`px-3 py-1 text-[11px] rounded-full transition
            ${
              tipoVenta === opt.value
                ? 'bg-teal-600 text-white shadow-sm'
                : 'text-teal-100'
            }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
    <span className="text-[11px] text-teal-100/75">
      Seleccionado: {tipoVentaLabel}
    </span>
  </div> */}

                  {/* Tipo de venta */}
                  <div className="flex flex-col gap-1 min-w-0 lg:col-span-2 lg:justify-self-center">
                    <span className="uppercase text-[10px] tracking-widest text-slate-600">
                      Tipo de venta
                    </span>

                    {/* Solo 1 opción: mostrar como badge fijo por pedido de Sale */}
                    <div className="inline-flex items-center gap-2">
                      <span className="inline-flex items-center rounded-full bg-teal-50 border border-teal-200 px-3 py-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-teal-500" />
                        <span className="ml-2 text-[11px] font-semibold text-teal-700">
                          Fiado
                        </span>
                      </span>
                    </div>

                    <span className="text-[11px] text-slate-600">
                      Seleccionado: {tipoVentaLabel}
                    </span>
                  </div>

                  {/* Vendedor + total  */}
                  <div className="flex flex-col gap-1 min-w-0 lg:col-span-3">
                    <span className="uppercase text-[10px] tracking-widest text-slate-600">
                      Vendedor / Total estimado
                    </span>
                    <div className="flex items-center gap-2 mb-1 min-w-0">
                      <select
                        value={vendedorId}
                        onChange={(e) => setVendedorId(e.target.value)}
                        className="flex-1 min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs sm:text-sm text-slate-800
                   focus:outline-none focus:ring-2 focus:ring-teal-400/60"
                      >
                        <option value="">Seleccionar vendedor…</option>
                        {vendedores.map((v) => (
                          <option
                            key={v.id}
                            value={v.id}
                            className="text-black"
                          >
                            {v.nombre || v.name || v.email}
                          </option>
                        ))}
                      </select>
                      {loadingVendedores && (
                        <div className="h-5 w-5 rounded-full border-2 border-teal-500 border-t-transparent animate-spin" />
                      )}
                    </div>
                    <div className="flex items-center justify-between gap-2 min-w-0">
                      <span className="text-[11px] text-slate-500 truncate">
                        Vendedor:{' '}
                        <span className="font-medium">{vendedorNombreUI}</span>
                      </span>
                    </div>
                    {/* <div className="inline-flex items-center gap-1 rounded-xl bg-emerald-500/15 border border-emerald-400/60 px-2.5 py-1 shrink-0">
                      <BadgeDollarSign className="h-4 w-4 text-emerald-300" />
                      <span className="text-xs font-semibold text-emerald-100">
                        {formatArMoney(totalGeneral)}
                      </span>
                    </div> */}
                  </div>
                </motion.div>

                {/*  - 17/01/2026 - Buscador de clientes (reemplaza Observaciones generales) */}
                <motion.div variants={fieldV} className="mt-3">
                  <label className="block text-xs sm:text-sm font-medium text-slate-600 mb-1.5">
                    Buscar cliente (por nombre o rango)
                  </label>

                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-600" />

                    <input
                      value={clienteSearch}
                      onChange={(e) => setClienteSearch(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-10 py-2 text-xs sm:text-sm text-slate-800
                                 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-400/60"
                      placeholder="Ej: 12 o Nombre…"
                    />

                    {!!clienteSearch?.trim() && (
                      <button
                        type="button"
                        onClick={() => {
                          setClienteSearch('');
                          setClienteSelectedId(null);
                        }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex h-7 w-7 items-center justify-center rounded-lg
                                   border border-slate-200 bg-slate-100 hover:bg-slate-200 transition"
                        title="Limpiar búsqueda"
                      >
                        <X className="h-4 w-4 text-slate-500" />
                      </button>
                    )}
                  </div>

                  <div className="mt-1.5 flex items-center justify-between gap-2 text-[11px] text-slate-600">
                    <span className="truncate">
                      Tip: escribí el número de rango (ej: 12) o parte del
                      nombre.
                    </span>
                    {!!clienteSearch?.trim() && (
                      <span className="shrink-0">
                        Mostrando {clientesUI.length} de{' '}
                        {clientesVisibles.length}
                      </span>
                    )}
                  </div>
                </motion.div>
              </motion.div>

              {/* Layout principal: clientes + productos */}
              <form onSubmit={handleSubmit}>
                {' '}
                <div className="grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1.7fr)]">
                  {/* Columna izquierda: clientes */}
                  <motion.div
                    variants={formContainerV}
                    initial="hidden"
                    animate="visible"
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-3 sm:p-4 flex flex-col"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <div className="text-xs uppercase tracking-widest text-slate-600">
                          Clientes del reparto
                        </div>
                        <div className="text-sm text-slate-600">
                          {!clienteSearch?.trim() ? (
                            <>{clientesVisibles.length} cliente(s)</>
                          ) : (
                            <>
                              Mostrando {clientesUI.length} de{' '}
                              {clientesVisibles.length}
                            </>
                          )}
                        </div>
                      </div>
                      {loadingClientes && (
                        <div className="h-6 w-6 rounded-full border-2 border-teal-500 border-t-transparent animate-spin" />
                      )}
                    </div>

                    <div className="flex-1 min-h-[180px] max-h-[340px] overflow-y-auto space-y-2 pr-1">
                      {!clientesUI.length && !loadingClientes ? (
                        <div className="text-xs text-slate-600 italic">
                          {clienteSearch?.trim()
                            ? 'No se encontraron clientes con ese criterio.'
                            : 'Este reparto no tiene clientes seleccionados para esta vuelta.'}
                        </div>
                      ) : (
                        clientesUI.map((cli) => (
                          <div
                            key={cli.id}
                            onClick={() => handleSelectCliente(cli.id)}
                            className={`rounded-xl border bg-white px-3 py-2 text-xs text-slate-700 flex flex-col gap-1.5 cursor-pointer transition
	                              ${
                                  Number(clienteSelectedId) === Number(cli.id)
                                    ? 'border-teal-400 ring-2 ring-teal-200'
                                    : 'border-slate-200 hover:border-teal-300'
                                }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="min-w-0">
                                <div className="font-semibold truncate">
                                  {cli.nombre}
                                </div>
                                <div className="text-[11px] text-teal-100/70 truncate">
                                  {cli.documento && `DNI: ${cli.documento} · `}
                                  {cli.barrio?.nombre || '—'}
                                  {cli.rango != null &&
                                    ` · Rango: ${cli.rango}`}
                                </div>
                              </div>

                              {/* Botón quitar cliente SOLO para esta vuelta */}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOcultarCliente(cli.id);
                                }}
                                className="inline-flex h-7 w-7 items-center justify-center rounded-lg
                       border border-rose-200 bg-transparent hover:bg-rose-50
                       text-rose-500 transition"
                                title="Quitar de esta vuelta"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>

                            <div className="text-[11px] text-slate-500">
                              Subtotal:{' '}
                              <span className="font-semibold text-emerald-600">
                                {formatArMoney(subtotalesPorCliente[cli.id])}
                              </span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </motion.div>

                  {/* Columna derecha: matriz productos x clientes */}
                  <motion.div
                    variants={formContainerV}
                    initial="hidden"
                    animate="visible"
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-3 sm:p-4 flex flex-col"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <div className="text-xs uppercase tracking-widest text-slate-600">
                          Productos y cantidades
                        </div>
                        <div className="text-[11px] text-slate-500">
                          Cargá las cantidades para cada cliente y producto.
                        </div>
                      </div>
                      {loadingProductos && (
                        <div className="h-6 w-6 rounded-full border-2 border-teal-500 border-t-transparent animate-spin" />
                      )}
                    </div>

                    <div className="flex-1 min-h-[220px] max-h-[380px] overflow-y-auto rounded-xl border border-slate-200 bg-white px-2 py-2">
                      {(!productos.length || !clientesUI.length) &&
                      !loadingProductos ? (
                        <div className="py-10 text-center text-xs text-slate-600">
                          {clienteSearch?.trim()
                            ? 'No hay clientes que coincidan con la búsqueda.'
                            : 'Necesitás al menos un cliente visible con productos activos para cargar ventas.'}
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {clientesUI.map((cli) => {
                            const subtotalCli =
                              subtotalesPorCliente[cli.id] ?? 0;
                            const aCuentaCli = Number(
                              aCuentaPorCliente[cli.id] ?? 0
                            );
                            const saldoCli = Math.max(
                              0,
                              subtotalCli - aCuentaCli
                            );

                            return (
                              <div
                                key={cli.id}
                                ref={setClienteCardRef(cli.id)}
                                className={`rounded-xl border bg-slate-50 px-3 py-2 transition
	                                  ${
                                      Number(clienteSelectedId) ===
                                      Number(cli.id)
                                        ? 'border-teal-400 ring-2 ring-teal-200'
                                        : 'border-slate-200'
                                    }`}
                              >
                                {/* Cabecera cliente + montos */}
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
                                  <div className="min-w-0">
                                    <span className="text-xs sm:text-sm font-semibold text-slate-800 truncate block">
                                      {cli.nombre}
                                    </span>
                                    <span className="text-[11px] text-slate-500 block">
                                      Subtotal mercadería:{' '}
                                      <span className="font-semibold text-emerald-600">
                                        {formatArMoney(subtotalCli)}
                                      </span>
                                    </span>
                                  </div>

                                  {/*  - 24/02/2026 - Acciones por venta individual (cliente) con OK sin cerrar modal */}
                                  <div className="flex flex-wrap items-center justify-end gap-2">
                                    {/* Campo A cuenta + Saldo previo (debajo, mismo lugar) */}
                                    <div className="flex flex-col items-start gap-1.5">
                                      {/* Fila A cuenta */}
                                      <div className="flex items-center gap-1.5">
                                        <span className="text-[11px] text-slate-500 min-w-[62px]">
                                          A cuenta:
                                        </span>
                                        <input
                                          ref={setACuentaInputRef(cli.id)}
                                          type="number"
                                          onWheel={blockWheelChange}
                                          min="0"
                                          step="0.01"
                                          value={aCuentaCli || ''}
                                          onFocus={() =>
                                            setClienteSelectedId(Number(cli.id))
                                          }
                                          onChange={(e) =>
                                            handleACuentaChange(
                                              cli.id,
                                              e.target.value
                                            )
                                          }
                                          className="w-24 rounded-lg border border-teal-300 bg-white px-2 py-1 text-[11px] text-slate-800
                 focus:outline-none focus:ring-1 focus:ring-teal-400/80"
                                          placeholder="0.00"
                                        />
                                        {/* Botón OK por cliente */}
                                        <button
                                          type="button"
                                          onClick={() =>
                                            handleSubmitCliente(cli)
                                          }
                                          disabled={
                                            !!savingByCliente?.[cli.id] ||
                                            !!savedByCliente?.[cli.id] ||
                                            !repartoSelected?.id ||
                                            !Number.isFinite(
                                              Number(vendedorId)
                                            ) ||
                                            Number(vendedorId) <= 0 ||
                                            !buildVentaItemByCliente(cli)
                                          }
                                          className="inline-flex items-center justify-center rounded-lg px-3 py-1.5 text-[11px] font-semibold transition
             border border-teal-300 bg-teal-50 text-teal-700
             hover:bg-teal-100 hover:border-teal-400
             disabled:opacity-50 disabled:cursor-not-allowed"
                                          title={
                                            savedByCliente?.[cli.id]
                                              ? 'Esta venta ya fue cargada'
                                              : 'Guardar solo esta venta'
                                          }
                                        >
                                          {savingByCliente?.[cli.id]
                                            ? 'Guardando…'
                                            : savedByCliente?.[cli.id]
                                              ? 'Cargada'
                                              : 'OK'}
                                        </button>
                                      </div>

                                      {/* Fila Saldo previo (justo debajo de A cuenta) */}
                                      <div className="flex items-center gap-1.5 flex-wrap">
                                        <span className="text-[11px] text-amber-700 min-w-[62px]">
                                          Saldo Previo:
                                        </span>

                                        <input
                                          type="number"
                                          onWheel={blockWheelChange}
                                          min="0"
                                          step="0.01"
                                          value={
                                            saldoPrevioPorCliente?.[cli.id] ??
                                            ''
                                          }
                                          onFocus={() =>
                                            setClienteSelectedId(Number(cli.id))
                                          }
                                          onChange={(e) => {
                                            // Bloqueado luego de cargar para evitar doble registro accidental
                                            if (
                                              saldoPrevioCargadoByCliente?.[
                                                cli.id
                                              ]
                                            )
                                              return;
                                            handleSaldoPrevioChange(
                                              cli.id,
                                              e.target.value
                                            );
                                          }}
                                          disabled={
                                            !!saldoPrevioCargadoByCliente?.[
                                              cli.id
                                            ] ||
                                            !!savingSaldoPrevioByCliente?.[
                                              cli.id
                                            ]
                                          }
                                          className="w-24 rounded-lg border border-amber-200 bg-amber-50 px-2 py-1 text-[11px] text-slate-800
                 focus:outline-none focus:ring-1 focus:ring-amber-400/80
                 disabled:opacity-60 disabled:cursor-not-allowed"
                                          placeholder="0.00"
                                        />

                                        {/* OK de saldo previo */}
                                        <button
                                          type="button"
                                          onClick={() =>
                                            handleSubmitSaldoPrevioCliente(cli)
                                          }
                                          disabled={
                                            !!savingSaldoPrevioByCliente?.[
                                              cli.id
                                            ] ||
                                            !!saldoPrevioCargadoByCliente?.[
                                              cli.id
                                            ] || // <- bloqueo al cargar
                                            !repartoSelected?.id ||
                                            !Number.isFinite(
                                              Number(vendedorId)
                                            ) ||
                                            Number(vendedorId) <= 0 ||
                                            !getSaldoPrevioClienteNum(cli.id)
                                          }
                                          className="inline-flex items-center justify-center rounded-lg px-3 py-1.5 text-[11px] font-semibold transition
                 border border-amber-300 bg-amber-100 text-amber-700
                 hover:bg-amber-200 hover:border-amber-400
                 disabled:opacity-50 disabled:cursor-not-allowed"
                                          title={
                                            saldoPrevioCargadoByCliente?.[
                                              cli.id
                                            ]
                                              ? 'Saldo previo ya cargado'
                                              : 'Registrar saldo previo'
                                          }
                                        >
                                          {savingSaldoPrevioByCliente?.[cli.id]
                                            ? 'Guardando…'
                                            : saldoPrevioCargadoByCliente?.[
                                                  cli.id
                                                ]
                                              ? 'Cargada'
                                              : 'OK'}
                                        </button>

                                        {!!saldoPrevioCargadoByCliente?.[
                                          cli.id
                                        ] && (
                                          <span className="text-[11px] font-semibold text-emerald-600">
                                            Cargada
                                          </span>
                                        )}
                                      </div>
                                    </div>

                                    {/* Estado visual */}
                                    {!!savedByCliente?.[cli.id] &&
                                      !savingByCliente?.[cli.id] && (
                                        <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-[10px] font-semibold text-emerald-700">
                                          Cargada
                                        </span>
                                      )}
                                  </div>
                                </div>

                                {/* Saldo fiado (subtotal - a cuenta) */}
                                <div className="text-[11px] text-emerald-600 mb-2">
                                  Saldo fiado:{' '}
                                  <span className="font-semibold">
                                    {formatArMoney(saldoCli)}
                                  </span>
                                </div>

                                {/* Grid de productos */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                  {productos.map((prod) => {
                                    const key = `${cli.id}-${prod.id}`;
                                    const value = cantidades[key] ?? '';
                                    const precio = getPrecioVenta(prod);
                                    return (
                                      <div
                                        key={prod.id}
                                        className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 flex flex-col gap-1.5"
                                      >
                                        <div className="text-[11px] font-medium text-slate-800 truncate">
                                          {prod.nombre}
                                        </div>
                                        <div className="text-[11px] text-slate-500">
                                          {formatArMoney(precio)} c/u
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                          <span className="text-[11px] text-slate-500">
                                            Cant:
                                          </span>
                                          <input
                                            type="number"
                                            onWheel={blockWheelChange}
                                            min="0"
                                            step="1"
                                            value={value}
                                            onChange={(e) =>
                                              handleCantidadChange(
                                                cli.id,
                                                prod.id,
                                                e.target.value
                                              )
                                            }
                                            className="w-20 rounded-lg border border-teal-300 bg-white px-2 py-1 text-[11px] text-slate-800
                             focus:outline-none focus:ring-1 focus:ring-cyan-400/70"
                                          />
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Footer mini + botón guardar */}
                    <div className="mt-3 flex flex-col sm:flex-row items-center justify-between gap-2">
                      <div className="text-xs text-slate-500">
                        Total general (saldo fiado):{' '}
                        <span className="font-semibold text-emerald-600">
                          {formatArMoney(totalGeneralConACuenta)}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={handleClose}
                          disabled={saving}
                          className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition disabled:opacity-50"
                        >
                          Cancelar
                        </button>
                        <button
                          type="submit"
                          disabled={saving}
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl
                                     bg-teal-600 hover:bg-teal-700 text-white text-[13px] font-semibold
                                     hover:brightness-110 disabled:opacity-60 disabled:cursor-not-allowed transition"
                        >
                          {saving
                            ? 'Guardando…'
                            : 'Crear ventas pendientes'}{' '}
                        </button>
                      </div>
                    </div>
                  </motion.div>
                </div>
                {/*  - 24/02/2026 - Ayuda visual para flujo mixto (OK por cliente + submit global opcional) */}
                <div className="text-[11px] text-slate-600">
                  Podés guardar cada venta con el botón OK de cada cliente sin
                  cerrar esta ventana.
                </div>
                <div className="mt-4 h-[3px] w-full rounded-full bg-gradient-to-r from-teal-400/60 via-cyan-300/70 to-teal-400/60 opacity-70" />
              </form>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
