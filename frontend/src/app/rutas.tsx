import { createBrowserRouter } from 'react-router-dom'
import AppLayout from './AppLayout'
import Inicio from '../paginas/Inicio'
import SaludAPI from '../paginas/Health'
import InventarioPorLotePage from '../paginas/inventario/InventarioPorLote'

import MonedasPage from "../paginas/Monedas";

export const router = createBrowserRouter([
    {
        element: <AppLayout />,
        children: [
            { path: '/', element: <Inicio /> },
            { path: '/salud', element: <SaludAPI /> },
            { path: '/inventario/por-lote', element: <InventarioPorLotePage /> },
            { path: '/catalogo/monedas', element: <MonedasPage /> }, // <--- nueva ruta
        ],
    },
])

