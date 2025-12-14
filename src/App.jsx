// src/App.jsx
import { useState } from "react";
import Pokedex from "./pages/Pokedex.jsx";
import Moves from "./pages/Moves.jsx";
import Types from "./pages/Types.jsx";
import "./App.css";

export default function App() {
  const [tab, setTab] = useState("pokedex");

  return (
    <div className="appRoot">
      <div className="topTabs">
        <button
          className={`tabBtn ${tab === "pokedex" ? "tabBtnActive" : ""}`}
          onClick={() => setTab("pokedex")}
          type="button"
        >
          Pokédex
        </button>

        <button
          className={`tabBtn ${tab === "moves" ? "tabBtnActive" : ""}`}
          onClick={() => setTab("moves")}
          type="button"
        >
          Movimientos
        </button>

        <button
          className={`tabBtn ${tab === "types" ? "tabBtnActive" : ""}`}
          onClick={() => setTab("types")}
          type="button"
        >
          Tipos
        </button>
      </div>

      {tab === "pokedex" && <Pokedex />}
      {tab === "moves" && <Moves />}
      {tab === "types" && <Types />}
    </div>
  );
}
