// src/Components/Facturacion/DatosEmisorCard.jsx
// Datos del negocio que se imprimen en el comprobante de un CUIT (además de
// CUIT, razón social y condición fiscal). No requieren aprobación: no tocan
// el certificado ni el CUIT.
import React, { useEffect, useState } from 'react';
import { FileText, Save } from 'lucide-react';
import { getDatosEmisor, updateDatosEmisor } from '../../api/facturacion';
import { showApiErrorSwal, showSuccessToast } from '../../ui/swal';

const inputCls =
  'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-400/40';

const VACIO = {
  nombre_fantasia: '',
  domicilio_comercial: '',
  iibb: '',
  inicio_actividades: '',
  telefono: '',
  email: '',
  leyenda_pie: ''
};

function Campo({ label, ayuda, children }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-600 mb-1">{label}</label>
      {children}
      {ayuda && <p className="mt-1 text-[11px] text-slate-400">{ayuda}</p>}
    </div>
  );
}

export default function DatosEmisorCard({ emisorId }) {
  const [datos, setDatos] = useState(VACIO);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    setCargando(true);
    getDatosEmisor(emisorId)
      .then((d) => {
        const limpio = { ...VACIO };
        for (const k of Object.keys(VACIO)) limpio[k] = d?.[k] ?? '';
        setDatos(limpio);
      })
      .catch((err) => showApiErrorSwal(err, { title: 'No se pudieron cargar los datos del comprobante' }))
      .finally(() => setCargando(false));
  }, [emisorId]);

  const set = (k) => (e) => setDatos((d) => ({ ...d, [k]: e.target.value }));

  const guardar = async (e) => {
    e.preventDefault();
    try {
      setGuardando(true);
      await updateDatosEmisor(emisorId, datos);
      showSuccessToast('Datos del comprobante guardados');
    } catch (err) {
      await showApiErrorSwal(err, { title: 'No se pudieron guardar' });
    } finally {
      setGuardando(false);
    }
  };

  const faltan = !datos.domicilio_comercial || !datos.iibb || !datos.inicio_actividades;

  return (
    <form onSubmit={guardar} className="mt-6 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-200">
        <h2 className="font-semibold text-slate-800 flex items-center gap-2">
          <FileText className="h-4 w-4 text-teal-600" /> Datos que se imprimen en el comprobante
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Aparecen en la factura (A4 y ticket) junto al CUIT y la razón social. Se guardan al toque, sin aprobación.
        </p>
      </div>
      {cargando ? (
        <div className="p-6 text-sm text-slate-400">Cargando…</div>
      ) : (
        <div className="p-5 sm:p-6 space-y-4">
          {faltan && (
            <p className="rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-xs text-amber-800">
              ARCA exige que el comprobante muestre el domicilio comercial, el N° de Ingresos Brutos y la fecha de inicio
              de actividades. Completalos antes de imprimir facturas.
            </p>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Campo label="Nombre de fantasía" ayuda="Opcional. Si está, va como título del comprobante.">
              <input value={datos.nombre_fantasia} onChange={set('nombre_fantasia')} maxLength={150} className={inputCls} />
            </Campo>
            <Campo label="Domicilio comercial *">
              <input value={datos.domicilio_comercial} onChange={set('domicilio_comercial')} maxLength={255} className={inputCls} placeholder="Calle 123, Localidad, Provincia" />
            </Campo>
            <Campo label="Ingresos Brutos *" ayuda="Número, o «Exento» / «Convenio Multilateral».">
              <input value={datos.iibb} onChange={set('iibb')} maxLength={50} className={inputCls} />
            </Campo>
            <Campo label="Inicio de actividades *">
              <input type="date" value={datos.inicio_actividades} onChange={set('inicio_actividades')} className={inputCls} />
            </Campo>
            <Campo label="Teléfono">
              <input value={datos.telefono} onChange={set('telefono')} maxLength={50} className={inputCls} />
            </Campo>
            <Campo label="Email">
              <input type="email" value={datos.email} onChange={set('email')} maxLength={120} className={inputCls} />
            </Campo>
          </div>
          <Campo label="Leyenda al pie" ayuda="Opcional. Ej.: «¡Gracias por su compra!»">
            <input value={datos.leyenda_pie} onChange={set('leyenda_pie')} maxLength={255} className={inputCls} />
          </Campo>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={guardando}
              className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60"
            >
              <Save className="h-4 w-4" /> {guardando ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
        </div>
      )}
    </form>
  );
}
