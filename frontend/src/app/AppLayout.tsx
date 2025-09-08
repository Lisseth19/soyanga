import {Link, NavLink, Outlet} from 'react-router-dom'

export default function AppLayout() {
    return (
        <>
            <header className="border-b bg-white/70 backdrop-blur dark:bg-neutral-950">
                <nav className="max-w-5xl mx-auto p-4 flex gap-4">
                    <Link to="/" className="font-semibold">SOYANGA</Link>
                    <NavLink to="/inventario/por-lote">Inventario por lote</NavLink>
                    <Link to="/salud" className="hover:underline">API Health</Link>
                </nav>
            </header>

            <main className="max-w-5xl mx-auto p-4">
                <Outlet />
            </main>
        </>
    )
}
