// src/app/router/rutas.tsx
import { createBrowserRouter, Navigate } from "react-router-dom";

// Layouts
import AppLayout from "../layout/Layout";              // layout ADMIN
import PublicLayout from "../layout/PublicLayout";     // layout PÚBLICO
import ComprasLayout from "../layout/ComprasLayout";   // Layout del módulo Compras
import SeguridadLayout from "../layout/SeguridadLayout";
import SettingsLayout from "../layout/SettingsLayout";
// NUEVO: Layout del módulo Ventas
import VentasLayout from "../layout/VentasLayout";

// Auth
import RequireAuth from "@/componentes/RequireAuth";
import LoginPage from "@/paginas/Login";

// Páginas públicas
import InicioPublico from "@/paginas/publico/InicioPublico";
import CatalogoPublico from "@/paginas/publico/CatalogoPublico";
import ProductoPublico from "@/paginas/publico/ProductoPublico";
import ContactoPublico from "@/paginas/publico/Contacto";
import CartPage from "@/paginas/publico/Cotizacion"; //  Cotización
import MetodosPagoPage from "@/paginas/publico/MetodosPago";

// Páginas admin
import Inicio from "@/paginas/Inicio";
import SaludAPI from "@/paginas/Health";
import InventarioPorLotePage from "@/paginas/inventario/InventarioPorLote";
// import SucursalesList from "@/paginas/sucursales/SucursalesList";
import NuevaSucursal from "@/paginas/sucursales/NuevaSucursal";
import EditarSucursal from "@/paginas/sucursales/EditarSucursal";
// import AlmacenesPage from "@/paginas/almacenes/almacen";
// import CategoriasPage from "@/paginas/categorias/Categorias";
// import MonedasPage from "@/paginas/moneda/Monedas";
// import ProductosPage from "@/paginas/inventario/Productos";

// Compras
import ComprasListaPage from "@/paginas/compras/ComprasLista";
import CompraDetallePage from "@/paginas/compras/CompraDetalle";
import CompraNuevaPage from "@/paginas/compras/CompraNueva";
import RecepcionNuevaPage from "@/paginas/compras/RecepcionNueva";

// Ventas
import VentasListado from "@/paginas/ventas/VentasListado";
import VentaNueva from "@/paginas/ventas/VentaNueva";
// import VentaDetalle from "@/paginas/ventas/VentaDetalle";
// import VentaTrazabilidad from "@/paginas/ventas/VentaTrazabilidad"; // si aún no la tienes, déjalo comentado

// Anticipos / Cobros (viven dentro de Ventas)
import AnticiposListado from "@/paginas/anticipos/AnticiposListado";
import AnticipoDetalle from "@/paginas/anticipos/AnticipoDetalle";
// import { AplicarAnticipoModal } from "@/paginas/anticipos/AplicarAnticipoModal";
import { AnticipoCrearForm } from "@/paginas/anticipos/AnticipoCrearForm";
import CxcListado from "@/paginas/cobros/CxcListado.tsx";

// CRM básico
import ClientesPage from "@/paginas/cliente/Clientes";
import ProveedoresPage from "@/paginas/proveedor/Proveedores";

// Seguridad
import UsuariosPage from "@/paginas/seguridad/Usuarios";
import RolesPage from "@/paginas/seguridad/Roles";
import PermisosPage from "@/paginas/seguridad/Permisos";
import AuditoriasPage from "@/paginas/seguridad/Auditorias";

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
import AjustesInventarioPage from "@/paginas/inventario/AjustesInventario";
import InventarioLayout from "../layout/InventarioLayout";
import MovimientosEntreAlmacenesPage from "@/paginas/inventario/MovimientosEntreAlmacenes";

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

      // === Configuración y Catálogo (nuevo)
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

      // === Compras (ANIDADO CON LAYOUT)
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
          // { path: "nueva", element: <CompraNuevaPage /> },
          // { path: "nuevo", element: <CompraNuevaPage /> },

          // /compras/:id  (detalle)
          { path: ":id", element: <CompraDetallePage /> },

          // /compras/:id/recepciones/nueva  (por si hay enlaces antiguos absolutos)
          { path: ":id/recepciones/nueva", element: <RecepcionNuevaPage /> },
        ],
      },

      // === Ventas (ANIDADO CON LAYOUT) — aquí viven Cobros y Anticipos
      {
        path: "/ventas",
        element: <VentasLayout />,
        children: [
          { index: true, element: <VentasListado /> },            // /ventas
          { path: "nueva", element: <VentaNueva /> },             // /ventas/nueva
          // { path: ":id", element: <VentaDetalle /> },
          // { path: ":id/trazabilidad", element: <VentaTrazabilidad /> },

          // Cobros (CxC)
          { path: "cobros", element: <CxcListado /> },            // /ventas/cobros

          // Anticipos
          { path: "anticipos", element: <AnticiposListado /> },   // /ventas/anticipos
          { path: "anticipos/nuevo", element: <AnticipoCrearForm /> }, // /ventas/anticipos/nuevo
          { path: "anticipos/:id", element: <AnticipoDetalle /> },     // /ventas/anticipos/:id
        ],
      },

      // Seguridad
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
      {
      path: "/inventario",
      element: <InventarioLayout />,
      children: [
        { index: true, element: <Navigate to="ajustes" replace /> },
        { path: "ajustes", element: <AjustesInventarioPage /> },
        { path: "movimientos", element: <MovimientosEntreAlmacenesPage /> },
      ],
    },


      // Inventario
      { path: "/inventario/por-lote", element: <InventarioPorLotePage /> },
      // { path: "/inventario/productos", element: <ProductosPage /> },
// dentro del bloque privado (donde ya tienes /inventario/por-lote y /inventario/ajustes)


      // Sucursales
      { path: "/sucursales", element: <SucursalesList /> },
      { path: "/sucursales/nueva", element: <NuevaSucursal /> },
      { path: "/sucursales/:id", element: <EditarSucursal /> },

      // ===== Aliases de compatibilidad (redirigen al módulo Ventas) =====
      { path: "/cobros", element: <Navigate to="/ventas/cobros" replace /> },
      { path: "/anticipos", element: <Navigate to="/ventas/anticipos" replace /> },
      { path: "/anticipos/nuevo", element: <Navigate to="/ventas/anticipos/nuevo" replace /> },
      { path: "/anticipos/:id", element: <Navigate to="/ventas/anticipos/:id" replace /> },

      // CRM básico
      { path: "/clientes", element: <ClientesPage /> },
      // { path: "/proveedores", element: <ProveedoresPage /> },
    ],
  },

  // Catch-all → homepage pública
  { path: "*", element: <Navigate to="/soyanga/inicio" replace /> },
]);
