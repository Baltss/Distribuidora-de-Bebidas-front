// src/Pages/Productos/ProductosCards.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import AppShell from '../../Components/Layout/AppShell';
import { Search, Plus, Layers, ArrowLeft, X, FileSpreadsheet } from 'lucide-react';
import useDebouncedValue from '../../hooks/useDebouncedValue';

import ProductTableRow from '../../Components/Productos/ProductTableRow';
import ProductoFormModal from '../../Components/Productos/ProductoFormModal';
import StockMovimientosModal from '../../Components/Stock/StockMovimientosModal';
import CategoriasManagerModal from '../../Components/Categorias/CategoriasManagerModal';

import {
  listProductos,
  createProducto,
  updateProducto,
  patchProductoEstado,
  deleteProducto,
  exportProductosXlsx
} from '../../api/productos.js';
import { getStockResumen } from '../../api/stock.js';
import { listCategorias } from '../../api/categorias.js';

import {
  showErrorSwal,
  showWarnSwal,
  showSuccessSwal,
  showConfirmSwal
} from '../../ui/swal';

export default function ProductosCards() {
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);

  const [q, setQ] = useState('');
  const dq = useDebouncedValue(q, 500);

  const [filtroEstado, setFiltroEstado] = useState('todos'); // 'todos' | 'activos' | 'inactivos'
  const [filtroPresentacion, setFiltroPresentacion] = useState('todas'); // 'todas' | 'unidad' | 'pack'
  const [filtroCategoria, setFiltroCategoria] = useState(''); // '' = todas
  const [categorias, setCategorias] = useState([]);

  const [page, setPage] = useState(1);
  const limit = 15;

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const [stockMap, setStockMap] = useState({});
  const [stockModalProducto, setStockModalProducto] = useState(null);
  const [categoriasModalOpen, setCategoriasModalOpen] = useState(false);

  const fetchStock = async () => {
    try {
      const resp = await getStockResumen();
      const map = {};
      for (const r of resp?.data || []) map[r.producto_id] = r;
      setStockMap(map);
    } catch {
      // no bloqueamos el listado de productos si falla el resumen de stock
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = {
        page,
        limit,
        q: dq || '',
        orderBy: 'nombre',
        orderDir: 'ASC'
      };

      if (filtroEstado === 'activos') params.estado = 'activo';
      if (filtroEstado === 'inactivos') params.estado = 'inactivo';
      if (filtroPresentacion === 'unidad' || filtroPresentacion === 'pack') {
        params.presentacion = filtroPresentacion;
      }
      if (filtroCategoria) params.categoria_id = filtroCategoria;

      const resp = await listProductos(params);

      // El backend puede devolver array plano o { data, meta }
      let apiRows = Array.isArray(resp) ? resp : resp?.data || [];
      let apiMeta = Array.isArray(resp) ? null : resp?.meta || null;

      // Normalizamos meta para el pager
      let normalized = null;
      if (apiMeta) {
        const lim = apiMeta.limit || limit;
        const pageNum =
          apiMeta.page ??
          (apiMeta.offset !== undefined
            ? Math.floor(apiMeta.offset / lim) + 1
            : 1);
        const totalPages =
          apiMeta.totalPages ??
          (apiMeta.total ? Math.ceil(apiMeta.total / lim) : undefined);
        const hasPrev =
          apiMeta.hasPrev ??
          (totalPages ? pageNum > 1 : (apiMeta.offset || 0) > 0);
        const hasNext =
          apiMeta.hasNext ?? (totalPages ? pageNum < totalPages : false);

        normalized = {
          ...apiMeta,
          page: pageNum,
          totalPages,
          hasPrev,
          hasNext,
          total: apiMeta.total ?? apiRows.length
        };
      }

      setRows(apiRows);
      setMeta(normalized);
    } catch (e) {
      console.error(e);
      await showErrorSwal({
        title: 'Error',
        text: 'No se pudieron cargar los productos'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(); // eslint-disable-next-line
  }, [dq, filtroEstado, filtroPresentacion, filtroCategoria, page]);

  useEffect(() => {
    fetchStock();
    cargarCategorias();
  }, []);

  const cargarCategorias = async () => {
    try {
      const resp = await listCategorias({ estado: 'activo' });
      setCategorias(resp?.data || []);
    } catch {
      // el filtro queda sin opciones si falla, sin romper el listado
    }
  };

  const onNew = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const [exportando, setExportando] = useState(false);
  const onExport = async () => {
    setExportando(true);
    try {
      await exportProductosXlsx();
    } catch (err) {
      await showErrorSwal({
        title: 'No se pudo exportar',
        text: err?.mensajeError || 'Ocurrió un error inesperado'
      });
    } finally {
      setExportando(false);
    }
  };

  const onEdit = (item) => {
    setEditing(item);
    setModalOpen(true);
  };

  const onSubmit = async (form) => {
    try {
      if (editing?.id) {
        await updateProducto(editing.id, form);
        await showSuccessSwal({
          title: 'Guardado',
          text: 'Producto actualizado'
        });
      } else {
        await createProducto(form);
        await showSuccessSwal({ title: 'Creado', text: 'Producto creado' });
      }
      await fetchData();
      setModalOpen(false);
      setEditing(null);
    } catch (err) {
      const { code, mensajeError, tips } = err || {};
      if (code === 'DUPLICATE') {
        return showErrorSwal({
          title: 'SKU en uso',
          text: mensajeError || 'Ya existe un producto con ese SKU.',
          tips: tips?.length ? tips : ['Usá un SKU distinto.']
        });
      }
      if (code === 'MODEL_VALIDATION' || code === 'BAD_REQUEST') {
        return showWarnSwal({
          title: 'Datos inválidos',
          text: mensajeError || 'Revisá los campos del formulario.',
          tips
        });
      }
      if (code === 'NETWORK') {
        return showErrorSwal({
          title: 'Sin conexión',
          text: mensajeError,
          tips
        });
      }
      return showErrorSwal({
        title: 'No se pudo guardar',
        text: mensajeError || 'Ocurrió un error inesperado',
        tips
      });
    }
  };

  const onToggleActivo = async (item) => {
    const nextEstado =
      (item?.estado || '') === 'activo' ? 'inactivo' : 'activo';

    // Optimista
    setRows((r) =>
      r.map((x) => (x.id === item.id ? { ...x, estado: nextEstado } : x))
    );

    try {
      await patchProductoEstado(item.id, { estado: nextEstado });
      await showSuccessSwal({
        title: nextEstado === 'activo' ? 'Activado' : 'Desactivado',
        text: `Producto ${nextEstado === 'activo' ? 'activado' : 'desactivado'}`
      });
    } catch (err) {
      // Rollback
      setRows((r) =>
        r.map((x) => (x.id === item.id ? { ...x, estado: item.estado } : x))
      );
      const { mensajeError, tips } = err || {};
      await showErrorSwal({
        title: 'No se pudo actualizar',
        text: mensajeError || 'Error al cambiar el estado',
        tips
      });
    }
  };

  const isConfirmed = (res) =>
    typeof res === 'object' && res !== null ? !!res.isConfirmed : !!res;

  const onDeleteDirect = async (item) => {
    const res = await showConfirmSwal({
      title: '¿Eliminar producto?',
      text: `Se eliminará "${item?.nombre}". Esta acción no se puede deshacer.`,
      confirmText: 'Sí, eliminar'
    });
    if (!isConfirmed(res)) return;

    const id = Number(item.id);

    // Optimista
    setRows((r) => r.filter((x) => Number(x.id) !== id));

    try {
      const resp = await deleteProducto(id); // hard delete normal
      await showSuccessSwal({ title: 'Eliminado', text: resp?.message });
      await fetchData();
    } catch (err) {
      await fetchData();

      const { code, mensajeError, meta: errMeta } = err || {};

      if (code === 'PRODUCT_HAS_SALES') {
        const ventasCount = errMeta?.ventasCount ?? null;

        const r2 = await showConfirmSwal({
          title: 'Producto con ventas asociadas',
          text:
            `Este producto tiene ventas asociadas${ventasCount != null ? ` (${ventasCount})` : ''}.\n` +
            `Si continuás, se eliminarán esas líneas del detalle de ventas y el producto se borrará definitivamente.\n\n` +
            `¿Deseás borrar de todas formas?`,
          confirmText: 'Sí, borrar igual',
          cancelText: 'Cancelar'
        });

        if (!isConfirmed(r2)) return;

        const resp2 = await deleteProducto(id, { force: 1 });
        await showSuccessSwal({
          title: 'Eliminado definitivamente',
          text: resp2?.message || 'Se eliminó el producto y sus referencias.'
        });
        await fetchData();
        return;
      }

      await showErrorSwal({
        title: 'No se pudo eliminar',
        text: mensajeError || 'Ocurrió un error al eliminar'
      });
    }
  };

  const limpiarFiltros = () => {
    setQ('');
    setFiltroEstado('todos');
    setFiltroPresentacion('todas');
    setFiltroCategoria('');
    setPage(1);
  };

  const rangoTexto = useMemo(() => {
    if (!meta?.total) return null;
    const desde = (page - 1) * limit + 1;
    const hasta = Math.min(page * limit, meta.total);
    return `Mostrando ${desde} a ${hasta} de ${meta.total} productos`;
  }, [meta, page]);

  return (
    <AppShell>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold uppercase tracking-tight text-slate-900">
              Productos
            </h1>
            <p className="mt-1 text-sm text-slate-500">Gestión de productos.</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
            >
              <ArrowLeft className="h-4 w-4" /> Volver
            </Link>
            <button
              onClick={() => setCategoriasModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 text-sm font-semibold text-white hover:bg-violet-700 transition"
            >
              <Layers className="h-4 w-4" /> Nueva Categoría
            </button>
            <button
              onClick={onExport}
              disabled={exportando}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50 transition disabled:opacity-60"
            >
              <FileSpreadsheet className="h-4 w-4 text-emerald-600" /> {exportando ? 'Exportando…' : 'Exportar Excel'}
            </button>
            <button
              onClick={onNew}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-sm font-semibold text-white hover:bg-blue-700 transition"
            >
              <Plus className="h-4 w-4" /> Nuevo Producto
            </button>
          </div>
        </div>

        {/* Filtros */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="relative lg:col-span-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-600" />
              <input
                value={q}
                onChange={(e) => {
                  setPage(1);
                  setQ(e.target.value);
                }}
                placeholder="Buscar por nombre o SKU…"
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-800
                           focus:outline-none focus:ring-2 focus:ring-blue-400/40 focus:border-transparent"
              />
            </div>

            <select
              value={filtroCategoria}
              onChange={(e) => {
                setPage(1);
                setFiltroCategoria(e.target.value);
              }}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-700
                         focus:outline-none focus:ring-2 focus:ring-blue-400/40"
            >
              <option value="">Todas las categorías</option>
              {categorias.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>

            <select
              value={filtroPresentacion}
              onChange={(e) => {
                setPage(1);
                setFiltroPresentacion(e.target.value);
              }}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-700
                         focus:outline-none focus:ring-2 focus:ring-blue-400/40"
            >
              <option value="todas">Todas las presentaciones</option>
              <option value="unidad">Unidad</option>
              <option value="pack">Pack</option>
            </select>

            <select
              value={filtroEstado}
              onChange={(e) => {
                setPage(1);
                setFiltroEstado(e.target.value);
              }}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-700
                         focus:outline-none focus:ring-2 focus:ring-blue-400/40"
            >
              <option value="todos">Estado: Todos</option>
              <option value="activos">Activos</option>
              <option value="inactivos">Inactivos</option>
            </select>
          </div>

          {(q || filtroCategoria || filtroPresentacion !== 'todas' || filtroEstado !== 'todos') && (
            <div className="mt-3">
              <button
                onClick={limpiarFiltros}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-800 transition"
              >
                <X className="h-3.5 w-3.5" /> Limpiar filtros
              </button>
            </div>
          )}
        </div>

        {/* Tabla */}
        <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-3 text-left font-medium">ID</th>
                  <th className="px-4 py-3 text-left font-medium">Imagen</th>
                  <th className="px-4 py-3 text-left font-medium">Nombre</th>
                  <th className="px-4 py-3 text-left font-medium">SKU</th>
                  <th className="px-4 py-3 text-left font-medium">Categoría</th>
                  <th className="px-4 py-3 text-left font-medium">Presentación</th>
                  <th className="px-4 py-3 text-left font-medium">UM / Contenido</th>
                  <th className="px-4 py-3 text-left font-medium">Precio</th>
                  <th className="px-4 py-3 text-left font-medium">Stock</th>
                  <th className="px-4 py-3 text-left font-medium">Estado</th>
                  <th className="px-4 py-3 text-right font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={11} className="px-4 py-16 text-center text-slate-600">
                      Cargando…
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="px-4 py-16 text-center text-slate-600">
                      No hay productos con esos filtros.
                    </td>
                  </tr>
                ) : (
                  rows.map((it) => (
                    <ProductTableRow
                      key={it.id}
                      item={it}
                      onEdit={onEdit}
                      onToggleActivo={onToggleActivo}
                      onDelete={onDeleteDirect}
                      onVerStock={setStockModalProducto}
                      stock={stockMap[it.id]}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Paginación */}
          {meta && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3.5 border-t border-slate-200">
              <p className="text-xs text-slate-500">{rangoTexto}</p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={!meta.hasPrev}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white transition"
                >
                  Anterior
                </button>
                <span className="text-xs text-slate-500">
                  Página {meta.page} {meta.totalPages ? `de ${meta.totalPages}` : ''}
                </span>
                <button
                  onClick={() => setPage((p) => (meta.hasNext ? p + 1 : p))}
                  disabled={!meta.hasNext}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white transition"
                >
                  Siguiente
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal de alta/edición */}
      <ProductoFormModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditing(null);
        }}
        onSubmit={onSubmit}
        initial={editing}
      />

      <StockMovimientosModal
        open={!!stockModalProducto}
        producto={stockModalProducto}
        onClose={() => setStockModalProducto(null)}
        onChanged={fetchStock}
      />

      <CategoriasManagerModal
        open={categoriasModalOpen}
        onClose={() => setCategoriasModalOpen(false)}
        onChanged={cargarCategorias}
      />
    </AppShell>
  );
}
