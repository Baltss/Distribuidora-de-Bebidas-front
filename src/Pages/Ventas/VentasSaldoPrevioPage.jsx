// ===============================
// FILE: src/Pages/Ventas/VentasSaldoPrevioPage.jsx
// ===============================
import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';

import {
  backdropV,
  panelV,
  formContainerV,
  fieldV
} from '../../ui/animHelpers';

import { listCiudades } from '../../api/ciudades';
import { listClientes } from '../../api/clientes';
import http from '../../api/http';

import ventasApi from '../../api/ventas';
import SearchableSelect from '../../Components/Common/SearchableSelect';
import AdminPageVentas from './AdminPageVentas';
import { blockWheelChange } from '../../utils/numberInput';

//  - 25/02/2026 - Form para cargar saldo previo (deuda histórica) sin registrar productos/ventas.
export default function VentasSaldoPrevioPage() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    fecha: new Date().toISOString().slice(0, 10), // YYYY-MM-DD
    ciudad_id: '',
    reparto_id: '',
    cliente_id: '',
    monto: '',
    descripcion: ''
  });

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [ciudades, setCiudades] = useState([]);
  const [repartos, setRepartos] = useState([]);
  const [repartosLoading, setRepartosLoading] = useState(false);

  const [clientes, setClientes] = useState([]);
  const [clientesLoading, setClientesLoading] = useState(false);

  const [selectedCliente, setSelectedCliente] = useState(null);
  const [vendedorLabel, setVendedorLabel] = useState('');

  const moneyRound = (n) =>
    Math.round((Number(n || 0) + Number.EPSILON) * 100) / 100;

  const handleClose = () => {
    navigate(-1);
  };

  // Cargar ciudades y repartos al entrar
  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const cRes = await listCiudades({
          orderBy: 'nombre',
          orderDir: 'ASC',
          limit: 1000
        });

        const ciuds = Array.isArray(cRes) ? cRes : cRes?.data || [];
        if (alive) setCiudades(ciuds);

        setRepartosLoading(true);

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
          setCiudades([]);
          setRepartos([]);
        }
      } finally {
        if (alive) setRepartosLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  // Repartos filtrados por ciudad
  const repartosByCiudad = useMemo(() => {
    const list = Array.isArray(repartos) ? repartos : [];
    const ciudadId = Number(form.ciudad_id || 0);
    const filtered =
      ciudadId > 0 ? list.filter((r) => Number(r.ciudad_id) === ciudadId) : [];
    return filtered.sort((a, b) =>
      String(a?.nombre || '').localeCompare(String(b?.nombre || ''))
    );
  }, [repartos, form.ciudad_id]);

  // Cargar clientes al elegir reparto (o fallback por ciudad si no hay reparto)
  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setClientesLoading(true);

        // reset selección de cliente cuando cambia el filtro
        setClientes([]);
        setSelectedCliente(null);
        setVendedorLabel('');
        setForm((f) => ({ ...f, cliente_id: '' }));

        const repId = Number(form.reparto_id || 0);
        const ciudadId = Number(form.ciudad_id || 0);

        //  - 25/02/2026 - Priorizamos reparto_id para cargar clientes (fuente de verdad).
        // Si no hay reparto, intentamos por ciudad_id (si el backend lo soporta).
        const params =
          repId > 0
            ? { reparto_id: repId, estado: 'activo', limit: 2000 }
            : ciudadId > 0
              ? { ciudad_id: ciudadId, estado: 'activo', limit: 2000 }
              : null;

        if (!params) {
          if (alive) setClientes([]);
          return;
        }

        const cRes = await listClientes(params);
        const cls = Array.isArray(cRes?.data)
          ? cRes.data
          : Array.isArray(cRes)
            ? cRes
            : [];
        if (alive) setClientes(cls);
      } catch (e) {
        if (alive) setClientes([]);
      } finally {
        if (alive) setClientesLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [form.reparto_id, form.ciudad_id]);

  const handleCiudad = (e) => {
    const v = e.target.value;

    //  - 25/02/2026 - Reset duro de dependencias al cambiar ciudad
    setSaved(false);

    setForm((prev) => ({
      ...prev,
      ciudad_id: v,
      reparto_id: '',
      cliente_id: ''
    }));

    setSelectedCliente(null);
    setVendedorLabel('');
  };

  const handleReparto = (e) => {
    const v = e.target.value;

    //  - 25/02/2026 - Reset duro al cambiar reparto
    setSaved(false);

    setForm((prev) => ({
      ...prev,
      reparto_id: v === '' ? '' : v,
      cliente_id: ''
    }));

    setSelectedCliente(null);
    setVendedorLabel('');
  };

  const handleClienteChange = (cliOrId) => {
    setSaved(false);

    if (!cliOrId) {
      setSelectedCliente(null);
      setVendedorLabel('');
      setForm((f) => ({
        ...f,
        cliente_id: ''
      }));
      return;
    }

    const cli =
      typeof cliOrId === 'object'
        ? cliOrId
        : clientes.find((c) => Number(c.id) === Number(cliOrId));

    if (!cli) {
      setSelectedCliente(null);
      setVendedorLabel('Sin vendedor asignado');
      setForm((f) => ({
        ...f,
        cliente_id: Number(cliOrId) || ''
      }));
      return;
    }

    setSelectedCliente(cli);
    setForm((f) => ({
      ...f,
      cliente_id: cli.id
    }));

    if (cli.vendedor_preferido?.nombre) {
      setVendedorLabel(cli.vendedor_preferido.nombre);
    } else if (cli.vendedor_preferido_id) {
      setVendedorLabel(`Vendedor ID: ${cli.vendedor_preferido_id}`);
    } else {
      setVendedorLabel('Sin vendedor asignado');
    }
  };

  const montoNumber = useMemo(() => {
    const n = Number(form.monto);
    return Number.isFinite(n) ? moneyRound(n) : 0;
  }, [form.monto]);

  const canSave = useMemo(() => {
    const cliId = Number(form.cliente_id);
    const hasCliente = Number.isFinite(cliId) && cliId > 0;
    const montoOk = Number.isFinite(montoNumber) && montoNumber > 0;
    const fechaOk = !!String(form.fecha || '').trim();

    return hasCliente && montoOk && fechaOk && !saving && !saved;
  }, [form.cliente_id, montoNumber, form.fecha, saving, saved]);

  const submit = async (e) => {
    e?.preventDefault?.();
    if (!canSave) return;

    try {
      setSaving(true);

      const payload = {
        cliente_id: Number(form.cliente_id),
        //  - 25/02/2026 - Enviamos fecha como datetime 00:00:00 para normalizar.
        fecha: `${String(form.fecha).trim()}T00:00:00`,
        monto: moneyRound(montoNumber),
        //  - 25/02/2026 - Contexto opcional para auditoría/validación backend
        reparto_id:
          form.reparto_id === '' || form.reparto_id === null
            ? null
            : Number(form.reparto_id),
        descripcion: form.descripcion?.trim() || null
      };

      const resp = await ventasApi.createSaldoPrevioCliente(payload);

      setSaved(true);

      await Swal.fire({
        icon: 'success',
        title: 'Saldo previo cargado',
        text:
          resp?.mensaje ||
          'Se registró el saldo previo correctamente (deuda histórica).',
        confirmButtonText: 'OK'
      });
    } catch (err) {
      const msg =
        err?.response?.data?.mensajeError ||
        err?.mensajeError ||
        'No se pudo cargar el saldo previo.';
      await Swal.fire({
        icon: 'error',
        title: 'Error',
        text: msg,
        confirmButtonText: 'OK'
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
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
          className="relative w-full max-w-[92vw] sm:max-w-2xl md:max-w-4xl
                     max-h-[90vh] overflow-y-auto overscroll-contain
                     rounded-2xl border border-slate-200 bg-white shadow-2xl"
        >
          <button
            onClick={handleClose}
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
              Cargar saldo previo
            </motion.h3>

            <motion.form
              onSubmit={submit}
              variants={formContainerV}
              initial="hidden"
              animate="visible"
              className="space-y-5 sm:space-y-6"
            >
              {/* Fecha */}
              <motion.div variants={fieldV}>
                <label className="block text-sm font-medium text-slate-600 mb-2">
                  Fecha <span className="text-orange-600">*</span>
                </label>
                <input
                  type="date"
                  value={form.fecha}
                  onChange={(e) => {
                    setSaved(false);
                    setForm((f) => ({ ...f, fecha: e.target.value }));
                  }}
                  disabled={saving || saved}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-slate-800
                             focus:outline-none focus:ring-2 focus:ring-orange-400/40 focus:border-transparent
                             disabled:opacity-60 disabled:cursor-not-allowed"
                />
              </motion.div>

              {/* Ciudad + Reparto + Cliente */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Ciudad */}
                <motion.div variants={fieldV}>
                  <label className="block text-sm font-medium text-slate-600 mb-2">
                    Ciudad
                  </label>
                  <select
                    value={form.ciudad_id}
                    onChange={handleCiudad}
                    disabled={saving || saved}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-slate-800
                               focus:outline-none focus:ring-2 focus:ring-orange-400/40 focus:border-transparent
                               disabled:opacity-60 disabled:cursor-not-allowed"
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
                </motion.div>

                {/* Reparto */}
                <motion.div variants={fieldV}>
                  <label className="block text-sm font-medium text-slate-600 mb-2">
                    Reparto (opcional)
                  </label>
                  <select
                    value={form.reparto_id ?? ''}
                    onChange={handleReparto}
                    disabled={
                      !form.ciudad_id || repartosLoading || saving || saved
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-slate-800
                               focus:outline-none focus:ring-2 focus:ring-orange-400/40 focus:border-transparent
                               disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <option className="text-black" value="">
                      {repartosLoading
                        ? 'Cargando repartos…'
                        : !form.ciudad_id
                          ? 'Seleccioná ciudad primero…'
                          : 'Sin reparto…'}
                    </option>
                    {repartosByCiudad.map((r) => (
                      <option className="text-black" key={r.id} value={r.id}>
                        {r.nombre}
                      </option>
                    ))}
                  </select>
                </motion.div>

                {/* Cliente */}
                <motion.div variants={fieldV} className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-600 mb-2">
                    Cliente <span className="text-orange-600">*</span>
                  </label>

                  <div className={clientesLoading ? 'opacity-80' : ''}>
                    <SearchableSelect
                      items={clientes}
                      value={form.cliente_id}
                      onChange={handleClienteChange}
                      getOptionLabel={(c) =>
                        c ? `${c.nombre} (${c.documento || 's/ doc'})` : ''
                      }
                      getOptionValue={(c) => c.id}
                    />
                  </div>

                  <div className="mt-1 text-[11px] text-slate-400">
                    {clientesLoading
                      ? 'Cargando clientes…'
                      : !form.ciudad_id
                        ? 'Seleccioná una ciudad para cargar clientes.'
                        : form.reparto_id
                          ? 'Clientes filtrados por reparto.'
                          : 'Clientes filtrados por ciudad (si el backend lo soporta).'}
                  </div>
                </motion.div>
              </div>

              {/* Vendedor asignado (informativo) */}
              <motion.div variants={fieldV}>
                <label className="block text-sm font-medium text-slate-600 mb-2">
                  Vendedor asignado (informativo)
                </label>
                <input
                  value={vendedorLabel || '—'}
                  readOnly
                  className="w-full rounded-xl border border-slate-200 bg-slate-100 px-3.5 py-3 text-slate-500"
                />
              </motion.div>

              {/* Monto */}
              <motion.div variants={fieldV}>
                <label className="block text-sm font-medium text-slate-600 mb-2">
                  Monto de deuda <span className="text-orange-600">*</span>
                </label>
                <input
                  type="number"
                  onWheel={blockWheelChange}
                  min="0"
                  step="0.01"
                  value={form.monto}
                  onChange={(e) => {
                    setSaved(false);
                    setForm((f) => ({ ...f, monto: e.target.value }));
                  }}
                  disabled={saving || saved}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-slate-800
                             placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-400/40 focus:border-transparent
                             disabled:opacity-60 disabled:cursor-not-allowed"
                  placeholder="0.00"
                />
                <p className="mt-1 text-[11px] text-slate-400">
                  Registra una deuda histórica del cliente (sin productos).
                </p>
              </motion.div>

              {/* Descripción */}
              <motion.div variants={fieldV}>
                <label className="block text-sm font-medium text-slate-600 mb-2">
                  Descripción (opcional)
                </label>
                <textarea
                  rows={3}
                  value={form.descripcion}
                  onChange={(e) => {
                    setSaved(false);
                    setForm((f) => ({ ...f, descripcion: e.target.value }));
                  }}
                  disabled={saving || saved}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-slate-800
                             placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-400/40 focus:border-transparent
                             disabled:opacity-60 disabled:cursor-not-allowed"
                  placeholder="Ej: Deuda previa a la implementación del sistema"
                />
              </motion.div>

              {/* Acciones */}
              <motion.div
                variants={fieldV}
                className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-1"
              >
                <button
                  type="button"
                  onClick={handleClose}
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
                  {saving ? 'Guardando…' : saved ? 'Cargado' : 'Cargar saldo'}
                </button>
              </motion.div>

              {/* Nota bloqueo */}
              {saved && (
                <div className="text-[11px] text-emerald-600">
                  El saldo previo fue registrado. El formulario quedó bloqueado
                  para evitar duplicados.
                </div>
              )}
            </motion.form>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
