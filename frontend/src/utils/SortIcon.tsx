// src/utils/SortIcon.tsx
import type { SortDir } from "./sort";

export function SortIcon({ active, dir }: { active: boolean; dir?: SortDir }) {
  const className = !active ? "opacity-30" : undefined;
  const transform = dir === "asc" ? "" : "rotate(180 12 12)";

  return (
    <svg width="12" height="12" viewBox="0 0 24 24" className={className}>
      <path d="M7 14l5 5 5-5" fill="none" stroke="currentColor" strokeWidth={2} />
      <path
        d="M7 10l5-5 5 5"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        transform={transform}
      />
    </svg>
  );
}
