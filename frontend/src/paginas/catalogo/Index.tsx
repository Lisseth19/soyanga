// src/paginas/catalogo/Index.tsx
import Tarjeta from "@/componentes/ui/Tarjeta";
import { NavLink } from "react-router-dom";
import {
  FolderOpen,
  Package,
  Ruler,
  Layers3,
  Barcode,
} from "lucide-react";

type TileProps = {
  to: string;
  title: string;
  desc: string;
  icon: React.ReactNode;
};

function Tile({ to, title, desc, icon }: TileProps) {
  return (
    <NavLink to={to} className="block">
      <Tarjeta
        variant="tile"
        className="p-5 hover:shadow-md hover:ring-1 ring-emerald-200/60 border-neutral-200"
      >
        <div className="flex items-start gap-3">
          <div className="mt-1 inline-flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
            {icon}
          </div>
          <div>
            <h3 className="text-base font-semibold">{title}</h3>
            <p className="text-sm text-neutral-600 mt-0.5">
              {desc}
            </p>
          </div>
        </div>
      </Tarjeta>
    </NavLink>
  );
}

export default function CatalogoIndex() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Catálogo</h1>
        <p className="text-neutral-600">
          Administra las categorías, productos y unidades de medida de tu inventario.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Tile
          to="/catalogo/categorias"
          title="Categorías"
          desc="Organiza tus productos."
          icon={<FolderOpen size={18} />}
        />
        <Tile
          to="/catalogo/productos"
          title="Productos"
          desc="Administra tus artículos."
          icon={<Package size={18} />}
        />
        <Tile
          to="/catalogo/unidades"
          title="Unidades"
          desc="Define unidades de medida."
          icon={<Ruler size={18} />}
        />
        <Tile
          to="/catalogo/presentaciones"
          title="Presentaciones"
          desc="Crea empaques y formatos."
          icon={<Layers3 size={18} />}
        />
        <Tile
          to="/catalogo/codigos-barras"
          title="Códigos de Barras"
          desc="Asigna y gestiona códigos."
          icon={<Barcode size={18} />}
        />
      </div>
    </div>
  );
}
