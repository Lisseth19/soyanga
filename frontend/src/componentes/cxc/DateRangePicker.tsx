import { useEffect, useRef, useState } from "react";

/* === helpers de fecha === */
function toISODate(d: Date) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${dd}`;
}
function fromISODate(s?: string) {
    if (!s) return undefined;
    const [y, m, d] = s.split("-").map(Number);
    const dt = new Date(y, (m || 1) - 1, d || 1);
    if (Number.isNaN(dt.getTime())) return undefined;
    return dt;
}
function fmtHuman(d?: string) {
    if (!d) return "";
    const dt = fromISODate(d)!;
    return dt.toLocaleDateString("es-BO", { day: "2-digit", month: "2-digit", year: "numeric" });
}
function clsx(...xs: Array<string | false | null | undefined>) {
    return xs.filter(Boolean).join(" ");
}

export default function DateRangePicker({
                                            from,
                                            to,
                                            onChange,
                                            className,
                                            buttonWidth = "w-[260px]",
                                            label = "Rango de fechas",
                                        }: {
    from?: string;
    to?: string;
    onChange: (from?: string, to?: string) => void;
    className?: string;
    buttonWidth?: string; // permite variar el ancho del botón si lo necesitas
    label?: string;
}) {
    const [open, setOpen] = useState(false);
    const [view, setView] = useState<Date>(() => {
        const base = fromISODate(from) || new Date();
        return new Date(base.getFullYear(), base.getMonth(), 1);
    });
    const [start, setStart] = useState<Date | undefined>(fromISODate(from));
    const [end, setEnd] = useState<Date | undefined>(fromISODate(to));
    const [hover, setHover] = useState<Date | undefined>(undefined);
    const panelRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function onDoc(e: MouseEvent) {
            if (!open) return;
            if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
        }
        document.addEventListener("mousedown", onDoc);
        return () => document.removeEventListener("mousedown", onDoc);
    }, [open]);

    function daysInMonth(d: Date) {
        return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    }
    function firstDayIndex(d: Date) {
        const idx = new Date(d.getFullYear(), d.getMonth(), 1).getDay(); // 0=Dom
        return (idx + 6) % 7; // Lunes=0
    }
    function sameDay(a?: Date, b?: Date) {
        if (!a || !b) return false;
        return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
    }
    function isBetween(x: Date, a?: Date, b?: Date) {
        if (!a || !b) return false;
        const t = x.getTime();
        const lo = Math.min(a.getTime(), b.getTime());
        const hi = Math.max(a.getTime(), b.getTime());
        return t > lo && t < hi;
    }
    function handlePick(day: Date) {
        if (!start || (start && end)) {
            setStart(day);
            setEnd(undefined);
        } else {
            let a = start;
            let b = day;
            if (b.getTime() < a.getTime()) [a, b] = [b, a];
            setStart(a);
            setEnd(b);
            onChange(toISODate(a), toISODate(b));
            setOpen(false);
        }
    }
    function clear() {
        setStart(undefined);
        setEnd(undefined);
        onChange(undefined, undefined);
    }

    const weeks: Array<Array<Date | null>> = (() => {
        const res: Array<Array<Date | null>> = [];
        const fIdx = firstDayIndex(view);
        const total = daysInMonth(view);
        let day = 1 - fIdx;
        for (let w = 0; w < 6; w++) {
            const row: Array<Date | null> = [];
            for (let i = 0; i < 7; i++, day++) {
                const thisDate = new Date(view.getFullYear(), view.getMonth(), day);
                if (day < 1 || day > total) row.push(null);
                else row.push(thisDate);
            }
            res.push(row);
        }
        return res;
    })();

    return (
        <div className={clsx("relative", className)}>
            <label className="block text-xs mb-1">{label}</label>
            <button
                type="button"
                className={clsx("border rounded-lg px-3 py-2 text-left hover:bg-neutral-50", buttonWidth)}
                onClick={() => setOpen((s) => !s)}
                title="Seleccionar rango de fechas"
            >
                {from && to ? (
                    <span className="flex items-center gap-2">
            <span>📅</span>
            <span>
              {fmtHuman(from)} — {fmtHuman(to)}
            </span>
          </span>
                ) : (
                    <span className="flex items-center gap-2 text-neutral-500">
            <span>📅</span>
            <span>Rango de fechas</span>
          </span>
                )}
            </button>

            {open && (
                <div ref={panelRef} className="absolute z-50 mt-2 bg-white border rounded-xl p-3 shadow-lg w-[320px]">
                    <div className="flex items-center justify-between mb-2">
                        <button
                            type="button"
                            className="px-2 py-1 rounded hover:bg-neutral-100"
                            onClick={() => setView((v) => new Date(v.getFullYear(), v.getMonth() - 1, 1))}
                            title="Mes anterior"
                        >
                            ←
                        </button>
                        <div className="text-sm font-medium">
                            {view.toLocaleDateString("es-BO", { month: "long", year: "numeric" })}
                        </div>
                        <button
                            type="button"
                            className="px-2 py-1 rounded hover:bg-neutral-100"
                            onClick={() => setView((v) => new Date(v.getFullYear(), v.getMonth() + 1, 1))}
                            title="Mes siguiente"
                        >
                            →
                        </button>
                    </div>

                    <div className="grid grid-cols-7 text-xs mb-1 text-center text-neutral-500">
                        {["L", "M", "M", "J", "V", "S", "D"].map((d, i) => (
                            <div key={i} className="py-1">
                                {d}
                            </div>
                        ))}
                    </div>

                    <div className="grid grid-cols-7 gap-0.5 text-sm">
                        {weeks.flatMap((row, ri) =>
                            row.map((d, ci) => {
                                if (!d) return <div key={`${ri}-${ci}`} className="h-9 rounded" />;
                                const selectedStart = sameDay(d, start);
                                const selectedEnd = sameDay(d, end);
                                const hoverEnd = hover && !end ? hover : end;
                                const inRange = isBetween(d, start, hoverEnd || undefined) || selectedStart || selectedEnd;
                                return (
                                    <button
                                        key={`${ri}-${ci}`}
                                        onClick={() => handlePick(d)}
                                        onMouseEnter={() => setHover(d)}
                                        onMouseLeave={() => setHover(undefined)}
                                        className={clsx(
                                            "h-9 rounded relative",
                                            "hover:bg-blue-50",
                                            inRange && "bg-blue-100",
                                            selectedStart || selectedEnd ? "ring-2 ring-blue-500 font-medium" : ""
                                        )}
                                    >
                                        {d.getDate()}
                                    </button>
                                );
                            })
                        )}
                    </div>

                    <div className="flex items-center justify-between mt-3">
                        <div className="text-xs text-neutral-600">
                            {start ? fmtHuman(toISODate(start)) : "—"} {start && "→"} {end ? fmtHuman(toISODate(end)) : "—"}
                        </div>
                        <div className="flex gap-2">
                            <button type="button" className="px-2 py-1 text-xs border rounded hover:bg-neutral-50" onClick={clear}>
                                Limpiar
                            </button>
                            <button
                                type="button"
                                className="px-2 py-1 text-xs border rounded hover:bg-neutral-50"
                                onClick={() => setOpen(false)}
                            >
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
