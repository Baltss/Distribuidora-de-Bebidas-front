/*
 *
 * Fecha Actualización: 21 / 12 / 2025
 * Versión: 1.2
 *
 * Descripción:
 * Este archivo (LoginValidation.jsx) valida el formulario de login basado en email y password.
 *
 * Tema: Validación - Login
 * Capa: Frontend
 *
 */

function LoginValidation(values) {
  let errors = {};

  const email_pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const password_pattern = /^.{6,}$/;

  if (!values.email) {
    errors.email = 'Debe ingresar un correo electrónico';
  } else if (!email_pattern.test(values.email)) {
    errors.email = 'El correo electrónico no es válido';
  }

  if (!values.password) {
    errors.password = 'Debe ingresar una contraseña';
  } else if (!password_pattern.test(values.password)) {
    errors.password = 'La contraseña debe tener al menos 6 caracteres';
  }

  return errors;
}

export default LoginValidation;
