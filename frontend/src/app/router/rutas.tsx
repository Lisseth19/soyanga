// src/app/router/rutas.tsx
import { createBrowserRouter, Navigate } from "react-router-dom";

// Layouts
import AppLayout from "../layout/Layout";              // layout ADMIN
import PublicLayout from "../layout/PublicLayout";     // layout PÚBLICO

// Auth
import RequireAuth from "@/componentes/RequireAuth";
import LoginPage from "@/paginas/Login";

// Páginas públicas
import InicioPublico from "@/paginas/publico/InicioPublico";
import CatalogoPublico from "@/paginas/publico/CatalogoPublico";
import ProductoPublico from "@/paginas/publico/ProductoPublico";
import ContactoPublico from "@/paginas/publico/Contacto";
import CartPage from "@/paginas/publico/Cotizacion"; //  Cotización

// Páginas admin
import Inicio from "@/paginas/Inicio";
import SaludAPI from "@/paginas/Health";
import InventarioPorLotePage from "@/paginas/inventario/InventarioPorLote";
//import SucursalesList from "@/paginas/sucursales/SucursalesList";
import NuevaSucursal from "@/paginas/sucursales/NuevaSucursal";
import EditarSucursal from "@/paginas/sucursales/EditarSucursal";
//import AlmacenesPage from "@/paginas/almacenes/almacen";
//import CategoriasPage from "@/paginas/categorias/Categorias";
//import MonedasPage from "@/paginas/moneda/Monedas";
//import ProductosPage from "@/paginas/inventario/Productos";

// Catálogo interno
//import UnidadesPage from "@/paginas/catalogo/Unidades";
//import PresentacionesPage from "@/paginas/catalogo/Presentaciones";

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
import MetodosPagoPage from "@/paginas/publico/MetodosPago";

import SettingsLayout from "../layout/SettingsLayout";

import SucursalesList from "@/paginas/sucursales/SucursalesList";
import AlmacenesPage from "@/paginas/almacenes/almacen";
import MonedasPage from "@/paginas/moneda/Monedas";
import TiposCambioPage from "@/paginas/finanzas/TiposCambio";

import CatalogoIndex from "@/paginas/catalogo/Index";
import CategoriasPage from "@/paginas/categorias/Categorias";
import ProductosPage from "@/paginas/inventario/Productos";       // reutilizamos tu página actual
import UnidadesPage from "@/paginas/catalogo/Unidades";
import PresentacionesPage from "@/paginas/catalogo/Presentaciones";
import CodigosBarrasPage from "@/paginas/catalogo/CodigosBarras";

// Layout del módulo Compras
import ComprasLayout from "../layout/ComprasLayout";
import SeguridadLayout from "../layout/SeguridadLayout";
import AuditoriasPage from "@/paginas/seguridad/Auditorias";
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
      { path: "cotizacion", element: <CartPage /> }, //  NUEVO
      { path: "*", element: <div className="p-6 max-w-6xl mx-auto">Página no encontrada.</div> },
    ],
  },

  // Login
  { path: "/soyanga/login", element: <LoginPage /> },
  { path: "/login", element: <Navigate to="/soyanga/login" replace /> },

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

      // === Configuración y Catálogo (nuevo) ===
      {
        path: "/config",
        element: <SettingsLayout />,
        children: [
          { path: "estructura/sucursales", element: <SucursalesList /> },
          { path: "estructura/almacenes", element: <AlmacenesPage /> },
          { path: "finanzas/monedas", element: <MonedasPage /> },
          { path: "finanzas/tipos-cambio", element: <TiposCambioPage /> },
        ],
      },
      {
        path: "/catalogo",
        element: <SettingsLayout />,
        children: [
          { index: true, element: <CatalogoIndex /> },
          { path: "categorias", element: <CategoriasPage /> },
          { path: "productos", element: <ProductosPage /> },
          { path: "unidades", element: <UnidadesPage /> },
          { path: "presentaciones", element: <PresentacionesPage /> },
          { path: "codigos-barras", element: <CodigosBarrasPage /> },
        ],
      },
      {
        path: "/compras",
        element: <ComprasLayout />,
        children: [
          // Inicio del módulo: lista de pedidos
          { index: true, element: <ComprasListaPage /> },

          // Proveedores
          { path: "proveedores", element: <ProveedoresPage /> },

          // Pedidos (rutas principales)
          { path: "pedidos", element: <ComprasListaPage /> },
          { path: "pedidos/nuevo", element: <CompraNuevaPage /> },
          { path: "pedidos/:id", element: <CompraDetallePage /> },

          // Recepciones para un pedido específico
          { path: "pedidos/:id/recepciones/nueva", element: <RecepcionNuevaPage /> },

          // ---------- ALIAS DE COMPATIBILIDAD ----------
          // /compras/nueva  y  /compras/nuevo
         // { path: "nueva", element: <CompraNuevaPage /> },
          //{ path: "nuevo", element: <CompraNuevaPage /> },

          // /compras/:id  (detalle)
          { path: ":id", element: <CompraDetallePage /> },

          // /compras/:id/recepciones/nueva  (por si hay enlaces antiguos absolutos)
          { path: ":id/recepciones/nueva", element: <RecepcionNuevaPage /> },
        ],
      },
      {
        path: "/seguridad",
        element: <SeguridadLayout />,
        children: [
          { index: true, element: <UsuariosPage /> },             // landing del módulo
          { path: "usuarios", element: <UsuariosPage /> },
          { path: "roles", element: <RolesPage /> },
          { path: "permisos", element: <PermisosPage /> },
          { path: "auditorias", element: <AuditoriasPage /> },
        ],
      },






      // Inventario
      { path: "/inventario/por-lote", element: <InventarioPorLotePage /> },
      // { path: "/inventario/productos", element: <ProductosPage /> },

      // Sucursales
      { path: "/sucursales", element: <SucursalesList /> },
      { path: "/sucursales/nueva", element: <NuevaSucursal /> },
      { path: "/sucursales/:id", element: <EditarSucursal /> },

      // Catálogo interno
      //{ path: "/catalogo/almacenes", element: <AlmacenesPage /> },
      // { path: "/catalogo/categorias", element: <CategoriasPage /> },
      // { path: "/catalogo/monedas", element: <MonedasPage /> },
      // { path: "/catalogo/unidades", element: <UnidadesPage /> },
      // { path: "/catalogo/presentaciones", element: <PresentacionesPage /> },

      // Compras
      // { path: "/compras", element: <ComprasListaPage /> },
      //  { path: "/compras/nueva", element: <CompraNuevaPage /> },
      //  { path: "/compras/:id", element: <CompraDetallePage /> },
      //  { path: "/compras/:id/recepciones/nueva", element: <RecepcionNuevaPage /> },

      // CRM básico
      { path: "/clientes", element: <ClientesPage /> },
      // { path: "/proveedores", element: <ProveedoresPage /> },

      // Seguridad
     // { path: "/seguridad", element: <Navigate to="/seguridad/usuarios" replace /> },
     // { path: "/seguridad/usuarios", element: <UsuariosPage /> },
     // { path: "/seguridad/roles", element: <RolesPage /> },
     // { path: "/seguridad/permisos", element: <PermisosPage /> },
    ],
  },

  // Catch-all → homepage pública
  { path: "*", element: <Navigate to="/soyanga/inicio" replace /> },
]);
