// src/Components/Facturacion/PadronesIibbCard.jsx
// Padrones de alícuotas de Ingresos Brutos por CUIT que publica cada
// jurisdicción (por ejemplo Rentas Tucumán). Cada organismo tiene su propio
// diseño de archivo: acá se indica en qué columnas están el CUIT y la alícuota.
// Lo ven el dueño y el contador; lo importa el dueño.
import React, { useEffect, useState } from 'react';
import { FileSpreadsheet, Search } from 'lucide-react';
import { listPadrones, importarPadron, consultarCuitEnPadrones } from '../../api/facturacion';
import { showApiErrorSwal, showSuccessSwal } from '../../ui/swal';
import { formatFechaCalendario } from '../../utils/fechaCalendario';
import useCatalogoFiscal from '../../hooks/useCatalogoFiscal';
import { useAuth } from '../../AuthContext';

const inputCls =
  'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-400/40';
const labelCls = 'block text-sm font-medium text-slate-600 mb-1.5';

const VACIO = {
  jurisdiccion: '',
  tipo: 'percepcion',
  separador: 'auto',
  encabezado: true,
  cuit: '',
  alicuota: '',
  desde: '',
  hasta: '',
  vigente_desde: '',
  vigente_hasta: ''
};

export default function PadronesIibbCard() {
  const { userLevel } = useAuth();
  const puedeImportar = String(userLevel || '').toLowerCase() === 'socio';
  const catalogo = useCatalogoFiscal();
  const [padrones, setPadrones] = useState([]);
  const [form, setForm] = useState(null); // null = cerrado
  const [archivo, setArchivo] = useState(null); // { nombre, texto, muestra }
  const [importando, setImportando] = useState(false);
  const [cuitConsulta, setCuitConsulta] = useState('');
  const [consulta, setConsulta] = useState(null);

  const cargar = () => listPadrones().then(setPadrones).catch((err) => showApiErrorSwal(err, { title: 'No se pudieron cargar los padrones' }));
  useEffect(() => {
    cargar();
  }, []);

  const jurisdiccion = (id) => catalogo?.jurisdicciones.find((j) => j.id === id)?.label || id;
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const elegirArchivo = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const texto = await file.text();
    setArchivo({ nombre: file.name, texto, muestra: texto.split(/\r?\n/).slice(0, 3).join('\n') });
  };

  const importar = async (e) => {
    e.preventDefault();
    if (!archivo) return;
    try {
      setImportando(true);
      const r = await importarPadron({
        jurisdiccion: Number(form.jurisdiccion),
        tipo: form.tipo,
        texto: archivo.texto,
        origen: archivo.nombre,
        separador: form.separador,
        encabezado: form.encabezado,
        columnas: { cuit: form.cuit, alicuota: form.alicuota, desde: form.desde, hasta: form.hasta },
        vigente_desde: form.vigente_desde || undefined,
        vigente_hasta: form.vigente_hasta || undefined
      });
      await showSuccessSwal(
        'Padrón importado',
        `Se cargaron ${r.importadas.toLocaleString('es-AR')} alícuotas` + (r.rechazadas ? ` y se descartaron ${r.rechazadas} líneas con datos inválidos.` : '.')
      );
      setForm(null);
      setArchivo(null);
      await cargar();
    } catch (err) {
      await showApiErrorSwal(err, { title: 'No se pudo importar el padrón' });
    } finally {
      setImportando(false);
    }
  };

  const consultar = async (e) => {
    e.preventDefault();
    try {
      setConsulta(await consultarCuitEnPadrones(cuitConsulta));
    } catch (err) {
      setConsulta(null);
      await showApiErrorSwal(err, { title: 'No se pudo consultar el CUIT' });
    }
  };

  return (
    <div className="mt-6 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold text-slate-800 flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4 text-teal-600" /> Padrones de Ingresos Brutos
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Alícuotas por CUIT de cada jurisdicción. Se usan en los regímenes de percepción marcados “la alícuota sale del padrón”. Cada carga reemplaza la
            anterior de la misma jurisdicción.
          </p>
        </div>
        {puedeImportar && !form && (
          <button
            onClick={() => setForm(VACIO)}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-teal-600 text-white text-sm font-semibold hover:bg-teal-700 transition shrink-0"
          >
            Importar padrón
          </button>
        )}
      </div>

      {form && (
        <form onSubmit={importar} className="p-5 space-y-4 border-b border-slate-200 bg-slate-50/60">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className={labelCls}>Jurisdicción</label>
              <select value={form.jurisdiccion} onChange={set('jurisdiccion')} className={inputCls} required>
                <option value="">Elegí…</option>
                {(catalogo?.jurisdicciones || []).map((j) => (
                  <option key={j.id} value={j.id}>
                    {j.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Alícuotas de</label>
              <select value={form.tipo} onChange={set('tipo')} className={inputCls}>
                <option value="percepcion">Percepción</option>
                <option value="retencion">Retención</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Archivo (texto / CSV)</label>
              <input type="file" accept=".txt,.csv,.tsv,text/*" onChange={elegirArchivo} className="block w-full text-sm text-slate-600" required />
            </div>
          </div>

          {archivo && (
            <div>
              <p className="text-xs text-slate-500 mb-1">Primeras líneas de {archivo.nombre}:</p>
              <pre className="text-[11px] leading-snug bg-white border border-slate-200 rounded-xl p-2.5 overflow-x-auto text-slate-700">{archivo.muestra}</pre>
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <label className={labelCls}>Separador</label>
              <select value={form.separador} onChange={set('separador')} className={inputCls}>
                <option value="auto">Detectar</option>
                <option value=";">Punto y coma ( ; )</option>
                <option value=",">Coma ( , )</option>
                <option value="|">Barra ( | )</option>
                <option value={'\t'}>Tabulación</option>
              </select>
            </div>
            <div className="col-span-2 sm:col-span-3 flex items-end">
              <label className="inline-flex items-center gap-2 text-sm text-slate-600 pb-2.5">
                <input
                  type="checkbox"
                  checked={form.encabezado}
                  onChange={(e) => setForm((f) => ({ ...f, encabezado: e.target.checked }))}
                  className="rounded border-slate-300 text-teal-600 focus:ring-teal-400"
                />
                La primera línea son los títulos de las columnas
              </label>
            </div>
            <div>
              <label className={labelCls}>Columna del CUIT</label>
              <input value={form.cuit} onChange={set('cuit')} placeholder="N° o título" className={inputCls} required />
            </div>
            <div>
              <label className={labelCls}>Columna de la alícuota</label>
              <input value={form.alicuota} onChange={set('alicuota')} placeholder="N° o título" className={inputCls} required />
            </div>
            <div>
              <label className={labelCls}>Columna “desde” (opcional)</label>
              <input value={form.desde} onChange={set('desde')} placeholder="N° o título" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Columna “hasta” (opcional)</label>
              <input value={form.hasta} onChange={set('hasta')} placeholder="N° o título" className={inputCls} />
            </div>
            {!form.desde && (
              <div>
                <label className={labelCls}>Rige desde</label>
                <input type="date" value={form.vigente_desde} onChange={set('vigente_desde')} className={inputCls} required />
              </div>
            )}
            {!form.hasta && (
              <div>
                <label className={labelCls}>Rige hasta (opcional)</label>
                <input type="date" value={form.vigente_hasta} onChange={set('vigente_hasta')} className={inputCls} />
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setForm(null);
                setArchivo(null);
              }}
              className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition"
            >
              Cancelar
            </button>
            <button type="submit" disabled={importando || !archivo} className="px-4 py-2 rounded-xl bg-teal-600 text-white font-semibold hover:bg-teal-700 disabled:opacity-60 transition">
              {importando ? 'Importando…' : 'Importar'}
            </button>
          </div>
        </form>
      )}

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50/90 border-b border-gray-200">
            <tr>
              <th className="px-4 py-2 text-left font-semibold text-gray-600">Jurisdicción</th>
              <th className="px-4 py-2 text-left font-semibold text-gray-600">Tipo</th>
              <th className="px-4 py-2 text-right font-semibold text-gray-600">CUIT cargados</th>
              <th className="px-4 py-2 text-left font-semibold text-gray-600">Vigencia</th>
              <th className="px-4 py-2 text-left font-semibold text-gray-600">Archivo</th>
            </tr>
          </thead>
          <tbody>
            {padrones.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-gray-500">
                  Todavía no hay padrones cargados.
                </td>
              </tr>
            )}
            {padrones.map((p) => (
              <tr key={`${p.jurisdiccion}-${p.tipo}`} className="border-b border-gray-100">
                <td className="px-4 py-2 font-medium text-gray-800">{jurisdiccion(p.jurisdiccion)}</td>
                <td className="px-4 py-2 text-gray-700">{p.tipo === 'percepcion' ? 'Percepción' : 'Retención'}</td>
                <td className="px-4 py-2 text-right text-gray-800">{p.cantidad.toLocaleString('es-AR')}</td>
                <td className="px-4 py-2 text-gray-700 whitespace-nowrap">
                  {formatFechaCalendario(p.desde)}
                  {p.hasta ? ` → ${formatFechaCalendario(p.hasta)}` : ''}
                </td>
                <td className="px-4 py-2 text-gray-500 text-xs">
                  {p.origen || '—'}
                  <span className="block">{new Date(p.importado_at).toLocaleDateString('es-AR')}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <form onSubmit={consultar} className="px-5 py-4 border-t border-slate-200 flex flex-wrap items-center gap-3">
        <span className="text-sm font-medium text-slate-600">Consultar un CUIT:</span>
        <input
          value={cuitConsulta}
          onChange={(e) => setCuitConsulta(e.target.value)}
          placeholder="30-12345678-9"
          inputMode="numeric"
          className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-400/40"
        />
        <button type="submit" className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition">
          <Search className="h-4 w-4" /> Buscar
        </button>
        {consulta && (
          <div className="basis-full text-sm text-slate-700">
            {consulta.length === 0 ? (
              'No figura en ninguno de los padrones cargados.'
            ) : (
              <ul className="list-disc pl-5 space-y-0.5">
                {consulta.map((c, i) => (
                  <li key={i}>
                    {jurisdiccion(c.jurisdiccion)} ({c.tipo === 'percepcion' ? 'percepción' : 'retención'}): {Number(c.alicuota).toLocaleString('es-AR')}% desde{' '}
                    {formatFechaCalendario(c.vigente_desde)}
                    {c.vigente_hasta ? ` hasta ${formatFechaCalendario(c.vigente_hasta)}` : ''}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </form>
    </div>
  );
}
