// src/Components/Facturacion/ImportarMisComprobantesModal.jsx
// Importa el archivo de "Mis Comprobantes → Recibidos" de ARCA (CSV) como
// comprobantes de compra de un CUIT, en lugar de cargarlos uno por uno.
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { backdropV, panelV } from '../../ui/animHelpers';

export default function ImportarMisComprobantesModal({ open, onClose, onImportar, periodoInicial }) {
  const [archivo, setArchivo] = useState(null); // { nombre, texto }
  const [periodo, setPeriodo] = useState('');
  const [importando, setImportando] = useState(false);
  const [resultado, setResultado] = useState(null);

  useEffect(() => {
    if (!open) return;
    setArchivo(null);
    setResultado(null);
    setPeriodo(periodoInicial || '');
  }, [open, periodoInicial]);

  const elegir = async (e) => {
    const file = e.target.files?.[0];
    if (file) setArchivo({ nombre: file.name, texto: await file.text() });
  };

  const importar = async (e) => {
    e.preventDefault();
    try {
      setImportando(true);
      setResultado(await onImportar({ texto: archivo.texto, periodo_imputacion: periodo || undefined }));
    } catch {
      // el motivo ya se mostró
    } finally {
      setImportando(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4" variants={backdropV} initial="hidden" animate="visible" exit="exit" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
          <motion.div variants={panelV} initial="hidden" animate="visible" exit="exit" className="relative w-full max-w-[92vw] sm:max-w-xl max-h-[88vh] overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <button onClick={onClose} className="absolute z-50 top-2.5 right-2.5 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 border border-slate-200 text-slate-500 hover:bg-slate-200 transition" aria-label="Cerrar">
              <X className="h-5 w-5" />
            </button>
            <form onSubmit={importar} className="p-5 sm:p-6 space-y-4">
              <div>
                <h3 className="text-lg font-bold tracking-tight text-slate-900">Importar de “Mis Comprobantes”</h3>
                <p className="text-xs text-slate-500 mt-1">
                  En ARCA: Mis Comprobantes → Recibidos → elegí el período → Exportar CSV. Los que ya estaban cargados se saltean. ARCA junta todas las percepciones en
                  “Otros tributos”: si necesitás separarlas por jurisdicción, editá el comprobante.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1.5">Archivo CSV</label>
                <input type="file" accept=".csv,.txt,text/csv,text/plain" onChange={elegir} className="block w-full text-sm text-slate-600" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1.5">Computarlos en el mes (opcional)</label>
                <input type="month" value={periodo} onChange={(e) => setPeriodo(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-400/40" />
                <p className="text-[11px] text-slate-500 mt-1">Si lo dejás vacío, cada uno se computa en el mes de su fecha de emisión.</p>
              </div>

              {resultado && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm text-slate-700">
                  <p className="font-semibold">
                    {resultado.importados} importados · {resultado.duplicados} ya estaban · {resultado.rechazados} rechazados
                  </p>
                  {resultado.ejemplos_rechazados?.length > 0 && (
                    <ul className="mt-2 list-disc pl-5 text-xs text-rose-700 space-y-0.5">
                      {resultado.ejemplos_rechazados.map((r) => (
                        <li key={r.linea}>
                          Línea {r.linea}: {r.motivo}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              <div className="flex justify-end gap-2">
                <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition">
                  {resultado ? 'Cerrar' : 'Cancelar'}
                </button>
                {!resultado && (
                  <button type="submit" disabled={importando || !archivo} className="px-4 py-2 rounded-xl bg-teal-600 text-white font-semibold hover:bg-teal-700 disabled:opacity-60 transition">
                    {importando ? 'Importando…' : 'Importar'}
                  </button>
                )}
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
