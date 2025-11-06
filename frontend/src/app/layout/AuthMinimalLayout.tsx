import { Outlet } from "react-router-dom";

export function AuthMinimalLayout() {
    return (
        <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100">
            {/* Puedes poner un logo centrado si quieres */}
            <Outlet/>
        </div>
    );
}
