// src/Components/Facturacion/AvisoCertificadoArca.jsx
// Aviso de vencimiento del certificado digital de ARCA con el que se
// factura: aparece 30 días antes y, si venció, avisa que no se puede
// facturar. No muestra nada si el certificado está vigente.
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { getEstadoEmision } from '../../api/facturacion';
import { useAuth } from '../../AuthContext';

const fecha = (iso) =>
  new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'America/Argentina/Buenos_Aires' });

export default function AvisoCertificadoArca({ className = '', enDatosFiscales = false }) {
  const { userLevel } = useAuth();
  const [certificado, setCertificado] = useState(null);

  useEffect(() => {
    let vigente = true;
    getEstadoEmision()
      .then((e) => vigente && setCertificado(e?.certificado || null))
      .catch(() => {}); // el aviso es informativo: si falla, no se muestra
    return () => {
      vigente = false;
    };
  }, []);

  if (!certificado || certificado.estado === 'vigente') return null;

  const vencido = certificado.estado === 'vencido';
  const dias = certificado.dias_restantes;
  const esSocio = String(userLevel || '').toLowerCase() === 'socio';
  const cuando = dias <= 0 ? 'hoy' : dias === 1 ? 'mañana' : `en ${dias} días`;

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
            ? `El certificado de ARCA venció el ${fecha(certificado.vence)}: no se puede facturar.`
            : `El certificado de ARCA vence ${cuando} (${fecha(certificado.vence)}).`}
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
