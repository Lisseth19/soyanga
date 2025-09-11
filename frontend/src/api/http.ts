import axios from "axios";

const baseURL = import.meta.env.VITE_API_BASE || "http://localhost:8084";

export const http = axios.create({
    baseURL,
    timeout: 15000,
    headers: { Accept: "application/json" },
});

// (opcional: para depurar)
if (import.meta.env.DEV) {
    console.log("[HTTP] baseURL =", baseURL);
}
