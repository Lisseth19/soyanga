import axios from "axios";

const baseURL = import.meta.env.VITE_API_BASE ?? "http://localhost:8084";

export const http = axios.create({
    baseURL,
    timeout: 15000,
});

// (Opcional) agrega headers comunes aquí si los necesitas:
// http.defaults.headers.common["Accept"] = "application/json";
