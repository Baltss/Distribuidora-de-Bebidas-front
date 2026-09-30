// src/Components/Facturacion/AuditoriaFiscalCard.jsx
// Registro de cambios en la configuración fiscal: quién, qué y cuándo.
import React, { useEffect, useState } from 'react';
import { History } from 'lucide-react';
import { listAuditoriaFiscal } from '../../api/facturacion';
import { showApiErrorSwal } from '../../ui/swal';

const ENTIDAD = {
  emisor: 'CUIT',
  punto_venta: 'Punto de venta',
  datos_comprobante: 'Datos del comprobante',
  configuracion_fiscal: 'Datos fiscales',
  parametro_fiscal: 'Parámetro de la norma'
};

const ACCION = {
  crear: 'Alta',
  actualizar: 'Cambio',
  cambiar_estado: 'Cambio de estado',
  solicitar: 'Solicitud',
  cargar_certificado: 'Certificado cargado',
  aprobar: 'Aprobación iniciada',
  activar: 'Activada',
  rechazar: 'Rechazada',
  cancelar_verificacion: 'Verificación cancelada'
};

const texto = (v) => (v === null || v === undefined || v === '' ? '—' : String(v));

// { campo: { antes, despues } } → "campo: antes → después"; el resto, "campo: valor".
function resumenDetalle(detalle) {
  if (!detalle) return '';
  return Object.entries(detalle)
    .map(([campo, valor]) => {
      const nombre = campo.replace(/_/g, ' ');
      return valor && typeof valor === 'object' && 'despues' in valor
        ? `${nombre}: ${texto(valor.antes)} → ${texto(valor.despues)}`
        : `${nombre}: ${texto(valor)}`;
    })
    .join(' · ');
}

const cuando = (iso) =>
  new Date(iso).toLocaleString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Argentina/Buenos_Aires'
  });

export default function AuditoriaFiscalCard() {
  const [filas, setFilas] = useState([]);
  const [meta, setMeta] = useState(null);
  const [cargando, setCargando] = useState(true);

  const cargar = async (page) => {
    setCargando(true);
    try {
      const r = await listAuditoriaFiscal({ page, limit: 15 });
      setFilas((prev) => (page === 1 ? r.data : [...prev, ...r.data]));
      setMeta(r.meta);
    } catch (err) {
      await showApiErrorSwal(err, { title: 'No se pudo cargar el historial de cambios' });
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargar(1);
  }, []);

  return (
    <div className="mt-6 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-200">
        <h2 className="font-semibold text-slate-800 flex items-center gap-2">
          <History className="h-4 w-4 text-teal-600" /> Historial de cambios fiscales
        </h2>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50/90 border-b border-gray-200">
            <tr>
              <th className="px-4 py-2 text-left font-semibold text-gray-600">Cuándo</th>
              <th className="px-4 py-2 text-left font-semibold text-gray-600">Quién</th>
              <th className="px-4 py-2 text-left font-semibold text-gray-600">Qué</th>
              <th className="px-4 py-2 text-left font-semibold text-gray-600">Detalle</th>
            </tr>
          </thead>
          <tbody>
            {!cargando && filas.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-gray-500">
                  Todavía no hay cambios registrados.
                </td>
              </tr>
            )}
            {filas.map((a) => (
              <tr key={a.id} className="border-b border-gray-100 align-top">
                <td className="px-4 py-2 whitespace-nowrap text-gray-700">{cuando(a.created_at)}</td>
                <td className="px-4 py-2 text-gray-700">{a.usuario?.nombre || '—'}</td>
                <td className="px-4 py-2 text-gray-800">
                  {ENTIDAD[a.entidad] || a.entidad} · {ACCION[a.accion] || a.accion}
                </td>
                <td className="px-4 py-2 text-gray-600">{resumenDetalle(a.detalle)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {meta?.hasNext && (
        <div className="px-5 py-3 border-t border-slate-200 text-center">
          <button
            onClick={() => cargar(meta.page + 1)}
            disabled={cargando}
            className="text-sm font-semibold text-teal-700 hover:text-teal-800 disabled:opacity-50"
          >
            {cargando ? 'Cargando…' : 'Ver más'}
          </button>
        </div>
      )}
    </div>
  );
}
