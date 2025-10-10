// src/app/router/rutas.tsx
import { createBrowserRouter, Navigate } from "react-router-dom";
import AppLayout from "../layout/Layout";

import LoginPage from "@/paginas/Login";
import RequireAuth from "@/componentes/RequireAuth";

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


//  NUEVO: Seguridad
import UsuariosPage from "@/paginas/seguridad/Usuarios";
import RolesPage from "@/paginas/seguridad/Roles";
import PermisosPage from "@/paginas/seguridad/Permisos";

import UnidadesPage from '@/paginas/catalogo/Unidades'
import PresentacionesPage from '@/paginas/catalogo/Presentaciones'
import ClientesPage from '@/paginas/cliente/Clientes'
import ProveedoresPage from '@/paginas/proveedor/Proveedores'


export const router = createBrowserRouter([
    // Público
    { path: "/login", element: <LoginPage /> },

    // Privado
    {
        element: (
            <RequireAuth>
                <AppLayout />
            </RequireAuth>
        ),
        children: [

            { path: "/inicio", element: <Inicio /> },
            { path: "/salud", element: <SaludAPI /> },
            { path: "/inventario/por-lote", element: <InventarioPorLotePage /> },

            { path: "/sucursales", element: <SucursalesList /> },
            { path: "/sucursales/nueva", element: <NuevaSucursal /> },
            { path: "/sucursales/:id", element: <EditarSucursal /> },
            { path: '/catalogo/almacenes', element: <AlmacenesPage /> },
            { path: '/catalogo/categorias', element: <CategoriasPage /> },
            { path: '/catalogo/monedas', element: <MonedasPage /> },
            { path: "/clientes", element: <ClientesPage /> },
            { path: '/proveedores', element: <ProveedoresPage /> },
            { path: '/inventario/productos', element: <ProductosPage /> },
            { path: '/catalogo/unidades', element: <UnidadesPage /> },

            { path: "/catalogo/presentaciones", element: <PresentacionesPage /> },
            { path: "/seguridad", element: <Navigate to="/seguridad/usuarios" replace /> },
            { path: "/seguridad/usuarios", element: <UsuariosPage /> },
            { path: "/seguridad/roles", element: <RolesPage /> },
            { path: "/seguridad/permisos", element: <PermisosPage /> },

        ],
    },

    // Catch-all
    { path: "*", element: <Navigate to="/inicio" replace /> },
]);
