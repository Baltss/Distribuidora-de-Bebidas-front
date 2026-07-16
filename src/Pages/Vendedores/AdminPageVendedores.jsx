// src/Pages/Vendedores/AdminPageVendedores.jsx
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AppShell from '../../Components/Layout/AppShell';
import { motion } from 'framer-motion';
import { FaUserTie, FaMapMarkedAlt, FaArrowLeft } from 'react-icons/fa';

const vendedoresLinks = [
  {
    to: '/dashboard/vendedores/vendedores',
    label: 'Vendedores',
    icon: <FaUserTie />
  },
  {
    to: '/dashboard/vendedores/vendedores_barrios',
    label: 'Barrios Asignados',
    icon: <FaMapMarkedAlt />
  }
];

const AdminPageVendedores = () => {
  const navigate = useNavigate();

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
          Gestión de Vendedores
        </motion.h1>
        <p className="mt-1 text-sm text-slate-500">
          Elegí una sección para administrar vendedores y sus barrios asignados.
        </p>

        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
          {vendedoresLinks.map(({ to, label, icon }, index) => (
            <Link to={to} key={label} className="flex">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, delay: index * 0.08 }}
                className="w-full rounded-2xl border border-slate-200 bg-white shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 text-slate-700 font-semibold text-base p-6 flex flex-col items-center justify-center gap-3"
              >
                <span className="text-3xl text-teal-600">{icon}</span>
                <span className="text-center text-slate-800">{label}</span>
              </motion.div>
            </Link>
          ))}
        </div>
      </div>
    </AppShell>
  );
};

export default AdminPageVendedores;
