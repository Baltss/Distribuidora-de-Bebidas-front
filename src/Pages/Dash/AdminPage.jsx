import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import NavbarStaff from './NavbarStaff';
import '../../Styles/staff/dashboard.css';
import '../../Styles/staff/background.css';
import { useAuth } from '../../AuthContext';
import ParticlesBackground from '../../Components/ParticlesBackground';
import { motion } from 'framer-motion';
import {
  Package,
  MapPin,
  Users,
  UserCircle2,
  ShoppingBag,
  AlertTriangle,
  BanknoteArrowUp,
  FileText,
  Truck,
  ShoppingCart,
  Receipt
} from 'lucide-react';

import DeudoresResumenModal from '../../Components/Ventas/DeudoresResumenModal';
import axios from 'axios';

import { API_BASE_URL as API_URL } from '../../api/apiBase';

// ---------- Tile genérico reuso estilo HammerX ----------
const DashboardTile = ({ title, description, to, icon: Icon, delay = 0 }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.4, delay }}
      className="relative"
    >
      <Link to={to} className="group block h-full text-left focus:outline-none">
        <div className="relative h-full overflow-hidden rounded-2xl border border-white/10 bg-white/85 shadow-[0_18px_45px_rgba(15,23,42,0.32)] backdrop-blur-xl transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-[0_24px_60px_rgba(15,23,42,0.5)]">
          <div className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-br from-emerald-500/12 via-cyan-500/10 to-sky-400/12" />

          <div className="relative z-10 p-5 flex flex-col gap-3 h-full">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                {Icon && (
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 group-hover:bg-emerald-500 group-hover:text-white transition-colors duration-300">
                    <Icon className="h-5 w-5" />
                  </div>
                )}
                <h3 className="titulo uppercase text-xl tracking-wide text-slate-900 group-hover:text-slate-900">
                  {title}
                </h3>
              </div>
              <span className="text-[11px] uppercase tracking-widest text-slate-400">
                Abrir
              </span>
            </div>

            {description && (
              <p className="text-xs text-slate-600 leading-snug">
                {description}
              </p>
            )}
          </div>
        </div>
      </Link>
    </motion.div>
  );
};

