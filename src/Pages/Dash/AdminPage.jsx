import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import AppShell from '../../Components/Layout/AppShell';
import { useAuth } from '../../AuthContext';
import { motion } from 'framer-motion';
import {
  Package,
  Building2,
  ShieldCheck,
  Users,
  UserCircle2,
  ShoppingBag,
  AlertTriangle,
  Truck,
  ShoppingCart,
  Receipt,
  ArrowRight,
  PackageSearch
} from 'lucide-react';

import DeudoresResumenModal from '../../Components/Ventas/DeudoresResumenModal';
import axios from 'axios';

import { API_BASE_URL as API_URL } from '../../api/apiBase';
import { getReposicionResumen } from '../../api/productos.js';
import AvisoCertificadoArca from '../../Components/Facturacion/AvisoCertificadoArca';

// ---------- Tile genérico ----------
const DashboardTile = ({ title, description, to, icon: Icon, delay = 0 }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.4, delay }}
      className="relative"
    >
      <Link to={to} className="group block h-full text-left focus:outline-none">
        <div className="relative h-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:border-blue-200">
          <div className="relative z-10 p-5 flex flex-col gap-3 h-full">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                {Icon && (
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors duration-300">
                    <Icon className="h-5 w-5" />
                  </div>
                )}
                <h3 className="text-lg font-bold tracking-tight text-slate-900">
                  {title}
                </h3>
              </div>
              <ArrowRight className="h-4 w-4 text-slate-600 group-hover:text-blue-500 transition-colors shrink-0" />
            </div>

            {description && (
              <p className="text-xs text-slate-500 leading-snug">
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

  // Aviso de reposición: productos con stock ≤ stock mínimo, y pedidos guardados sin recibir
  const [reposicion, setReposicion] = useState(null); // { bajo_minimo, con_minimo, pedidos_pendientes } | null
  const [reposicionError, setReposicionError] = useState(false);

  useEffect(() => {
    if (!authToken) return;
    let mounted = true;
    getReposicionResumen()
      .then((r) => mounted && setReposicion(r))
      .catch(() => mounted && setReposicionError(true));
    return () => {
      mounted = false;
    };
  }, [authToken]);

  // Si todavía no cargó el nivel, evitamos parpadeos feos
  if (!userLevel) {
    return (
      <AppShell>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center text-slate-500">
            <p className="text-lg font-semibold text-slate-700">Cargando panel…</p>
            <p className="text-sm text-slate-600 mt-2">
              Si tarda demasiado, recargá la página.
            </p>
          </div>
        </div>
      </AppShell>
    );
  }

  const cantDeudores = deudores?.length || 0;
  const canOpenDeudores =
    !deudoresLoading && cantDeudores > 0 && !deudoresError;

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        {/* Encabezado */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900"
            >
              Panel Comercial
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.05 }}
              className="mt-1 text-sm text-slate-500 max-w-xl"
            >
              Elegí un módulo para administrar productos, clientes,
              locales, usuarios, etc.
            </motion.p>
          </div>

          {/* Rol actual + Botón debajo */}
          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="flex flex-col items-end gap-3"
          >
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-2 w-fit">
              <p className="text-[11px] uppercase tracking-wide text-slate-600">
                Rol actual
              </p>
              <p className="text-sm font-semibold text-slate-800">
                {nivelLabel}
              </p>
            </div>

            {/* Botón solicitado: debajo del rol actual */}
            <button
              type="button"
              onClick={() => setShowDeudoresModal(true)}
              disabled={!canOpenDeudores}
              className={[
                'group inline-flex items-center gap-2 rounded-2xl border px-4 py-2 transition-all',
                canOpenDeudores
                  ? 'border-amber-200 bg-amber-50 hover:bg-amber-100'
                  : 'border-slate-200 bg-slate-50 opacity-70 cursor-not-allowed'
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
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <span className="text-xs font-semibold text-slate-700">
                Resumen de Deudores
              </span>

              {/* Badge */}
              <span
                className={[
                  'ml-1 inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold',
                  canOpenDeudores
                    ? 'bg-amber-100 text-amber-700 border border-amber-200'
                    : 'bg-slate-100 text-slate-500 border border-slate-200'
                ].join(' ')}
              >
                {deudoresLoading ? '…' : cantDeudores}
              </span>
            </button>

            {/* Aviso de stock bajo → listado de reposición */}
            {!reposicionError && (
              <Link
                to="/dashboard/productos/reposicion"
                className={[
                  'group inline-flex items-center gap-2 rounded-2xl border px-4 py-2 transition-all',
                  reposicion?.bajo_minimo > 0
                    ? 'border-rose-200 bg-rose-50 hover:bg-rose-100'
                    : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                ].join(' ')}
                title={
                  reposicion && reposicion.con_minimo === 0
                    ? 'Ningún producto tiene cargado un stock mínimo'
                    : 'Ver listado de reposición'
                }
              >
                <PackageSearch
                  className={`h-4 w-4 ${reposicion?.bajo_minimo > 0 ? 'text-rose-500' : 'text-slate-400'}`}
                />
                <span className="text-xs font-semibold text-slate-700">
                  {reposicion && reposicion.con_minimo === 0
                    ? 'Stock bajo: cargá stock mínimos'
                    : reposicion?.bajo_minimo > 0
                      ? `${reposicion.bajo_minimo} producto${reposicion.bajo_minimo === 1 ? '' : 's'} por debajo del mínimo`
                      : 'Stock bajo'}
                </span>
                {reposicion && reposicion.con_minimo > 0 && (
                  <span
                    className={[
                      'ml-1 inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold border',
                      reposicion.bajo_minimo > 0
                        ? 'bg-rose-100 text-rose-700 border-rose-200'
                        : 'bg-slate-100 text-slate-500 border-slate-200'
                    ].join(' ')}
                  >
                    {reposicion.bajo_minimo}
                  </span>
                )}
                {!reposicion && (
                  <span className="ml-1 inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold bg-slate-100 text-slate-500 border border-slate-200">
                    …
                  </span>
                )}
              </Link>
            )}

            {/* Pedidos de reposición guardados sin recibir */}
            {reposicion?.pedidos_pendientes > 0 && (
              <Link
                to="/dashboard/productos/reposicion?tab=pedidos"
                className="group inline-flex items-center gap-2 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-2 transition-all hover:bg-blue-100"
                title="Pedidos de reposición guardados que todavía no se recibieron"
              >
                <ShoppingCart className="h-4 w-4 text-blue-500" />
                <span className="text-xs font-semibold text-slate-700">
                  {reposicion.pedidos_pendientes === 1
                    ? '1 pedido de reposición pendiente'
                    : `${reposicion.pedidos_pendientes} pedidos de reposición pendientes`}
                </span>
              </Link>
            )}

            {/* Mensaje discreto de error (opcional) */}
            {deudoresError && (
              <p className="text-[11px] text-rose-500 max-w-[280px] text-right">
                No se pudieron cargar los deudores. Revisá conexión o
                permisos.
              </p>
            )}
          </motion.div>
        </div>

        {/* Certificado de ARCA por vencer / vencido (sólo si corresponde) */}
        {nivel !== 'vendedor' && <AvisoCertificadoArca className="mt-6" />}

        {/* Grid de módulos */}
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              <DashboardTile
                title="Productos"
                description="Catálogo maestro de productos, SKUs, categorías y atributos comerciales."
                to="/dashboard/productos"
                icon={Package}
                delay={0.12}
              />

              <DashboardTile
                title="Locales"
                description="ABM de locales/sucursales del negocio."
                to="/dashboard/locales"
                icon={Building2}
                delay={0.14}
              />

              <DashboardTile
                title="Usuarios"
                description="Gestión de usuarios del sistema, roles y accesos."
                to="/dashboard/usuarios"
                icon={ShieldCheck}
                delay={0.15}
              />

              <DashboardTile
                title="Vendedores"
                description="Gestión de vendedores, comisiones y asignación por sucursal."
                to="/dashboard/vendedores/vendedores"
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
                to="/dashboard/nueva-venta"
                icon={ShoppingBag}
                delay={0.2}
              />

              <DashboardTile
                title="Gestión de Deudas y Cobranzas"
                description="Consultá clientes con deuda, saldo pendiente, registrá cobros y revisá el historial de cobranzas."
                to="/dashboard/ventas/deudas"
                icon={AlertTriangle}
                delay={0.22}
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
                title="Caja y Finanzas"
                description="Saldo de caja, ingresos y egresos unificados: cobros, pagos, gastos y ventas/compras de contado."
                to="/dashboard/caja"
                icon={Receipt}
                delay={0.34}
              />
        </div>
      </div>

      {/* Modal: ahora solo se abre cuando el usuario lo solicita */}
      <DeudoresResumenModal
        open={showDeudoresModal && deudores.length > 0}
        onClose={() => setShowDeudoresModal(false)}
        deudores={deudores}
      />
    </AppShell>
  );
};

export default AdminPage;
