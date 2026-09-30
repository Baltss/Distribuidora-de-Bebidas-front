// src/Components/Facturacion/ReportesContadorPanel.jsx
// Pestaña "Para el contador" de Facturación: resumen de IVA Ventas del mes
// (por tipo de comprobante y por alícuota) y las descargas que pide el
// contador: Libro IVA en Excel, el archivo para importar en el Libro IVA
// Digital de ARCA y todos los comprobantes en PDF.
import React, { useEffect, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  FileSpreadsheet,
  FileArchive,
  Files,
  AlertTriangle,
  Download,
  Info
} from 'lucide-react';
import { getResumenIva, descargarReporteContador } from '../../api/facturacion';
import { showApiErrorSwal, showSuccessToast } from '../../ui/swal';

const money = (n) =>
  `$ ${Number(n || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const pct = (n) => `${Number(n).toLocaleString('es-AR')}%`;

// Mes calendario en hora argentina (UTC-3), corrido `delta` meses.
function mesAR(delta = 0) {
  const ar = new Date(Date.now() - 3 * 60 * 60 * 1000);
  const d = new Date(Date.UTC(ar.getUTCFullYear(), ar.getUTCMonth() + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

function moverMes(periodo, delta) {
  const [a, m] = periodo.split('-').map(Number);
  const d = new Date(Date.UTC(a, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

const nombreMes = (periodo) => {
  const [a, m] = periodo.split('-').map(Number);
  const texto = new Date(Date.UTC(a, m - 1, 1)).toLocaleDateString('es-AR', { month: 'long', year: 'numeric', timeZone: 'UTC' });
  return texto.charAt(0).toUpperCase() + texto.slice(1);
};

function Kpi({ label, valor, detalle }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 text-xl font-bold text-slate-900">{valor}</p>
      {detalle && <p className="mt-0.5 text-xs text-slate-500">{detalle}</p>}
    </div>
  );
}

function Descarga({ icon: Icon, titulo, children, onClick, cargando, disabled, nota }) {
  return (
    <div className="flex flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2">
        <Icon className="h-5 w-5 text-teal-600" />
        <h3 className="font-semibold text-slate-800">{titulo}</h3>
      </div>
      <p className="mt-1.5 flex-1 text-sm text-slate-500">{children}</p>
      {nota && <p className="mt-2 text-xs text-amber-700">{nota}</p>}
      <button
        onClick={onClick}
        disabled={disabled || cargando}
        className="mt-3 inline-flex items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-50"
      >
        {cargando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
        {cargando ? 'Generando…' : 'Descargar'}
      </button>
    </div>
  );
}

export default function ReportesContadorPanel({ onVerSinAutorizar }) {
  // Por defecto el mes anterior: es el que se presenta.
  const [periodo, setPeriodo] = useState(() => mesAR(-1));
  const [resumen, setResumen] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [descargando, setDescargando] = useState(null);

  useEffect(() => {
    let vigente = true;
    setCargando(true);
    getResumenIva(periodo)
      .then((r) => vigente && setResumen(r))
      .catch((err) => vigente && showApiErrorSwal(err, { title: 'No se pudo cargar el resumen' }))
      .finally(() => vigente && setCargando(false));
    return () => {
      vigente = false;
    };
  }, [periodo]);

  const descargar = async (tipo) => {
    try {
      setDescargando(tipo);
      const nombre = await descargarReporteContador(tipo, periodo);
      showSuccessToast('Descargado', nombre);
    } catch (err) {
      await showApiErrorSwal(err, { title: 'No se pudo generar el archivo' });
    } finally {
      setDescargando(null);
    }
  };

  const esMesActual = periodo === mesAR(0);
  const hayComprobantes = (resumen?.totales?.cantidad || 0) > 0;
  const t = resumen?.totales;

  return (
    <div className="mt-6 space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex items-center rounded-xl border border-slate-200 bg-white shadow-sm">
          <button
            onClick={() => setPeriodo((p) => moverMes(p, -1))}
            className="px-3 py-2 text-slate-500 hover:text-slate-800"
            aria-label="Mes anterior"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <input
            type="month"
            value={periodo}
            max={mesAR(0)}
            onChange={(e) => e.target.value && setPeriodo(e.target.value)}
            className="border-x border-slate-200 px-3 py-2 text-sm text-slate-700 focus:outline-none"
            aria-label="Período"
          />
          <button
            onClick={() => setPeriodo((p) => moverMes(p, 1))}
            disabled={esMesActual}
            className="px-3 py-2 text-slate-500 hover:text-slate-800 disabled:opacity-30"
            aria-label="Mes siguiente"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <p className="text-sm text-slate-500">
          IVA Ventas de <span className="font-semibold text-slate-700">{nombreMes(periodo)}</span>
          {esMesActual && ' (mes en curso: todavía puede cambiar)'}
        </p>
        {cargando && <Loader2 className="h-4 w-4 animate-spin text-teal-500" />}
      </div>

      {resumen?.sin_autorizar > 0 && (
        <button
          onClick={onVerSinAutorizar}
          className="w-full flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-left text-sm text-amber-800 hover:bg-amber-100"
        >
          <AlertTriangle className="h-4 w-4 shrink-0" />
          Hay {resumen.sin_autorizar} comprobante{resumen.sin_autorizar === 1 ? '' : 's'} de este mes sin autorizar (en
          proceso o con error): no entran en el libro. Resolvelos en Comprobantes antes de pasarle el mes al contador.
        </button>
      )}

      {resumen && !hayComprobantes && !cargando && (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
          No hay comprobantes autorizados en {nombreMes(periodo)}.
        </div>
      )}

      {resumen && hayComprobantes && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Kpi label="Total facturado" valor={money(t.total)} detalle="Notas de crédito restando" />
            <Kpi label="IVA débito fiscal" valor={money(t.iva)} detalle="Lo que va a la declaración de IVA" />
            <Kpi label="Neto gravado" valor={money(t.neto_gravado)} detalle={t.exento || t.no_gravado ? `Exento ${money(t.exento)} · No gravado ${money(t.no_gravado)}` : null} />
            <Kpi label="Comprobantes" valor={t.cantidad} />
          </div>

          <div className="space-y-4">
            <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
              <p className="px-4 pt-3 pb-2 text-sm font-semibold text-slate-700">Por tipo de comprobante</p>
              <table className="min-w-full text-sm whitespace-nowrap">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-2 text-left">Comprobante</th>
                    <th className="px-4 py-2 text-right">Cant.</th>
                    <th className="px-4 py-2 text-right">Neto gravado</th>
                    <th className="px-4 py-2 text-right">IVA</th>
                    <th className="px-4 py-2 text-right">Exento / No grav.</th>
                    <th className="px-4 py-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {resumen.por_tipo.map((r) => {
                    const signo = r.es_nc ? '− ' : '';
                    return (
                      <tr key={r.tipo} className={`border-t border-slate-100 ${r.es_nc ? 'text-rose-700' : 'text-slate-700'}`}>
                        <td className="px-4 py-2 font-medium">{r.nombre}</td>
                        <td className="px-4 py-2 text-right">{r.cantidad}</td>
                        <td className="px-4 py-2 text-right">{r.neto_gravado ? signo + money(r.neto_gravado) : '—'}</td>
                        <td className="px-4 py-2 text-right">{r.iva ? signo + money(r.iva) : '—'}</td>
                        <td className="px-4 py-2 text-right">
                          {r.exento + r.no_gravado ? signo + money(r.exento + r.no_gravado) : '—'}
                        </td>
                        <td className="px-4 py-2 text-right font-semibold">{signo + money(r.total)}</td>
                      </tr>
                    );
                  })}
                  <tr className="border-t-2 border-slate-200 font-bold text-slate-900">
                    <td className="px-4 py-2">Total del mes</td>
                    <td className="px-4 py-2 text-right">{t.cantidad}</td>
                    <td className="px-4 py-2 text-right">{money(t.neto_gravado)}</td>
                    <td className="px-4 py-2 text-right">{money(t.iva)}</td>
                    <td className="px-4 py-2 text-right">{money(t.exento + t.no_gravado)}</td>
                    <td className="px-4 py-2 text-right">{money(t.total)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="max-w-xl overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
              <p className="px-4 pt-3 pb-2 text-sm font-semibold text-slate-700">IVA por alícuota (débito fiscal)</p>
              {resumen.por_alicuota.length === 0 ? (
                <p className="px-4 pb-4 text-sm text-slate-500">Sin IVA discriminado en el mes.</p>
              ) : (
                <table className="min-w-full text-sm whitespace-nowrap">
                  <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-4 py-2 text-left">Alícuota</th>
                      <th className="px-4 py-2 text-right">Neto gravado</th>
                      <th className="px-4 py-2 text-right">IVA</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resumen.por_alicuota.map((a) => (
                      <tr key={a.porcentaje} className="border-t border-slate-100 text-slate-700">
                        <td className="px-4 py-2 font-medium">{pct(a.porcentaje)}</td>
                        <td className="px-4 py-2 text-right">{money(a.base)}</td>
                        <td className="px-4 py-2 text-right">{money(a.iva)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Descarga
              icon={FileSpreadsheet}
              titulo="Libro IVA Ventas (Excel)"
              onClick={() => descargar('excel')}
              cargando={descargando === 'excel'}
            >
              Un renglón por comprobante con el IVA de cada alícuota, más una hoja con este resumen. Para revisar o mandarle
              al contador.
            </Descarga>
            <Descarga
              icon={FileArchive}
              titulo="Archivo para ARCA (Libro IVA Digital)"
              onClick={() => descargar('arca')}
              cargando={descargando === 'arca'}
              disabled={!resumen.libro_iva_digital_aplica}
              nota={
                !resumen.libro_iva_digital_aplica
                  ? 'Este emisor no discrimina IVA: no presenta Libro IVA Digital de ventas.'
                  : resumen.hay_comprobantes_c
                    ? 'Los comprobantes C (de monotributo) no se incluyen.'
                    : null
              }
            >
              ZIP con los dos archivos que se importan en Portal IVA → Libro IVA Digital → Ventas: primero el de
              comprobantes y después el de alícuotas.
            </Descarga>
            <Descarga
              icon={Files}
              titulo="Comprobantes en PDF"
              onClick={() => descargar('pdfs')}
              cargando={descargando === 'pdfs'}
            >
              ZIP con todas las facturas y notas del mes, un PDF por comprobante. Si son muchos puede tardar un par de
              minutos.
            </Descarga>
          </div>

          <p className="flex items-start gap-2 text-xs text-slate-500">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            Se toman los comprobantes autorizados por ARCA con fecha de este mes, tal como se emitieron. Las facturas
            anuladas se incluyen igual, junto con la nota de crédito que las anula.
          </p>
        </>
      )}
    </div>
  );
}
