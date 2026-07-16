// src/hooks/useDebouncedValue.js
import { useEffect, useState } from 'react';

// Hook compartido de debounce. Reemplaza los useDebounce duplicados que
// existían sueltos en cada página de listado (Productos, Clientes,
// Proveedores, Vendedores, Geografía, Compras).
export default function useDebouncedValue(value, ms = 500) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(id);
  }, [value, ms]);

  return debounced;
}
