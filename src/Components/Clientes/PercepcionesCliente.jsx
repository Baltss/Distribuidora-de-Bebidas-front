// src/Components/Clientes/PercepcionesCliente.jsx
// Cómo se le aplican al cliente las percepciones que cobra el negocio: normal
// (la alícuota del régimen), con una alícuota propia (la que le corresponde
// según el padrón del organismo) o sin percibirle (exento, con su constancia).
// No muestra nada si el negocio no percibe ningún tributo o si el usuario
// no tiene permiso para verlo.
import React, { useEffect, useState } from 'react';
import { Percent } from 'lucide-react';
import { listRegimenesCliente, guardarExcepcionCliente, quitarExcepcionCliente } from '../../api/facturacion';
import { showApiErrorSwal, showSuccessToast } from '../../ui/swal';
import { nombreEmisor } from '../../utils/emisores';

const inputCls =
  'rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-400/40';

const modoDe = (e) => (e?.exento ? 'exento' : e?.alicuota != null ? 'alicuota' : 'normal');

function FilaRegimen({ clienteId, regimen, mostrarCuit, onGuardado }) {
  const e = regimen.excepcion;
  const [modo, setModo] = useState(modoDe(e));
  const [alicuota, setAlicuota] = useState(e?.alicuota != null ? String(e.alicuota) : '');
  const [vence, setVence] = useState(e?.vigente_hasta || '');
  const [constancia, setConstancia] = useState(e?.constancia || '');
  const [guardando, setGuardando] = useState(false);

  const guardar = async () => {
    try {
      setGuardando(true);
      if (modo === 'normal') await quitarExcepcionCliente(clienteId, regimen.id);
      else {
        await guardarExcepcionCliente(clienteId, regimen.id, {
          exento: modo === 'exento',
          alicuota: modo === 'alicuota' ? alicuota : null,
          vigente_hasta: vence || null,
          constancia
        });
      }
      showSuccessToast('Guardado');
      onGuardado();
    } catch (err) {
      await showApiErrorSwal(err, { title: 'No se pudo guardar' });
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <p className="text-sm font-medium text-slate-700">
        {regimen.nombre}
        <span className="ml-2 text-xs font-normal text-slate-500">
          {Number(regimen.alicuota).toLocaleString('es-AR')}%{mostrarCuit ? ` · ${nombreEmisor(regimen.emisor)}` : ''}
        </span>
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <select value={modo} onChange={(ev) => setModo(ev.target.value)} className={inputCls} aria-label={`Percepción ${regimen.nombre}`}>
          <option value="normal">Se le percibe normalmente</option>
          <option value="alicuota">Alícuota propia</option>
          <option value="exento">No se le percibe (exento)</option>
        </select>
        {modo === 'alicuota' && (
          <input type="number" step="0.0001" min="0" max="100" value={alicuota} onChange={(ev) => setAlicuota(ev.target.value)} placeholder="%" className={`${inputCls} w-24`} />
        )}
        {modo !== 'normal' && (
          <>
            <input value={constancia} onChange={(ev) => setConstancia(ev.target.value)} maxLength={60} placeholder="Constancia (opcional)" className={`${inputCls} w-44`} />
            <label className="inline-flex items-center gap-1.5 text-xs text-slate-500">
              Vence
              <input type="date" value={vence} onChange={(ev) => setVence(ev.target.value)} className={inputCls} />
            </label>
          </>
        )}
        <button
          type="button"
          onClick={guardar}
          disabled={guardando}
          className="ml-auto px-3 py-2 rounded-xl bg-teal-600 text-xs font-semibold text-white hover:bg-teal-700 disabled:opacity-60"
        >
          {guardando ? 'Guardando…' : 'Guardar'}
        </button>
      </div>
    </div>
  );
}

export default function PercepcionesCliente({ clienteId }) {
  const [regimenes, setRegimenes] = useState([]);

  const cargar = () =>
    listRegimenesCliente(clienteId)
      .then(setRegimenes)
      .catch(() => setRegimenes([])); // sin permiso o sin conexión: no se muestra

  useEffect(() => {
    cargar();
  }, [clienteId]);

  if (!regimenes.length) return null;
  const variosCuit = new Set(regimenes.map((r) => r.emisor_id)).size > 1;

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
      <p className="text-sm font-semibold text-slate-700 flex items-center gap-2">
        <Percent className="h-4 w-4 text-teal-600" /> Percepciones
      </p>
      <p className="mt-0.5 text-xs text-slate-500">Cómo se le aplican a este cliente las percepciones que cobra el negocio.</p>
      <div className="mt-3 space-y-2">
        {regimenes.map((r) => (
          <FilaRegimen key={`${r.id}-${r.excepcion?.updated_at || ''}`} clienteId={clienteId} regimen={r} mostrarCuit={variosCuit} onGuardado={cargar} />
        ))}
      </div>
    </div>
  );
}
