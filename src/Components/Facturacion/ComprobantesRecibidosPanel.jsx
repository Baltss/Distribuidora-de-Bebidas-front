// src/Components/Facturacion/ComprobantesRecibidosPanel.jsx
// Pestaña "Compras" de Facturación: facturas y notas que los proveedores le
// emitieron a un CUIT propio (Libro IVA Compras). Las de mercadería se cargan
// solas al registrar la compra con sus datos fiscales; acá se cargan a mano las
// de servicios y gastos, o se importa el CSV de "Mis Comprobantes" de ARCA.
import React, { useCallback, useEffect, useState } from 'react';
import { Loader2, Plus, Upload } from 'lucide-react';
import {
  listComprobantesRecibidos,
  crearComprobanteRecibido,
  updateComprobanteRecibido,
  anularComprobanteRecibido,
  importarMisComprobantes
} from '../../api/facturacion';
import useEstadoEmision from '../../hooks/useEstadoEmision';
import useCatalogoFiscal from '../../hooks/useCatalogoFiscal';
import { formatearCuit, nombreEmisor } from '../../utils/emisores';
import { mesAR, nombreMes } from '../../utils/periodo';
import { showApiErrorSwal, showConfirmSwal, showSuccessToast } from '../../ui/swal';
import SelectorMes from './SelectorMes';
import ComprobanteRecibidoModal from './ComprobanteRecibidoModal';
import ImportarMisComprobantesModal from './ImportarMisComprobantesModal';
import moneyAR from '../../utils/money';

const ORIGEN = { manual: 'Manual', compra: 'Compra', mis_comprobantes: 'Mis Comprobantes' };
const esNc = (catalogo, tipo) => catalogo?.comprobantes?.find((c) => c.id === tipo)?.clase === 'nc';

