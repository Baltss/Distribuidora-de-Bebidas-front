import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  preview: {
    // Railway asigna un dominio dinámico (*.up.railway.app); Vite bloquea
    // hosts desconocidos por defecto en `vite preview`.
    allowedHosts: true
  }
});
