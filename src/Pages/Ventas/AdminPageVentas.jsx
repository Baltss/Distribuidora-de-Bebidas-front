// ===============================
// FILE: src/Pages/Ventas/AdminPageVentas.jsx
// ===============================
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AppShell from '../../Components/Layout/AppShell';
import { useAuth } from '../../AuthContext';
import { motion } from 'framer-motion';
import { FaArrowLeft } from 'react-icons/fa';
// Íconos relacionados a ventas
import {
  FaCashRegister,
  FaFileInvoiceDollar,
  FaUsers,
  FaChartLine,
  FaMoneyBillWave
} from 'react-icons/fa';

import VentaFormModal from '../../Components/Ventas/VentaFormModal';
import VentaRepartoFormModal from '../../Components/Ventas/VentaRepartoFormModal'; //
import { createVenta, createVentasRepartoMasiva } from '../../api/ventas'; //
import { addVentaItems } from '../../api/ventas_detalles';
import Swal from 'sweetalert2';
import 'sweetalert2/dist/sweetalert2.min.css';

const ventasLinks = [
  {
    to: '/dashboard/ventas/ventas', // listado / historial
    label: 'Historial de Ventas',
    icon: <FaFileInvoiceDollar />
  },
  {
    to: '/dashboard/ventas/ventas-reparto-masiva',
    label: 'Ventas masivas por reparto',
    icon: <FaCashRegister />
  },
  {
    to: '/dashboard/ventas/nueva', // esta NO navega: abre modal
    label: 'Nueva Venta',
    icon: <FaCashRegister />
  },
  //  - 25/02/2026 - Link a pantalla de carga manual de saldo previo (deudas históricas sin productos)
  {
    to: '/dashboard/ventas/saldo-previo',
    label: 'Cargar Saldo Previo',
    icon: <FaMoneyBillWave />
  },
  {
    to: '/dashboard/ventas/deudas', // fiado / cuentas por cobrar
    label: 'Gestión de Deudas',
    icon: <FaUsers />
  },
  {
    to: '/dashboard/ventas/reportes', // analítica básica
    label: 'Reportes y Análisis',
    icon: <FaChartLine />
  }
];

