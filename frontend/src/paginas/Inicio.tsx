import { useEffect, useMemo, useState } from "react";
import { NavLink, Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { ClienteService } from "@/servicios/cliente";
import { ProveedorService } from "@/servicios/proveedor";
import {
    Store as StoreIcon,
    ShoppingCart,
    PackageOpen,
    Users,
    Settings,
    ShieldCheck,
    Activity,
    ArrowRight,
    FilePlus2,
    UserPlus2,
    Truck,
    Barcode,
    Warehouse,
    Coins,
} from "lucide-react";

import {
    ResponsiveContainer,
    AreaChart,
    Area,
    XAxis,
    YAxis,
    Tooltip,
    CartesianGrid,
    PieChart,
    Pie,
    Legend,
    BarChart,
    Bar,
} from "recharts";

/* === UI === */
function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
    return (
        <div className={["bg-white rounded-2xl border border-neutral-200/70 shadow-sm", className].join(" ")}>
            {children}
        </div>
    );
}

function Kpi({
                 label,
                 value,
                 hint,
                 icon,
                 loading = false,
             }: {
    label: string;
    value: string | number;
    hint?: string;
    icon?: React.ReactNode;
    loading?: boolean;
}) {
    return (
        <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                {icon}
            </div>
            <div>
                <div className="text-[13px] text-neutral-500">{label}</div>
                {loading ? (
                    <div className="h-5 w-24 rounded bg-neutral-100 animate-pulse" />
                ) : (
                    <div className="text-xl font-semibold text-neutral-800">{value}</div>
                )}
                {hint && <div className="text-xs text-neutral-400">{hint}</div>}
            </div>
        </div>
    );
}

function QuickBtn({ to, label, icon }: { to: string; label: string; icon: React.ReactNode }) {
    return (
        <NavLink
            to={to}
            className="inline-flex items-center gap-2 rounded-xl px-3.5 py-2.5 border border-neutral-200 text-sm text-neutral-700 hover:bg-neutral-50 transition"
        >
            <span className="text-emerald-600">{icon}</span>
            <span className="font-medium">{label}</span>
        </NavLink>
    );
}

function ModuleCard({
                        to,
                        title,
                        desc,
                        icon,
                    }: {
    to: string;
    title: string;
    desc: string;
    icon: React.ReactNode;
}) {
    return (
        <NavLink
            to={to}
            className="group block bg-white rounded-2xl border border-neutral-200/70 shadow-sm p-4 hover:shadow-md transition"
        >
            <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    {icon}
                </div>
                <div>
                    <div className="font-semibold text-neutral-800">{title}</div>
                    <div className="text-[13px] text-neutral-500">{desc}</div>
                </div>
                <div className="ml-auto text-neutral-400 group-hover:text-emerald-600">
                    <ArrowRight size={18} />
                </div>
            </div>
        </NavLink>
    );
}

/* === Datos demo para gráficas (hasta que conectes endpoints reales) === */
const demoVentas7d = [
    { dia: "Lun", total: 1200 },
    { dia: "Mar", total: 900 },
    { dia: "Mié", total: 1600 },
    { dia: "Jue", total: 800 },
    { dia: "Vie", total: 1400 },
    { dia: "Sáb", total: 1100 },
    { dia: "Dom", total: 700 },
];

const demoOC = [
    { name: "Pendientes", value: 3 },
    { name: "Aprobadas", value: 6 },
    { name: "Recibidas", value: 4 },
];

