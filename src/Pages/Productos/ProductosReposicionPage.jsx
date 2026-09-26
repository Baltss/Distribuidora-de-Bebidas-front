// src/Pages/Productos/ProductosReposicionPage.jsx
// Listado de reposición: productos por debajo de su stock mínimo (o según
// filtros). Se arma un pedido (productos + cantidad) que se conserva entre
// filtros y visitas, con total estimado; se exporta a Excel/PDF, se guarda
// en el sistema como pedido pendiente o se pasa directo a una compra.
// Pestaña "Pedidos guardados": pendientes → pasar a compra / editar / anular.
import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Search,
  ArrowLeft,
  FileSpreadsheet,
  FileText,
  PackageSearch,
  ShoppingCart,
  Trash2,
  ListChecks,
  Save,
  Pencil
} from 'lucide-react';
import AppShell from '../../Components/Layout/AppShell';
import useDebouncedValue from '../../hooks/useDebouncedValue';
import {
  listProductosReposicion,
  exportReposicionXlsx,
  exportReposicionPdf
} from '../../api/productos.js';
import { listCategorias } from '../../api/categorias.js';
import { listProveedores } from '../../api/proveedores.js';
import { showErrorSwal, showConfirmSwal, showSuccessSwal, baseSwal } from '../../ui/swal';
import moneyAR from '../../utils/money';
import { blockWheelChange } from '../../utils/numberInput';
import {
  leerBorrador,
  guardarBorrador,
  leerEdicion,
  guardarEdicion,
  agruparPorProveedor
} from '../../utils/pedidoReposicionBorrador';
import {
  listPedidosReposicion,
  createPedidoReposicion,
  updatePedidoReposicion
} from '../../api/pedidosReposicion.js';
import GuardarPedidoModal from '../../Components/Reposicion/GuardarPedidoModal';
import PedidosGuardadosPanel from '../../Components/Reposicion/PedidosGuardadosPanel';

const inputCls =
  'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-400/40 focus:border-transparent';

const stockColor = (actual, minimo) => {
  if (minimo == null) return 'text-slate-700';
  if (actual <= 0) return 'text-rose-600';
  if (actual <= minimo) return 'text-amber-600';
  return 'text-slate-700';
};

const presentacionLabel = (p) =>
  p.presentacion === 'pack' ? `Pack x${p.pack_cantidad}` : 'Unidad';

// Cantidad sugerida al tildar: lo que falta para llegar al mínimo (al menos 1)
const cantidadSugerida = (p) =>
  p.stock_minimo != null ? Math.max(p.stock_minimo - p.stock_actual, 1) : 1;

const cantidadValida = (c) => Number.isInteger(Number(c)) && Number(c) > 0;

