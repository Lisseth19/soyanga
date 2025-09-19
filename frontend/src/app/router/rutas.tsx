import { createBrowserRouter } from 'react-router-dom'
import AppLayout from '../layout/Layout'
import Inicio from '@/paginas/Inicio'
import SaludAPI from '@/paginas/Health'
import InventarioPorLotePage from '@/paginas/inventario/InventarioPorLote'
import SucursalesList from "@/paginas/sucursales/SucursalesList";
import NuevaSucursal from "@/paginas/sucursales/NuevaSucursal";
import EditarSucursal from "@/paginas/sucursales/EditarSucursal";
import AlmacenesPage from '@/paginas/almacenes/almacen'
import CategoriasPage from '@/paginas/categorias/Categorias'
import MonedasPage from '@/paginas/moneda/Monedas';
import ProductosPage from '@/paginas/inventario/Productos'
import ClientesPage from "@/paginas/cliente/Clientes.tsx";


export const router = createBrowserRouter([
    {
        element: <AppLayout />,
        children: [
            { path: '/', element: <Inicio /> },
            { path: '/salud', element: <SaludAPI /> },
            { path: '/inventario/por-lote', element: <InventarioPorLotePage /> },
            { path: "/sucursales", element: <SucursalesList /> },
            { path: "/sucursales/nueva", element: <NuevaSucursal /> },
            { path: "/sucursales/:id", element: <EditarSucursal /> },
            { path: '/catalogo/almacenes', element: <AlmacenesPage /> },
            { path: '/catalogo/categorias', element: <CategoriasPage /> },
            { path: '/catalogo/monedas', element: <MonedasPage /> },
            { path: "clientes", element: <ClientesPage /> },
            { path: '/inventario/productos', element: <ProductosPage /> },
        ],
    },
])
