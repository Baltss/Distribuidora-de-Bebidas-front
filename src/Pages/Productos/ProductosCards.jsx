// src/Pages/Productos/ProductosCards.jsx
import React, { useEffect, useMemo, useState } from 'react';
import NavbarStaff from '../Dash/NavbarStaff';
import '../../Styles/staff/dashboard.css';
import '../../Styles/staff/background.css';
import ParticlesBackground from '../../Components/ParticlesBackground';
import ButtonBack from '../../Components/ButtonBack';
import { motion } from 'framer-motion';
import { FaPlus, FaSearch } from 'react-icons/fa';

import ProductCard from '../../Components/Productos/ProductCard';
import ProductoFormModal from '../../Components/Productos/ProductoFormModal';
import StockMovimientosModal from '../../Components/Stock/StockMovimientosModal';

import {
  listProductos,
  createProducto,
  updateProducto,
  patchProductoEstado,
  deleteProducto
} from '../../api/productos.js';
import { getStockResumen } from '../../api/stock.js';

import {
  showErrorSwal,
  showWarnSwal,
  showSuccessSwal,
  showConfirmSwal
} from '../../ui/swal';

const useDebounce = (value, ms = 200) => {
  const [deb, setDeb] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDeb(value), ms);
    return () => clearTimeout(id);
  }, [value, ms]);
  return deb;
};

export default function ProductosCards() {
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);

  const [q, setQ] = useState('');
  const dq = useDebounce(q);

  const [filtroEstado, setFiltroEstado] = useState('todos'); // 'todos' | 'activos' | 'inactivos'
  const [filtroPresentacion, setFiltroPresentacion] = useState('todas'); // 'todas' | 'unidad' | 'pack'

  const [page, setPage] = useState(1);
  const limit = 18;

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const [stockMap, setStockMap] = useState({});
  const [stockModalProducto, setStockModalProducto] = useState(null);

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
          hasNext
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
  }, [dq, filtroEstado, filtroPresentacion, page]);

  useEffect(() => {
    fetchStock();
  }, []);

  const onNew = () => {
    setEditing(null);
    setModalOpen(true);
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

      const { code, mensajeError, meta } = err || {};

      if (code === 'PRODUCT_HAS_SALES') {
        const ventasCount = meta?.ventasCount ?? null;

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

  const Pager = useMemo(() => {
    if (!meta) return null;
    return (
      <div className="flex items-center justify-center gap-2 mt-6">
        <button
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={!meta.hasPrev}
          className="px-3 py-2 rounded-xl border border-white/30 bg-white/70 hover:bg-white disabled:opacity-50"
        >
          ← Anterior
        </button>
        <span className="text-white/90 text-sm">
          Página {meta.page} {meta.totalPages ? `/ ${meta.totalPages}` : ''}
        </span>
        <button
          onClick={() => setPage((p) => (meta.hasNext ? p + 1 : p))}
          disabled={!meta.hasNext}
          className="px-3 py-2 rounded-xl border border-white/30 bg-white/70 hover:bg-white disabled:opacity-50"
        >
          Siguiente →
        </button>
      </div>
    );
  }, [meta]);

  return (
    <>
      <NavbarStaff />
      <section className="relative w-full min-h-screen bg-white">
        <div className="min-h-screen bg-gradient-to-b from-[#001219] via-[#003049] to-[#005f73]">
          <ParticlesBackground />
          <ButtonBack />

          <div className="text-center pt-24 px-4">
            <motion.h1
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-4xl titulo uppercase font-bold text-white mb-3 drop-shadow-md"
            >
              Productos
            </motion.h1>
            <p className="text-white/80">Gestioná productos.</p>
          </div>

          {/* Barra de acciones */}
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
            <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
              <div className="relative flex-1">
                <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  value={q}
                  onChange={(e) => {
                    setPage(1);
                    setQ(e.target.value);
                  }}
                  placeholder="Buscar por nombre o SKU…"
                  className="w-full pl-10 pr-3 py-2 rounded-xl border border-white/20 bg-white/90 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={filtroEstado}
                  onChange={(e) => {
                    setPage(1);
                    setFiltroEstado(e.target.value);
                  }}
                  className="px-3 py-2 rounded-xl border border-white/20 bg-white/90 focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  <option value="todos">Todos</option>
                  <option value="activos">Activos</option>
                  <option value="inactivos">Inactivos</option>
                </select>

                <select
                  value={filtroPresentacion}
                  onChange={(e) => {
                    setPage(1);
                    setFiltroPresentacion(e.target.value);
                  }}
                  className="px-3 py-2 rounded-xl border border-white/20 bg-white/90 focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  <option value="todas">Todas</option>
                  <option value="unidad">Unidad</option>
                  <option value="pack">Pack</option>
                </select>

                <button
                  onClick={onNew}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-600 text-white font-semibold hover:bg-teal-700"
                >
                  <FaPlus /> Nuevo Producto
                </button>
              </div>
            </div>
          </div>

          {/* Grid de cards */}
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {loading ? (
              <div className="flex items-center justify-center py-24">
                <div className="h-10 w-10 border-4 border-white/50 border-t-teal-400 rounded-full animate-spin" />
              </div>
            ) : rows.length === 0 ? (
              <div className="text-center text-white/80 py-24">
                No hay productos con esos filtros.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                {rows.map((it) => (
                  <ProductCard
                    key={it.id}
                    item={it}
                    onEdit={onEdit}
                    onToggleActivo={onToggleActivo}
                    onDelete={onDeleteDirect}
                    onVerStock={setStockModalProducto}
                    stock={stockMap[it.id]}
                    color={it.presentacion === 'pack' ? '#a12262' : '#06b6d4'}
                  />
                ))}
              </div>
            )}

            {Pager}
          </div>
        </div>
      </section>

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
    </>
  );
}
