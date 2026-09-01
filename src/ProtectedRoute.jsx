/*
 *
 * Fecha Creación: 26 / 11 / 2025
 * Versión: 1.0
 *
 * Descripción:
 * Este archivo (AuthContext.jsx) es el componente el cual proteje las rutas.
 *
 * Tema: Renderizacion
 * Capa: Frontend
 *
 */

import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext';

// `roles`: lista opcional de roles permitidos (ej: ['socio']). Si no se
// pasa, sólo exige estar logueado (comportamiento de siempre).
const ProtectedRoute = ({ children, roles }) => {
  const { authToken, userLevel } = useAuth();

  if (!authToken) {
    return <Navigate to="/login" />;
  }

  if (roles && roles.length > 0 && !roles.includes(String(userLevel || ''))) {
    return <Navigate to="/dashboard" />;
  }

  return children;
};

export default ProtectedRoute;
