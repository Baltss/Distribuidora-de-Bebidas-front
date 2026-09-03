/*
 *
 * Fecha Creación: 11 / 11 / 2025
 * Versión: 1.0
 *
 * Descripción:
 *  Este archivo (App.jsx) es el componente principal de la aplicación.
 *  Contiene la configuración de enrutamiento, carga de componentes asíncrona,
 *  y la lógica para mostrar un componente de carga durante la carga inicial.
 *  Además, incluye la estructura principal de la aplicación, como la barra de navegación,
 *  el pie de página y las diferentes rutas para las páginas de la aplicación.
 *
 * Tema: Configuración de la Aplicación Principal
 * Capa: Frontend
 */

import './App.css';
import {
  BrowserRouter as Router,
  Routes as Rutas,
  Route as Ruta,
  Navigate
} from 'react-router-dom'; // IMPORTAMOS useLocation PARA OCULTAR COMPONENTES

import { AuthProvider } from './AuthContext';
import ProtectedRoute from './ProtectedRoute';


import LoginForm from './Components/login/LoginForm';
import AdminPage from './Pages/Dash/AdminPage';
import LocalesGet from './Pages/MetodosGets/LocalesGet';
import UsuariosPage from './Pages/Usuarios/UsuariosPage';
import ProductosCards from './Pages/Productos/ProductosCards';
import CiudadesCards from './Pages/Geografia/CiudadesCards';
import AdminPageGeografia from './Pages/Geografia/AdminPageGeografia';
import LocalidadesCards from './Pages/Geografia/LocalidadesCards';
import BarriosCards from './Pages/Geografia/BarriosCards';
import AdminPageVendedores from './Pages/Vendedores/AdminPageVendedores';
import VendedoresCards from './Pages/Vendedores/VendedoresCards';
import VendedorBarriosCards from './Pages/Vendedores/VendedorBarriosCards';
import ClientesCards from './Pages/Clientes/ClientesCards';
import VentasHistorialPage from './Pages/Ventas/VentasHistorialPage';
import NuevaVentaPage from './Pages/Ventas/NuevaVentaPage';
import VentasDeudasPage from './Pages/Ventas/VentasDeudasPage';
import VentasReportesPage from './Pages/Ventas/VentasReportesPage';
import AdminPageRepartos from './Pages/Repartos/AdminPageRepartos';
import RepartosCards from './Pages/Repartos/RepartosCards';

import ReporteRepartoCobranza from './Pages/Reportes/ReporteRepartoCobranza';

//  - 25/02/2026 - Pantalla de saldo previo (deudas históricas)
import VentasSaldoPrevioPage from './Pages/Ventas/VentasSaldoPrevioPage.jsx';

//  - 09/07/2026 - Stock, Proveedores, Compras y Gastos
import ProveedoresCards from './Pages/Proveedores/ProveedoresCards.jsx';
import ComprasHistorialPage from './Pages/Compras/ComprasHistorialPage.jsx';
//  - 16/07/2026 - Gastos se renombra y amplía a "Caja y Finanzas"
import CajaPage from './Pages/Caja/CajaPage.jsx';

