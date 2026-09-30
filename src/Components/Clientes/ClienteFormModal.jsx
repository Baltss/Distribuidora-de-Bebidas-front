// ===============================
// FILE: src/Components/Clientes/ClienteFormModal.jsx
// ===============================
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, Loader2 } from 'lucide-react';
import {
  backdropV,
  panelV,
  formContainerV,
  fieldV
} from '../../ui/animHelpers';

const inputCls =
  'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-400/40 focus:border-transparent';
const labelCls = 'block text-sm font-medium text-slate-600 mb-2';
const errorInputCls = 'ring-2 ring-rose-300 border-rose-300';

// APIs de catálogos (usadas dentro del modal)
import { listCiudades } from '../../api/ciudades';
import { listLocalidades } from '../../api/localidades';
import { listBarrios } from '../../api/barrios';
import http from '../../api/http';
import { API_BASE_URL } from '../../api/apiBase';
import { consultarPadron } from '../../api/facturacion';
import useCatalogoFiscal from '../../hooks/useCatalogoFiscal';
import { esCuitValido, mensajeDeError } from '../../utils/comprobantes';

const selectCls = inputCls.replace('w-full', 'w-auto shrink-0');

// Tipos de documento mientras carga el catálogo del backend.
const DOCUMENTOS_POR_DEFECTO = [
  { id: 80, label: 'CUIT' },
  { id: 86, label: 'CUIL' },
  { id: 96, label: 'DNI' },
  { id: 99, label: 'Sin identificar' }
];
const DOCUMENTO_GENERICO = 'CONSUMIDOR_FINAL'; // cliente "Consumidor Final" del sistema

