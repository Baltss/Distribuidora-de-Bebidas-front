// src/Components/Facturacion/AvisoCertificadoArca.jsx
// Aviso de vencimiento del certificado digital de ARCA de cada CUIT con el
// que se factura: aparece 30 días antes y, si venció, avisa que no se puede
// facturar con ese CUIT. No muestra nada si los certificados están vigentes.
import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import useEstadoEmision from '../../hooks/useEstadoEmision';
import { nombreEmisor } from '../../utils/emisores';
import { useAuth } from '../../AuthContext';

const fecha = (iso) =>
  new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'America/Argentina/Buenos_Aires' });

function AvisoDeEmisor({ emisor, conNombre, esSocio, enDatosFiscales, className }) {
  const { certificado } = emisor;
  const vencido = certificado.estado === 'vencido';
  const dias = certificado.dias_restantes;
  const cuando = dias <= 0 ? 'hoy' : dias === 1 ? 'mañana' : `en ${dias} días`;
  const de = conNombre ? ` de ${nombreEmisor(emisor)}` : '';

  return (
    <div
      role="alert"
      className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-sm ${
        vencido ? 'border-rose-200 bg-rose-50 text-rose-800' : 'border-amber-200 bg-amber-50 text-amber-800'
      } ${className}`}
    >
      <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" />
      <div className="flex-1">
        <p className="font-semibold">
          {vencido
            ? `El certificado de ARCA${de} venció el ${fecha(certificado.vence)}: no se puede facturar con ese CUIT.`
            : `El certificado de ARCA${de} vence ${cuando} (${fecha(certificado.vence)}).`}
        </p>
        <p className="mt-0.5">
          {esSocio
            ? 'Para renovarlo, generá una nueva solicitud en Datos Fiscales con el mismo CUIT, pedí el certificado nuevo en ARCA con ese pedido y cargalo.'
            : 'Avisale al dueño del negocio para que lo renueve en Datos Fiscales.'}
          {!vencido && ' Mientras tanto se sigue facturando normalmente.'}
        </p>
      </div>
      {esSocio && !enDatosFiscales && (
        <Link
          to="/dashboard/datos-fiscales"
          className={`shrink-0 self-center rounded-lg border px-3 py-1.5 text-xs font-semibold ${
            vencido ? 'border-rose-300 hover:bg-rose-100' : 'border-amber-300 hover:bg-amber-100'
          }`}
        >
          Ir a Datos Fiscales
        </Link>
      )}
    </div>
  );
}

export default function AvisoCertificadoArca({ className = '', enDatosFiscales = false }) {
  const { userLevel } = useAuth();
  const estado = useEstadoEmision();

  // El aviso es informativo: si no se pudo consultar, no se muestra.
  const conAviso = (estado?.emisores || []).filter((e) => e.certificado && e.certificado.estado !== 'vigente');
  if (!conAviso.length) return null;

  const esSocio = String(userLevel || '').toLowerCase() === 'socio';
  return (
    <div className="space-y-2">
      {conAviso.map((e) => (
        <AvisoDeEmisor
          key={e.id}
          emisor={e}
          conNombre={(estado.emisores || []).length > 1}
          esSocio={esSocio}
          enDatosFiscales={enDatosFiscales}
          className={className}
        />
      ))}
    </div>
  );
}
