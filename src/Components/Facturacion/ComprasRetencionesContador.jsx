// src/Components/Facturacion/ComprasRetencionesContador.jsx
// Lo que el contador necesita del lado de las compras y las retenciones del mes:
// Libro IVA Compras (Excel y archivo para ARCA), y las retenciones sufridas
// (las que le hicieron al negocio) y practicadas (las que el negocio le hizo a
// proveedores), en Excel. Va dentro de la pestaña "Para el contador".
import React, { useEffect, useState } from 'react';
import { Download, FileArchive, FileSpreadsheet, Loader2 } from 'lucide-react';
import { descargarReporteContador, getResumenCompras, getResumenRetenciones } from '../../api/facturacion';
import { showApiErrorSwal, showSuccessToast } from '../../ui/swal';
import moneyAR from '../../utils/money';

function Boton({ onClick, cargando, disabled, children }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || cargando}
      className="inline-flex items-center gap-2 rounded-xl border border-teal-200 px-3 py-1.5 text-sm font-semibold text-teal-700 hover:bg-teal-50 disabled:opacity-50"
    >
      {cargando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
      {children}
    </button>
  );
}

export default function ComprasRetencionesContador({ periodo, emisorId }) {
  const [compras, setCompras] = useState(null);
  const [sufridas, setSufridas] = useState(null);
  const [practicadas, setPracticadas] = useState(null);
  const [descargando, setDescargando] = useState(null);

  useEffect(() => {
    if (emisorId == null) return undefined;
    let vigente = true;
    setCompras(null);
    setSufridas(null);
    setPracticadas(null);
    const fallo = (err) => vigente && showApiErrorSwal(err, { title: 'No se pudieron cargar las compras del mes' });
    getResumenCompras(periodo, emisorId).then((r) => vigente && setCompras(r)).catch(fallo);
    getResumenRetenciones('sufridas', periodo, emisorId).then((r) => vigente && setSufridas(r)).catch(fallo);
    getResumenRetenciones('practicadas', periodo, emisorId).then((r) => vigente && setPracticadas(r)).catch(fallo);
    return () => {
      vigente = false;
    };
  }, [periodo, emisorId]);

  const descargar = async (tipo) => {
    try {
      setDescargando(tipo);
      showSuccessToast('Descargado', await descargarReporteContador(tipo, periodo, emisorId));
    } catch (err) {
      await showApiErrorSwal(err, { title: 'No se pudo generar el archivo' });
    } finally {
      setDescargando(null);
    }
  };

  const hayCompras = (compras?.totales?.cantidad || 0) > 0;
  const percepciones = compras ? Object.values(compras.totales.percepciones).reduce((a, b) => a + b, 0) : 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="flex items-center gap-2 text-sm font-semibold text-slate-700">
          <FileSpreadsheet className="h-4 w-4 text-teal-600" /> Libro IVA Compras
        </p>
        {!compras ? (
          <Loader2 className="mt-3 h-4 w-4 animate-spin text-teal-500" />
        ) : !hayCompras ? (
          <p className="mt-2 text-sm text-slate-500">No hay comprobantes de compra imputados a este mes. Cargalos en la pestaña Compras.</p>
        ) : (
          <>
            <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
              <dt className="text-slate-500">Comprobantes</dt>
              <dd className="text-right font-semibold">{compras.totales.cantidad}</dd>
              <dt className="text-slate-500">Neto gravado</dt>
              <dd className="text-right font-semibold">{moneyAR(compras.totales.neto)}</dd>
              <dt className="text-slate-500">Crédito fiscal computable</dt>
              <dd className="text-right font-semibold">{moneyAR(compras.totales.credito_fiscal)}</dd>
              <dt className="text-slate-500">Percepciones sufridas</dt>
              <dd className="text-right font-semibold">{moneyAR(percepciones)}</dd>
              <dt className="text-slate-500">Total de compras</dt>
              <dd className="text-right font-semibold">{moneyAR(compras.totales.total)}</dd>
            </dl>
            <div className="mt-3 flex flex-wrap gap-2">
              <Boton onClick={() => descargar('compras_excel')} cargando={descargando === 'compras_excel'}>
                Excel
              </Boton>
              <Boton onClick={() => descargar('compras_arca')} cargando={descargando === 'compras_arca'} disabled={!compras.libro_iva_digital_aplica}>
                <FileArchive className="h-4 w-4" /> Archivo para ARCA
              </Boton>
            </div>
            {!compras.libro_iva_digital_aplica && <p className="mt-2 text-xs text-amber-700">Este emisor no discrimina IVA: no presenta Libro IVA Digital de compras.</p>}
          </>
        )}
      </div>

      {[
        ['sufridas', 'Retenciones sufridas', 'Las que le hicieron al negocio al cobrar (pagos a cuenta).', sufridas],
        ['practicadas', 'Retenciones practicadas', 'Las que el negocio le hizo a proveedores como agente de retención.', practicadas]
      ].map(([tipo, titulo, ayuda, datos]) => (
        <div key={tipo} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm font-semibold text-slate-700">{titulo}</p>
          <p className="text-xs text-slate-500">{ayuda}</p>
          {!datos ? (
            <Loader2 className="mt-3 h-4 w-4 animate-spin text-teal-500" />
          ) : datos.retenciones.length === 0 ? (
            <p className="mt-2 text-sm text-slate-500">Sin retenciones en el mes.</p>
          ) : (
            <>
              <ul className="mt-2 space-y-0.5 text-sm">
                {datos.por_impuesto.map((g) => (
                  <li key={`${g.impuesto}-${g.jurisdiccion ?? ''}`} className="flex justify-between text-slate-700">
                    <span>
                      {g.nombre}
                      {g.jurisdiccion ? ` · ${g.jurisdiccion}` : ''} <span className="text-slate-400">({g.cantidad})</span>
                    </span>
                    <span className="font-semibold">{moneyAR(g.importe)}</span>
                  </li>
                ))}
                <li className="flex justify-between border-t border-slate-100 pt-1 font-bold text-slate-900">
                  <span>Total</span>
                  <span>{moneyAR(datos.total)}</span>
                </li>
              </ul>
              <div className="mt-3">
                <Boton onClick={() => descargar(`retenciones_${tipo}`)} cargando={descargando === `retenciones_${tipo}`}>
                  Excel
                </Boton>
              </div>
            </>
          )}
        </div>
      ))}
    </div>
  );
}
