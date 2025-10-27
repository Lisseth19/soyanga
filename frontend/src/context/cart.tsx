// src/context/cart.tsx
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { CartItem } from "@/types/cart";

type CartContextType = {
    items: CartItem[];
    totalBob: number;
    count: number;
    addItem: (item: CartItem) => void;
    removeItem: (idPresentacion: number) => void;
    changeQty: (idPresentacion: number, qty: number) => void;
    clear: () => void;
};

const CartContext = createContext<CartContextType | undefined>(undefined);
const LS_KEY = "soyanga.cart.v1";

function calcTotal(items: CartItem[]) {
    return items.reduce((acc, it) => acc + (it.precioUnitBob ?? 0) * it.cantidad, 0);
}

export function CartProvider({ children }: { children: React.ReactNode }) {
    const [items, setItems] = useState<CartItem[]>(() => {
        try {
            const raw = localStorage.getItem(LS_KEY);
            return raw ? (JSON.parse(raw) as CartItem[]) : [];
        } catch {
            return [];
        }
    });

    useEffect(() => {
        try {
            localStorage.setItem(LS_KEY, JSON.stringify(items));
        } catch {}
    }, [items]);

    const totalBob = useMemo(() => calcTotal(items), [items]);
    const count = useMemo(() => items.reduce((a, it) => a + it.cantidad, 0), [items]);

    const addItem = (item: CartItem) => {
        setItems((prev) => {
            const idx = prev.findIndex((x) => x.idPresentacion === item.idPresentacion);
            if (idx >= 0) {
                const next = [...prev];
                next[idx] = { ...next[idx], cantidad: next[idx].cantidad + item.cantidad };
                return next;
            }
            return [...prev, { ...item, cantidad: Math.max(1, item.cantidad) }];
        });
    };

    const removeItem = (idPresentacion: number) => {
        setItems((prev) => prev.filter((x) => x.idPresentacion !== idPresentacion));
    };

    const changeQty = (idPresentacion: number, qty: number) => {
        setItems((prev) =>
            prev
                .map((x) => (x.idPresentacion === idPresentacion ? { ...x, cantidad: Math.max(1, qty) } : x))
                .filter((x) => x.cantidad > 0)
        );
    };

    const clear = () => setItems([]);

    const value = { items, totalBob, count, addItem, removeItem, changeQty, clear };
    return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
    const ctx = useContext(CartContext);
    if (!ctx) throw new Error("useCart debe usarse dentro de <CartProvider>");
    return ctx;
}
