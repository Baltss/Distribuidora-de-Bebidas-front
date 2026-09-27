// src/hooks/useImprimirComprobante.jsx
// Imprimir un comprobante desde cualquier pantalla:
// - ticket ESC/POS en la impresora térmica (si no está configurada, abre
//   la configuración y al guardar imprime);
// - PDF A4 en una pestaña nueva.
// Si el ticket falla, ofrece abrir el PDF A4 como alternativa.
import React, { useCallback, useRef, useState } from 'react';
import ImpresoraTicketModal from '../Components/Facturacion/ImpresoraTicketModal';
import { imprimirTicketComprobante, mensajeDeError } from '../utils/comprobantes';
import { abrirFacturaPdf } from '../api/facturacion';
import { baseSwal, showErrorSwal, showSuccessToast } from '../ui/swal';

export default function useImprimirComprobante() {
  const [configOpen, setConfigOpen] = useState(false);
  const [imprimiendo, setImprimiendo] = useState(null); // facturaId
  const pendiente = useRef(null);

  const abrirPdf = useCallback(async (facturaId) => {
    try {
      await abrirFacturaPdf(facturaId);
    } catch (err) {
      await showErrorSwal({ title: 'No se pudo abrir el PDF', text: mensajeDeError(err) });
    }
  }, []);

  const imprimirTicket = useCallback(
    async (facturaId) => {
      setImprimiendo(facturaId);
      try {
        await imprimirTicketComprobante(facturaId);
        showSuccessToast('Ticket enviado a la impresora');
      } catch (err) {
        if (err?.sinConfigurar) {
          pendiente.current = facturaId;
          setConfigOpen(true);
          return;
        }
        const { isConfirmed, isDenied } = await baseSwal.fire({
          icon: 'error',
          title: 'No se pudo imprimir el ticket',
          text: mensajeDeError(err),
          showCancelButton: true,
          showDenyButton: true,
          confirmButtonText: 'Ver PDF A4',
          denyButtonText: 'Configurar impresora',
          cancelButtonText: 'Cerrar'
        });
        if (isConfirmed) abrirPdf(facturaId);
        if (isDenied) {
          pendiente.current = facturaId;
          setConfigOpen(true);
        }
      } finally {
        setImprimiendo(null);
      }
    },
    [abrirPdf]
  );

  const modalImpresora = (
    <ImpresoraTicketModal
      open={configOpen}
      onClose={() => {
        setConfigOpen(false);
        pendiente.current = null;
      }}
      onGuardado={() => {
        const id = pendiente.current;
        pendiente.current = null;
        if (id) setTimeout(() => imprimirTicket(id), 300);
      }}
    />
  );

  return {
    imprimirTicket,
    abrirPdf,
    imprimiendo,
    configurarImpresora: () => setConfigOpen(true),
    modalImpresora
  };
}
