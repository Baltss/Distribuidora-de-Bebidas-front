/*
 *
 * Fecha Actualización: 21 / 11 / 2025
 * Versión: 1.2
 *
 * Descripción:
 * Este archivo (AuthContext.jsx) gestiona el estado de sesión del usuario mediante token JWT
 * basado en la nueva tabla de usuarios, sincronizado con el backend Node.js.
 *
 * Tema: Autenticación
 * Capa: Frontend
 */

import React, { createContext, useContext, useState } from 'react';

const AuthContext = createContext();

// Lee y valida el token guardado ANTES del primer render. Usar un
// useEffect para esto (como se hacía antes) deja una ventana en la que
// authToken todavía vale su estado inicial (null) durante el primer
// render: ProtectedRoute lo lee ahí mismo y redirige a /login antes de
// que el efecto llegue a rehidratarlo desde sessionStorage, así que
// cada F5 deslogueaba aunque el token siguiera guardado y vigente.
const leerTokenValido = () => {
  const token = sessionStorage.getItem('authToken');
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    if (Date.now() >= payload.exp * 1000) {
      return null; // expirado: se limpia en limpiarSesionStorage()
    }
    return token;
  } catch (e) {
    console.error('Token inválido:', e);
    return null;
  }
};

const limpiarSesionStorage = () => {
  sessionStorage.removeItem('authToken');
  sessionStorage.removeItem('userId');
  sessionStorage.removeItem('userName');
  sessionStorage.removeItem('userEmail');
  sessionStorage.removeItem('userLevel');
  sessionStorage.removeItem('userLocalId');
  sessionStorage.removeItem('userIsReemplazante');
  sessionStorage.removeItem('sucursalActivaId');
};

export const AuthProvider = ({ children }) => {
  const [authToken, setAuthToken] = useState(() => {
    const token = leerTokenValido();
    if (!token) limpiarSesionStorage();
    return token;
  });
  const [userId, setUserId] = useState(() => (authToken ? sessionStorage.getItem('userId') : null));
  const [userName, setUserName] = useState(() => (authToken ? sessionStorage.getItem('userName') || '' : ''));
  const [userEmail, setUserEmail] = useState(() => (authToken ? sessionStorage.getItem('userEmail') || '' : ''));
  const [userLevel, setUserLevel] = useState(() => (authToken ? sessionStorage.getItem('userLevel') || '' : ''));
  const [userLocalId, setUserLocalId] = useState(() => (authToken ? sessionStorage.getItem('userLocalId') : null));
  const [userIsReemplazante, setUserIsReemplazante] = useState(
    () => authToken && sessionStorage.getItem('userIsReemplazante') === 'true'
  );

  const logout = () => {
    setAuthToken(null);
    setUserId(null);
    setUserName('');
    setUserEmail('');
    setUserLevel('');
    setUserLocalId(null);
    setUserIsReemplazante(false);

    limpiarSesionStorage();
  };

  const login = (token, id, name, email, role, localId, esReemplazante) => {
    setAuthToken(token);
    setUserId(id);
    setUserName(name);
    setUserEmail(email);
    setUserLevel(role);
    setUserLocalId(localId);
    setUserIsReemplazante(!!esReemplazante);

    sessionStorage.setItem('authToken', token);
    sessionStorage.setItem('userId', id);
    sessionStorage.setItem('userName', name);
    sessionStorage.setItem('userEmail', email);
    sessionStorage.setItem('userLevel', role);
    sessionStorage.setItem('userLocalId', localId);
    sessionStorage.setItem('userIsReemplazante', (!!esReemplazante).toString());
  };

  return (
    <AuthContext.Provider
      value={{
        authToken,
        userId,
        userName,
        userEmail,
        userLevel,
        userLocalId,
        userIsReemplazante,
        login,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
