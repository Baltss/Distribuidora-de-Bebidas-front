// ===============================
// FILE: src/Pages/Ventas/AdminPageCobranzas.jsx
// ===============================
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import NavbarStaff from '../Dash/NavbarStaff';
import '../../Styles/staff/dashboard.css';
import '../../Styles/staff/background.css';
import ParticlesBackground from '../../Components/ParticlesBackground';
import { motion, AnimatePresence } from 'framer-motion';
import ButtonBack from '../../Components/ButtonBack';

import DeudaClienteModal from '../../Components/Cobranzas/DeudaClienteModal';
import SeleccionarClienteDeudaModal from '../../Components/Cobranzas/SeleccionarClienteDeudaModal';

// Íconos relacionados a cobranzas / dinero
import { FaMoneyBill } from 'react-icons/fa';
import { X } from 'lucide-react';
import CobranzasClientesListado from '../../Components/Cobranzas/CobranzasClientesListado';

const cobranzasLinks = [
  {
    key: 'cobrar-fiados',
    label: 'Cobrar Fiados a Clientes',
    icon: <FaMoneyBill />,
    description:
      'Elegí un cliente con deuda, revisá sus fiados y registrá la cobranza.'
  },
  {
    key: 'cobranzas',
    label: 'Listado de Cobranzas Realizadas',
    icon: <FaMoneyBill />,
    description: 'Listado general de todas las cobranzas realizadas.'
  }
];

const AdminPageCobranzas = () => {
  const navigate = useNavigate();
  const [selectClienteModalOpen, setSelectClienteModalOpen] = useState(false);
  const [deudaModalOpen, setDeudaModalOpen] = useState(false);
  const [deudaClienteId, setDeudaClienteId] = useState(null);

  // qué “acción” de cobranzas está activa
  const [activeKey, setActiveKey] = useState(null);

  // modal para listado de cobranzas
  const [cobranzasListadoOpen, setCobranzasListadoOpen] = useState(false);

  const handleClickCard = (key) => {
    if (key === 'cobrar-fiados') {
      setActiveKey('cobrar-fiados');
      setSelectClienteModalOpen(true);
    } else if (key === 'cobranzas') {
      setActiveKey('cobranzas');
      setCobranzasListadoOpen(true);
    }
  };

  const handleCloseListado = () => {
    setCobranzasListadoOpen(false);
    setActiveKey((prev) => (prev === 'cobranzas' ? null : prev));
  };

  return (
    <>
      <NavbarStaff />
      <section className="relative w-full min-h-screen bg-white">
        {/*  Gradiente tipo “CxC / cobranzas” */}
        <div className="min-h-screen bg-gradient-to-b from-[#111827] via-[#1f2937] to-[#b53a1d]">
          <ParticlesBackground />
          <ButtonBack />

          {/* Título */}
          <div className="text-center pt-24 px-4">
            <motion.h1
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-4xl titulo uppercase font-bold text-white mb-3 drop-shadow-md"
            >
              Gestión de Cobranzas
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-sm sm:text-base text-slate-500/80 max-w-2xl mx-auto"
            >
              Consultá las deudas de tus clientes, cobrales los fiados y mantené
              actualizada la cuenta corriente de manera simple y ordenada.
            </motion.p>
          </div>

          {/* Contenido principal */}
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
            {/* Tarjetas / acciones principales del módulo de cobranzas */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 justify-center">
              {cobranzasLinks.map(
                ({ key, label, icon, description }, index) => {
                  const isActive = activeKey === key;
                  return (
                    <button
                      type="button"
                      key={key}
                      onClick={() => handleClickCard(key)}
                      className="flex justify-center"
                    >
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.4, delay: index * 0.08 }}
                        className={`bg-white/90 backdrop-blur-xl shadow-lg
                                   transition-all duration-300 text-gray-800 font-semibold text-lg
                                   rounded-2xl w-full max-w-xs p-6 flex flex-col items-center justify-center
                                   border hover:scale-[1.03] gap-3
                                   ${
                                     isActive
                                       ? 'border-orange-400 shadow-orange-500/70'
                                       : 'border-white/20 hover:shadow-orange-400/70'
                                   }`}
                      >
                        <span className="text-4xl text-orange-600">{icon}</span>
                        <span className="text-center">{label}</span>
                        {description && (
                          <p className="text-xs text-gray-500 text-center font-normal">
                            {description}
                          </p>
                        )}
                      </motion.div>
                    </button>
                  );
                }
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Modal para seleccionar cliente con deuda */}
      <SeleccionarClienteDeudaModal
        open={selectClienteModalOpen}
        onClose={() => {
          setSelectClienteModalOpen(false);
          setActiveKey((prev) => (prev === 'cobrar-fiados' ? null : prev));
        }}
        onSelect={(clienteId, clienteObj) => {
          console.log('Seleccionado para CxC:', clienteId, clienteObj);
          setDeudaClienteId(clienteId);
          setSelectClienteModalOpen(false);
          setDeudaModalOpen(true);
        }}
      />

      {/* Modal: detalle de deuda del cliente y futuras cobranzas */}
      <DeudaClienteModal
        open={deudaModalOpen}
        clienteId={deudaClienteId}
        onClose={() => {
          setDeudaModalOpen(false);
          setDeudaClienteId(null);
          setActiveKey((prev) => (prev === 'cobrar-fiados' ? null : prev));
        }}
        onVerVenta={(ventaId) => {
          if (!ventaId) return;

          // Cerramos el modal de deuda
          setDeudaModalOpen(false);

          navigate('/dashboard/ventas/ventas', {
            state: {
              ventaIdDetalle: ventaId,
              from: 'cobranzas'
            }
          });
        }}
      />

      {/*  Modal fullscreen para listado de cobranzas */}
      <AnimatePresence>
        {cobranzasListadoOpen && (
          <motion.div
            className="fixed inset-0 z-[58] flex items-center justify-center p-3 sm:p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* Overlay */}
            <div
              className="absolute inset-0 bg-black/75 backdrop-blur-md"
              onClick={handleCloseListado}
            />

            {/* Panel principal */}
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 230, damping: 26 }}
              className="relative w-full max-w-6xl max-h-[90vh] rounded-3xl border border-white/15
                         bg-slate-950/95 shadow-[0_0_50px_rgba(248,250,252,0.15)] flex flex-col overflow-hidden"
            >
              {/* Header modal listado */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-slate-900/80">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.16em] text-orange-300/80">
                    Cobranzas
                  </p>
                  <h2 className="text-lg sm:text-xl font-semibold text-slate-500">
                    Listado de Cobranzas Realizadas
                  </h2>
                  <p className="text-[11px] text-slate-600/80">
                    Revisá todas las cobranzas registradas, filtrá por cliente y
                    fecha, y abrí el detalle cuando lo necesites.
                  </p>
                </div>
                <button
                  onClick={handleCloseListado}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-2xl
                             bg-white/5 border border-white/20 hover:bg-white/10 transition"
                  aria-label="Cerrar listado de cobranzas"
                >
                  <X className="h-5 w-5 text-slate-500" />
                </button>
              </div>

              {/* Contenido: listado */}
              <div className="flex-1 overflow-y-auto px-3 sm:px-5 py-4">
                <CobranzasClientesListado />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default AdminPageCobranzas;
