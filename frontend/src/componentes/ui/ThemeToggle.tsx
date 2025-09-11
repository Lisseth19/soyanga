import { useEffect, useState } from "react";

function getInitial(): boolean {
  const saved = localStorage.getItem("theme");
  if (saved) return saved === "dark";
  // por defecto: CLARO
  return false;
}

export default function ThemeToggle() {
  const [dark, setDark] = useState(getInitial);

  useEffect(() => {
    const root = document.documentElement;
    if (dark) {
      root.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      root.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [dark]);

  return (
    <button
      onClick={() => setDark(v => !v)}
      className="btn-ghost"
      title={dark ? "Cambiar a claro" : "Cambiar a oscuro"}
    >
      {dark ? "Claro" : "Oscuro"}
    </button>
  );
}
