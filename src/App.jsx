import { Routes, Route, Navigate } from "react-router-dom";
import Pokedex from "./pages/Pokedex.jsx";

export default function App() {
  return (
    <Routes>
      <Route path="/pokedex" element={<Pokedex />} />
      <Route path="*" element={<Navigate to="/pokedex" replace />} />
    </Routes>
  );
}