export default function ClienteFormModal({
  open,
  onClose,
  onSubmit,
  initial,
  barrios: barriosProp = [], // opcional: si no vienen, los pedimos
  vendedores = []
}) {
  // ------- Form -------
  const [form, setForm] = useState({
    nombre: '',
    tipo: 'local', // 'local' | 'reparto'
    documento: '',
    telefono: '',
    email: '',
    estado: 'activo',

    // Datos fiscales (para facturar)
    documento_tipo: '96',
    condicion_iva_id: '5',
    razon_social: '',
    domicilio_fiscal: '',

    // Geografía (cascada)
    ciudad_id: '',
    localidad_id: '',
    barrio_id: '',

    // Domicilio
    direccion_calle: '',
    direccion_numero: '',
    direccion_piso_dpto: '',
    referencia: '',

    // Ubicación
    lat: '',
    lng: '',

    // Vendedor preferido
    vendedor_preferido_id: '',

    // Reparto (asignación inicial desde el modal)
    reparto_id: ''
  });

  const [saving, setSaving] = useState(false);
  const isEdit = !!initial?.id;
  const catalogo = useCatalogoFiscal();

  // Consulta al padrón de ARCA: { estado: 'cargando' | 'ok' | 'error', mensaje }
  const [padron, setPadron] = useState(null);

  // ------- Catálogos -------
  const [ciudades, setCiudades] = useState([]);
  const [localidades, setLocalidades] = useState([]);
  const [barrios, setBarrios] = useState(barriosProp);

  // ------- Repartos -------
  const [repartos, setRepartos] = useState([]);
  const [repartosLoading, setRepartosLoading] = useState(false);

  // UI/UX: detalle opcional (localidad/barrio)
  const [showGeoDetail, setShowGeoDetail] = useState(false);

  // Validación visual: mostrar errores luego del primer submit
  const [attempted, setAttempted] = useState(false);

  // Helpers locales
  const toNumOrNull = (v) => {
    if (v === '' || v === undefined || v === null) return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };

  const resolveRepartoId = (obj) => {
    try {
      if (!obj || typeof obj !== 'object') return '';

      const arr = Array.isArray(obj.asignaciones_repartos)
        ? obj.asignaciones_repartos
        : [];

      // SOLO ACTIVO
      const active = arr.find((x) => String(x?.estado) === 'activo');
      if (!active) return '';

      const id =
        active?.reparto_id ??
        active?.reparto?.id ??
        active?.repartoId ??
        active?.repartoID;

      return id != null && id !== '' ? String(id) : '';
    } catch {
      return '';
    }
  };

  // Base URL centralizada (ver src/api/apiBase.js)
  const API_BASE = API_BASE_URL;

  // Si no nos pasaron barrios por props, los cargamos
  useEffect(() => {
    setBarrios(barriosProp);
  }, [barriosProp]);

  useEffect(() => {
    if (!open) return;

    const ctrl = new AbortController();

    (async () => {
      try {
        setRepartosLoading(true);

        const fetchRepartos = async () => {
          const resp = await fetch(`${API_BASE}/repartos`, {
            signal: ctrl.signal
          });
          if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
          const json = await resp.json();
          // soporta respuesta array o {data: []}
          return Array.isArray(json) ? json : json?.data || [];
        };

        const [cRes, lRes, rRes] = await Promise.all([
          listCiudades({ orderBy: 'nombre', orderDir: 'ASC', limit: 1000 }),
          listLocalidades({ orderBy: 'nombre', orderDir: 'ASC', limit: 5000 }),
          fetchRepartos()
        ]);

        setCiudades(Array.isArray(cRes) ? cRes : cRes?.data || []);
        setLocalidades(Array.isArray(lRes) ? lRes : lRes?.data || []);
        setRepartos(Array.isArray(rRes) ? rRes : []);

        if (!barriosProp?.length) {
          const bRes = await listBarrios({
            orderBy: 'nombre',
            orderDir: 'ASC',
            limit: 10000
          });
          setBarrios(Array.isArray(bRes) ? bRes : bRes?.data || []);
        }
      } catch (e) {
        if (e?.name !== 'AbortError') {
          console.error('Error cargando catálogos:', e);
        }
      } finally {
        setRepartosLoading(false);
      }
    })();

    return () => ctrl.abort();
  }, [open]); // eslint-disable-line

  // ------- Inicialización de edición -------
  useEffect(() => {
    if (!open) return;

    // Intenta deducir ciudad/localidad desde el barrio_id de initial
    const seed = {
      nombre: initial?.nombre || '',
      tipo: initial?.tipo === 'reparto' ? 'reparto' : 'local',
      documento: initial?.documento || '',
      telefono: initial?.telefono || '',
      email: initial?.email || '',
      estado: initial?.estado || 'activo',

      documento_tipo: String(initial?.documento_tipo ?? 96),
      condicion_iva_id: String(initial?.condicion_iva_id ?? 5),
      razon_social: initial?.razon_social || '',
      domicilio_fiscal: initial?.domicilio_fiscal || '',

      ciudad_id: initial?.ciudad_id ? String(initial.ciudad_id) : '',
      localidad_id: '',
      barrio_id: initial?.barrio_id ?? '',

      direccion_calle: initial?.direccion_calle || '',
      direccion_numero: initial?.direccion_numero || '',
      direccion_piso_dpto: initial?.direccion_piso_dpto || '',
      referencia: initial?.referencia || '',

      lat:
        initial?.lat === null || initial?.lat === undefined
          ? ''
          : String(initial.lat),
      lng:
        initial?.lng === null || initial?.lng === undefined
          ? ''
          : String(initial.lng),

      vendedor_preferido_id:
        initial?.vendedor_preferido_id == null
          ? ''
          : String(initial.vendedor_preferido_id),

      // Reparto (asignación inicial desde el modal)
      reparto_id: resolveRepartoId(initial)
    };

    // Si el include trae incGeo, usarlo directo
    const locIdFromInclude = initial?.barrio?.localidad?.id;
    const ciudadIdFromInclude = initial?.barrio?.localidad?.ciudad?.id;

    // Si no viene include, intentar resolver por catálogo (barrios -> localidad_id -> ciudad_id)
    let localidad_id = locIdFromInclude || '';
    let ciudad_id = seed.ciudad_id || ciudadIdFromInclude || '';

    if (!localidad_id || !ciudad_id) {
      const b = (barriosProp.length ? barriosProp : barrios).find(
        (x) => Number(x.id) === Number(seed.barrio_id)
      );
      if (b?.localidad_id) {
        localidad_id = b.localidad_id;
      }
      if (!ciudad_id && localidad_id) {
        const loc = (localidades.length ? localidades : []).find(
          (l) => Number(l.id) === Number(localidad_id)
        );
        if (loc?.ciudad_id) ciudad_id = loc.ciudad_id;
      }
    }

    // Si trae barrio/localidad, mostramos el detalle automáticamente
    const hasDetail =
      (seed.barrio_id && Number(seed.barrio_id)) ||
      (localidad_id && Number(localidad_id));

    setShowGeoDetail(!!hasDetail);

    const repartoFromInitial = resolveRepartoId(initial);

    setForm((f) => ({
      ...seed,
      ciudad_id: ciudad_id || '',
      localidad_id: localidad_id || '',
      reparto_id: repartoFromInitial || f.reparto_id || ''
    }));

    setAttempted(false);
    setPadron(null);
  }, [open, initial, barrios, localidades, barriosProp]);

  // Si en edición el "initial" no trae reparto, intentamos hidratar desde GET /clientes/:id
  useEffect(() => {
    if (!open) return;
    if (!isEdit) return;
    if (!initial?.id) return;

    const repFromInitial = resolveRepartoId(initial);
    if (repFromInitial) return; // ya vino

    let alive = true;

    (async () => {
      try {
        const { data } = await http.get(`/clientes/${initial.id}`);

        if (!alive) return;

        const repId = resolveRepartoId(data);

        if (repId) {
          setForm((f) => ({
            ...f,
            reparto_id: f.reparto_id || repId // no pisar si ya se seteo
          }));
        }
      } catch (e) {
        console.log('[ClienteFormModal] hidratar error', e?.message || e);
      }
    })();

    return () => {
      alive = false;
    };
  }, [open, isEdit, initial?.id]);

  // ------- Cascada (filtros derivados) -------
  const localidadesFiltradas = useMemo(() => {
    const cid = Number(form.ciudad_id) || null;
    if (!cid) return localidades;
    return localidades.filter((l) => Number(l.ciudad_id) === cid);
  }, [localidades, form.ciudad_id]);

  const barriosFiltrados = useMemo(() => {
    const lid = Number(form.localidad_id) || null;
    if (!lid) return [];
    return barrios.filter((b) => Number(b.localidad_id) === lid);
  }, [barrios, form.localidad_id]);

  const repartosFiltrados = useMemo(() => {
    const cid = Number(form.ciudad_id) || null;
    const activos = (repartos || []).filter(
      (r) => String(r.estado) === 'activo'
    );
    if (!cid) return activos;
    return activos.filter((r) => Number(r.ciudad_id) === cid);
  }, [repartos, form.ciudad_id]);

  const repartoSeleccionado = useMemo(() => {
    const rid = Number(form.reparto_id) || null;
    if (!rid) return null;
    return (repartos || []).find((r) => Number(r.id) === rid) || null;
  }, [repartos, form.reparto_id]);

  // Al cambiar ciudad -> limpiar localidad y barrio
  const handleCiudad = (e) => {
    const val = e.target.value;
    setForm((f) => ({
      ...f,
      ciudad_id: val,
      localidad_id: '',
      barrio_id: '',
      reparto_id: ''
    }));
  };
  // Al cambiar localidad -> limpiar barrio
  const handleLocalidad = (e) => {
    const val = e.target.value;
    setForm((f) => ({
      ...f,
      localidad_id: val,
      barrio_id: ''
    }));
  };

  const handleBarrio = (e) => {
    const val = e.target.value;
    setForm((f) => ({ ...f, barrio_id: val }));
  };

  const handleReparto = (e) => {
    const val = e.target.value; // '' o '9'
    setForm((f) => ({
      ...f,
      reparto_id: val
    }));
  };

  // ------- Reglas de validación mínimas -------
  const errors = useMemo(() => {
    const out = {};

    const nombreOK = form.nombre.trim().length > 0;
    if (!nombreOK) out.nombre = 'El nombre es obligatorio.';

    //  - 31-08-2026 - Un cliente "local" (mostrador) solo pide nombre y documento.
    if (form.tipo === 'local') {
      const documentoOK = form.documento.trim().length > 0;
      if (!documentoOK) out.documento = 'El documento es obligatorio.';
    }

    // Datos fiscales: el número tiene que corresponder al tipo de documento, y
    // las condiciones de IVA de un contribuyente registrado piden CUIT.
    if (form.documento.trim() !== DOCUMENTO_GENERICO) {
      const tipoDoc = Number(form.documento_tipo);
      const doc = form.documento.trim();
      if (doc && (tipoDoc === 80 || tipoDoc === 86) && !esCuitValido(doc)) {
        out.documento = 'El CUIT/CUIL no es válido (revisá los 11 dígitos).';
      } else if (doc && tipoDoc === 96 && !/^\d{7,8}$/.test(doc.replace(/\D/g, ''))) {
        out.documento = 'El DNI debe tener 7 u 8 dígitos.';
      }
      const condicion = catalogo?.condiciones_iva.find((c) => c.id === Number(form.condicion_iva_id));
      if (condicion?.requiere_cuit && !(tipoDoc === 80 && esCuitValido(doc))) {
        out.condicion_iva_id = `"${condicion.label}" requiere un CUIT válido.`;
      }
    }

    //  - 14-07-2026 - Ciudad y reparto solo son obligatorios para clientes de reparto.
    //  Un cliente "local" (mostrador) no pide datos de entrega.
    if (form.tipo === 'reparto') {
      const ciudadOK = Number(form.ciudad_id) > 0;
      if (!ciudadOK) out.ciudad_id = 'La ciudad es obligatoria.';

      //  - 24-02-2026 - Reparto ahora es obligatorio en el formulario y se valida antes de enviar al backend.
      const repartoRaw = String(form.reparto_id ?? '').trim();
      if (!repartoRaw) {
        out.reparto_id = 'El reparto es obligatorio.';
      } else {
        const rid = Number(repartoRaw);
        if (!Number.isFinite(rid) || rid <= 0) {
          out.reparto_id = 'El reparto seleccionado es inválido.';
        }
      }
    }

    //  - 24-02-2026 - Calle y número dejan de ser obligatorios por requerimiento; se permiten vacíos.
    return out;
  }, [form.nombre, form.tipo, form.documento, form.documento_tipo, form.condicion_iva_id, form.ciudad_id, form.reparto_id, catalogo]);

  const canSave = useMemo(() => {
    return Object.keys(errors).length === 0;
  }, [errors]);

  const showError = (key) => attempted && !!errors[key];
  // Los errores de datos fiscales se muestran apenas se cargan (con el botón
  // deshabilitado nunca se llegaría a "intentar" guardar).
  const showFiscalError = (key) =>
    !!errors[key] && (attempted || key === 'condicion_iva_id' || form.documento.trim() !== '');

  // ------- Handler genérico -------
  const handle = (e) => {
    const { name, value, type, checked } = e.target;
    if (name === 'estado' && type === 'checkbox') {
      setForm((f) => ({ ...f, estado: checked ? 'activo' : 'inactivo' }));
      return;
    }
    setForm((f) => ({ ...f, [name]: value }));
  };

  // Al elegir "Sin identificar" se borra el número (salvo en el cliente genérico del sistema).
  const handleDocumentoTipo = (e) => {
    const val = e.target.value;
    setForm((f) => ({
      ...f,
      documento_tipo: val,
      documento: val === '99' && f.documento.trim() !== DOCUMENTO_GENERICO ? '' : f.documento
    }));
    setPadron(null);
  };

  // Completa razón social, domicilio fiscal y condición de IVA desde el padrón de ARCA.
  const buscarEnArca = async () => {
    setPadron({ estado: 'cargando' });
    try {
      const p = await consultarPadron(form.documento);
      setForm((f) => ({
        ...f,
        nombre: f.nombre.trim() ? f.nombre : p.razon_social || f.nombre,
        razon_social: p.razon_social || f.razon_social,
        domicilio_fiscal: p.domicilio_fiscal || f.domicilio_fiscal,
        condicion_iva_id: p.condicion_iva_id ? String(p.condicion_iva_id) : f.condicion_iva_id
      }));
      setPadron({
        estado: 'ok',
        mensaje: p.condicion_iva_id
          ? 'Datos completados desde ARCA.'
          : 'Datos completados desde ARCA. Elegí la condición frente al IVA: ARCA no la informa de forma concluyente.'
      });
    } catch (err) {
      setPadron({ estado: 'error', mensaje: mensajeDeError(err, 'No se pudo consultar ARCA.') });
    }
  };

  // ------- Submit -------
  const submit = async (e) => {
    e.preventDefault();
    setAttempted(true);
    if (!canSave) return;

    const toNull = (v) => (v === '' || v === undefined ? null : v);
    const esLocal = form.tipo === 'local';
    const repId = form.reparto_id === '' ? null : Number(form.reparto_id);

    try {
      setSaving(true);

      await onSubmit({
        nombre: form.nombre.trim(),
        tipo: form.tipo,
        documento: form.documento?.trim() || null,
        // Sin número el cliente queda "sin identificar".
        documento_tipo: form.documento?.trim() ? Number(form.documento_tipo) : 99,
        condicion_iva_id: Number(form.condicion_iva_id),
        razon_social: form.razon_social?.trim() || null,
        domicilio_fiscal: form.domicilio_fiscal?.trim() || null,
        telefono: form.telefono?.trim() || null,
        email: form.email?.trim() || null,
        estado: form.estado,

        // Ciudad/geografía: solo aplica a clientes de reparto.
        ciudad_id: esLocal ? null : toNumOrNull(form.ciudad_id),

        // Se mantiene por compatibilidad: si el usuario completa detalle, se envía
        barrio_id: esLocal ? null : toNumOrNull(form.barrio_id),

        //  - 24-02-2026 - Dirección detallada opcional: se envía null si calle/número llegan vacíos.
        direccion_calle: esLocal ? null : toNull(form.direccion_calle?.trim()),
        direccion_numero: esLocal ? null : toNull(form.direccion_numero?.trim()),
        direccion_piso_dpto: esLocal
          ? null
          : toNull(form.direccion_piso_dpto?.trim()),
        referencia: esLocal ? null : toNull(form.referencia?.trim()),

        lat: esLocal ? null : toNumOrNull(form.lat),
        lng: esLocal ? null : toNumOrNull(form.lng),

        vendedor_preferido_id: toNumOrNull(form.vendedor_preferido_id),

        // Asignación inicial desde el modal (no aplica a clientes locales)
        reparto_id: esLocal ? null : Number.isFinite(repId) ? repId : null
      });

      // onClose();
    } finally {
      setSaving(false);
    }
  };

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
            className="relative w-full max-w-[92vw] sm:max-w-xl md:max-w-3xl
                       max-h-[85vh] overflow-y-auto overscroll-contain
                       rounded-2xl border border-slate-200 bg-white shadow-2xl"
          >
            <button
              onClick={onClose}
              className="absolute z-50 top-2.5 right-2.5 inline-flex h-9 w-9 items-center justify-center rounded-lg
                         bg-slate-100 border border-slate-200 text-slate-500 hover:bg-slate-200 transition"
              aria-label="Cerrar"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="relative z-10 p-5 sm:p-6 md:p-8">
              <motion.h3
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 260, damping: 24 }}
                className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 mb-5"
              >
                {isEdit ? 'Editar Cliente' : 'Nuevo Cliente'}
              </motion.h3>

              <motion.form
                onSubmit={submit}
                variants={formContainerV}
                initial="hidden"
                animate="visible"
                className="space-y-5 sm:space-y-6"
              >
                {/* Tipo de cliente */}
                <motion.div variants={fieldV}>
                  <label className={labelCls}>Tipo de cliente</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, tipo: 'local' }))}
                      className={`flex-1 px-3.5 py-3 rounded-xl border text-sm font-medium transition ${
                        form.tipo === 'local'
                          ? 'border-teal-300 bg-teal-50 text-teal-700'
                          : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
                      }`}
                    >
                      Local (mostrador)
                    </button>
                    <button
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, tipo: 'reparto' }))}
                      className={`flex-1 px-3.5 py-3 rounded-xl border text-sm font-medium transition ${
                        form.tipo === 'reparto'
                          ? 'border-teal-300 bg-teal-50 text-teal-700'
                          : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
                      }`}
                    >
                      Reparto
                    </button>
                  </div>
                  <p className="mt-2 text-xs text-slate-600">
                    {form.tipo === 'local'
                      ? 'Cliente de mostrador: solo se piden nombre, documento, teléfono y email.'
                      : 'Cliente de reparto: requiere ciudad, dirección y reparto asignado.'}
                  </p>
                </motion.div>

                {/* Nombre */}
                <motion.div variants={fieldV}>
                  <label className={labelCls}>
                    Nombre <span className="text-teal-600">*</span>
                  </label>
                  <input
                    name="nombre"
                    value={form.nombre}
                    onChange={handle}
                    className={`${inputCls} ${showError('nombre') ? errorInputCls : ''}`}
                    placeholder="Nombre y apellido"
                  />
                  {showError('nombre') && (
                    <p className="mt-2 text-xs text-rose-600">
                      {errors.nombre}
                    </p>
                  )}
                </motion.div>

                {/* Documento / Teléfono / Email / Estado */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <motion.div variants={fieldV}>
                    <label className={labelCls}>
                      Documento
                      {form.tipo === 'local' && (
                        <span className="text-teal-600"> *</span>
                      )}
                    </label>
                    <div className="flex gap-2">
                      <select
                        name="documento_tipo"
                        value={form.documento_tipo}
                        onChange={handleDocumentoTipo}
                        className={selectCls}
                        aria-label="Tipo de documento"
                      >
                        {(catalogo?.documentos || DOCUMENTOS_POR_DEFECTO).map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.label}
                          </option>
                        ))}
                      </select>
                      <input
                        name="documento"
                        value={form.documento}
                        onChange={handle}
                        disabled={form.documento_tipo === '99'}
                        className={`${inputCls} disabled:opacity-60 ${showFiscalError('documento') ? errorInputCls : ''}`}
                        placeholder={form.documento_tipo === '96' ? '12345678' : '20-12345678-6'}
                      />
                    </div>
                    {showFiscalError('documento') && (
                      <p className="mt-2 text-xs text-rose-600">
                        {errors.documento}
                      </p>
                    )}
                    {form.documento_tipo === '80' && esCuitValido(form.documento) && (
                      <button
                        type="button"
                        onClick={buscarEnArca}
                        disabled={padron?.estado === 'cargando'}
                        className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-teal-700 hover:text-teal-800 disabled:opacity-60"
                      >
                        {padron?.estado === 'cargando' ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Search className="h-3.5 w-3.5" />
                        )}
                        Buscar en ARCA
                      </button>
                    )}
                    {padron?.mensaje && (
                      <p className={`mt-1 text-xs ${padron.estado === 'error' ? 'text-amber-700' : 'text-emerald-700'}`}>
                        {padron.mensaje}
                      </p>
                    )}
                  </motion.div>

                  <motion.div variants={fieldV}>
                    <label className={labelCls}>Teléfono</label>
                    <input
                      name="telefono"
                      value={form.telefono}
                      onChange={handle}
                      className={inputCls}
                      placeholder="+54 9 ..."
                    />
                  </motion.div>

                  <motion.div variants={fieldV}>
                    <label className={labelCls}>Email</label>
                    <input
                      type="email"
                      name="email"
                      value={form.email}
                      onChange={handle}
                      className={inputCls}
                      placeholder="correo@dominio.com"
                    />
                  </motion.div>

                  <motion.div variants={fieldV} className="flex items-end">
                    <label className="inline-flex items-center gap-3 select-none cursor-pointer">
                      <input
                        type="checkbox"
                        name="estado"
                        checked={form.estado === 'activo'}
                        onChange={handle}
                        className="peer sr-only"
                      />
                      <span
                        className="relative inline-flex h-6 w-11 items-center rounded-full
                                   bg-slate-200 peer-checked:bg-teal-600 transition-colors duration-200"
                        aria-hidden
                      >
                        <span
                          className="absolute left-0.5 h-5 w-5 rounded-full bg-white shadow
                                     peer-checked:translate-x-5 transition-transform duration-200"
                        />
                      </span>
                      <span className="text-sm text-slate-600">
                        {form.estado === 'activo' ? 'Activo' : 'Inactivo'}
                      </span>
                    </label>
                  </motion.div>
                </div>

                {/* Datos fiscales: lo que sale en la factura */}
                <motion.div
                  variants={fieldV}
                  className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4"
                >
                  <p className="text-sm font-semibold text-slate-700">
                    Datos fiscales{' '}
                    <span className="font-normal text-slate-500">(para facturar)</span>
                  </p>
                  <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className={labelCls}>Condición frente al IVA</label>
                      <select
                        name="condicion_iva_id"
                        value={form.condicion_iva_id}
                        onChange={handle}
                        className={`${inputCls} ${showFiscalError('condicion_iva_id') ? errorInputCls : ''}`}
                      >
                        {(catalogo?.condiciones_iva || [{ id: 5, label: 'Consumidor Final' }]).map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.label}
                          </option>
                        ))}
                      </select>
                      {showFiscalError('condicion_iva_id') && (
                        <p className="mt-2 text-xs text-rose-600">
                          {errors.condicion_iva_id}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className={labelCls}>Razón social</label>
                      <input
                        name="razon_social"
                        value={form.razon_social}
                        onChange={handle}
                        className={inputCls}
                        placeholder="Como figura en ARCA (opcional)"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className={labelCls}>Domicilio fiscal</label>
                      <input
                        name="domicilio_fiscal"
                        value={form.domicilio_fiscal}
                        onChange={handle}
                        className={inputCls}
                        placeholder="Como figura en ARCA (opcional)"
                      />
                    </div>
                  </div>
                </motion.div>

                {/* Geografía, reparto y dirección: solo para clientes de reparto */}
                {form.tipo === 'reparto' && (
                  <>
                {/* Geografía (cascada) */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Ciudad */}
                  <motion.div variants={fieldV}>
                    <label className={labelCls}>
                      Ciudad <span className="text-teal-600">*</span>
                    </label>
                    <select
                      name="ciudad_id"
                      value={form.ciudad_id}
                      onChange={handleCiudad}
                      className={`${inputCls} ${showError('ciudad_id') ? errorInputCls : ''}`}
                    >
                      <option value="">Seleccionar…</option>
                      {ciudades.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nombre}
                        </option>
                      ))}
                    </select>
                    {showError('ciudad_id') && (
                      <p className="mt-2 text-xs text-rose-600">
                        {errors.ciudad_id}
                      </p>
                    )}
                  </motion.div>

                  {/* Localidad (filtrada por ciudad) */}
                  <motion.div variants={fieldV}>
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <label className="block text-sm font-medium text-slate-600">
                        Localidad
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowGeoDetail((v) => !v)}
                        className="text-xs text-slate-500 hover:text-slate-700 underline underline-offset-4"
                      >
                        {showGeoDetail
                          ? 'Ocultar detalle'
                          : 'Agregar detalle (opcional)'}
                      </button>
                    </div>

                    <select
                      name="localidad_id"
                      value={form.localidad_id}
                      onChange={handleLocalidad}
                      disabled={!form.ciudad_id || !showGeoDetail}
                      className={`${inputCls} disabled:opacity-60`}
                    >
                      <option value="">
                        {form.ciudad_id
                          ? showGeoDetail
                            ? 'Seleccionar…'
                            : '(Detalle desactivado)'
                          : '(Elegí ciudad primero)'}
                      </option>
                      {localidadesFiltradas.map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.nombre}
                        </option>
                      ))}
                    </select>
                  </motion.div>

                  {/* Barrio (filtrado por localidad) */}
                  <motion.div variants={fieldV}>
                    <label className={labelCls}>Barrio</label>
                    <select
                      name="barrio_id"
                      value={form.barrio_id}
                      onChange={handleBarrio}
                      disabled={!form.localidad_id || !showGeoDetail}
                      className={`${inputCls} disabled:opacity-60`}
                    >
                      <option value="">
                        {form.localidad_id && showGeoDetail
                          ? 'Seleccionar…'
                          : '(Opcional)'}
                      </option>
                      {barriosFiltrados.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.nombre}
                        </option>
                      ))}
                    </select>
                  </motion.div>
                </div>

                {/* Asignación inicial de reparto (desde el modal) */}
                <motion.div variants={fieldV}>
                  <label className={labelCls}>
                    Reparto <span className="text-teal-600">*</span>
                  </label>

                  <select
                    name="reparto_id"
                    value={form.reparto_id}
                    onChange={handleReparto}
                    disabled={!form.ciudad_id || repartosLoading}
                    className={`${inputCls} disabled:opacity-60 ${showError('reparto_id') ? errorInputCls : ''}`}
                  >
                    <option value="">
                      {!form.ciudad_id
                        ? '(Elegí ciudad primero)'
                        : repartosLoading
                          ? 'Cargando repartos…'
                          : 'Seleccionar reparto…'}
                    </option>

                    {repartosFiltrados.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.nombre} ({r.rango_min}–{r.rango_max})
                      </option>
                    ))}
                  </select>

                  {showError('reparto_id') && (
                    <p className="mt-2 text-xs text-rose-600">
                      {errors.reparto_id}
                    </p>
                  )}

                  {!!form.ciudad_id &&
                    !repartosLoading &&
                    repartosFiltrados.length === 0 && (
                      <p className="mt-2 text-xs text-slate-600">
                        No hay repartos activos para la ciudad seleccionada.
                      </p>
                    )}

                  {repartoSeleccionado && (
                    <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3">
                      <div className="text-sm text-slate-700">
                        <span className="font-semibold">
                          {repartoSeleccionado.nombre}
                        </span>{' '}
                        <span className="text-slate-500">
                          {repartoSeleccionado?.ciudad?.nombre
                            ? `- ${repartoSeleccionado.ciudad.nombre}`
                            : ''}
                        </span>
                      </div>
                      <div className="text-xs text-slate-600 mt-1">
                        Rango de clientes: {repartoSeleccionado.rango_min}–
                        {repartoSeleccionado.rango_max}
                      </div>
                    </div>
                  )}
                </motion.div>

                {/* Vendedor preferido */}
                <motion.div variants={fieldV}>
                  <label className={labelCls}>Vendedor preferido</label>
                  <select
                    name="vendedor_preferido_id"
                    value={form.vendedor_preferido_id}
                    onChange={handle}
                    className={inputCls}
                  >
                    <option value="">(Sin asignar)</option>
                    {vendedores.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.nombre}
                        {v.estado === 'inactivo' ? ' (inactivo)' : ''}
                      </option>
                    ))}
                  </select>
                </motion.div>

                {/* Dirección */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <motion.div variants={fieldV}>
                    <label className={labelCls}>Calle</label>
                    <input
                      name="direccion_calle"
                      value={form.direccion_calle}
                      onChange={handle}
                      className={`${inputCls} ${showError('direccion_calle') ? errorInputCls : ''}`}
                      placeholder="Ej: San Martín"
                    />
                    {showError('direccion_calle') && (
                      <p className="mt-2 text-xs text-rose-600">
                        {errors.direccion_calle}
                      </p>
                    )}
                  </motion.div>

                  <motion.div variants={fieldV}>
                    <label className={labelCls}>Número</label>
                    <input
                      name="direccion_numero"
                      value={form.direccion_numero}
                      onChange={handle}
                      className={`${inputCls} ${showError('direccion_numero') ? errorInputCls : ''}`}
                      placeholder="1234"
                    />
                    {showError('direccion_numero') && (
                      <p className="mt-2 text-xs text-rose-600">
                        {errors.direccion_numero}
                      </p>
                    )}
                  </motion.div>

                  <motion.div variants={fieldV}>
                    <label className={labelCls}>Piso / Dpto</label>
                    <input
                      name="direccion_piso_dpto"
                      value={form.direccion_piso_dpto}
                      onChange={handle}
                      className={inputCls}
                      placeholder="2° B"
                    />
                  </motion.div>
                </div>

                {/* Referencia */}
                <motion.div variants={fieldV}>
                  <label className={labelCls}>Referencia</label>
                  <input
                    name="referencia"
                    value={form.referencia}
                    onChange={handle}
                    className={inputCls}
                    placeholder="Frente a..., cerca de..."
                  />
                </motion.div>
                  </>
                )}

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
                    className="px-4 py-2 rounded-xl bg-teal-600 text-white font-semibold
                               hover:bg-teal-700 disabled:opacity-60 disabled:cursor-not-allowed transition"
                  >
                    {saving
                      ? 'Guardando…'
                      : isEdit
                        ? 'Guardar cambios'
                        : 'Crear'}
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
