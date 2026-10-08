// src/Components/Productos/PreciosSucursalModal.jsx
// Precio de venta de un producto en cada sucursal. Sin precio propio, la sucursal vende al precio base del
// catálogo. El administrador ve y edita todas; el administrativo, sólo la suya.
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Tags } from 'lucide-react';
import { backdropV, panelV } from '../../ui/animHelpers';
import { getPreciosSucursales, setPrecioSucursal, quitarPrecioSucursal } from '../../api/productos.js';
import { showErrorSwal, showSuccessSwal } from '../../ui/swal';
import { blockWheelChange } from '../../utils/numberInput';
import { useAuth } from '../../AuthContext';

const moneda = (n) => Number(n || 0).toLocaleString('es-AR', { style: 'currency', currency: 'ARS' });

export default function PreciosSucursalModal({ open, producto, onClose, onChanged }) {
  const { userLevel, userLocalId } = useAuth();
  const esSocio = String(userLevel || '').toLowerCase() === 'socio';
  const [loading, setLoading] = useState(false);
  const [base, setBase] = useState(0);
  const [filas, setFilas] = useState([]); // { local_id, nombre, precio_propio, edicion }
  const [guardando, setGuardando] = useState(null);

  useEffect(() => {
    if (!open || !producto?.id) return undefined;
    let vivo = true;
    (async () => {
      setLoading(true);
      try {
        if (esSocio) {
          const r = await getPreciosSucursales(producto.id);
          if (!vivo) return;
          setBase(Number(r.precio_base) || 0);
          setFilas((r.sucursales || []).map((s) => ({ ...s, edicion: s.precio_propio ?? '' })));
        } else {
          // El administrativo no ve las demás sucursales: sólo la suya, a partir del producto ya cargado.
          const propio = producto.precio_propio === true ? Number(producto.precio) : null;
          setBase(Number(producto.precio_base ?? producto.pre_prod) || 0);
          setFilas([{ local_id: Number(userLocalId), nombre: 'Mi sucursal', precio_propio: propio, edicion: propio ?? '' }]);
        }
      } catch (err) {
        await showErrorSwal({ title: 'No se pudieron obtener los precios', text: err?.mensajeError || 'Ocurrió un error inesperado', tips: err?.tips });
      } finally {
        if (vivo) setLoading(false);
      }
    })();
    return () => {
      vivo = false;
    };
  }, [open, producto, esSocio, userLocalId]);

  const actualizar = (localId, cambios) => setFilas((fs) => fs.map((f) => (f.local_id === localId ? { ...f, ...cambios } : f)));

  const guardar = async (fila) => {
    const precio = Number(fila.edicion);
    if (fila.edicion === '' || !Number.isFinite(precio) || precio < 0) {
      return showErrorSwal({ title: 'Precio inválido', text: 'Ingresá un precio de 0 o más.' });
    }
    setGuardando(fila.local_id);
    try {
      await setPrecioSucursal(producto.id, fila.local_id, precio);
      actualizar(fila.local_id, { precio_propio: precio });
      await showSuccessSwal({ title: 'Precio guardado', text: `${fila.nombre}: ${moneda(precio)}` });
      onChanged?.();
    } catch (err) {
      await showErrorSwal({ title: 'No se pudo guardar', text: err?.mensajeError || 'Ocurrió un error inesperado', tips: err?.tips });
    } finally {
      setGuardando(null);
    }
  };

  const quitar = async (fila) => {
    setGuardando(fila.local_id);
    try {
      await quitarPrecioSucursal(producto.id, fila.local_id);
      actualizar(fila.local_id, { precio_propio: null, edicion: '' });
      onChanged?.();
    } catch (err) {
      await showErrorSwal({ title: 'No se pudo quitar el precio', text: err?.mensajeError || 'Ocurrió un error inesperado', tips: err?.tips });
    } finally {
      setGuardando(null);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          variants={backdropV}
          initial="hidden"
          animate="visible"
          exit="exit"
          className="fixed inset-0 z-[70] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            variants={panelV}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="relative w-full max-w-[92vw] sm:max-w-xl max-h-[85vh] overflow-y-auto overscroll-contain rounded-2xl border border-slate-200 bg-white shadow-2xl"
          >
            <button
              onClick={onClose}
              className="absolute z-50 top-2.5 right-2.5 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 border border-slate-200 text-slate-500 hover:bg-slate-200 transition"
              aria-label="Cerrar"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="p-5 sm:p-6">
              <div className="mb-4 flex items-center gap-3">
                <Tags className="h-6 w-6 text-teal-600 shrink-0" />
                <div>
                  <h3 className="text-xl font-bold tracking-tight text-slate-900">Precio por sucursal</h3>
                  <p className="text-sm text-slate-500">{producto?.nombre}</p>
                </div>
              </div>

              {loading ? (
                <div className="py-10 text-center text-slate-600">Cargando…</div>
              ) : (
                <>
                  <div className="mb-4 flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm">
                    <span className="text-slate-600">Precio base del catálogo</span>
                    <strong className="text-slate-900">{moneda(base)}</strong>
                  </div>
                  <p className="mb-3 text-xs text-slate-500">
                    Una sucursal sin precio propio vende al precio base. Cambiar el precio de una sucursal no afecta a las demás.
                  </p>
                  <ul className="space-y-2">
                    {filas.map((f) => (
                      <li key={f.local_id} className="rounded-xl border border-slate-200 p-3">
                        <div className="mb-2 flex items-center justify-between text-sm">
                          <span className="font-semibold text-slate-800">{f.nombre}</span>
                          <span className="text-xs text-slate-500">
                            {f.precio_propio != null ? `Precio propio: ${moneda(f.precio_propio)}` : `Usa el base: ${moneda(base)}`}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            onWheel={blockWheelChange}
                            value={f.edicion}
                            onChange={(e) => actualizar(f.local_id, { edicion: e.target.value })}
                            placeholder="Precio de esta sucursal"
                            aria-label={`Precio en ${f.nombre}`}
                            className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-400/40"
                          />
                          <button
                            type="button"
                            onClick={() => guardar(f)}
                            disabled={guardando === f.local_id}
                            className="rounded-lg bg-teal-600 px-3 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60 transition"
                          >
                            Guardar
                          </button>
                          {f.precio_propio != null && (
                            <button
                              type="button"
                              onClick={() => quitar(f)}
                              disabled={guardando === f.local_id}
                              className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-60 transition"
                            >
                              Usar el base
                            </button>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
