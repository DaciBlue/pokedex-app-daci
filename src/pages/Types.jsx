// src/pages/Types.jsx
import { useEffect, useMemo, useState } from "react";
import { TYPE_ES } from "../utils/types.js";

const API = "https://pokeapi.co/api/v2";

// 18 tipos “oficiales” (evitamos shadow/unknown)
const TYPES = [
  "normal",
  "fire",
  "water",
  "electric",
  "grass",
  "ice",
  "fighting",
  "poison",
  "ground",
  "flying",
  "psychic",
  "bug",
  "rock",
  "ghost",
  "dragon",
  "dark",
  "steel",
  "fairy",
];

function withTimeout(promise, ms = 12000) {
  return Promise.race([
    promise,
    new Promise((_, rej) =>
      setTimeout(() => rej(new Error("Timeout cargando tipos")), ms)
    ),
  ]);
}

function iconUrl(typeKey) {
  return `${import.meta.env.BASE_URL}types/${typeKey}.svg`;
}

function atkMultiplier(attacker, defender, relMap) {
  const rel = relMap?.[attacker];
  if (!rel) return 1;

  if (rel.no_damage_to.has(defender)) return 0;
  if (rel.double_damage_to.has(defender)) return 2;
  if (rel.half_damage_to.has(defender)) return 0.5;
  return 1;
}

function labelMult(m) {
  if (m === 4) return "400% (x4)";
  if (m === 2) return "200% (x2)";
  if (m === 1) return "100% (x1)";
  if (m === 0.5) return "50% (x1/2)";
  if (m === 0.25) return "25% (x1/4)";
  if (m === 0) return "0% (x0)";
  return `${m}`;
}

