export default function SearchBar({
                                      value,
                                      onChange,
                                      placeholder = "Buscar productos…",
                                  }: {
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
}) {
    return (
        <div className="relative">
      <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
        <svg className="h-5 w-5 text-[var(--muted)]" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <circle cx="11" cy="11" r="7" strokeWidth="1.6" />
          <path d="M20 20l-3.5-3.5" strokeWidth="1.6" />
        </svg>
      </span>

            <input
                className="w-full rounded-full border border-[var(--border)] bg-[var(--light-bg)] text-[var(--fg)]
                   placeholder-[var(--muted)] py-2.5 pl-10 pr-9 outline-none
                   focus:border-[var(--primary-color)] focus:ring-2 ring-[var(--primary-color)]/20 transition"
                placeholder={placeholder}
                value={value}
                onChange={(e) => onChange(e.target.value)}
            />

            {value && (
                <button
                    onClick={() => onChange("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 grid h-7 w-7 place-items-center rounded-full
                     border border-[var(--border)] text-[var(--muted)] hover:bg-black/5"
                    aria-label="Limpiar búsqueda"
                    type="button"
                >
                    ×
                </button>
            )}
        </div>
    );
}