export default function ProductosReposicionPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get('tab') === 'pedidos' ? 'pedidos' : 'armar';
  const setTab = (t) =>
    setSearchParams(t === 'pedidos' ? { tab: 'pedidos' } : {}, {
      replace: true
    });

  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categorias, setCategorias] = useState([]);
  const [proveedores, setProveedores] = useState([]);

  const [q, setQ] = useState('');
  const dq = useDebouncedValue(q, 400);
  const [categoriaId, setCategoriaId] = useState('');
  const [proveedorId, setProveedorId] = useState('');
  const [stockMax, setStockMax] = useState('');
  const dStockMax = useDebouncedValue(stockMax, 400);
  const [soloBajoMinimo, setSoloBajoMinimo] = useState(true);

  // Pedido en armado: { [id]: { producto, cantidad } }. No depende de los filtros.
  const [pedido, setPedido] = useState(() => leerBorrador());
  const [verPedido, setVerPedido] = useState(false);
  const [exportando, setExportando] = useState(null); // 'xlsx' | 'pdf' | null

  // Pedido guardado que se está editando: { id, proveedor_id, observaciones } | null
  const [edicion, setEdicion] = useState(() => leerEdicion());
  const [guardarOpen, setGuardarOpen] = useState(false);
  const [pendientes, setPendientes] = useState(null);
  const [recargarPedidos, setRecargarPedidos] = useState(0);

  useEffect(() => {
    guardarBorrador(pedido);
  }, [pedido]);

  useEffect(() => {
    guardarEdicion(edicion);
  }, [edicion]);

  // Contador de la pestaña "Pedidos guardados"
  useEffect(() => {
    listPedidosReposicion({ estado: 'pendiente' })
      .then((r) => setPendientes(r?.pendientes ?? 0))
      .catch(() => setPendientes(null));
  }, []);

  useEffect(() => {
    listCategorias({ estado: 'activo' })
      .then((resp) => setCategorias(resp?.data || []))
      .catch(() => setCategorias([]));
    listProveedores({ estado: 'activo', limit: 200 })
      .then((resp) => setProveedores(resp?.data || []))
      .catch(() => setProveedores([]));
  }, []);

  const pedidoIds = useMemo(() => Object.keys(pedido).join(','), [pedido]);
  const cantPedido = Object.keys(pedido).length;

  // Si se vacía el pedido mientras se lo está viendo, volvemos al listado
  useEffect(() => {
    if (verPedido && cantPedido === 0) setVerPedido(false);
  }, [verPedido, cantPedido]);

  const filtros = useMemo(
    () => ({
      categoria_id: categoriaId || undefined,
      proveedor_id: proveedorId || undefined,
      q: dq.trim() || undefined,
      stock_max: dStockMax !== '' ? dStockMax : undefined,
      solo_bajo_minimo: soloBajoMinimo ? 1 : undefined
    }),
    [categoriaId, proveedorId, dq, dStockMax, soloBajoMinimo]
  );

  // "Ver pedido" trae datos frescos (stock actual) sólo de lo elegido.
  // Mientras se ve el pedido, la lista sólo se recarga al entrar (no al
  // editar cantidades) para no refrescar la tabla en cada tecla.
  const consulta = useMemo(
    () => (verPedido ? { ids: pedidoIds } : filtros),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [verPedido, filtros]
  );

  useEffect(() => {
    if (verPedido && !consulta.ids) return;
    let alive = true;
    setLoading(true);
    listProductosReposicion(consulta)
      .then((resp) => {
        if (!alive) return;
        const lista = resp?.productos || [];
        setProductos(lista);
        // Refresca los datos (stock, costo, proveedor) de lo que ya está en el pedido
        setPedido((prev) => {
          let cambio = false;
          const next = { ...prev };
          for (const p of lista) {
            if (next[p.id]) {
              next[p.id] = { ...next[p.id], producto: p };
              cambio = true;
            }
          }
          return cambio ? next : prev;
        });
      })
      .catch((err) => {
        if (!alive) return;
        setProductos([]);
        showErrorSwal({
          title: 'No se pudo cargar el listado',
          text: err?.mensajeError || 'Ocurrió un error inesperado'
        });
      })
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [consulta, verPedido]);

  const enPedido = (id) => !!pedido[id];

  const agregar = (p, cantidad = cantidadSugerida(p)) =>
    setPedido((prev) => ({ ...prev, [p.id]: { producto: p, cantidad } }));

  const quitar = (id) =>
    setPedido((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });

  const toggleUno = (p) => (enPedido(p.id) ? quitar(p.id) : agregar(p));

  const todosEnPedido = productos.length > 0 && productos.every((p) => enPedido(p.id));

  const toggleTodos = () =>
    setPedido((prev) => {
      const next = { ...prev };
      if (todosEnPedido) productos.forEach((p) => delete next[p.id]);
      else
        productos.forEach((p) => {
          if (!next[p.id]) next[p.id] = { producto: p, cantidad: cantidadSugerida(p) };
        });
      return next;
    });

  // Escribir una cantidad tilda el producto; vacío/0 se limpia al salir del campo
  const onCantidad = (p, valor) =>
    setPedido((prev) => ({
      ...prev,
      [p.id]: { producto: prev[p.id]?.producto || p, cantidad: valor }
    }));

  const onCantidadBlur = (id) => {
    const item = pedido[id];
    if (item && !cantidadValida(item.cantidad)) quitar(id);
  };

  const vaciarPedido = async () => {
    const ok = await showConfirmSwal({
      title: 'Vaciar pedido',
      text: `¿Quitar los ${cantPedido} productos del pedido?`,
      confirmText: 'Sí, vaciar'
    });
    if (ok) {
      setPedido({});
      setEdicion(null);
    }
  };

  const itemsPedido = useMemo(
    () => Object.values(pedido).filter((it) => cantidadValida(it.cantidad)),
    [pedido]
  );

  const resumen = useMemo(() => {
    let unidades = 0;
    let total = 0;
    let sinCosto = 0;
    for (const it of itemsPedido) {
      const cant = Number(it.cantidad);
      unidades += cant;
      if (it.producto.ultimo_costo_compra != null) total += cant * it.producto.ultimo_costo_compra;
      else sinCosto += 1;
    }
    return { unidades, total, sinCosto };
  }, [itemsPedido]);

  // Con pedido armado se exporta el pedido (con cantidades); si no, lo que muestran los filtros.
  const onExport = async (tipo) => {
    const params = itemsPedido.length
      ? {
          items: itemsPedido.map((it) => `${it.producto.id}:${Number(it.cantidad)}`).join(',')
        }
      : filtros;
    setExportando(tipo);
    try {
      await (tipo === 'pdf' ? exportReposicionPdf(params) : exportReposicionXlsx(params));
    } catch (err) {
      await showErrorSwal({
        title: tipo === 'pdf' ? 'No se pudo exportar el PDF' : 'No se pudo exportar el Excel',
        text:
          err?.details?.status === 404
            ? 'No hay productos para exportar con esos filtros.'
            : err?.mensajeError || 'Ocurrió un error inesperado'
      });
    } finally {
      setExportando(null);
    }
  };

  // Pasa el pedido a una compra nueva (precargada). Si hay productos de varios
  // proveedores, se elige de cuál llegó la mercadería.
  const pasarACompra = async () => {
    if (!itemsPedido.length) return;

    const grupos = new Map(agruparPorProveedor(itemsPedido).map((g) => [g.key, g]));

    let proveedorElegido = null;
    let items = itemsPedido;

    if (grupos.size === 1) {
      const [key] = grupos.keys();
      proveedorElegido = key === 'sin' ? null : key;
    } else {
      const inputOptions = {};
      for (const [key, g] of grupos) {
        inputOptions[key] =
          `${g.nombre} (${g.items.length} producto${g.items.length === 1 ? '' : 's'})`;
      }
      inputOptions.todos = `Todo el pedido (${itemsPedido.length} productos)`;

      const { isConfirmed, value } = await baseSwal.fire({
        icon: 'question',
        title: '¿De qué proveedor llegó la mercadería?',
        text: `Tu pedido tiene productos de ${grupos.size} proveedores distintos. Los que no pases a la compra quedan en el pedido.`,
        input: 'select',
        inputOptions,
        inputValue: [...grupos.keys()].find((k) => k !== 'sin') ?? 'todos',
        showCancelButton: true,
        confirmButtonText: 'Continuar',
        cancelButtonText: 'Cancelar'
      });
      if (!isConfirmed) return;

      if (value !== 'todos') {
        const key = value === 'sin' ? 'sin' : Number(value);
        items = grupos.get(key)?.items || [];
        proveedorElegido = key === 'sin' ? null : key;
      }
    }

    navigate('/dashboard/compras', {
      state: {
        compraPrecargada: {
          origen: 'reposicion',
          proveedor_id: proveedorElegido,
          aviso:
            'Compra armada desde el listado de reposición. Revisá cantidades y costos con la factura antes de registrar.',
          items: items.map((it) => ({
            producto_id: it.producto.id,
            cantidad: Number(it.cantidad),
            costo_unit: it.producto.ultimo_costo_compra
          }))
        }
      }
    });
  };

  // Guarda el pedido en armado en el sistema (uno o varios, según proveedor)
  const onGuardarPedidos = async (payloads) => {
    try {
      if (edicion) {
        await updatePedidoReposicion(edicion.id, payloads[0]);
      } else {
        for (const payload of payloads) await createPedidoReposicion(payload);
      }
    } catch (err) {
      await showErrorSwal({
        title: 'No se pudo guardar el pedido',
        text: err?.mensajeError || 'Ocurrió un error inesperado'
      });
      return;
    }
    const eraEdicion = edicion;
    setGuardarOpen(false);
    setPedido({});
    setEdicion(null);
    setVerPedido(false);
    setRecargarPedidos((n) => n + 1);
    setTab('pedidos');
    await showSuccessSwal({
      title: eraEdicion
        ? `Pedido #${eraEdicion.id} actualizado`
        : payloads.length > 1
          ? `${payloads.length} pedidos guardados`
          : 'Pedido guardado',
      text: 'Cuando llegue la mercadería, tocá “Pasar a compra” en el pedido.'
    });
  };

  // "Editar" un pedido guardado: se carga en el armado
  const editarPedidoGuardado = async (det) => {
    if (cantPedido > 0 && edicion?.id !== det.id) {
      const ok = await showConfirmSwal({
        title: 'Reemplazar el pedido en armado',
        text: `Tenés ${cantPedido} producto${cantPedido === 1 ? '' : 's'} en armado sin guardar. ¿Reemplazarlos por el pedido #${det.id}?`,
        confirmText: 'Sí, reemplazar'
      });
      if (!ok) return;
    }
    const nuevo = {};
    for (const it of det.items) {
      if (it.producto?.inactivo) continue;
      nuevo[it.producto_id] = { producto: it.producto, cantidad: it.cantidad };
    }
    setPedido(nuevo);
    setEdicion({
      id: det.id,
      proveedor_id: det.proveedor_id,
      observaciones: det.observaciones || ''
    });
    setTab('armar');
    setVerPedido(Object.keys(nuevo).length > 0);
  };

  const cancelarEdicion = async () => {
    const ok = await showConfirmSwal({
      title: 'Cancelar edición',
      text: `Se descartan los cambios y el pedido #${edicion.id} queda como estaba.`,
      confirmText: 'Sí, cancelar'
    });
    if (!ok) return;
    setPedido({});
    setEdicion(null);
    setVerPedido(false);
  };

  // "Pasar a compra" de un pedido guardado: la compra queda vinculada al pedido
  const pasarPedidoGuardadoACompra = async (det) => {
    const activos = det.items.filter((it) => !it.producto?.inactivo);
    if (!activos.length) {
      await showErrorSwal({
        title: 'No se puede pasar a compra',
        text: 'Todos los productos de este pedido están desactivados.'
      });
      return;
    }
    if (activos.length < det.items.length) {
      const ok = await showConfirmSwal({
        title: 'Productos desactivados',
        text: `${det.items.length - activos.length} producto(s) del pedido están desactivados y no se cargan en la compra.`,
        confirmText: 'Continuar',
        icon: 'warning'
      });
      if (!ok) return;
    }
    navigate('/dashboard/compras', {
      state: {
        compraPrecargada: {
          origen: 'pedido',
          pedido_id: det.id,
          proveedor_id: det.proveedor_id,
          aviso: `Compra del pedido de reposición #${det.id}. Revisá cantidades y costos con la factura antes de registrar.`,
          items: activos.map((it) => ({
            producto_id: it.producto_id,
            cantidad: it.cantidad,
            // Último costo actual; si no hay, el estimado guardado en el pedido
            costo_unit: it.producto?.ultimo_costo_compra ?? it.costo_unit
          }))
        }
      }
    });
  };

  const hayFiltrosExtra = !!(q || categoriaId || proveedorId || stockMax !== '');

  return (
    <AppShell>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold uppercase tracking-tight text-slate-900 flex items-center gap-2.5">
              <PackageSearch className="h-7 w-7 text-blue-600 shrink-0" /> Listado de reposición
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Tildá lo que necesitás, ajustá la cantidad y guardá el pedido para pasarlo a una
              compra cuando llegue la mercadería.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              to="/dashboard/productos"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
            >
              <ArrowLeft className="h-4 w-4" /> Volver a Productos
            </Link>
            {tab === 'armar' && (
              <>
                <button
                  onClick={() => onExport('xlsx')}
                  disabled={
                    !!exportando || loading || (productos.length === 0 && !itemsPedido.length)
                  }
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50 transition disabled:opacity-60"
                >
                  <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                  {exportando === 'xlsx' ? 'Exportando…' : 'Exportar Excel'}
                </button>
                <button
                  onClick={() => onExport('pdf')}
                  disabled={
                    !!exportando || loading || (productos.length === 0 && !itemsPedido.length)
                  }
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-sm font-semibold text-white hover:bg-blue-700 transition disabled:opacity-60"
                >
                  <FileText className="h-4 w-4" />
                  {exportando === 'pdf' ? 'Generando PDF…' : 'Exportar PDF'}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Pestañas */}
        <div className="mb-5 inline-flex rounded-2xl border border-slate-200 bg-white p-1">
          <button
            onClick={() => setTab('armar')}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
              tab === 'armar' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            Armar pedido
          </button>
          <button
            onClick={() => setTab('pedidos')}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition inline-flex items-center gap-2 ${
              tab === 'pedidos' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            Pedidos guardados
            {pendientes > 0 && (
              <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-bold ${
                  tab === 'pedidos' ? 'bg-white text-slate-900' : 'bg-amber-100 text-amber-700'
                }`}
              >
                {pendientes}
              </span>
            )}
          </button>
        </div>

        {tab === 'pedidos' ? (
          <PedidosGuardadosPanel
            onEditar={editarPedidoGuardado}
            onPasarACompra={pasarPedidoGuardadoACompra}
            onCambio={setPendientes}
            recargar={recargarPedidos}
          />
        ) : (
          <>
            {/* Edición de un pedido guardado */}
            {edicion && (
              <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="text-sm text-amber-800 flex items-center gap-2">
                  <Pencil className="h-4 w-4 shrink-0" />
                  <span>
                    Estás editando el <strong>pedido #{edicion.id}</strong>. Agregá o quitá
                    productos y tocá “Guardar cambios”.
                  </span>
                </div>
                <button
                  onClick={cancelarEdicion}
                  className="self-start sm:self-auto px-3 py-1.5 rounded-lg border border-amber-300 bg-white text-xs font-semibold text-amber-800 hover:bg-amber-100"
                >
                  Cancelar edición
                </button>
              </div>
            )}

            {/* Filtros */}
            {!verPedido && (
              <div className="rounded-2xl border border-slate-200 bg-white p-4 mb-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="relative sm:col-span-2 lg:col-span-4 xl:col-span-2">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-600" />
                    <input
                      value={q}
                      onChange={(e) => setQ(e.target.value)}
                      placeholder="Buscar por nombre, SKU o código de barras…"
                      className={`${inputCls} pl-9`}
                    />
                  </div>
                  <select
                    value={proveedorId}
                    onChange={(e) => setProveedorId(e.target.value)}
                    className={inputCls}
                    title="Proveedor de la última compra de cada producto"
                  >
                    <option value="">Todos los proveedores</option>
                    {proveedores.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.razon_social}
                      </option>
                    ))}
                    <option value="sin">Sin compras registradas</option>
                  </select>
                  <select
                    value={categoriaId}
                    onChange={(e) => setCategoriaId(e.target.value)}
                    className={inputCls}
                  >
                    <option value="">Todas las categorías</option>
                    {categorias.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nombre}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min="0"
                    value={stockMax}
                    onChange={(e) => setStockMax(e.target.value)}
                    onWheel={blockWheelChange}
                    placeholder="Stock máximo (opcional)"
                    className={inputCls}
                  />
                </div>
                <label className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-slate-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={soloBajoMinimo}
                    onChange={(e) => setSoloBajoMinimo(e.target.checked)}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-400"
                  />
                  Sólo productos por debajo de su stock mínimo
                </label>
              </div>
            )}

            {/* Resultados */}
            <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
              <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-slate-100 bg-slate-50">
                {verPedido ? (
                  <span className="text-sm font-semibold text-slate-700">
                    Tu pedido ({cantPedido} producto
                    {cantPedido === 1 ? '' : 's'})
                  </span>
                ) : (
                  <label className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={todosEnPedido}
                      onChange={toggleTodos}
                      disabled={productos.length === 0}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-400"
                    />
                    Seleccionar todos
                  </label>
                )}
                <span className="text-sm text-slate-500 text-right">
                  {verPedido ? (
                    <button
                      onClick={() => setVerPedido(false)}
                      className="font-semibold text-blue-600 hover:underline"
                    >
                      Volver al listado
                    </button>
                  ) : (
                    `${productos.length} producto${productos.length === 1 ? '' : 's'}`
                  )}
                </span>
              </div>

              {loading ? (
                <div className="px-4 py-10 text-center text-slate-400">Cargando…</div>
              ) : productos.length === 0 ? (
                <div className="px-4 py-10 text-center text-slate-500">
                  {soloBajoMinimo && !hayFiltrosExtra
                    ? 'No hay productos por debajo de su stock mínimo.'
                    : 'No hay productos que coincidan con los filtros.'}
                  {soloBajoMinimo && (
                    <p className="mt-1 text-xs text-slate-400">
                      Sólo aparecen acá los productos que tienen cargado un stock mínimo.
                    </p>
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
                        <th className="pl-3 pr-1 sm:px-4 py-2 w-8 sm:w-10"></th>
                        <th className="px-2 sm:px-3 py-2">Producto</th>
                        <th className="px-3 py-2 hidden md:table-cell">Categoría</th>
                        <th className="px-3 py-2 hidden lg:table-cell">Proveedor</th>
                        <th className="px-2 sm:px-3 py-2 text-right whitespace-nowrap">
                          <span className="sm:hidden">Stock</span>
                          <span className="hidden sm:inline">Stock actual</span>
                        </th>
                        <th className="px-2 sm:px-3 py-2 text-right whitespace-nowrap">
                          <span className="sm:hidden">Mín.</span>
                          <span className="hidden sm:inline">Stock mínimo</span>
                        </th>
                        <th className="px-3 py-2 text-right whitespace-nowrap hidden sm:table-cell">
                          Último costo
                        </th>
                        <th className="pl-2 pr-3 sm:px-3 py-2 text-right whitespace-nowrap">
                          <span className="sm:hidden">Pedir</span>
                          <span className="hidden sm:inline">A pedir</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {productos.map((p) => {
                        const sel = enPedido(p.id);
                        return (
                          <tr
                            key={p.id}
                            onClick={() => toggleUno(p)}
                            className={`cursor-pointer ${sel ? 'bg-blue-50/60' : 'hover:bg-slate-50'}`}
                          >
                            <td className="pl-3 pr-1 sm:px-4 py-2">
                              <input
                                type="checkbox"
                                checked={sel}
                                onChange={() => toggleUno(p)}
                                onClick={(e) => e.stopPropagation()}
                                className="rounded border-slate-300 text-blue-600 focus:ring-blue-400"
                              />
                            </td>
                            <td className="px-2 sm:px-3 py-2 md:min-w-[180px]">
                              <div className="font-medium text-slate-800">{p.nombre}</div>
                              <div className="text-xs text-slate-400">{p.codigo_sku}</div>
                              <div className="text-xs text-slate-500 md:hidden">
                                {[p.categoria, presentacionLabel(p)].filter(Boolean).join(' · ')}
                              </div>
                              <div className="text-xs text-slate-500 lg:hidden">
                                {p.proveedor || 'Sin compras registradas'}
                              </div>
                            </td>
                            <td className="px-3 py-2 text-slate-600 hidden md:table-cell">
                              {p.categoria || '—'}
                              <div className="text-xs text-slate-400">{presentacionLabel(p)}</div>
                            </td>
                            <td className="px-3 py-2 text-slate-600 hidden lg:table-cell">
                              {p.proveedor || <span className="text-slate-400">Sin compras</span>}
                            </td>
                            <td
                              className={`px-2 sm:px-3 py-2 text-right font-semibold ${stockColor(p.stock_actual, p.stock_minimo)}`}
                            >
                              {p.stock_actual}
                            </td>
                            <td className="px-2 sm:px-3 py-2 text-right text-slate-500">
                              {p.stock_minimo ?? '—'}
                            </td>
                            <td className="px-3 py-2 text-right text-slate-500 whitespace-nowrap hidden sm:table-cell">
                              {p.ultimo_costo_compra != null ? moneyAR(p.ultimo_costo_compra) : '—'}
                            </td>
                            <td
                              className="pl-2 pr-3 sm:px-3 py-2 text-right"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <input
                                type="number"
                                min="1"
                                step="1"
                                inputMode="numeric"
                                value={pedido[p.id]?.cantidad ?? ''}
                                onChange={(e) => onCantidad(p, e.target.value)}
                                onBlur={() => onCantidadBlur(p.id)}
                                onWheel={blockWheelChange}
                                placeholder="—"
                                aria-label={`Cantidad a pedir de ${p.nombre}`}
                                className="w-14 sm:w-20 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-right text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-400/40"
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Barra del pedido: fija abajo de la pantalla (a la derecha del menú lateral
                en desktop). El espacio de abajo evita que tape las últimas filas. */}
            {cantPedido > 0 && <div className="h-44 sm:h-36 lg:h-28" aria-hidden="true" />}
            {cantPedido > 0 && (
              <div className="fixed inset-x-0 bottom-0 lg:left-64 z-30 px-3 sm:px-6 lg:px-8 pb-3 pt-2 pointer-events-none">
                <div className="pointer-events-auto max-w-7xl mx-auto rounded-2xl border border-blue-200 bg-white/95 backdrop-blur shadow-[0_-4px_24px_rgba(15,23,42,0.12)] px-4 py-3 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-2.5 sm:gap-3">
                  <div className="text-sm text-slate-700 min-w-0">
                    <span className="font-bold text-slate-900">
                      {itemsPedido.length} producto
                      {itemsPedido.length === 1 ? '' : 's'}
                    </span>
                    {' · '}
                    {resumen.unidades} unidad
                    {resumen.unidades === 1 ? '' : 'es'}
                    {' · '}
                    Total estimado{' '}
                    <span className="font-bold text-slate-900">{moneyAR(resumen.total)}</span>
                    {resumen.sinCosto > 0 && (
                      <span className="text-xs text-amber-600">
                        {' '}
                        ({resumen.sinCosto} sin costo cargado)
                      </span>
                    )}
                    <div className="hidden sm:block text-xs text-slate-400">
                      {edicion
                        ? `Cambios del pedido #${edicion.id} sin guardar.`
                        : 'Tocá “Guardar pedido” para dejarlo en el sistema y pasarlo a compra cuando llegue.'}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap lg:flex-nowrap lg:shrink-0">
                    <button
                      onClick={() => setVerPedido((v) => !v)}
                      className="inline-flex items-center justify-center gap-1.5 sm:gap-2 px-2 sm:px-3.5 py-2 whitespace-nowrap rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
                    >
                      <ListChecks className="h-4 w-4 shrink-0" /> {verPedido ? 'Ver listado' : 'Ver pedido'}
                    </button>
                    <button
                      onClick={vaciarPedido}
                      className="inline-flex items-center justify-center gap-1.5 sm:gap-2 px-2 sm:px-3.5 py-2 whitespace-nowrap rounded-xl border border-rose-200 bg-white text-sm font-semibold text-rose-600 hover:bg-rose-50 transition"
                    >
                      <Trash2 className="h-4 w-4 shrink-0" /> Vaciar
                    </button>
                    {!edicion && (
                      <button
                        onClick={pasarACompra}
                        disabled={!itemsPedido.length}
                        title="Si la mercadería ya llegó: cargar la compra ahora sin guardar el pedido"
                        className="inline-flex items-center justify-center gap-1.5 sm:gap-2 px-2 sm:px-3.5 py-2 whitespace-nowrap rounded-xl border border-emerald-600 bg-white text-sm font-semibold text-emerald-700 hover:bg-emerald-50 transition disabled:opacity-60"
                      >
                        <ShoppingCart className="h-4 w-4 shrink-0" /> Pasar a compra
                      </button>
                    )}
                    <button
                      onClick={() => setGuardarOpen(true)}
                      disabled={!itemsPedido.length}
                      className="inline-flex items-center justify-center gap-1.5 sm:gap-2 px-2 sm:px-3.5 py-2 whitespace-nowrap rounded-xl bg-blue-600 text-sm font-semibold text-white hover:bg-blue-700 transition disabled:opacity-60"
                    >
                      <Save className="h-4 w-4 shrink-0" /> {edicion ? 'Guardar cambios' : 'Guardar pedido'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <GuardarPedidoModal
        open={guardarOpen}
        onClose={() => setGuardarOpen(false)}
        onGuardar={onGuardarPedidos}
        items={itemsPedido}
        proveedores={proveedores}
        edicion={edicion}
      />
    </AppShell>
  );
}