export default function ComprobantesRecibidosPanel() {
  const catalogo = useCatalogoFiscal();
  const estado = useEstadoEmision();
  const emisores = estado?.emisores || [];
  const [emisorElegido, setEmisorElegido] = useState(null);
  const emisorId = emisorElegido ?? emisores[0]?.id ?? null;

  const [periodo, setPeriodo] = useState(() => mesAR(0));
  const [q, setQ] = useState('');
  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [modal, setModal] = useState({ abierto: false, comprobante: null });
  const [importarAbierto, setImportarAbierto] = useState(false);

  const cargar = useCallback(async () => {
    if (emisorId == null) return;
    setCargando(true);
    try {
      setDatos(await listComprobantesRecibidos({ emisor_id: emisorId, periodo, q: q.trim() || undefined, estado: 'activo' }));
    } catch (err) {
      await showApiErrorSwal(err, { title: 'No se pudieron cargar los comprobantes de compra' });
    } finally {
      setCargando(false);
    }
  }, [emisorId, periodo, q]);

  useEffect(() => {
    const t = setTimeout(cargar, q ? 300 : 0);
    return () => clearTimeout(t);
  }, [cargar, q]);

  const guardar = async (payload) => {
    try {
      if (modal.comprobante) await updateComprobanteRecibido(modal.comprobante.id, payload);
      else await crearComprobanteRecibido({ ...payload, emisor_id: payload.emisor_id ?? emisorId });
      showSuccessToast('Comprobante guardado');
      await cargar();
    } catch (err) {
      await showApiErrorSwal(err, { title: 'No se pudo guardar el comprobante' });
      throw err; // el modal queda abierto
    }
  };

  const importar = async (payload) => {
    try {
      const r = await importarMisComprobantes({ ...payload, emisor_id: emisorId });
      await cargar();
      return r;
    } catch (err) {
      await showApiErrorSwal(err, { title: 'No se pudo importar el archivo' });
      throw err;
    }
  };

  const anular = async (c) => {
    const ok = await showConfirmSwal('Anular comprobante', `Se saca del Libro IVA Compras: ${c.proveedor_nombre} ${String(c.punto_venta).padStart(5, '0')}-${String(c.numero).padStart(8, '0')}.`);
    if (!ok) return;
    try {
      await anularComprobanteRecibido(c.id);
      await cargar();
    } catch (err) {
      await showApiErrorSwal(err, { title: 'No se pudo anular el comprobante' });
    }
  };

  const nombreTipo = (tipo) => catalogo?.comprobantes?.find((c) => c.id === tipo)?.nombre || `Tipo ${tipo}`;
  const comprobantes = datos?.comprobantes || [];

  return (
    <div className="mt-6 space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <SelectorMes periodo={periodo} onChange={setPeriodo} />
        {emisores.length > 1 && (
          <select value={emisorId ?? ''} onChange={(e) => setEmisorElegido(Number(e.target.value))} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:outline-none" aria-label="CUIT">
            {emisores.map((e) => (
              <option key={e.id} value={e.id}>
                {nombreEmisor(e)} · CUIT {formatearCuit(e.cuit)}
              </option>
            ))}
          </select>
        )}
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar proveedor, CUIT o número"
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-400/40"
        />
        {cargando && <Loader2 className="h-4 w-4 animate-spin text-teal-500" />}
        <div className="ml-auto flex gap-2">
          <button onClick={() => setImportarAbierto(true)} className="inline-flex items-center gap-2 rounded-xl border border-teal-200 px-3 py-2 text-sm font-semibold text-teal-700 hover:bg-teal-50">
            <Upload className="h-4 w-4" /> Importar de ARCA
          </button>
          <button onClick={() => setModal({ abierto: true, comprobante: null })} className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-3 py-2 text-sm font-semibold text-white hover:bg-teal-700">
            <Plus className="h-4 w-4" /> Nuevo
          </button>
        </div>
      </div>

      <p className="text-sm text-slate-500">
        Comprobantes de compra que se computan en <span className="font-semibold text-slate-700">{nombreMes(periodo)}</span>
        {datos && ` · ${comprobantes.length}${datos.truncado ? '+' : ''} · Total ${moneyAR(datos.total)}`}
      </p>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full text-sm whitespace-nowrap">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-2 text-left">Fecha</th>
              <th className="px-4 py-2 text-left">Comprobante</th>
              <th className="px-4 py-2 text-left">Proveedor</th>
              <th className="px-4 py-2 text-right">Neto</th>
              <th className="px-4 py-2 text-right">IVA</th>
              <th className="px-4 py-2 text-right">Percepciones</th>
              <th className="px-4 py-2 text-right">Total</th>
              <th className="px-4 py-2 text-left">Origen</th>
              <th className="px-4 py-2 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {datos && comprobantes.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-slate-500">
                  No hay comprobantes de compra en este mes.
                </td>
              </tr>
            )}
            {comprobantes.map((c) => {
              const signo = esNc(catalogo, c.tipo_comprobante) ? '− ' : '';
              const percepciones = c.percepcion_iva + c.percepcion_iibb + c.percepcion_nacional + c.percepcion_municipal;
              return (
                <tr key={c.id} className={`border-t border-slate-100 ${signo ? 'text-rose-700' : 'text-slate-700'}`}>
                  <td className="px-4 py-2">{c.fecha_comprobante.split('-').reverse().join('/')}</td>
                  <td className="px-4 py-2 font-medium">
                    {nombreTipo(c.tipo_comprobante)}
                    <span className="block text-[11px] font-normal text-slate-500">
                      {String(c.punto_venta).padStart(5, '0')}-{String(c.numero).padStart(8, '0')}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    {c.proveedor_nombre}
                    <span className="block text-[11px] text-slate-500">{c.proveedor_documento !== '0' ? formatearCuit(c.proveedor_documento) : ''}</span>
                  </td>
                  <td className="px-4 py-2 text-right">{c.importe_neto ? signo + moneyAR(c.importe_neto) : '—'}</td>
                  <td className="px-4 py-2 text-right">
                    {c.importe_iva ? signo + moneyAR(c.importe_iva) : '—'}
                    {c.importe_iva > 0 && !c.computa_credito && <span className="block text-[11px] text-amber-700">no computable</span>}
                  </td>
                  <td className="px-4 py-2 text-right">{percepciones ? signo + moneyAR(percepciones) : '—'}</td>
                  <td className="px-4 py-2 text-right font-semibold">{signo + moneyAR(c.importe_total)}</td>
                  <td className="px-4 py-2 text-slate-500">{ORIGEN[c.origen]}</td>
                  <td className="px-4 py-2 text-center">
                    {c.origen === 'compra' ? (
                      <span className="text-[11px] text-slate-400">desde la compra</span>
                    ) : (
                      <>
                        <button onClick={() => setModal({ abierto: true, comprobante: c })} className="mr-3 text-xs font-semibold text-teal-700 hover:text-teal-800">
                          Editar
                        </button>
                        <button onClick={() => anular(c)} className="text-xs font-semibold text-slate-500 hover:text-rose-600">
                          Anular
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <ComprobanteRecibidoModal open={modal.abierto} onClose={() => setModal({ abierto: false, comprobante: null })} onSubmit={guardar} comprobante={modal.comprobante} emisorId={emisorId} />
      <ImportarMisComprobantesModal open={importarAbierto} onClose={() => setImportarAbierto(false)} onImportar={importar} periodoInicial={periodo} />
    </div>
  );
}