export default function Inicio() {
    const { user, can } = useAuth() as {
        user: { nombreCompleto?: string; username?: string } | null;
        can: (permiso: string) => boolean;
    };

    const nombre = user?.nombreCompleto || user?.username || "Usuario";

    /* Permisos */
    const canVentas = can("ventas:ver");
    const canCompras = can("compras:ver") || can("proveedores:ver");
    const canClientes = can("clientes:ver");
    const canCatalogo =
        can("productos:ver") ||
        can("categorias:ver") ||
        can("unidades:ver") ||
        can("presentaciones:ver") ||
        can("monedas:ver") ||
        can("tipos-cambio:ver") ||
        can("almacenes:ver") ||
        can("sucursales:ver") ||
        can("codigos-barras:ver");
    const canSeguridad =
        can("usuarios:ver") || can("roles:ver") || can("permisos:ver") || can("auditorias:ver");
    const canInventario = can("inventario:ver");

    const quicks = useMemo(
        () =>
            [
                canCompras && { to: "/compras/proveedores", label: "Agregar proveedor", icon: <Truck size={16} /> },
                canClientes && { to: "/clientes", label: "Agregar cliente", icon: <UserPlus2 size={16} /> },
                canCatalogo && { to: "/catalogo/productos", label: "Nuevo producto", icon: <FilePlus2 size={16} /> },
                canCatalogo && { to: "/catalogo/codigos-barras", label: "Generar código de barras", icon: <Barcode size={16} /> },
                canCatalogo && { to: "/catalogo/almacenes", label: "Ver almacenes", icon: <Warehouse size={16} /> },
                canCatalogo && { to: "/catalogo/monedas", label: "Monedas y tipos de cambio", icon: <Coins size={16} /> },
            ].filter(Boolean) as Array<{ to: string; label: string; icon: React.ReactNode }>,
        [canCompras, canClientes, canCatalogo],
    );

    /* KPIs (conectados) */
    const [loading, setLoading] = useState(true);
    const [clientesActivos, setClientesActivos] = useState<number>(0);
    const [proveedoresActivos, setProveedoresActivos] = useState<number>(0);

    // Deja listos los states para conectar endpoints reales más adelante
    const [ventasHoy, _setVentasHoy] = useState<number>(0);
    const [stockBajo, _setStockBajo] = useState<number>(0);

    useEffect(() => {
        let cancelled = false;

        async function fetchCounts() {
            setLoading(true);
            try {
                const [cliRes, provRes] = await Promise.allSettled([
                    canClientes
                        ? ClienteService.listar({
                            q: undefined,
                            page: 0,
                            size: 1,
                            sort: "idCliente,asc",
                            soloActivos: true,
                        })
                        : Promise.resolve({ totalElements: 0 } as any),
                    canCompras
                        ? ProveedorService.listar({
                            q: undefined,
                            page: 0,
                            size: 1,
                            sort: "idProveedor,asc",
                            soloActivos: true,
                        })
                        : Promise.resolve({ totalElements: 0 } as any),
                ]);

                if (!cancelled) {
                    if (cliRes.status === "fulfilled") {
                        setClientesActivos(Number((cliRes as any).value.totalElements || 0));
                    }
                    if (provRes.status === "fulfilled") {
                        setProveedoresActivos(Number((provRes as any).value.totalElements || 0));
                    }
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        fetchCounts();
        return () => {
            cancelled = true;
        };
    }, [canClientes, canCompras]);

    return (
        <div className="relative">
            <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-emerald-50/50 to-transparent" />

            <div className="mx-auto max-w-7xl px-4 py-6 space-y-6">
                {/* Hero */}
                <Card className="overflow-hidden">
                    <div className="relative p-6 md:p-8">
                        <div className="absolute -right-10 -top-10 w-56 h-56 rounded-full bg-emerald-100/40 blur-2xl" />
                        <div className="absolute -left-10 -bottom-16 w-72 h-72 rounded-full bg-lime-100/40 blur-2xl" />
                        <div className="relative">
                            <div className="text-sm text-emerald-700 font-semibold uppercase tracking-wider">
                                SOYANGA — Agroimportadora
                            </div>
                            <h1 className="mt-1 text-2xl md:text-3xl font-extrabold text-neutral-900">¡Hola, {nombre}! 👋</h1>
                            <p className="mt-2 text-neutral-600 max-w-2xl">
                                Tablero general para <b>ventas</b>, <b>compras</b>, <b>inventario por lote</b>, <b>catálogo</b> y{" "}
                                <b>seguridad</b>. Mantén el negocio de insumos y semillas al 100%.
                            </p>

                            {quicks.length > 0 && (
                                <div className="mt-4 flex flex-wrap gap-2">
                                    {quicks.slice(0, 6).map((q) => (
                                        <QuickBtn key={q.to} to={q.to} label={q.label} icon={q.icon} />
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </Card>

                {/* KPIs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card className="p-4">
                        <Kpi
                            label="Ventas del día"
                            value={`Bs ${ventasHoy.toLocaleString("es-BO")}`}
                            hint="Actualizado hoy"
                            icon={<StoreIcon size={18} />}
                            loading={loading}
                        />
                    </Card>
                    <Card className="p-4">
                        <Kpi
                            label="Compras pendientes"
                            value={demoOC.find((x) => x.name === "Pendientes")?.value ?? 0}
                            hint="Órdenes por aprobar"
                            icon={<ShoppingCart size={18} />}
                            loading={false}
                        />
                    </Card>
                    <Card className="p-4">
                        <Kpi
                            label="Productos con bajo stock"
                            value={stockBajo}
                            hint="Debajo del mínimo"
                            icon={<PackageOpen size={18} />}
                            loading={loading}
                        />
                    </Card>
                    <Card className="p-4">
                        <Kpi
                            label="Clientes activos"
                            value={clientesActivos}
                            hint="Registrados con estado activo"
                            icon={<Users size={18} />}
                            loading={loading}
                        />
                    </Card>
                </div>

                {/* Gráficas */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <Card className="p-4 lg:col-span-2">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-[15px] font-semibold text-neutral-800">Ventas últimos 7 días</h3>
                            {canVentas && (
                                <Link to="/ventas" className="text-sm text-emerald-700 hover:underline">
                                    Ver ventas →
                                </Link>
                            )}
                        </div>
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={demoVentas7d} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0.02} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="dia" />
                                    <YAxis />
                                    <Tooltip />
                                    <Area type="monotone" dataKey="total" stroke="#10b981" fill="url(#g1)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </Card>

                    <Card className="p-4">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-[15px] font-semibold text-neutral-800">Estado de órdenes de compra</h3>
                            {canCompras && (
                                <Link to="/compras" className="text-sm text-emerald-700 hover:underline">
                                    Ir a compras →
                                </Link>
                            )}
                        </div>
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={demoOC} dataKey="value" nameKey="name" outerRadius={80} innerRadius={40} paddingAngle={3} label />
                                    <Legend />
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </Card>
                </div>

                {/* Avisos + Resumen maestros */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <Card className="p-4 lg:col-span-2">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-[15px] font-semibold text-neutral-800">Avisos operativos</h3>
                            <Link to="/inventario/por-lote" className="text-sm text-emerald-700 hover:underline">
                                Ver inventario →
                            </Link>
                        </div>
                        <ul className="divide-y divide-neutral-200 text-sm">
                            <li className="py-2 flex items-start justify-between">
                                <div>
                                    <div className="font-medium text-neutral-800">Lotes próximos a vencer</div>
                                    <div className="text-neutral-500 text-xs">Revisa lotes con vencimiento &lt; 30 días.</div>
                                </div>
                                <span className="px-2 py-0.5 rounded-full text-xs bg-amber-100 text-amber-700 border border-amber-200">0</span>
                            </li>
                            <li className="py-2 flex items-start justify-between">
                                <div>
                                    <div className="font-medium text-neutral-800">Productos con stock bajo</div>
                                    <div className="text-neutral-500 text-xs">Debajo del mínimo configurado.</div>
                                </div>
                                <span className="px-2 py-0.5 rounded-full text-xs bg-rose-100 text-rose-700 border border-rose-200">
                  {stockBajo}
                </span>
                            </li>
                            <li className="py-2 flex items-start justify-between">
                                <div>
                                    <div className="font-medium text-neutral-800">Órdenes de compra pendientes</div>
                                    <div className="text-neutral-500 text-xs">Aprobación y recepción en curso.</div>
                                </div>
                                <span className="px-2 py-0.5 rounded-full text-xs bg-emerald-100 text-emerald-700 border border-emerald-200">
                  {demoOC.find((x) => x.name === "Pendientes")?.value ?? 0}
                </span>
                            </li>
                        </ul>
                    </Card>

                    <Card className="p-4">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-[15px] font-semibold text-neutral-800">Resumen maestros</h3>
                            <Link to="/compras/proveedores" className="text-sm text-emerald-700 hover:underline">
                                Ver proveedores →
                            </Link>
                        </div>
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                    data={[
                                        { name: "Proveedores activos", value: proveedoresActivos },
                                        { name: "Clientes activos", value: clientesActivos },
                                    ]}
                                    margin={{ top: 10, right: 16, left: 0, bottom: 10 }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="name" hide />
                                    <YAxis allowDecimals={false} />
                                    <Tooltip />
                                    <Bar dataKey="value" radius={[6, 6, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </Card>
                </div>

                {/* Módulos */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {canVentas && <ModuleCard to="/ventas" title="Ventas" desc="Facturación, pedidos y cuentas por cobrar." icon={<StoreIcon size={18} />} />}
                    {canCompras && <ModuleCard to="/compras" title="Compras" desc="Proveedores, órdenes y recepción de insumos." icon={<ShoppingCart size={18} />} />}
                    {canClientes && <ModuleCard to="/clientes" title="Clientes" desc="Gestión de cartera y condiciones de pago." icon={<Users size={18} />} />}
                    {canCatalogo && <ModuleCard to="/catalogo" title="Configuración y Catálogo" desc="Productos, presentaciones, unidades, monedas y almacenes." icon={<Settings size={18} />} />}
                    {canInventario && <ModuleCard to="/inventario/por-lote" title="Inventario por lote" desc="Trazabilidad por lote, vencimientos y lotes bloqueados." icon={<Activity size={18} />} />}
                    {canSeguridad && <ModuleCard to="/seguridad" title="Seguridad" desc="Usuarios, roles, permisos y auditorías." icon={<ShieldCheck size={18} />} />}
                    <ModuleCard to="/salud" title="Salud de la API" desc="Monitorea el estado del backend y la latencia." icon={<Activity size={18} />} />
                </div>
            </div>
        </div>
    );
}
