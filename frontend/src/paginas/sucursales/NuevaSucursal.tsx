import { useNavigate } from "react-router-dom";
import SucursalForm from "./SucursalForm";
import { sucursalService } from "@/servicios/sucursal";
import type { SucursalCreate } from "@/types/sucursal";

export default function NuevaSucursal() {
  const navigate = useNavigate();

  async function onSubmit(payload: SucursalCreate) {
    await sucursalService.create(payload);
    // después de crear, redirige a la lista
    navigate("/sucursales?created=1");
  }

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Nueva sucursal</h1>
      <SucursalForm mode="create" onSubmit={onSubmit} />
    </div>
  );
}
