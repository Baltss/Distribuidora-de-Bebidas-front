// NavbarStaff.jsx — versión moderna “glass” refinada
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FiMenu, FiX, FiBell, FiLogOut, FiChevronDown } from 'react-icons/fi';
import logoSueno from '../../Images/staff/imgLogoSueño.jpg';
import { useAuth } from '../../AuthContext';
// import NotificationBell from './NotificationBell'; // si ya lo tenés, descomenta

const linksDef = [
  {
    id: 1,
    href: 'dashboard',
    title: 'Dashboard',
    roles: ['socio', 'administrativo', 'vendedor', 'contador']
  },
  {
    id: 2,
    href: 'dashboard/usuarios',
    title: 'Usuarios',
    roles: ['socio']
  },
  {
    id: 3,
    href: 'dashboard/locales',
    title: 'Locales',
    roles: ['socio']
  }
];

const NavbarStaff = () => {
  const { logout, userName, nomyape, userLevel } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  // Normalizamos rol
  const currentRole = useMemo(
    () =>
      String(userLevel || '')
        .trim()
        .toLowerCase(),
    [userLevel]
  );

  const nivelLabel =
    currentRole === 'socio'
      ? 'Administrador'
      : currentRole === 'administrativo'
        ? 'Administrativo'
        : currentRole === 'vendedor'
          ? 'Vendedor'
          : currentRole === 'contador'
            ? 'Contador'
            : currentRole || 'Staff';

  // Derivar nombre para saludo/avatar
  const displayUserName = useMemo(() => {
    if (nomyape) return nomyape.trim().split(' ')[0] || '';
    if (!userName) return '';
    if (userName.includes('@')) {
      const beforeAt = userName.substring(0, userName.indexOf('@'));
      if (beforeAt) return beforeAt;
    }
    return userName.trim().split(' ')[0] || '';
  }, [userName, nomyape]);

  const userInitial = (displayUserName?.[0] || 'U').toUpperCase();

  // Navegación visible por rol
  const filteredLinks = useMemo(() => {
    if (!currentRole) return linksDef; // fallback: mostrar todo si aún no hay rol
    const lowerRole = currentRole.toLowerCase();

    const links = linksDef.filter((l) =>
      (l.roles || []).some((r) => r.toLowerCase() === lowerRole)
    );

    // si por algún motivo no matchea nada, mostramos al menos Dashboard
    if (!links.length) {
      return linksDef.filter((l) => l.href === 'dashboard');
    }

    return links;
  }, [currentRole]);

  // Activo por ruta
  const isActive = (href) => pathname.startsWith(`/${href}`);

  // UI state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef(null);

  useEffect(() => {
    // Cerrar user menu al click fuera
    function onDocClick(e) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/inicio');
  };

  return (
    <header className="sticky top-0 z-50">
      {/* barra “glass” */}
      <nav
        className="
          relative
          border-b border-white/10
          bg-[rgba(6,9,24,0.75)]
          backdrop-blur-xl
          supports-[backdrop-filter]:bg-white/5
          text-white
        "
        aria-label="Navegación principal"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* logo + marca */}
          <div className="flex items-center gap-3">
            <Link
              to="/dashboard"
              className="shrink-0 focus:outline-none focus:ring-2 focus:ring-emerald-400 rounded-lg"
            >
              <motion.img
                src={logoSueno}
                alt="Sueño"
                className="h-9 w-9 rounded-lg shadow-sm ring-1 ring-white/15 object-cover"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.25 }}
              />
            </Link>
            <div className="hidden sm:flex flex-col">
              <span className="text-sm titulo uppercase font-semibold text-white/90">
                Panel Administrativo
              </span>
            </div>
          </div>

          {/* links desktop */}
          <ul className="hidden lg:flex items-center gap-2">
            {filteredLinks.map((link) => {
              const active = isActive(link.href);
              return (
                <li key={link.id}>
                  <Link
                    to={`/${link.href}`}
                    className="
                      relative px-3 py-2 rounded-lg text-sm
                      transition
                      hover:text-white/90
                      focus:outline-none focus:ring-2 focus:ring-emerald-400
                    "
                    aria-current={active ? 'page' : undefined}
                  >
                    <span
                      className={
                        active ? 'text-white font-semibold' : 'text-white/70'
                      }
                    >
                      {link.title}
                    </span>
                    {/* indicador animado */}
                    <AnimatePresence>
                      {active && (
                        <motion.span
                          layoutId="active-pill"
                          className="absolute inset-0 -z-10 rounded-lg bg-white/10"
                          transition={{
                            type: 'spring',
                            bounce: 0.25,
                            duration: 0.45
                          }}
                        />
                      )}
                    </AnimatePresence>
                  </Link>
                </li>
              );
            })}
          </ul>

          {/* acciones derecha desktop */}
          <div className="hidden lg:flex items-center gap-3">
            {/* <NotificationBell /> */}
            <button
              type="button"
              className="relative inline-flex items-center justify-center h-9 w-9 rounded-xl bg-white/5 ring-1 ring-white/10 hover:bg-white/10 transition focus:outline-none focus:ring-2 focus:ring-emerald-400"
              title="Notificaciones"
            >
              <FiBell className="text-white/80" />
              {/* puntito opcional
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-emerald-400" />
              */}
            </button>

            {/* avatar + menú usuario */}
            <div className="relative" ref={userMenuRef}>
              <button
                type="button"
                onClick={() => setUserMenuOpen((v) => !v)}
                className="
                  group flex items-center gap-2 pl-1 pr-2 py-1
                  rounded-xl bg-white/5 ring-1 ring-white/12 hover:bg-white/10
                  transition focus:outline-none focus:ring-2 focus:ring-emerald-400
                "
                aria-haspopup="menu"
                aria-expanded={userMenuOpen}
              >
                <span
                  aria-hidden
                  className="
                    grid place-items-center h-8 w-8 rounded-full
                    bg-gradient-to-br from-emerald-500 to-teal-500
                    text-white font-bold text-sm ring-1 ring-white/25
                  "
                >
                  {userInitial}
                </span>
                <div className="hidden md:flex flex-col items-start">
                  <span className="text-sm text-white/90 leading-tight">
                    {displayUserName || 'Usuario'}
                  </span>
                  <span className="text-[11px] text-emerald-200/80 leading-tight">
                    {nivelLabel}
                  </span>
                </div>
                <FiChevronDown className="text-white/70 group-hover:text-white transition" />
              </button>

              <AnimatePresence>
                {userMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -6, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: 0.98 }}
                    transition={{ duration: 0.16 }}
                    className="
                      absolute right-0 mt-2 w-60
                      rounded-2xl bg-[rgba(9,12,28,0.96)] backdrop-blur-xl
                      border border-white/10 shadow-2xl p-2
                    "
                    role="menu"
                  >
                    <div className="px-3 py-2">
                      <p className="text-xs text-white/45">Sesión activa</p>
                      <p className="text-sm text-white font-medium">
                        {displayUserName || 'Usuario'}
                      </p>
                      <p className="text-[11px] text-white/40 capitalize">
                        Rol: {nivelLabel}
                      </p>
                    </div>
                    <div className="my-2 h-px bg-white/10" />
                    <button
                      onClick={handleLogout}
                      className="
                        w-full inline-flex items-center gap-2 px-3 py-2.5
                        rounded-xl text-sm text-rose-100
                        hover:bg-rose-500/10 hover:text-white
                        transition
                      "
                      role="menuitem"
                    >
                      <FiLogOut /> Cerrar sesión
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* botón burger móvil */}
          <div className="lg:hidden flex items-center gap-2">
            {/* mini avatar móvil */}
            <div className="flex items-center gap-2">
              <span className="grid place-items-center h-8 w-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 text-white font-bold text-sm ring-1 ring-white/25">
                {userInitial}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              className="inline-flex items-center justify-center h-10 w-10 rounded-xl bg-white/5 ring-1 ring-white/10 hover:bg-white/10 transition focus:outline-none focus:ring-2 focus:ring-emerald-400"
              aria-label="Abrir menú"
            >
              <FiMenu className="text-white/85 text-xl" />
            </button>
          </div>
        </div>

        {/* sombra inferior sutil */}
        <div className="pointer-events-none h-[1px] w-full bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      </nav>

      {/* Drawer móvil */}
      <AnimatePresence>
        {drawerOpen && (
          <>
            {/* backdrop */}
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.45 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black"
              onClick={() => setDrawerOpen(false)}
            />

            {/* panel */}
            <motion.aside
              key="panel"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 22, stiffness: 240 }}
              className="
                fixed right-0 top-0 h-full w-[86%] max-w-sm
                bg-[rgba(6,9,24,0.98)] backdrop-blur-xl
                border-l border-white/10
                p-4 z-50
                flex flex-col
              "
              aria-label="Menú móvil"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <img
                    src={logoSueno}
                    alt="Sueño"
                    className="h-9 w-9 rounded-md ring-1 ring-white/10 object-cover"
                  />
                  <div>
                    <p className="text-white font-semibold leading-5">
                      {displayUserName || 'Usuario'}
                    </p>
                    <p className="text-white/50 text-xs capitalize">
                      Rol: {nivelLabel}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setDrawerOpen(false)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 ring-1 ring-white/10 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  aria-label="Cerrar menú"
                >
                  <FiX className="text-white/85 text-xl" />
                </button>
              </div>

              <div className="mt-6">
                <ul className="space-y-1">
                  {filteredLinks.map((link) => {
                    const active = isActive(link.href);
                    return (
                      <li key={link.id}>
                        <Link
                          to={`/${link.href}`}
                          onClick={() => setDrawerOpen(false)}
                          className={`
                            block px-3 py-3 rounded-xl text-sm transition
                            ${
                              active
                                ? 'bg-white/10 text-white font-semibold'
                                : 'text-white/80 hover:text-white hover:bg-white/5'
                            }
                          `}
                          aria-current={active ? 'page' : undefined}
                        >
                          {link.title}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>

              <div className="mt-auto pt-4 border-t border-white/10 space-y-3">
                {/* <NotificationBell /> */}
                <button
                  onClick={handleLogout}
                  className="
                    w-full inline-flex items-center justify-center gap-2
                    rounded-xl px-4 py-3
                    bg-gradient-to-r from-rose-500 to-pink-600
                    hover:from-rose-600 hover:to-pink-700
                    text-white font-semibold
                    shadow-lg shadow-rose-900/25
                    focus:outline-none focus:ring-2 focus:ring-emerald-400
                  "
                >
                  <FiLogOut className="text-white" />
                  Cerrar sesión
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </header>
  );
};

export default NavbarStaff;
