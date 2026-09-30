// src/Components/Facturacion/RegimenesTributoCard.jsx
// Percepciones y otros tributos que un CUIT le suma a sus facturas (por ejemplo
// percepción de IVA o de Ingresos Brutos). Sólo aplica si el negocio es agente
// de percepción: lo define el contador. Los ve el dueño y Soldi; lo edita el dueño.
import React, { useEffect, useState } from 'react';
import { Percent, Plus } from 'lucide-react';
import { listRegimenesEmisor, crearRegimen, updateRegimen } from '../../api/facturacion';
import { showApiErrorSwal, showSuccessToast } from '../../ui/swal';
import { formatFechaCalendario } from '../../utils/fechaCalendario';
import useCatalogoFiscal from '../../hooks/useCatalogoFiscal';
import { useAuth } from '../../AuthContext';
import RegimenTributoFormModal from './RegimenTributoFormModal';

const pct = (n) => `${Number(n).toLocaleString('es-AR')}%`;

export default function RegimenesTributoCard({ emisorId }) {
  const { userLevel } = useAuth();
  const puedeEditar = String(userLevel || '').toLowerCase() === 'socio';
  const catalogo = useCatalogoFiscal();
  const [regimenes, setRegimenes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [modal, setModal] = useState({ abierto: false, regimen: null });

  const cargar = () =>
    listRegimenesEmisor(emisorId)
      .then(setRegimenes)
      .catch((err) => showApiErrorSwal(err, { title: 'No se pudieron cargar los regímenes de percepción' }))
      .finally(() => setCargando(false));

  useEffect(() => {
    setCargando(true);
    cargar();
  }, [emisorId]);

  const guardar = async (payload) => {
    try {
      if (modal.regimen) await updateRegimen(modal.regimen.id, payload);
      else await crearRegimen(emisorId, payload);
      showSuccessToast('Régimen guardado');
      await cargar();
    } catch (err) {
      await showApiErrorSwal(err, { title: 'No se pudo guardar el régimen' });
      throw err; // el modal queda abierto
    }
  };

  const cambiarEstado = async (r) => {
    try {
      await updateRegimen(r.id, { estado: r.estado === 'activo' ? 'inactivo' : 'activo' });
      await cargar();
    } catch (err) {
      await showApiErrorSwal(err, { title: 'No se pudo cambiar el estado' });
    }
  };

  const tipo = (id) => catalogo?.tipos_tributo.find((t) => t.id === id)?.descripcion || `Tipo ${id}`;
  const jurisdiccion = (id) => (id ? catalogo?.jurisdicciones.find((j) => j.id === id)?.label || id : 'Nacional');
  const base = (id) => catalogo?.bases_tributo.find((b) => b.id === id)?.label || id;
  const receptores = (r) =>
    r.condiciones_receptor?.length
      ? r.condiciones_receptor.map((id) => catalogo?.condiciones_iva.find((c) => c.id === id)?.label || id).join(', ')
      : 'Todos';

  return (
    <div className="mt-6 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold text-slate-800 flex items-center gap-2">
            <Percent className="h-4 w-4 text-teal-600" /> Percepciones que se suman a la factura
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Sólo si el negocio es agente de percepción (IVA, Ingresos Brutos…). Si no, dejalo vacío. La percepción queda
            como deuda del cliente en su cuenta corriente.
          </p>
        </div>
        {puedeEditar && (
          <button
            onClick={() => setModal({ abierto: true, regimen: null })}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-teal-600 text-white text-sm font-semibold hover:bg-teal-700 transition shrink-0"
          >
            <Plus className="h-4 w-4" /> Nuevo
          </button>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50/90 border-b border-gray-200">
            <tr>
              <th className="px-4 py-2 text-left font-semibold text-gray-600">Nombre</th>
              <th className="px-4 py-2 text-left font-semibold text-gray-600">Tributo</th>
              <th className="px-4 py-2 text-right font-semibold text-gray-600">Alícuota</th>
              <th className="px-4 py-2 text-left font-semibold text-gray-600">Base</th>
              <th className="px-4 py-2 text-left font-semibold text-gray-600">Clientes</th>
              <th className="px-4 py-2 text-left font-semibold text-gray-600">Rige</th>
              <th className="px-4 py-2 text-left font-semibold text-gray-600">Estado</th>
              {puedeEditar && <th className="px-4 py-2 text-center font-semibold text-gray-600">Acciones</th>}
            </tr>
          </thead>
          <tbody>
            {!cargando && regimenes.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-center text-gray-500">
                  Este CUIT no percibe ningún tributo.
                </td>
              </tr>
            )}
            {regimenes.map((r) => (
              <tr key={r.id} className="border-b border-gray-100 align-top">
                <td className="px-4 py-2 font-medium text-gray-800">{r.nombre}</td>
                <td className="px-4 py-2 text-gray-700">
                  {tipo(r.tributo_arca_id)}
                  <span className="block text-[11px] text-slate-500">
                    {jurisdiccion(r.jurisdiccion)}
                    {r.solo_destino ? ' · sólo clientes de la jurisdicción' : ''}
                  </span>
                </td>
                <td className="px-4 py-2 text-right text-gray-800">
                  {pct(r.alicuota)}
                  {r.usa_padron && <span className="block text-[11px] text-slate-500">o la del padrón</span>}
                  {r.minimo_base > 0 && <span className="block text-[11px] text-slate-500">desde $ {Number(r.minimo_base).toLocaleString('es-AR')}</span>}
                </td>
                <td className="px-4 py-2 text-gray-700">{base(r.base)}</td>
                <td className="px-4 py-2 text-gray-700">
                  {receptores(r)}
                  {r.clases?.length > 0 && <span className="block text-[11px] text-slate-500">Factura {r.clases.join(' / ')}</span>}
                </td>
                <td className="px-4 py-2 text-gray-700 whitespace-nowrap">
                  {formatFechaCalendario(r.vigente_desde)}
                  {r.vigente_hasta ? ` → ${formatFechaCalendario(r.vigente_hasta)}` : ''}
                </td>
                <td className="px-4 py-2">
                  <span
                    className={`inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-full border ${
                      r.estado === 'activo' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'
                    }`}
                  >
                    {r.estado === 'activo' ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                {puedeEditar && (
                  <td className="px-4 py-2 text-center whitespace-nowrap">
                    <button onClick={() => setModal({ abierto: true, regimen: r })} className="text-xs font-semibold text-teal-700 hover:text-teal-800 mr-3">
                      Editar
                    </button>
                    <button onClick={() => cambiarEstado(r)} className="text-xs font-semibold text-slate-500 hover:text-slate-700">
                      {r.estado === 'activo' ? 'Desactivar' : 'Activar'}
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <RegimenTributoFormModal
        open={modal.abierto}
        onClose={() => setModal({ abierto: false, regimen: null })}
        onSubmit={guardar}
        regimen={modal.regimen}
      />
    </div>
  );
}
