import { useNavigate } from "react-router-dom";
import SucursalForm from "./SucursalForm";
import { sucursalService } from "@/servicios/sucursal";
import type { SucursalCreate } from "@/types/sucursal";

export default function NuevaSucursal() {
    const navigate = useNavigate();
    async function onSubmit(payload: SucursalCreate) {
        await sucursalService.create(payload);
        navigate("/sucursales?created=1");
    }
    return (
        <div className="p-6 space-y-4">
            <h1 className="text-2xl font-semibold">Nueva sucursal</h1>
            <SucursalForm mode="create" onSubmit={onSubmit} />
        </div>
    );
}

export function NuevaSucursalModal({
                                       onClose,
                                       afterSave,
                                   }: {
    onClose: () => void;
    afterSave?: () => void;
}) {
    async function onSubmit(payload: SucursalCreate) {
        await sucursalService.create(payload);
        afterSave?.();
    }
    return (
        <div className="space-y-2">
            <SucursalForm mode="create" onSubmit={onSubmit} />
            <div className="pt-1">
                <button
                    type="button"
                    onClick={onClose}
                    className="px-3 h-9 rounded-lg border border-neutral-300 hover:bg-neutral-50"
                >
                    Cerr
                </button>
            </div>
        </div>
    );
}
