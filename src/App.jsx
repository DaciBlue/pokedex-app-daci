import { useState } from "react";
import Pokedex from "./pages/Pokedex.jsx";
import Moves from "./pages/Moves.jsx";
import "./App.css";

export default function App() {
  const [tab, setTab] = useState("pokedex");

  return (
    <div className="appRoot">
      <div className="topTabs">
        <button
          className={`tabBtn ${tab === "pokedex" ? "active" : ""}`}
          onClick={() => setTab("pokedex")}
          type="button"
        >
          Pokédex
        </button>

        <button
          className={`tabBtn ${tab === "moves" ? "active" : ""}`}
          onClick={() => setTab("moves")}
          type="button"
        >
          Movimientos
        </button>
      </div>

      {tab === "pokedex" ? <Pokedex /> : <Moves />}
    </div>
  );
}
