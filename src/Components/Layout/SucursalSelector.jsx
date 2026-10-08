// src/Components/Layout/SucursalSelector.jsx
// Muestra con qué sucursal se está trabajando. Quien tiene sucursal fija (administrativo, vendedor) ve su
// nombre; el administrador y el contador la eligen (o "Todas", consolidado de sólo lectura para escribir).
import { useEffect, useMemo, useState } from 'react';
import { FiMapPin } from 'react-icons/fi';
import { useAuth } from '../../AuthContext';
import { listLocales } from '../../api/locales';
import {
  SUCURSAL_TODAS,
  getSucursalActivaId,
  setSucursalActivaId,
  veTodasLasSucursales
} from '../../utils/sucursalActiva';

const aLista = (resp) => (Array.isArray(resp) ? resp : resp?.data || []);

// `variante`: 'oscuro' (barra oscura) o 'claro' (menú lateral blanco).
export default function SucursalSelector({ className = '', variante = 'oscuro' }) {
  const claro = variante === 'claro';
  const { userLevel, userLocalId } = useAuth();
  const puedeElegir = veTodasLasSucursales(userLevel);
  const [locales, setLocales] = useState([]);
  const [elegida, setElegida] = useState(getSucursalActivaId());

  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        const lista = aLista(await listLocales({ limit: 200 }));
        if (!vivo) return;
        setLocales(lista);
        // Primera vez que entra: arranca en la primera sucursal activa (escribir exige una sucursal elegida).
        if (puedeElegir && !getSucursalActivaId()) {
          const primera = lista.find((l) => l.estado === 'activo') || lista[0];
          if (primera) {
            setSucursalActivaId(primera.id);
            window.location.reload();
          }
        }
      } catch {
        // sin la lista no se puede elegir; el servidor igual aplica la sucursal del usuario
      }
    })();
    return () => {
      vivo = false;
    };
  }, [puedeElegir]);

  const activas = useMemo(() => locales.filter((l) => l.estado === 'activo' || String(l.id) === elegida), [locales, elegida]);

  if (!puedeElegir) {
    const propia = locales.find((l) => String(l.id) === String(userLocalId));
    if (!propia) return null;
    return (
      <span className={`inline-flex items-center gap-1.5 text-xs ${claro ? 'text-slate-600' : 'text-white/80'} ${className}`} title="Tu sucursal">
        <FiMapPin aria-hidden /> {propia.nombre}
      </span>
    );
  }

  const cambiar = (e) => {
    const valor = e.target.value;
    setElegida(valor);
    setSucursalActivaId(valor);
    window.location.reload(); // todas las pantallas vuelven a pedir sus datos con la sucursal nueva
  };

  return (
    <label className={`flex items-center gap-1.5 text-xs ${claro ? 'text-slate-600' : 'text-white/80'} ${className}`}>
      <FiMapPin aria-hidden />
      <span className="sr-only">Sucursal</span>
      <select
        value={elegida || SUCURSAL_TODAS}
        onChange={cambiar}
        className={
          claro
            ? 'min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-400/40'
            : 'rounded-lg bg-white/10 px-2 py-1.5 text-xs text-white ring-1 ring-white/15 focus:outline-none focus:ring-2 focus:ring-emerald-400'
        }
        aria-label="Sucursal activa"
      >
        <option value={SUCURSAL_TODAS} className="text-slate-900">
          Todas (solo lectura)
        </option>
        {activas.map((l) => (
          <option key={l.id} value={l.id} className="text-slate-900">
            {l.nombre}
          </option>
        ))}
      </select>
    </label>
  );
}