function Group({ title, types }) {
  if (!types?.length) return null; // ✅ no mostrar grupos vacíos
  return (
    <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
      <div style={{ fontWeight: 900 }}>{title}</div>
      <div className="row" style={{ gap: 10, flexWrap: "wrap" }}>
        {types.map((t) => (
          <span key={t} className="typeBadge">
            <span className={`typeCircle t-${t}`}>
              <img src={iconUrl(t)} alt={t} />
            </span>
            <span>{TYPE_ES[t] || t}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

function TypeBadge({ typeKey, onClick, selected }) {
  const es = TYPE_ES[typeKey] || typeKey;

  return (
    <button
      type="button"
      onClick={onClick}
      title={es}
      style={{
        border: "none",
        background: "transparent",
        padding: 0,
        cursor: "pointer",
      }}
    >
      <span className={`typeBadge t-${typeKey} ${selected ? "selected" : ""}`}>
        <span className={`typeCircle t-${typeKey}`}>
          <img src={iconUrl(typeKey)} alt={es} />
        </span>
        <span>{es}</span>
      </span>
    </button>
  );
}

function cellText(v) {
  if (v === 0.5) return "½";
  if (v === 0) return "0";
  if (v === 2) return "2";
  return "1";
}

export default function Types() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [relMap, setRelMap] = useState(null); // { type: { double_damage_to:Set, ... } }

  const [selected, setSelected] = useState(["normal"]); // 1-2 tipos seleccionados

  // ✅ resaltado tabla
  const [activeCol, setActiveCol] = useState(null); // defender
  const [activeRow, setActiveRow] = useState(null); // attacker

  useEffect(() => {
    let alive = true;

    (async () => {
      setLoading(true);
      setErr("");

      try {
        const results = await withTimeout(
          Promise.all(
            TYPES.map(async (t) => {
              const res = await fetch(`${API}/type/${t}`);
              if (!res.ok) throw new Error(`No se pudo cargar el tipo: ${t}`);
              const data = await res.json();

              const rel = data.damage_relations;
              return [
                t,
                {
                  double_damage_to: new Set(
                    rel.double_damage_to.map((x) => x.name)
                  ),
                  half_damage_to: new Set(
                    rel.half_damage_to.map((x) => x.name)
                  ),
                  no_damage_to: new Set(rel.no_damage_to.map((x) => x.name)),
                },
              ];
            })
          ),
          15000
        );

        const map = {};
        for (const [t, rel] of results) map[t] = rel;

        if (alive) setRelMap(map);
      } catch (e) {
        if (alive) setErr(e?.message || "Error cargando tipos");
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  function toggleType(t) {
    setSelected((prev) => {
      if (prev.includes(t)) return prev.filter((x) => x !== t);
      if (prev.length >= 2) return [prev[0], t]; // máximo 2
      return [...prev, t];
    });
  }

  const defenseGroups = useMemo(() => {
    if (!relMap || !selected.length) return null;

    const groups = { 4: [], 2: [], 1: [], 0.5: [], 0.25: [], 0: [] };

    for (const atk of TYPES) {
      let m = 1;
      for (const def of selected) m *= atkMultiplier(atk, def, relMap);

      if (m === 4) groups[4].push(atk);
      else if (m === 2) groups[2].push(atk);
      else if (m === 1) groups[1].push(atk);
      else if (m === 0.5) groups[0.5].push(atk);
      else if (m === 0.25) groups[0.25].push(atk);
      else if (m === 0) groups[0].push(atk);
    }

    return groups;
  }, [relMap, selected]);

  const offenseGroups = useMemo(() => {
    if (!relMap || !selected.length) return null;

    // “Cobertura” simple: mejor multiplicador entre tus tipos (max)
    const groups = { 2: [], 1: [], 0.5: [], 0: [] };

    for (const def of TYPES) {
      const m = Math.max(
        ...selected.map((atk) => atkMultiplier(atk, def, relMap))
      );
      if (m === 2) groups[2].push(def);
      else if (m === 1) groups[1].push(def);
      else if (m === 0.5) groups[0.5].push(def);
      else if (m === 0) groups[0].push(def);
    }
    return groups;
  }, [relMap, selected]);

  const matrix = useMemo(() => {
    if (!relMap) return null;
    const m = {};
    for (const atk of TYPES) {
      m[atk] = {};
      for (const def of TYPES) {
        m[atk][def] = atkMultiplier(atk, def, relMap);
      }
    }
    return m;
  }, [relMap]);

  // tabla más ancha para escritorio
  const WIDE = 1280;

  // Ajuste compacto (para que quepa mejor en web)
  const leftCol = 140;
  const cellW = 50;
  const gap = 6;

  return (
    <div className="container">
      <h2 style={{ margin: "8px 0 12px" }}>Tabla de tipos</h2>

      {loading && <div className="muted">Cargando tipos...</div>}
      {err && <div style={{ color: "#ff8a8a", marginTop: 8 }}>{err}</div>}

      {!loading && relMap && (
        <>
          <div className="card" style={{ maxWidth: WIDE }}>
            <div style={{ fontWeight: 900, marginBottom: 10 }}>
              Selecciona 1–2 tipos
            </div>

            <div className="row" style={{ gap: 10, flexWrap: "wrap" }}>
              {TYPES.map((t) => (
                <TypeBadge
                  key={t}
                  typeKey={t}
                  selected={selected.includes(t)}
                  onClick={() => toggleType(t)}
                />
              ))}
            </div>

            <div className="muted" style={{ marginTop: 10 }}>
              Seleccionados:{" "}
              <b>
                {selected.length
                  ? selected.map((t) => TYPE_ES[t] || t).join(" + ")
                  : "—"}
              </b>
            </div>
          </div>

          <div className="card" style={{ maxWidth: WIDE, marginTop: 12 }}>
            <div style={{ fontWeight: 900, marginBottom: 6 }}>
              Fuerte VS (cobertura con tus tipos)
            </div>
            <Group title={labelMult(2)} types={offenseGroups?.[2]} />
            <Group title={labelMult(0.5)} types={offenseGroups?.[0.5]} />
            <Group title={labelMult(0)} types={offenseGroups?.[0]} />
            <Group title={labelMult(1)} types={offenseGroups?.[1]} />
          </div>

          <div className="card" style={{ maxWidth: WIDE, marginTop: 12 }}>
            <div style={{ fontWeight: 900, marginBottom: 6 }}>
              Débil VS (daño que recibes)
            </div>
            <Group title={labelMult(4)} types={defenseGroups?.[4]} />
            <Group title={labelMult(2)} types={defenseGroups?.[2]} />
            <Group title={labelMult(0.5)} types={defenseGroups?.[0.5]} />
            <Group title={labelMult(0.25)} types={defenseGroups?.[0.25]} />
            <Group title={labelMult(0)} types={defenseGroups?.[0]} />
            <Group title={labelMult(1)} types={defenseGroups?.[1]} />
          </div>

          <div className="card" style={{ maxWidth: WIDE, marginTop: 12 }}>
            <div style={{ fontWeight: 900, marginBottom: 10 }}>
              Tabla completa (Ataque → Defensa)
              <span
                className="muted"
                style={{ fontWeight: 700, marginLeft: 10 }}
              >
                (click en una columna o fila para resaltar)
              </span>
            </div>

            <div style={{ overflowX: "auto", paddingBottom: 6 }}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: `${leftCol}px repeat(${TYPES.length}, ${cellW}px)`,
                  gap,
                  alignItems: "center",
                  minWidth: leftCol + TYPES.length * cellW + TYPES.length * gap,
                }}
              >
                <div className="muted" style={{ fontWeight: 800 }}>
                  →
                </div>

                {TYPES.map((d) => {
                  const isActive = activeCol === d;
                  return (
                    <button
                      key={`h-${d}`}
                      type="button"
                      onClick={() => setActiveCol((c) => (c === d ? null : d))}
                      title={`Defensa: ${TYPE_ES[d] || d}`}
                      style={{
                        border: "none",
                        background: "transparent",
                        padding: 0,
                        cursor: "pointer",
                        display: "flex",
                        justifyContent: "center",
                      }}
                    >
                      <span
                        className={`typeCircle t-${d}`}
                        style={{
                          width: 34,
                          height: 34,
                          outline: isActive
                            ? "2px solid rgba(255,255,255,0.30)"
                            : "none",
                          boxShadow: isActive
                            ? "0 0 18px rgba(255,255,255,0.10)"
                            : "none",
                        }}
                      >
                        <img src={iconUrl(d)} alt={d} />
                      </span>
                    </button>
                  );
                })}

                {TYPES.map((atk) => {
                  const rowActive = activeRow === atk;

                  return (
                    <div key={`row-${atk}`} style={{ display: "contents" }}>
                      <button
                        type="button"
                        onClick={() =>
                          setActiveRow((r) => (r === atk ? null : atk))
                        }
                        title={`Ataque: ${TYPE_ES[atk] || atk}`}
                        style={{
                          border: "none",
                          background: "transparent",
                          padding: 0,
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          borderRadius: 12,
                          outline: rowActive
                            ? "2px solid rgba(255,255,255,0.18)"
                            : "none",
                        }}
                      >
                        <span
                          className={`typeCircle t-${atk}`}
                          style={{ width: 34, height: 34 }}
                        >
                          <img src={iconUrl(atk)} alt={atk} />
                        </span>
                        <span className="muted" style={{ fontWeight: 800 }}>
                          {TYPE_ES[atk] || atk}
                        </span>
                      </button>

                      {TYPES.map((def) => {
                        const v = matrix?.[atk]?.[def] ?? 1;

                        const baseBg =
                          v === 2
                            ? "rgba(120,255,160,0.10)"
                            : v === 0.5
                            ? "rgba(120,190,255,0.10)"
                            : v === 0
                            ? "rgba(255,120,120,0.10)"
                            : "rgba(255,255,255,0.04)";

                        const colActive = activeCol === def;
                        const rowActive2 = activeRow === atk;
                        const highlight = colActive || rowActive2;

                        return (
                          <div
                            key={`${atk}->${def}`}
                            title={`${TYPE_ES[atk] || atk} → ${
                              TYPE_ES[def] || def
                            }: x${v}`}
                            style={{
                              height: 42,
                              border: highlight
                                ? "1px solid rgba(255,255,255,0.22)"
                                : "1px solid rgba(255,255,255,0.08)",
                              borderRadius: 10,
                              background: highlight
                                ? `linear-gradient(0deg, rgba(255,255,255,0.04), rgba(255,255,255,0.04)), ${baseBg}`
                                : baseBg,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontWeight: 900,
                              color: "rgba(255,255,255,0.92)",
                            }}
                          >
                            {cellText(v)}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="muted" style={{ marginTop: 10 }}>
              Leyenda: 2 = súper eficaz · ½ = poco eficaz · 0 = inmune · 1 =
              normal
            </div>
          </div>
        </>
      )}
    </div>
  );
}
