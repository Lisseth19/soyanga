import type { ReactNode } from "react";

type Variant = "default" | "tile";

type Props = {
  children: ReactNode;
  className?: string;
  /** 'tile' fuerza tarjeta clara en cualquier tema */
  variant?: Variant;
};

export default function Tarjeta({
  children,
  className = "",
  variant = "default",
}: Props) {
  const base = "rounded-xl border shadow-sm transition";
  const variants: Record<Variant, string> = {
    // comportamiento actual
    default:
      "bg-white text-neutral-900 dark:bg-neutral-900 dark:text-neutral-100",
    // SIEMPRE clara (lo que queremos para el catálogo)
    tile: "bg-white text-neutral-900 dark:bg-white dark:text-neutral-900",
  };

  return <div className={`${base} ${variants[variant]} ${className}`}>{children}</div>;
}
