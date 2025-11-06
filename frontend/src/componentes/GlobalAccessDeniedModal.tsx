// src/componentes/GlobalAccessDeniedModal.tsx
import { useAuth } from "@/context/AuthContext"; // ajusta la ruta real

export function GlobalAccessDeniedModal() {
    const { deniedInfo, clearDenied } = useAuth();

    if (!deniedInfo) return null;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-5 text-center">
                <h2 className="text-lg font-semibold text-red-600">
                    Acceso denegado
                </h2>

                <p className="text-sm text-gray-700 mt-2">
                    Ya no tienes permiso para realizar esta acción.
                </p>

                <p className="text-[11px] text-gray-400 mt-3 leading-snug break-all">
                    Acción bloqueada: {deniedInfo.method} {deniedInfo.path}
                </p>

                <button
                    onClick={clearDenied}
                    className="mt-4 w-full rounded-md bg-red-600 text-white text-sm font-medium py-2 hover:bg-red-700"
                >
                    Entendido
                </button>

                <p className="text-[10px] text-gray-400 mt-3">
                    Si crees que esto es un error, consulta con el administrador.
                </p>
            </div>
        </div>
    );
}
