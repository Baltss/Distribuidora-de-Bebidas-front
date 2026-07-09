// ===============================
// FILE: src/api/ccpProveedores.js
// ===============================

import http from './http';

export const getCcpDeudaProveedor = async (proveedorId) => {
  const { data } = await http.get(`/ccp/proveedores/${proveedorId}/deuda`);
  return data;
  // {
  //   proveedor: { ... },
  //   total_deuda: number,
  //   compras_pendientes: [{ id, fecha, nro_factura, total_compra, pagado, saldo, dias_atraso }]
  // }
};

export default { getCcpDeudaProveedor };
