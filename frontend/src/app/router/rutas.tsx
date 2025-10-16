// src/app/router/rutas.tsx
import { createBrowserRouter, Navigate } from "react-router-dom";

// Layouts
import AppLayout from "../layout/Layout";              // layout ADMIN ya existente
import PublicLayout from "../layout/PublicLayout";     // layout PÚBLICO (nuevo)

// Auth
import RequireAuth from "@/componentes/RequireAuth";
import LoginPage from "@/paginas/Login";

// Páginas públicas (nuevas)
import InicioPublico from "@/paginas/publico/InicioPublico";
import CatalogoPublico from "@/paginas/publico/CatalogoPublico";
import ProductoPublico from "@/paginas/publico/ProductoPublico";

// Páginas admin (ya existentes)
import Inicio from "@/paginas/Inicio";
import SaludAPI from "@/paginas/Health";
import InventarioPorLotePage from "@/paginas/inventario/InventarioPorLote";
import SucursalesList from "@/paginas/sucursales/SucursalesList";
import NuevaSucursal from "@/paginas/sucursales/NuevaSucursal";
import EditarSucursal from "@/paginas/sucursales/EditarSucursal";
import AlmacenesPage from "@/paginas/almacenes/almacen";
import CategoriasPage from "@/paginas/categorias/Categorias";
import MonedasPage from "@/paginas/moneda/Monedas";
import ProductosPage from "@/paginas/inventario/Productos";

// Seguridad
import UsuariosPage from "@/paginas/seguridad/Usuarios";
import RolesPage from "@/paginas/seguridad/Roles";
import PermisosPage from "@/paginas/seguridad/Permisos";

// Catálogo interno
import UnidadesPage from "@/paginas/catalogo/Unidades";
import PresentacionesPage from "@/paginas/catalogo/Presentaciones";

// CRM básico
import ClientesPage from "@/paginas/cliente/Clientes";
import ProveedoresPage from "@/paginas/proveedor/Proveedores";

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
            // ⬇️ DETALLE POR **ID**
            { path: "producto/:id", element: <ProductoPublico /> },
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

            // Inventario
            { path: "/inventario/por-lote", element: <InventarioPorLotePage /> },
            { path: "/inventario/productos", element: <ProductosPage /> },

            // Sucursales
            { path: "/sucursales", element: <SucursalesList /> },
            { path: "/sucursales/nueva", element: <NuevaSucursal /> },
            { path: "/sucursales/:id", element: <EditarSucursal /> },

            // Catálogo interno
            { path: "/catalogo/almacenes", element: <AlmacenesPage /> },
            { path: "/catalogo/categorias", element: <CategoriasPage /> },
            { path: "/catalogo/monedas", element: <MonedasPage /> },
            { path: "/catalogo/unidades", element: <UnidadesPage /> },
            { path: "/catalogo/presentaciones", element: <PresentacionesPage /> },

            // CRM básico
            { path: "/clientes", element: <ClientesPage /> },
            { path: "/proveedores", element: <ProveedoresPage /> },

            // Seguridad
            { path: "/seguridad", element: <Navigate to="/seguridad/usuarios" replace /> },
            { path: "/seguridad/usuarios", element: <UsuariosPage /> },
            { path: "/seguridad/roles", element: <RolesPage /> },
            { path: "/seguridad/permisos", element: <PermisosPage /> },
        ],
    },

    // Catch-all → homepage pública
    { path: "*", element: <Navigate to="/soyanga/inicio" replace /> },
]);
