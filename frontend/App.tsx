import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
// @ts-ignore
import InventarioPorLotePage from "@/pages/inventario/InventarioPorLote";

export default function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<Navigate to="/inventario/por-lote" replace />} />
                <Route path="/inventario/por-lote" element={<InventarioPorLotePage />} />
            </Routes>
        </BrowserRouter>
    );
}
