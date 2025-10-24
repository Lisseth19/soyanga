import { NavLink } from "react-router-dom";
import { useEffect, useRef } from "react";

function TabLink({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        [
          "flex-none px-3 py-2 rounded-full transition",
          isActive
            ? "bg-emerald-100 text-emerald-700"
            : "text-neutral-700 hover:bg-neutral-100",
        ].join(" ")
      }
    >
      {children}
    </NavLink>
  );
}

export default function TopNav() {
  const scrollerRef = useRef<HTMLDivElement | null>(null);

  // Lleva la pestaña activa al centro (nice UX)
  useEffect(() => {
    const el = scrollerRef.current?.querySelector(
      '[aria-current="page"]'
    ) as HTMLElement | null;
    el?.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
  }, []);

  return (
    <nav className="sticky top-0 z-30 bg-white border-b">
      <div className="mx-auto max-w-7xl px-3 relative">
        {/* Faders laterales (opcional, solo estética) */}
        <div className="pointer-events-none absolute left-0 top-0 h-full w-6 bg-gradient-to-r from-white to-transparent" />
        <div className="pointer-events-none absolute right-0 top-0 h-full w-6 bg-gradient-to-l from-white to-transparent" />

        {/* SCROLLER: lo importante */}
        <div
          ref={scrollerRef}
          className="
            relative -mx-3 px-3
            flex gap-2 overflow-x-auto scrollbar-none
            whitespace-nowrap scroll-px-3
            snap-x snap-mandatory
          "
          style={{ WebkitOverflowScrolling: "touch" }}
        >
          <TabLink to="/catalogo">Catálogo</TabLink>
          <TabLink to="/config/estructura/sucursales">Sucursales</TabLink>
          <TabLink to="/config/estructura/almacenes">Almacenes</TabLink>
          <TabLink to="/catalogo/categorias">Categorías</TabLink>
          <TabLink to="/catalogo/productos">Productos</TabLink>
          <TabLink to="/config/finanzas/monedas">Monedas</TabLink>
          <TabLink to="/catalogo/unidades">Unidades</TabLink>
          <TabLink to="/catalogo/presentaciones">Presentaciones</TabLink>
          <TabLink to="/inventario/lote">Inventario por lote</TabLink>
          <TabLink to="/api-health">API Health</TabLink>
          {/* agrega las que necesites */}
        </div>
      </div>
    </nav>
  );
}