const AdminPageVentas = () => {
  const { userLevel } = useAuth(); // por si despues filtras accesos por rol
  const navigate = useNavigate();
  const [ventaModalOpen, setVentaModalOpen] = useState(false);
  const [ventasRepartoModalOpen, setVentasRepartoModalOpen] = useState(false); //
  const [creating, setCreating] = useState(false);
  const [creatingMasiva, setCreatingMasiva] = useState(false); //

  // Recibe { venta: { cliente_id, vendedor_id, fecha, tipo, observaciones }, items: [] }
  const handleNuevaVenta = async ({ venta, items }) => {
    try {
      setCreating(true);

      // ======================================================
      //  - 17-01-2026
      // Crear venta en 1 solo request (cabecera + items + a_cuenta)
      // ======================================================
      const nueva = await createVenta({ ...venta, items });

      Swal.fire({
        icon: 'success',
        title: 'Venta creada',
        text: 'La venta se registró correctamente.',
        timer: 2000,
        showConfirmButton: false
      });

      setVentaModalOpen(false);
    } catch (err) {
      console.error('Error creando venta:', err);
      const msg =
        err?.response?.data?.mensajeError ||
        err?.message ||
        'No se pudo crear la venta.';

      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: msg
      });

      throw err;
    } finally {
      setCreating(false);
    }
  };

  //  Recibe payload ya armado para /ventas/reparto-masiva
  // {
  //   reparto_id, fecha, tipo, vendedor_id, observaciones,
  //   items: [{ cliente_id, lineas: [{ producto_id, cantidad, precio_unit }] }]
  // }
  const handleVentasRepartoMasiva = async (payload) => {
    try {
      setCreatingMasiva(true);

      const resp = await createVentasRepartoMasiva(payload);

      const cant =
        resp?.meta?.ventasCreadas ??
        (Array.isArray(resp?.ventas) ? resp.ventas.length : 0);

      const total = resp?.meta?.totalGeneral;

      Swal.fire({
        icon: 'success',
        title: 'Ventas generadas',
        html:
          cant && total != null
            ? `Se generaron <b>${cant}</b> venta(s) por reparto.<br/>Total general: <b>$${Number(
                total
              ).toLocaleString('es-AR', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
              })}</b>.`
            : 'Las ventas por reparto se registraron correctamente.',
        timer: 2800,
        showConfirmButton: false
      });

      setVentasRepartoModalOpen(false);
    } catch (err) {
      console.error('Error generando ventas por reparto:', err);
      const msg =
        err?.response?.data?.mensajeError ||
        err?.message ||
        'No se pudieron generar las ventas por reparto.';

      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: msg
      });

      throw err;
    } finally {
      setCreatingMasiva(false);
    }
  };

  const tileCls =
    'w-full rounded-2xl border border-slate-200 bg-white shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 text-slate-700 font-semibold text-base p-6 flex flex-col items-center justify-center gap-3';

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition"
          >
            <FaArrowLeft className="h-3.5 w-3.5" /> Volver
          </button>
        </div>

        <motion.h1
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900"
        >
          Gestión de Ventas
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mt-1 text-sm text-slate-500 max-w-2xl"
        >
          Accedé rápidamente al historial, cargá nuevas ventas, administrá
          deudas y consultá reportes para tomar mejores decisiones.
        </motion.p>

        {/* Tarjetas */}
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5">
          {ventasLinks.map(({ to, label, icon }, index) => {
            const isNuevaVenta = to === '/dashboard/ventas/nueva';
            const isVentasReparto =
              to === '/dashboard/ventas/ventas-reparto-masiva'; //
            const isCobranzas = to === '/dashboard/ventas/cobranzas';
            if (isNuevaVenta) {
              return (
                <button
                  type="button"
                  key={label}
                  onClick={() => setVentaModalOpen(true)}
                  disabled={creating}
                  className="flex justify-center"
                >
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.4, delay: index * 0.08 }}
                    className={`${tileCls} ${creating ? 'opacity-70 cursor-wait' : ''}`}
                  >
                    <span className="text-3xl text-teal-600">{icon}</span>
                    <span className="text-center text-slate-800">
                      {creating ? 'Creando venta…' : label}
                    </span>
                  </motion.div>
                </button>
              );
            }

            //  Tarjeta especial: abre modal de "Ventas masivas por reparto"
            if (isVentasReparto) {
              return (
                <button
                  type="button"
                  key={label}
                  onClick={() => setVentasRepartoModalOpen(true)}
                  disabled={creatingMasiva}
                  className="flex justify-center"
                >
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.4, delay: index * 0.08 }}
                    className={`${tileCls} ${creatingMasiva ? 'opacity-70 cursor-wait' : ''}`}
                  >
                    <span className="text-3xl text-teal-600">{icon}</span>
                    <span className="text-center text-slate-800">
                      {creatingMasiva ? 'Generando ventas…' : label}
                    </span>
                  </motion.div>
                </button>
              );
            }

            //  Tarjeta especial: flujo Cobrar Fiados Clientes (abre selector de cliente)
            if (isCobranzas) {
              return (
                <button
                  type="button"
                  key={label}
                  onClick={() => {
                    setSelectClienteModalOpen(true);
                  }}
                  className="flex justify-center"
                >
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.4, delay: index * 0.08 }}
                    className={tileCls}
                  >
                    <span className="text-3xl text-teal-600">{icon}</span>
                    <span className="text-center text-slate-800">{label}</span>
                  </motion.div>
                </button>
              );
            }

            //  Las demás siguen como links normales
            return (
              <Link
                to={typeof to === 'string' ? to : to.pathname}
                state={typeof to === 'object' ? to.state || {} : {}}
                key={label}
                className="flex justify-center"
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.4, delay: index * 0.08 }}
                  className={tileCls}
                >
                  <span className="text-3xl text-teal-600">{icon}</span>
                  <span className="text-center text-slate-800">{label}</span>
                </motion.div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Modal de Nueva Venta */}
      <VentaFormModal
        open={ventaModalOpen}
        onClose={() => setVentaModalOpen(false)}
        onSubmit={handleNuevaVenta}
      />

      {/*  Modal de Ventas masivas por reparto */}
      <VentaRepartoFormModal
        open={ventasRepartoModalOpen}
        onClose={() => setVentasRepartoModalOpen(false)}
        onSubmit={handleVentasRepartoMasiva}
      />
    </AppShell>
  );
};

export default AdminPageVentas;
