import { createBrowserRouter } from 'react-router-dom'
import AppLayout from './AppLayout'
import Inicio from '../paginas/Inicio'
import SaludAPI from '../paginas/Health'

export const router = createBrowserRouter([
    {
        element: <AppLayout />,
        children: [
            { path: '/', element: <Inicio /> },
            { path: '/salud', element: <SaludAPI /> },
        ],
    },
])
