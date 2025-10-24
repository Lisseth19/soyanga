// src/types/cart.ts
export type CartItem = {
    idPresentacion: number;
    nombreProducto: string;
    codigoSku?: string | null;
    contenido?: string | null;
    precioUnitBob?: number | null;
    cantidad: number;
    imagenUrl?: string | null;
};

export type Cart = {
    items: CartItem[];
    totalBob: number;
    count: number;
};
