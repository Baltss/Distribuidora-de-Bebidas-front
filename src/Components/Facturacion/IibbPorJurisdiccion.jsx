// src/Components/Facturacion/IibbPorJurisdiccion.jsx
// Ingresos Brutos del mes por jurisdicción de destino de la venta: base
// imponible y percepciones practicadas. Es lo que el contador necesita para
// declarar (Convenio Multilateral o local). Va dentro de la pestaña "Para el contador".
import React, { useEffect, useState } from 'react';
import { AlertTriangle, Download, Loader2, MapPinned } from 'lucide-react';
import { getReporteIibb } from '../../api/facturacion';
import useCatalogoFiscal from '../../hooks/useCatalogoFiscal';
import { showApiErrorSwal } from '../../ui/swal';

const money = (n) => `$ ${Number(n || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function IibbPorJurisdiccion({ periodo, emisorId, onDescargar, descargando }) {
  const catalogo = useCatalogoFiscal();
  const [reporte, setReporte] = useState(null);

  useEffect(() => {
    if (emisorId == null) return undefined;
    let vigente = true;
    setReporte(null);
    getReporteIibb(periodo, emisorId)
      .then((r) => vigente && setReporte(r))
      .catch((err) => vigente && showApiErrorSwal(err, { title: 'No se pudo cargar Ingresos Brutos' }));
    return () => {
      vigente = false;
    };
  }, [periodo, emisorId]);

  if (!reporte || reporte.totales.cantidad === 0) return null;

  const cm = reporte.regimen === 'convenio_multilateral';
  const regimen = catalogo?.regimenes_iibb.find((r) => r.id === reporte.regimen)?.label;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 pt-3 pb-2">
        <div>
          <p className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            <MapPinned className="h-4 w-4 text-teal-600" /> Ingresos Brutos por jurisdicción
          </p>
          <p className="text-xs text-slate-500">
            {regimen}
            {reporte.nro_inscripcion ? ` · Inscripción ${reporte.nro_inscripcion}` : ''}. Base = neto + exento + no gravado; las notas de crédito restan.
          </p>
        </div>
        <button
          onClick={onDescargar}
          disabled={descargando}
          className="inline-flex items-center gap-2 rounded-xl border border-teal-200 px-3 py-1.5 text-sm font-semibold text-teal-700 hover:bg-teal-50 disabled:opacity-50"
        >
          {descargando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} Excel
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm whitespace-nowrap">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-2 text-left">Jurisdicción</th>
              <th className="px-4 py-2 text-right">Cant.</th>
              <th className="px-4 py-2 text-right">Base imponible</th>
              {cm && <th className="px-4 py-2 text-right">Coef.</th>}
              {cm && <th className="px-4 py-2 text-right">Base por coeficiente</th>}
              <th className="px-4 py-2 text-right">Percepciones practicadas</th>
            </tr>
          </thead>
          <tbody>
            {reporte.por_jurisdiccion.map((f) => (
              <tr key={f.jurisdiccion ?? 'sin'} className={`border-t border-slate-100 ${f.jurisdiccion == null ? 'text-amber-700' : 'text-slate-700'}`}>
                <td className="px-4 py-2 font-medium">{f.nombre}</td>
                <td className="px-4 py-2 text-right">{f.cantidad}</td>
                <td className="px-4 py-2 text-right">{money(f.base_total)}</td>
                {cm && <td className="px-4 py-2 text-right">{f.coeficiente == null ? '—' : f.coeficiente.toLocaleString('es-AR', { maximumFractionDigits: 6 })}</td>}
                {cm && <td className="px-4 py-2 text-right">{f.base_por_coeficiente == null ? '—' : money(f.base_por_coeficiente)}</td>}
                <td className="px-4 py-2 text-right">{f.percepciones_practicadas ? money(f.percepciones_practicadas) : '—'}</td>
              </tr>
            ))}
            <tr className="border-t-2 border-slate-200 font-bold text-slate-900">
              <td className="px-4 py-2">Total del mes</td>
              <td className="px-4 py-2 text-right">{reporte.totales.cantidad}</td>
              <td className="px-4 py-2 text-right">{money(reporte.totales.base_total)}</td>
              {cm && <td />}
              {cm && <td />}
              <td className="px-4 py-2 text-right">{money(reporte.totales.percepciones_practicadas)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {reporte.sin_determinar > 0 && (
        <p className="flex items-start gap-2 border-t border-slate-100 px-4 py-3 text-xs text-amber-700">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {reporte.sin_determinar} comprobante(s) no tienen jurisdicción: son anteriores a la carga de Ingresos Brutos o su cliente no tiene jurisdicción
          ni ciudad con provincia y el CUIT no tiene sede definida. Cargá la sede en Datos Fiscales y la jurisdicción en los clientes para que los nuevos queden asignados.
        </p>
      )}
    </div>
  );
}
