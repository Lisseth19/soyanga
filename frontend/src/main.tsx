import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { router } from "./app/router/rutas";
import "./estilos/index.css"; // tu Tailwind/global CSS

const root = document.getElementById("root");
if (!root) {
    throw new Error("No se encontró el div #root en index.html");
}

ReactDOM.createRoot(root).render(
    <React.StrictMode>
        <RouterProvider router={router} />
    </React.StrictMode>
);
