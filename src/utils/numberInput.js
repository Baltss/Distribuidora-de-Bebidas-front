// src/utils/numberInput.js

// Bloquea que la rueda del mouse cambie el valor de un <input type="number">
// mientras el usuario scrollea la página (el input pierde foco al pasar el
// mouse por arriba y el navegador ya no le manda el evento de wheel).
export const blockWheelChange = (e) => {
  e.target.blur();
};