const AdminPage = () => {
  const { userLevel, authToken } = useAuth();

  const nivel = String(userLevel || '').toLowerCase();
  const nivelLabel =
    nivel === 'socio'
      ? 'Administrador'
      : nivel === 'administrativo'
        ? 'Administrativo'
        : nivel === 'vendedor'
          ? 'Vendedor'
          : 'Contador';

  const [showDeudoresModal, setShowDeudoresModal] = useState(false);
  const [deudores, setDeudores] = useState([]);
  const [deudoresLoading, setDeudoresLoading] = useState(false);
  const [deudoresError, setDeudoresError] = useState(null);

  useEffect(() => {
    if (!authToken) return;

    let mounted = true;
    const timer = setTimeout(async () => {
      try {
        setDeudoresLoading(true);
        setDeudoresError(null);

        const resp = await axios.get(`${API_URL}/ventas/deudores-fiado`, {
          headers: { Authorization: `Bearer ${authToken}` }
        });

        if (!mounted) return;
        setDeudores(Array.isArray(resp.data) ? resp.data : []);
        // IMPORTANTE: ya NO abrimos el modal automáticamente
        // setShowDeudoresModal(true);
      } catch (e) {
        if (!mounted) return;
        setDeudoresError(e);
        console.error('Error cargando deudores fiado:', e);
      } finally {
        if (mounted) setDeudoresLoading(false);
      }
    }, 500);

    return () => {
      mounted = false;
      clearTimeout(timer);
    };
  }, [authToken]);

  // Si todavía no cargó el nivel, evitamos parpadeos feos
  if (!userLevel) {
    return (
      <>
        <NavbarStaff />
        <section className="relative w-full min-h-screen mx-auto">
          <div className="min-h-screen bg-gradient-to-bl from-[#050509] via-[#0b0b13] to-[#151528] flex items-center justify-center">
            <div className="text-center text-slate-100">
              <p className="text-lg font-semibold">Cargando panel…</p>
              <p className="text-sm text-slate-400 mt-2">
                Si tarda demasiado, recargá la página.
              </p>
            </div>
          </div>
        </section>
      </>
    );
  }

  const cantDeudores = deudores?.length || 0;
  const canOpenDeudores =
    !deudoresLoading && cantDeudores > 0 && !deudoresError;

  return (
    <>
      <NavbarStaff />

      <section className="relative w-full min-h-screen mx-auto">
        <div className="min-h-screen bg-gradient-to-bl from-[#050509] via-[#0b0b13] to-[#151528]">
          <ParticlesBackground />

          <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
            {/* Encabezado */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <motion.h1
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                  className="text-2xl sm:text-3xl lg:text-4xl titulo uppercase tracking-[.18em] uppercase text-white"
                >
                  Panel Comercial
                </motion.h1>
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.55, delay: 0.05 }}
                  className="mt-1 text-sm text-slate-200/80 max-w-xl"
                >
                  Elegí un módulo para administrar productos, clientes,
                  geografía, etc.
                </motion.p>
              </div>

              {/* Rol actual + Botón debajo */}
              <motion.div
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="flex flex-col items-end gap-3"
              >
                <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-2 backdrop-blur-md w-fit">
                  <p className="text-[11px] uppercase tracking-wide text-slate-200/70">
                    Rol actual
                  </p>
                  <p className="text-sm font-semibold text-white">
                    {nivelLabel}
                  </p>
                </div>

                {/* Botón solicitado: debajo del rol actual */}
                <button
                  type="button"
                  onClick={() => setShowDeudoresModal(true)}
                  disabled={!canOpenDeudores}
                  className={[
                    'group inline-flex items-center gap-2 rounded-2xl border px-4 py-2 backdrop-blur-md transition-all',
                    canOpenDeudores
                      ? 'border-amber-400/25 bg-white/10 hover:bg-white/15 hover:border-amber-300/40'
                      : 'border-white/10 bg-white/5 opacity-70 cursor-not-allowed'
                  ].join(' ')}
                  title={
                    deudoresLoading
                      ? 'Cargando deudores…'
                      : deudoresError
                        ? 'No se pudieron cargar los deudores'
                        : cantDeudores === 0
                          ? 'No hay deudores para mostrar'
                          : 'Ver resumen de deudores'
                  }
                >
                  <AlertTriangle className="h-4 w-4 text-amber-300 group-hover:text-amber-200" />
                  <span className="text-xs font-semibold text-white">
                    Resumen de Deudores
                  </span>

                  {/* Badge */}
                  <span
                    className={[
                      'ml-1 inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold',
                      canOpenDeudores
                        ? 'bg-amber-400/15 text-amber-200 border border-amber-300/20'
                        : 'bg-white/10 text-slate-200/70 border border-white/10'
                    ].join(' ')}
                  >
                    {deudoresLoading ? '…' : cantDeudores}
                  </span>
                </button>

                {/* Mensaje discreto de error (opcional) */}
                {deudoresError && (
                  <p className="text-[11px] text-rose-200/80 max-w-[280px] text-right">
                    No se pudieron cargar los deudores. Revisá conexión o
                    permisos.
                  </p>
                )}
              </motion.div>
            </div>

            {/* Grid de módulos */}
            <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              <DashboardTile
                title="Productos"
                description="Catálogo maestro de productos, SKUs, categorías y atributos comerciales."
                to="/dashboard/productos"
                icon={Package}
                delay={0.12}
              />

              <DashboardTile
                title="Geografía"
                description="Provincias, ciudades, barrios y zonas de entrega o cobertura."
                to="/dashboard/geografia"
                icon={MapPin}
                delay={0.14}
              />

              <DashboardTile
                title="Vendedores"
                description="Gestión de vendedores, comisiones y asignación por sucursal."
                to="/dashboard/vendedores"
                icon={Users}
                delay={0.16}
              />

              <DashboardTile
                title="Clientes"
                description="ABM de clientes, datos de contacto y seguimiento comercial."
                to="/dashboard/clientes"
                icon={UserCircle2}
                delay={0.18}
              />

              <DashboardTile
                title="Ventas"
                description="Consulta de ventas, tickets, comprobantes y métricas clave."
                to="/dashboard/ventas"
                icon={ShoppingBag}
                delay={0.2}
              />

              <DashboardTile
                title="Gestión de Deudas"
                description="Control de saldos pendientes, planes de pago y cobranzas."
                to="/dashboard/ventas/deudas"
                icon={AlertTriangle}
                delay={0.22}
              />

              <DashboardTile
                title="Gestión de Cobranzas"
                description="Consultá deudas de fiado, registrá cobranzas y mantené la cuenta corriente al día."
                to="/dashboard/cobranzas"
                icon={BanknoteArrowUp}
                delay={0.26}
              />

              <DashboardTile
                title="Reporte de Repartos"
                description="Generá y descargá el PDF del reparto diario para organizar entregas y cobranzas."
                to="/dashboard/generacion-informes"
                icon={FileText}
                delay={0.28}
              />

              <DashboardTile
                title="Proveedores"
                description="ABM de proveedores y su cuenta corriente: deuda, compras pendientes y pagos."
                to="/dashboard/proveedores"
                icon={Truck}
                delay={0.3}
              />

              <DashboardTile
                title="Compras"
                description="Registrá compras a proveedores: suman stock automáticamente y generan deuda si son a cuenta corriente."
                to="/dashboard/compras"
                icon={ShoppingCart}
                delay={0.32}
              />

              <DashboardTile
                title="Gastos"
                description="Cargá y controlá los gastos operativos por categoría, con resumen gráfico."
                to="/dashboard/gastos"
                icon={Receipt}
                delay={0.34}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Modal: ahora solo se abre cuando el usuario lo solicita */}
      <DeudoresResumenModal
        open={showDeudoresModal && deudores.length > 0}
        onClose={() => setShowDeudoresModal(false)}
        deudores={deudores}
      />
    </>
  );
};

export default AdminPage;
