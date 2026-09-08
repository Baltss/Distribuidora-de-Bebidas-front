// src/Components/Layout/AppShell.jsx
//
// Shell con sidebar fijo para el nuevo rediseño visual (tema claro, sin
// gradientes ni partículas). Reemplaza, página por página, el patrón
// anterior de NavbarStaff + ParticlesBackground + fondo oscuro.
import React, { useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutGrid,
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
  Landmark,
  ClipboardCheck,
  FileText,
  LogOut,
  Menu,
  X
} from 'lucide-react';
import logoSoldi from '../../Images/staff/LOGO-SOLDI.png';
import { useAuth } from '../../AuthContext';

// `roles`: opcional — si se define, el ítem sólo se muestra a esos roles.
const NAV_ITEMS = [
  { label: 'Dashboard', to: '/dashboard', icon: LayoutGrid, exact: true },
  { label: 'Productos', to: '/dashboard/productos', icon: Package },
  { label: 'Locales', to: '/dashboard/locales', icon: Building2 },
  { label: 'Usuarios', to: '/dashboard/usuarios', icon: ShieldCheck },
  { label: 'Vendedores', to: '/dashboard/vendedores/vendedores', icon: Users },
  { label: 'Clientes', to: '/dashboard/clientes', icon: UserCircle2 },
  { label: 'Ventas', to: '/dashboard/nueva-venta', icon: ShoppingBag },
  { label: 'Deudas y Cobranzas', to: '/dashboard/ventas/deudas', icon: AlertTriangle },
  { label: 'Proveedores', to: '/dashboard/proveedores', icon: Truck },
  { label: 'Compras', to: '/dashboard/compras', icon: ShoppingCart },
  { label: 'Caja y Finanzas', to: '/dashboard/caja', icon: Receipt },
  {
    label: 'Facturación',
    to: '/dashboard/facturacion',
    icon: FileText,
    roles: ['socio', 'administrativo', 'contador']
  },
  { label: 'Datos Fiscales', to: '/dashboard/datos-fiscales', icon: Landmark, roles: ['socio'] },
  { label: 'Aprobaciones', to: '/dashboard/aprobaciones-fiscales', icon: ClipboardCheck, roles: ['soldi_admin'] }
];

function SidebarContent({ pathname, displayUserName, nivelLabel, userInitial, userLevel, onLogout, onNavigate }) {
  const navItems = NAV_ITEMS.filter((item) => !item.roles || item.roles.includes(String(userLevel || '')));
  return (
    <div className="flex h-full flex-col">
      {/* Logo / marca */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-slate-200">
        <img
          src={logoSoldi}
          alt="Soldi"
          className="h-9 w-9 rounded-xl object-cover ring-1 ring-slate-200"
        />
        <div className="leading-tight">
          <p className="text-sm font-extrabold tracking-wide text-slate-900">SOLDI</p>
          <p className="text-[10px] uppercase tracking-[0.14em] text-slate-600">
            Sistema de Ventas
          </p>
        </div>
      </div>

      {/* Navegación */}
      <div className="flex-1 overflow-y-auto px-3 py-4">
        <p className="px-2.5 mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-600">
          Módulos
        </p>
        <nav className="space-y-1">
          {navItems.map(({ label, to, icon: Icon, exact }) => {
            const active = exact ? pathname === to : pathname.startsWith(to);
            return (
              <Link
                key={to}
                to={to}
                onClick={onNavigate}
                className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                  active
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <Icon className={`h-4.5 w-4.5 shrink-0 ${active ? 'text-blue-600' : 'text-slate-600'}`} />
                <span className="truncate">{label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Usuario */}
      <div className="border-t border-slate-200 p-3">
        <div className="flex items-center gap-2.5 rounded-xl px-2.5 py-2.5 hover:bg-slate-50 transition">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-blue-600 text-sm font-bold text-white">
            {userInitial}
          </span>
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-sm font-semibold text-slate-800">
              {displayUserName || 'Usuario'}
            </p>
            <p className="truncate text-[11px] text-slate-600">{nivelLabel}</p>
          </div>
          <button
            type="button"
            onClick={onLogout}
            title="Cerrar sesión"
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-600 hover:bg-rose-50 hover:text-rose-600 transition"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AppShell({ children }) {
  const { userName, userLevel, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const nivelLabel = useMemo(() => {
    const r = String(userLevel || '').toLowerCase();
    if (r === 'socio' || r === 'administrador' || r === 'admin') return 'Administrador';
    if (r === 'administrativo') return 'Administrativo';
    if (r === 'vendedor') return 'Vendedor';
    return r ? r.charAt(0).toUpperCase() + r.slice(1) : 'Staff';
  }, [userLevel]);

  const displayUserName = useMemo(() => {
    if (!userName) return '';
    if (userName.includes('@')) return userName.slice(0, userName.indexOf('@'));
    return userName.trim().split(' ')[0] || '';
  }, [userName]);

  const userInitial = (displayUserName?.[0] || 'U').toUpperCase();

  const handleLogout = () => {
    logout();
    navigate('/inicio');
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Sidebar desktop */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-30 lg:flex lg:w-64 lg:flex-col border-r border-slate-200 bg-white">
        <SidebarContent
          pathname={pathname}
          displayUserName={displayUserName}
          nivelLabel={nivelLabel}
          userInitial={userInitial}
          userLevel={userLevel}
          onLogout={handleLogout}
        />
      </aside>

      {/* Sidebar móvil */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-slate-900/40" onClick={() => setMobileOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 bg-white shadow-xl">
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="absolute right-3 top-3 z-10 inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100"
              aria-label="Cerrar menú"
            >
              <X className="h-4 w-4" />
            </button>
            <SidebarContent
              pathname={pathname}
              displayUserName={displayUserName}
              nivelLabel={nivelLabel}
              userInitial={userInitial}
              userLevel={userLevel}
              onLogout={handleLogout}
              onNavigate={() => setMobileOpen(false)}
            />
          </aside>
        </div>
      )}

      {/* Contenido */}
      <div className="lg:pl-64">
        {/* Barra superior móvil */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
          <div className="flex items-center gap-2.5">
            <img src={logoSoldi} alt="Soldi" className="h-8 w-8 rounded-lg object-cover" />
            <span className="text-sm font-extrabold text-slate-900">SOLDI</span>
          </div>
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600"
            aria-label="Abrir menú"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>

        <main className="min-h-screen">{children}</main>
      </div>
    </div>
  );
}
