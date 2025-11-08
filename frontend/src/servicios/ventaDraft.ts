// src/servicios/ventaDraft.ts
// Guarda y recupera un borrador de venta (sessionStorage)

export type VentaDraftSource =
    | {
    kind: "anticipo";
    idAnticipo: number;
    /** si true, VentaNueva debe intentar aplicar el anticipo automáticamente tras crear la venta */
    aplicarAnticipoAuto?: boolean;
    /** saldo disponible del anticipo al momento de crear el borrador (BOB) */
    saldoAnticipoBob?: number;
};

export type VentaDraftItem = {
    idPresentacion: number;
    cantidad: number;
    // metadatos opcionales por si los quieres usar/mostrar
    idAlmacenOrigen?: number;
    lotes?: Array<{ idLote: number; cantidad: number }>;
};

export type VentaDraft = {
    source?: VentaDraftSource;
    idCliente?: number | null;
    idAlmacenDespacho?: number | null;
    items: VentaDraftItem[];
};

const KEY = "venta_draft_v1";

/**
 * Guarda un draft proveniente de un anticipo.
 * `payload` admite flags para aplicar el anticipo automáticamente y su saldo al momento del draft.
 */
export function saveVentaDraftFromAnticipo(
    idAnticipo: number,
    payload: Omit<VentaDraft, "source"> & {
        aplicarAnticipoAuto?: boolean;
        saldoAnticipoBob?: number;
    }
) {
    // extrae flags para colocarlos dentro de "source"
    const { aplicarAnticipoAuto, saldoAnticipoBob, ...rest } = payload as any;
    const draft: VentaDraft = {
        ...rest,
        source: {
            kind: "anticipo",
            idAnticipo,
            aplicarAnticipoAuto,
            saldoAnticipoBob,
        },
    };
    try {
        sessionStorage.setItem(KEY, JSON.stringify(draft));
    } catch {
        // ignore
    }
}

export function getVentaDraft(): VentaDraft | null {
    try {
        const raw = sessionStorage.getItem(KEY);
        return raw ? (JSON.parse(raw) as VentaDraft) : null;
    } catch {
        return null;
    }
}

export function clearVentaDraft() {
    try {
        sessionStorage.removeItem(KEY);
    } catch {
        /* ignore */
    }
}

/** Obtiene y limpia el draft de una vez. */
export function popVentaDraft(): VentaDraft | null {
    const d = getVentaDraft();
    clearVentaDraft();
    return d;
}