function AppContent() {
  return (
    <>
      <div className="w-full min-h-screen overflow-x-hidden bg-[#1f3636]">
        <Rutas>
          <Ruta path="/" element={<LoginForm />} />
          {/* componentes del staff y login INICIO */}
          <Ruta path="/login" element={<LoginForm />} />
          <Ruta
            path="/dashboard"
            element={
              <ProtectedRoute>
                {' '}
                <AdminPage />{' '}
              </ProtectedRoute>
            }
          />
          <Ruta
            path="/dashboard/usuarios"
            element={
              <ProtectedRoute roles={['socio']}>
                {' '}
                <UsuariosPage />{' '}
              </ProtectedRoute>
            }
          />
          <Ruta
            path="/dashboard/locales"
            element={
              <ProtectedRoute roles={['socio']}>
                {' '}
                <LocalesGet />{' '}
              </ProtectedRoute>
            }
          />
          <Ruta
            path="/dashboard/productos"
            element={
              <ProtectedRoute>
                {' '}
                <ProductosCards />{' '}
              </ProtectedRoute>
            }
          />
          <Ruta
            path="/dashboard/geografia"
            element={
              <ProtectedRoute>
                {' '}
                <AdminPageGeografia />{' '}
              </ProtectedRoute>
            }
          />
          <Ruta
            path="/dashboard/geografia/ciudades"
            element={
              <ProtectedRoute>
                {' '}
                <CiudadesCards />{' '}
              </ProtectedRoute>
            }
          />
          <Ruta
            path="/dashboard/geografia/localidades"
            element={
              <ProtectedRoute>
                {' '}
                <LocalidadesCards />{' '}
              </ProtectedRoute>
            }
          />
          <Ruta
            path="/dashboard/geografia/barrios"
            element={
              <ProtectedRoute>
                {' '}
                <BarriosCards />{' '}
              </ProtectedRoute>
            }
          />
          <Ruta
            path="/dashboard/vendedores"
            element={
              <ProtectedRoute>
                {' '}
                <AdminPageVendedores />{' '}
              </ProtectedRoute>
            }
          />
          <Ruta
            path="/dashboard/vendedores/vendedores"
            element={
              <ProtectedRoute>
                {' '}
                <VendedoresCards />{' '}
              </ProtectedRoute>
            }
          />
          <Ruta
            path="/dashboard/vendedores/vendedores_barrios"
            element={
              <ProtectedRoute>
                {' '}
                <VendedorBarriosCards />{' '}
              </ProtectedRoute>
            }
          />
          <Ruta
            path="/dashboard/clientes"
            element={
              <ProtectedRoute>
                {' '}
                <ClientesCards />{' '}
              </ProtectedRoute>
            }
          />
          <Ruta
            path="/dashboard/nueva-venta"
            element={
              <ProtectedRoute>
                {' '}
                <NuevaVentaPage />{' '}
              </ProtectedRoute>
            }
          />
          <Ruta
            path="/dashboard/ventas"
            element={
              <ProtectedRoute>
                {' '}
                <VentasHistorialPage />{' '}
              </ProtectedRoute>
            }
          />
          <Ruta
            path="/dashboard/ventas/ventas"
            element={
              <ProtectedRoute>
                {' '}
                <VentasHistorialPage />{' '}
              </ProtectedRoute>
            }
          />
          <Ruta
            path="/dashboard/ventas/saldo-previo"
            element={
              <ProtectedRoute>
                {' '}
                <VentasSaldoPrevioPage />{' '}
              </ProtectedRoute>
            }
          />
          <Ruta
            path="/dashboard/ventas/deudas"
            element={
              <ProtectedRoute>
                {' '}
                <VentasDeudasPage />{' '}
              </ProtectedRoute>
            }
          />
          <Ruta
            path="/dashboard/ventas/reportes"
            element={
              <ProtectedRoute>
                {' '}
                <VentasReportesPage />{' '}
              </ProtectedRoute>
            }
          />
          <Ruta
            path="/dashboard/geografia/repartos"
            element={
              <ProtectedRoute>
                {' '}
                <RepartosCards />{' '}
              </ProtectedRoute>
            }
          />
          {/* <Ruta
            path="/dashboard/geografia/repartos/listado"
            element={
              <ProtectedRoute>
                {' '}
                <RepartosCards />{' '}
              </ProtectedRoute>
            }
          /> */}
          <Ruta
            path="/dashboard/cobranzas"
            element={
              <ProtectedRoute>
                {' '}
                <VentasDeudasPage />{' '}
              </ProtectedRoute>
            }
          />
          <Ruta
            path="/dashboard/generacion-informes"
            element={
              <ProtectedRoute>
                {' '}
                <ReporteRepartoCobranza />{' '}
              </ProtectedRoute>
            }
          />
          <Ruta
            path="/dashboard/proveedores"
            element={
              <ProtectedRoute>
                {' '}
                <ProveedoresCards />{' '}
              </ProtectedRoute>
            }
          />
          <Ruta
            path="/dashboard/compras"
            element={
              <ProtectedRoute>
                {' '}
                <ComprasHistorialPage />{' '}
              </ProtectedRoute>
            }
          />
          <Ruta
            path="/dashboard/caja"
            element={
              <ProtectedRoute>
                {' '}
                <CajaPage />{' '}
              </ProtectedRoute>
            }
          />
          {/*  - 16/07/2026 - Alias: "Gastos" pasó a llamarse "Caja y Finanzas" */}
          <Ruta
            path="/dashboard/gastos"
            element={
              <ProtectedRoute>
                {' '}
                <CajaPage />{' '}
              </ProtectedRoute>
            }
          />
          {/* Red de seguridad: cualquier ruta que no exista (ej. un link roto
              o un redirect apuntando a algo que ya no está) manda al
              dashboard en vez de dejar la pantalla en blanco. */}
          <Ruta path="*" element={<Navigate to="/dashboard" replace />} />
        </Rutas>
        
      </div>
    </>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppContent />
      </Router>
    </AuthProvider>
  );
}

export default App;
