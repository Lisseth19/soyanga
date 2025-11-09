// src/app/router/rutas.tsx
import { createBrowserRouter, Navigate, useLocation } from "react-router-dom";
import ResetPasswordPage from "@/paginas/auth/ResetPassword";

// Layouts
import AppLayout from "../layout/Layout";
import PublicLayout from "../layout/PublicLayout";
import SettingsLayout from "../layout/SettingsLayout";
import ComprasLayout from "../layout/ComprasLayout";
import SeguridadLayout from "../layout/SeguridadLayout";
import InventarioLayout from "../layout/InventarioLayout";

// Auth
import RequireAuth from "@/componentes/RequireAuth";
import LoginPage from "@/paginas/Login";
import { AuthMinimalLayout } from "../layout/AuthMinimalLayout";

// Páginas públicas
import InicioPublico from "@/paginas/publico/InicioPublico";
import CatalogoPublico from "@/paginas/publico/CatalogoPublico";
import ProductoPublico from "@/paginas/publico/ProductoPublico";
import ContactoPublico from "@/paginas/publico/Contacto";
import CartPage from "@/paginas/publico/Cotizacion";
import MetodosPagoPage from "@/paginas/publico/MetodosPago";

// Páginas privadas (dashboard)
import Inicio from "@/paginas/Inicio";
import SaludAPI from "@/paginas/Health";

// Inventario
import InventarioPorLotePage from "@/paginas/inventario/InventarioPorLote";
import AjustesInventarioPage from "@/paginas/inventario/AjustesInventario";
import MovimientosEntreAlmacenesPage from "@/paginas/inventario/MovimientosEntreAlmacenes";
import AlertasInventarioPage from "@/paginas/inventario/AlertasInventario";

// Estructura / Finanzas
import SucursalesList from "@/paginas/sucursales/SucursalesList";
import NuevaSucursal from "@/paginas/sucursales/NuevaSucursal";
import EditarSucursal from "@/paginas/sucursales/EditarSucursal";
import AlmacenesPage from "@/paginas/almacenes/almacen";
import MonedasPage from "@/paginas/moneda/Monedas";
//import TiposCambioPage from "@/paginas/finanzas/TiposCambio";

// Catálogo interno
import CatalogoIndex from "@/paginas/catalogo/Index";
import CategoriasPage from "@/paginas/categorias/Categorias";
import ProductosPage from "@/paginas/inventario/Productos";
import UnidadesPage from "@/paginas/catalogo/Unidades";
import PresentacionesPage from "@/paginas/catalogo/Presentaciones";
//import CodigosBarrasPage from "@/paginas/catalogo/CodigosBarras";

// Compras
import ComprasListaPage from "@/paginas/compras/ComprasLista";
import CompraDetallePage from "@/paginas/compras/CompraDetalle";
import CompraNuevaPage from "@/paginas/compras/CompraNueva";
import RecepcionNuevaPage from "@/paginas/compras/RecepcionNueva";

// CRM básico
import ClientesPage from "@/paginas/cliente/Clientes";
import ProveedoresPage from "@/paginas/proveedor/Proveedores";

// Seguridad
import UsuariosPage from "@/paginas/seguridad/Usuarios";
import RolesPage from "@/paginas/seguridad/Roles";
import PermisosPage from "@/paginas/seguridad/Permisos";
import AuditoriasPage from "@/paginas/seguridad/Auditorias";

function RedirectWithQuery({ to }: { to: string }) {
  const location = useLocation();
  return <Navigate to={`${to}${location.search}${location.hash}`} replace />;
}

//precios
import ReglasDePrecios from "@/paginas/finanzas/ReglasDePrecios";
import HistorialPrecios from "@/paginas/finanzas/HistorialPrecios";

