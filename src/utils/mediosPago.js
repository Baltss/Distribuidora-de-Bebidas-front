// src/utils/mediosPago.js
// Medios de pago disponibles en todo el sistema: obligatorio en cualquier
// movimiento que genere un ingreso o egreso en caja (ventas, cobranzas,
// compras al contado, gastos, pagos a proveedores).

export const MEDIOS_PAGO = [
  { value: 'efectivo', label: 'Efectivo' },
  { value: 'transferencia', label: 'Transferencia' },
  { value: 'tarjeta_debito', label: 'Tarjeta de débito' },
  { value: 'tarjeta_credito', label: 'Tarjeta de crédito' },
  { value: 'qr', label: 'QR (Mercado Pago / billeteras)' },
  { value: 'cheque', label: 'Cheque' }
];

export const medioPagoLabel = (value) =>
  MEDIOS_PAGO.find((m) => m.value === value)?.label || value || '—';

export default MEDIOS_PAGO;
