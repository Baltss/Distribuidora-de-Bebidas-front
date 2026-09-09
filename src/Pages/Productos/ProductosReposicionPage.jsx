// src/Pages/Productos/ProductosReposicionPage.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import AppShell from '../../Components/Layout/AppShell';
import {
  Search,
  ArrowLeft,
  FileSpreadsheet,
  FileText,
  PackageSearch
} from 'lucide-react';
import useDebouncedValue from '../../hooks/useDebouncedValue';

import {
  listProductosReposicion,
  exportReposicionXlsx,
  exportReposicionPdf
} from '../../api/productos.js';
import { listCategorias } from '../../api/categorias.js';
import { showErrorSwal } from '../../ui/swal';

const inputCls =
  'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-400/60 focus:border-transparent';

const stockColor = (actual, minimo) => {
  if (minimo == null) return 'text-slate-700';
  if (actual <= 0) return 'text-rose-600';
  if (actual <= minimo) return 'text-amber-600';
  return 'text-slate-700';
};

export default function ProductosReposicionPage() {
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categorias, setCategorias] = useState([]);

  const [q, setQ] = useState('');
  const dq = useDebouncedValue(q, 400);
  const [categoriaId, setCategoriaId] = useState('');
  const [stockMax, setStockMax] = useState('');
  const dStockMax = useDebouncedValue(stockMax, 400);
  const [soloBajoMinimo, setSoloBajoMinimo] = useState(true);

  const [seleccionados, setSeleccionados] = useState(() => new Set());
  const [exportando, setExportando] = useState(false);

  useEffect(() => {
    listCategorias({ estado: 'activo' })
      .then((resp) => setCategorias(resp?.data || []))
      .catch(() => setCategorias([]));
  }, []);

  const fetchListado = async () => {
    setLoading(true);
    try {
      const resp = await listProductosReposicion({
        categoria_id: categoriaId || undefined,
        q: dq || undefined,
        stock_max: dStockMax !== '' ? dStockMax : undefined,
        solo_bajo_minimo: soloBajoMinimo ? 1 : undefined
      });
      const lista = resp?.productos || [];
      setProductos(lista);
      // Al recargar, sólo mantenemos seleccionados los que siguen en la lista.
      setSeleccionados((prev) => {
        const ids = new Set(lista.map((p) => p.id));
        const next = new Set();
        for (const id of prev) if (ids.has(id)) next.add(id);
        return next;
      });
    } catch (err) {
      await showErrorSwal({
        title: 'No se pudo cargar el listado',
        text: err?.mensajeError || 'Ocurrió un error inesperado'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchListado();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoriaId, dq, dStockMax, soloBajoMinimo]);

  const todosSeleccionados = productos.length > 0 && seleccionados.size === productos.length;

  const toggleTodos = () => {
    setSeleccionados(todosSeleccionados ? new Set() : new Set(productos.map((p) => p.id)));
  };

  const toggleUno = (id) => {
    setSeleccionados((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const filtrosActivos = useMemo(
    () => ({
      categoria_id: categoriaId || undefined,
      q: dq || undefined,
      stock_max: dStockMax !== '' ? dStockMax : undefined,
      solo_bajo_minimo: soloBajoMinimo ? 1 : undefined
    }),
    [categoriaId, dq, dStockMax, soloBajoMinimo]
  );

  const paramsExport = () =>
    seleccionados.size > 0 ? { ids: Array.from(seleccionados).join(',') } : filtrosActivos;

  const onExportXlsx = async () => {
    setExportando(true);
    try {
      await exportReposicionXlsx(paramsExport());
    } catch (err) {
      await showErrorSwal({
        title: 'No se pudo exportar el Excel',
        text: err?.mensajeError || 'Ocurrió un error inesperado'
      });
    } finally {
      setExportando(false);
    }
  };

  const onExportPdf = async () => {
    setExportando(true);
    try {
      await exportReposicionPdf(paramsExport());
    } catch (err) {
      await showErrorSwal({
        title: 'No se pudo exportar el PDF',
        text: err?.mensajeError || 'Ocurrió un error inesperado'
      });
    } finally {
      setExportando(false);
    }
  };

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold uppercase tracking-tight text-slate-900 flex items-center gap-2.5">
              <PackageSearch className="h-7 w-7 text-blue-600" /> Listado de reposición
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Elegí qué productos necesitás comprar y exportá el listado.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              to="/dashboard/productos"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
            >
              <ArrowLeft className="h-4 w-4" /> Volver a Productos
            </Link>
            <button
              onClick={onExportXlsx}
              disabled={exportando || productos.length === 0}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50 transition disabled:opacity-60"
            >
              <FileSpreadsheet className="h-4 w-4 text-emerald-600" /> Exportar Excel
            </button>
            <button
              onClick={onExportPdf}
              disabled={exportando || productos.length === 0}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-sm font-semibold text-white hover:bg-blue-700 transition disabled:opacity-60"
            >
              <FileText className="h-4 w-4" /> Exportar PDF
            </button>
          </div>
        </div>

        {/* Filtros */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="relative lg:col-span-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Buscar por nombre, SKU o código de barras…"
                className={`${inputCls} pl-9`}
              />
            </div>
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

        {/* Resultados */}
        <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50">
            <label className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={todosSeleccionados}
                onChange={toggleTodos}
                disabled={productos.length === 0}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-400"
              />
              Seleccionar todos
            </label>
            <span className="text-sm text-slate-500">
              {seleccionados.size > 0
                ? `${seleccionados.size} seleccionado${seleccionados.size === 1 ? '' : 's'}`
                : `${productos.length} producto${productos.length === 1 ? '' : 's'}`}
            </span>
          </div>

          {loading ? (
            <div className="px-4 py-10 text-center text-slate-400">Cargando…</div>
          ) : productos.length === 0 ? (
            <div className="px-4 py-10 text-center text-slate-400">
              No hay productos que coincidan con los filtros.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-4 py-2 w-10"></th>
                    <th className="px-3 py-2">Producto</th>
                    <th className="px-3 py-2">Categoría</th>
                    <th className="px-3 py-2 text-right">Stock actual</th>
                    <th className="px-3 py-2 text-right">Stock mínimo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {productos.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50">
                      <td className="px-4 py-2">
                        <input
                          type="checkbox"
                          checked={seleccionados.has(p.id)}
                          onChange={() => toggleUno(p.id)}
                          className="rounded border-slate-300 text-blue-600 focus:ring-blue-400"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <div className="font-medium text-slate-800">{p.nombre}</div>
                        <div className="text-xs text-slate-400">{p.codigo_sku}</div>
                      </td>
                      <td className="px-3 py-2 text-slate-600">{p.categoria || '—'}</td>
                      <td className={`px-3 py-2 text-right font-semibold ${stockColor(p.stock_actual, p.stock_minimo)}`}>
                        {p.stock_actual}
                      </td>
                      <td className="px-3 py-2 text-right text-slate-500">
                        {p.stock_minimo ?? '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