export const router = createBrowserRouter([
  // ============================
  // BLOQUE PÚBLICO (NO requiere auth)
  // ============================
  {
    path: "/soyanga",
    element: <PublicLayout />,
    children: [
      { index: true, element: <InicioPublico /> },
      { path: "inicio", element: <InicioPublico /> },
      { path: "catalogo", element: <CatalogoPublico /> },
      { path: "producto/:id", element: <ProductoPublico /> },
      { path: "metodos", element: <MetodosPagoPage /> },
      { path: "contacto", element: <ContactoPublico /> },
      { path: "cotizacion", element: <CartPage /> },
      { path: "*", element: <div className="p-6 max-w-6xl mx-auto">Página no encontrada.</div> },
    ],
  },

  // Login
  { path: "/soyanga/login", element: <LoginPage /> },
  { path: "/login", element: <Navigate to="/soyanga/login" replace /> },

  // ============================
  // BLOQUE AUTH MINIMAL (ej. reset password)
  // ============================
  {
    element: <AuthMinimalLayout />,
    children: [{ path: "/soyanga/reset-password", element: <ResetPasswordPage /> }],
  },
  { path: "/reset-password", element: <RedirectWithQuery to="/soyanga/reset-password" /> },

  // ============================
  // BLOQUE PRIVADO (SÍ requiere auth)
  // ============================
  {
    element: (
      <RequireAuth>
        <AppLayout />
      </RequireAuth>
    ),
    children: [
      { path: "/inicio", element: <Inicio /> },
      { path: "/salud", element: <SaludAPI /> },

      // === Configuración (estructura/finanzas) ===
      {
        path: "/config",
        element: <SettingsLayout />,
        children: [
          { path: "estructura/sucursales", element: <SucursalesList /> },
          { path: "estructura/almacenes", element: <AlmacenesPage /> },
          { path: "finanzas/monedas", element: <MonedasPage /> },
         // { path: "finanzas/tipos-cambio", element: <TiposCambioPage /> },
          { path: "finanzas/reglas-precios", element: <ReglasDePrecios />},
          { path: "finanzas/historial-precios", element: <HistorialPrecios /> },
        ],
      },

      // === Catálogo ===
      {
        path: "/catalogo",
        element: <SettingsLayout />,
        children: [
          { index: true, element: <CatalogoIndex /> },
          { path: "categorias", element: <CategoriasPage /> },
          { path: "productos", element: <ProductosPage /> },
          { path: "unidades", element: <UnidadesPage /> },
          { path: "presentaciones", element: <PresentacionesPage /> },
         // { path: "codigos-barras", element: <CodigosBarrasPage /> },
        ],
      },

      // === ALIASES de compatibilidad (evitan que te bote al público) ===
      { path: "/catalogo/almacenes", element: <Navigate to="/config/estructura/almacenes" replace /> },
      { path: "/catalogo/monedas", element: <Navigate to="/config/finanzas/monedas" replace /> },
    //  { path: "/catalogo/tipos-cambio", element: <Navigate to="/config/finanzas/tipos-cambio" replace /> },

      // === Compras ===
      {
        path: "/compras",
        element: <ComprasLayout />,
        children: [
          { index: true, element: <ComprasListaPage /> }, // Landing del módulo
          // Proveedores
          { path: "proveedores", element: <ProveedoresPage /> },
          // Pedidos
          { path: "pedidos", element: <ComprasListaPage /> },
          { path: "pedidos/nuevo", element: <CompraNuevaPage /> },
          { path: "pedidos/:id", element: <CompraDetallePage /> },
          // Recepciones para un pedido
          { path: "pedidos/:id/recepciones/nueva", element: <RecepcionNuevaPage /> },
          // Alias históricos
          { path: ":id", element: <CompraDetallePage /> },
          { path: ":id/recepciones/nueva", element: <RecepcionNuevaPage /> },
        ],
      },

      // === Seguridad ===
      {
        path: "/seguridad",
        element: <SeguridadLayout />,
        children: [
          { index: true, element: <UsuariosPage /> }, // el layout puede redirigir según permisos
          { path: "usuarios", element: <UsuariosPage /> },
          { path: "roles", element: <RolesPage /> },
          { path: "permisos", element: <PermisosPage /> },
          { path: "auditorias", element: <AuditoriasPage /> },
        ],
      },

      // === Inventario (módulo nuevo con subrutas) ===
      {
        path: "/inventario",
        element: <InventarioLayout />,
        children: [
          { index: true, element: <Navigate to="ajustes" replace /> },
          { path: "ajustes", element: <AjustesInventarioPage /> },
          { path: "movimientos", element: <MovimientosEntreAlmacenesPage /> },
          { path: "alertas", element: <AlertasInventarioPage /> },
        ],
      },

      // Inventario por lote (ruta directa que ya usas en el layout)
      { path: "/inventario/por-lote", element: <InventarioPorLotePage /> },

      // Sucursales (atajos fuera de /config si los usas en la UI)
      { path: "/sucursales", element: <SucursalesList /> },
      { path: "/sucursales/nueva", element: <NuevaSucursal /> },
      { path: "/sucursales/:id", element: <EditarSucursal /> },

      // CRM
      { path: "/clientes", element: <ClientesPage /> },

      // === Catch-all PRIVADO: manda al /inicio (no al público) ===
      { path: "*", element: <Navigate to="/inicio" replace /> },
    ],
  },

  // Catch-all GLOBAL → homepage pública (asegura que / caiga en público)
  { path: "*", element: <Navigate to="/soyanga/inicio" replace /> },
]);
