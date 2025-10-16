export default function CategorySidebar({
                                            categorias,
                                            activaId,
                                            onSelect,
                                        }: {
    categorias: { id: number; nombre: string; count?: number }[];
    activaId: number | "all";
    onSelect: (id: number | "all") => void;
}) {
    return (
        <aside className="hidden w-64 flex-shrink-0 lg:block">
            <div className="sticky top-20 rounded-xl border border-[var(--border)] bg-[var(--light-bg)] p-4">
                <h3 className="text-fg mb-4 text-lg font-semibold">Categorías</h3>

                {/* "Todas" siempre arriba */}
                <button
                    onClick={() => onSelect("all")}
                    className={[
                        "mb-2 w-full rounded-lg border px-3 py-2 text-left transition",
                        activaId === "all"
                            ? "border-emerald-600 bg-emerald-700/10 text-fg"
                            : "border-[var(--border)] bg-[var(--light-bg)] text-fg hover:bg-black/5",
                    ].join(" ")}
                >
                    <div className="flex items-center justify-between">
                        <span className="truncate">Todas</span>
                    </div>
                </button>

                {/* Lista de categorías */}
                <nav className="flex flex-col gap-2">
                    {categorias.map((cat) => {
                        const active = cat.id === activaId;
                        return (
                            <button
                                key={cat.id}
                                onClick={() => onSelect(cat.id)}
                                className={[
                                    "w-full rounded-lg border px-3 py-2 text-left transition",
                                    active
                                        ? "border-emerald-600 bg-emerald-700/10 text-fg"
                                        : "border-[var(--border)] bg-[var(--light-bg)] text-fg hover:bg-black/5",
                                ].join(" ")}
                                title={cat.nombre}
                            >
                                <div className="flex items-center justify-between">
                                    <span className="truncate">{cat.nombre}</span>

                                    {/* Badge con mejor contraste en ambos temas */}
                                    {typeof cat.count === "number" && (
                                        <span
                                            className={[
                                                "ml-3 inline-flex min-w-[1.5rem] items-center justify-center rounded-full border px-2 text-xs",
                                                active
                                                    ? "border-emerald-500 text-emerald-700 dark:text-emerald-200 bg-emerald-500/10"
                                                    : "border-[var(--border)] text-muted bg-black/5",
                                            ].join(" ")}
                                        >
                      {cat.count}
                    </span>
                                    )}
                                </div>
                            </button>
                        );
                    })}
                </nav>
            </div>
        </aside>
    );
}
