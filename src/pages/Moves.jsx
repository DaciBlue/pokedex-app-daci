import { useEffect, useMemo, useRef, useState } from "react";
import { TYPE_ES } from "../utils/types.js";
import MoveCard from "../components/MoveCard.jsx";

const CLASS_ES = {
  physical: "Físico",
  special: "Especial",
  status: "Estado",
};

function norm(s) {
  return (s || "")
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function MoveTypeBadge({ typeKey }) {
  const es = TYPE_ES[typeKey] || typeKey;
  const iconUrl = `${import.meta.env.BASE_URL}types/${typeKey}.svg`;

  return (
    <span className="typeBadge" title={es}>
      <span className={`typeCircle t-${typeKey}`}>
        <img
          src={iconUrl}
          alt={es}
          onError={(e) => {
            e.currentTarget.style.display = "none";
            e.currentTarget.parentElement?.classList.add("noIcon");
          }}
        />
        <span className="typeFallback">{es?.[0] || "?"}</span>
      </span>
      <span>{es}</span>
    </span>
  );
}

export default function Moves() {
  const [moves, setMoves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [q, setQ] = useState("");
  const [openSug, setOpenSug] = useState(false);
  const [active, setActive] = useState(-1);

  const [selectedIndex, setSelectedIndex] = useState(null); // item del moves-index.json
  const [selectedMove, setSelectedMove] = useState(null); // detalle PokeAPI /move/:id
  const [moveLoading, setMoveLoading] = useState(false);

  const [showAll, setShowAll] = useState(false);
  const [showTop, setShowTop] = useState(false);

  const [sortKey, setSortKey] = useState("id");
  const [sortDir, setSortDir] = useState("asc");

  const inputRef = useRef(null);
  const moveCacheRef = useRef({}); // cache de detalles por id

  useEffect(() => {
    (async () => {
      try {
        setErr("");
        setLoading(true);
        const res = await fetch(
          `${import.meta.env.BASE_URL}data/moves-index.json`
        );
        if (!res.ok) throw new Error("No se pudo cargar moves-index.json");
        const data = await res.json();
        setMoves(Array.isArray(data) ? data : []);
      } catch (e) {
        setErr(e?.message || "Error cargando movimientos");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Flecha ↑ solo cuando estás en ver todos y has bajado
  useEffect(() => {
    if (!showAll) {
      setShowTop(false);
      return;
    }
    const onScroll = () => setShowTop(window.scrollY > 600);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [showAll]);

  const suggestions = useMemo(() => {
    const nq = norm(q.trim());
    if (!nq) return [];

    const scored = [];
    for (const m of moves) {
      const es = norm(m.name_es);
      const en = norm(m.name_en);
      const id = String(m.id);

      let score = 0;
      if (id === nq) score += 1000;
      else if (id.startsWith(nq)) score += 200;

      if (es === nq) score += 900;
      else if (es.startsWith(nq)) score += 350;
      else if (es.includes(nq)) score += 140;

      if (en === nq) score += 650;
      else if (en.startsWith(nq)) score += 220;
      else if (en.includes(nq)) score += 80;

      if (score > 0) scored.push({ m, score });
    }

    scored.sort((a, b) => b.score - a.score || a.m.id - b.m.id);
    return scored.slice(0, 10).map((x) => x.m);
  }, [q, moves]);

  const sortedMoves = useMemo(() => {
    const arr = [...moves];
    const dir = sortDir === "asc" ? 1 : -1;

    arr.sort((a, b) => {
      const va = a[sortKey];
      const vb = b[sortKey];

      if (va == null && vb == null) return a.id - b.id;
      if (va == null) return 1;
      if (vb == null) return -1;

      if (typeof va === "number" && typeof vb === "number")
        return (va - vb) * dir;

      return (
        String(va).localeCompare(String(vb), "es", { sensitivity: "base" }) *
        dir
      );
    });

    return arr;
  }, [moves, sortKey, sortDir]);

  async function loadMoveDetails(id) {
    if (moveCacheRef.current[id]) return moveCacheRef.current[id];

    const res = await fetch(`https://pokeapi.co/api/v2/move/${id}`);
    if (!res.ok) throw new Error("No encontrado. Prueba con otro nombre/ID.");
    const data = await res.json();
    moveCacheRef.current[id] = data;
    return data;
  }

  async function pickMove(m) {
    setSelectedIndex(m);
    setQ(m.name_es || m.name_en || String(m.id));
    setOpenSug(false);
    setActive(-1);

    // siempre subir arriba si vienes desde abajo (tabla)
    window.scrollTo({ top: 0, behavior: "smooth" });

    try {
      setErr("");
      setMoveLoading(true);
      const detail = await loadMoveDetails(m.id);
      setSelectedMove(detail);
    } catch (e) {
      setErr(e?.message || "Error cargando el movimiento");
      setSelectedMove(null);
    } finally {
      setMoveLoading(false);
    }
  }

  function onKeyDown(e) {
    if (!openSug && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
      setOpenSug(true);
      return;
    }
    if (!openSug) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((p) => Math.min(p + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((p) => Math.max(p - 1, 0));
    } else if (e.key === "Enter") {
      if (active >= 0 && suggestions[active]) {
        e.preventDefault();
        pickMove(suggestions[active]);
      }
    } else if (e.key === "Escape") {
      setOpenSug(false);
      setActive(-1);
    }
  }

  function toggleSort(key) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  return (
    <div className="container">
      <h2 style={{ margin: "8px 0 12px" }}>Movimientos</h2>

      <div className="row" style={{ gap: 12, alignItems: "flex-start" }}>
        <div style={{ position: "relative", width: 420, maxWidth: "100%" }}>
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setOpenSug(true);
              setActive(-1);
            }}
            onFocus={() => setOpenSug(true)}
            onKeyDown={onKeyDown}
            placeholder='Ej: "puño", "thunder", "15"...'
            style={{ width: "100%" }}
          />

          {openSug && q.trim() && suggestions.length > 0 && (
            <div className="suggestBox" role="listbox">
              {suggestions.map((m, idx) => (
                <button
                  key={m.id}
                  type="button"
                  className={`suggestItem ${idx === active ? "active" : ""}`}
                  onMouseEnter={() => setActive(idx)}
                  onMouseDown={(ev) => ev.preventDefault()}
                  onClick={() => pickMove(m)}
                >
                  <div
                    style={{ display: "flex", gap: 10, alignItems: "center" }}
                  >
                    <span
                      className="muted"
                      style={{ width: 48, textAlign: "right" }}
                    >
                      #{m.id}
                    </span>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 900 }}>
                        {m.name_es}{" "}
                        <span className="muted" style={{ fontWeight: 700 }}>
                          ({m.name_en})
                        </span>
                      </div>
                      <div className="muted" style={{ fontSize: 12 }}>
                        {m.gen} · {TYPE_ES[m.type] || m.type} ·{" "}
                        {CLASS_ES[m.class] || m.class}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <button type="button" onClick={() => setShowAll((s) => !s)}>
          {showAll ? "Ocultar" : "Ver todos"}
        </button>

        <span className="muted" style={{ alignSelf: "center" }}>
          Tip: escribe en ES o EN y usa ↑↓ + Enter
        </span>
      </div>

      {/* Botón flotante ↑ */}
      {showAll && showTop && (
        <button
          className="fabTop"
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        >
          ↑
        </button>
      )}

      {loading && (
        <div className="muted" style={{ marginTop: 12 }}>
          Cargando movimientos...
        </div>
      )}
      {err && <div style={{ color: "#ff8a8a", marginTop: 12 }}>{err}</div>}

      {/* Tarjeta PRO */}
      {(selectedIndex || moveLoading) && (
        <div style={{ marginTop: 14 }}>
          {moveLoading && (
            <div className="muted" style={{ marginBottom: 10 }}>
              Cargando ficha...
            </div>
          )}
          {selectedMove && selectedIndex && (
            <MoveCard
              move={selectedMove}
              esName={selectedIndex.name_es}
              enName={selectedIndex.name_en}
            />
          )}
        </div>
      )}

      {/* Tabla */}
      {showAll && !loading && moves.length > 0 && (
        <div className="card" style={{ marginTop: 14, maxWidth: 1100 }}>
          <div className="muted" style={{ marginBottom: 10 }}>
            Movimientos: {moves.length} · Orden: <b>{sortKey}</b> ({sortDir})
          </div>

          <div style={{ overflowX: "auto" }}>
            <table className="movesTable">
              <thead>
                <tr>
                  <th>
                    <button className="thBtn" onClick={() => toggleSort("id")}>
                      #
                    </button>
                  </th>
                  <th>
                    <button
                      className="thBtn"
                      onClick={() => toggleSort("name_es")}
                    >
                      Nombre
                    </button>
                  </th>
                  <th>
                    <button className="thBtn" onClick={() => toggleSort("gen")}>
                      Gen
                    </button>
                  </th>
                  <th>
                    <button
                      className="thBtn"
                      onClick={() => toggleSort("type")}
                    >
                      Tipo
                    </button>
                  </th>
                  <th>
                    <button
                      className="thBtn"
                      onClick={() => toggleSort("class")}
                    >
                      Clase
                    </button>
                  </th>
                  <th>
                    <button
                      className="thBtn"
                      onClick={() => toggleSort("power")}
                    >
                      Pot.
                    </button>
                  </th>
                  <th>
                    <button
                      className="thBtn"
                      onClick={() => toggleSort("accuracy")}
                    >
                      Prec.
                    </button>
                  </th>
                  <th>
                    <button className="thBtn" onClick={() => toggleSort("pp")}>
                      PP
                    </button>
                  </th>
                </tr>
              </thead>

              <tbody>
                {sortedMoves.map((m) => (
                  <tr
                    key={m.id}
                    onClick={() => pickMove(m)}
                    style={{ cursor: "pointer" }}
                  >
                    <td className="muted">#{m.id}</td>
                    <td>
                      <b>{m.name_es}</b>{" "}
                      <span className="muted">({m.name_en})</span>
                    </td>
                    <td className="muted">{m.gen}</td>
                    <td>{m.type ? <MoveTypeBadge typeKey={m.type} /> : "—"}</td>
                    <td className="muted">{CLASS_ES[m.class] || m.class}</td>
                    <td className="muted">{m.power ?? "—"}</td>
                    <td className="muted">{m.accuracy ?? "—"}</td>
                    <td className="muted">{m.pp ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="muted" style={{ marginTop: 10 }}>
            Tip: click en una fila para abrir la ficha arriba.
          </div>
        </div>
      )}
    </div>
  );
}
