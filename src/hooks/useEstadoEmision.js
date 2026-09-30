// src/hooks/useEstadoEmision.js
import { useEffect, useState } from 'react';
import { getEstadoEmision } from '../api/facturacion';

/**
 * Estado de la facturación electrónica (ver getEstadoEmision), o null mientras
 * carga. Si no se pudo consultar, informa que no se puede facturar.
 */
export default function useEstadoEmision() {
  const [estado, setEstado] = useState(null);

  useEffect(() => {
    let vivo = true;
    getEstadoEmision()
      .then((e) => vivo && setEstado(e))
      .catch(
        () =>
          vivo &&
          setEstado({ habilitada: false, motivo: 'No se pudo consultar la facturación electrónica.', emisores: [] })
      );
    return () => {
      vivo = false;
    };
  }, []);

  return estado;
}
