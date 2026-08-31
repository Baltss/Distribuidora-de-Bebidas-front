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

import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [authToken, setAuthToken] = useState(null);
  const [userId, setUserId] = useState(null);
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userLevel, setUserLevel] = useState('');
  const [userLocalId, setUserLocalId] = useState(null);
  const [userIsReemplazante, setUserIsReemplazante] = useState(false);

  const logout = () => {
    setAuthToken(null);
    setUserId(null);
    setUserName('');
    setUserEmail('');
    setUserLevel('');
    setUserLocalId(null);
    setUserIsReemplazante(false);

    sessionStorage.removeItem('authToken');
    sessionStorage.removeItem('userId');
    sessionStorage.removeItem('userName');
    sessionStorage.removeItem('userEmail');
    sessionStorage.removeItem('userLevel');
    sessionStorage.removeItem('userLocalId');
    sessionStorage.removeItem('userIsReemplazante');
  };

  useEffect(() => {
    const token = sessionStorage.getItem('authToken');
    const id = sessionStorage.getItem('userId');
    const name = sessionStorage.getItem('userName');
    const email = sessionStorage.getItem('userEmail');
    const role = sessionStorage.getItem('userLevel');
    const localId = sessionStorage.getItem('userLocalId');
    const isReemplazante = sessionStorage.getItem('userIsReemplazante');

    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const isExpired = Date.now() >= payload.exp * 1000;
        if (isExpired) {
          logout();
        } else {
          setAuthToken(token);
        }
      } catch (e) {
        console.error('Token inválido:', e);
        logout();
      }
    }

    if (id) setUserId(id);
    if (name) setUserName(name);
    if (email) setUserEmail(email);
    if (role) setUserLevel(role);
    if (localId) setUserLocalId(localId);
    if (isReemplazante) setUserIsReemplazante(isReemplazante === 'true');
    // Nota: usamos sessionStorage (no localStorage) a propósito: persiste
    // mientras la pestaña/navegador esté abierto (sobrevive a recargas) y
    // se borra solo al cerrarlo, sin necesitar un listener de beforeunload
    // (que además se dispara también en cada F5, deslogueando al recargar).
  }, []);

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
