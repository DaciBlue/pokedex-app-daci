import { useState } from "react";
import { TYPE_ES } from "../utils/types.js";

const STAT_ES = {
  hp: "PS",
  attack: "Ataque",
  defense: "Defensa",
  "special-attack": "At. Esp.",
  "special-defense": "Def. Esp.",
  speed: "Velocidad",
};

function AbilityTag({ label, open, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: "6px 10px",
        border: "1px solid var(--border)",
        borderRadius: 999,
        background: "rgba(255,255,255,0.03)",
        cursor: "pointer",
        fontWeight: 800,
        maxWidth: "100%",
      }}
      title="Click para ver descripción"
    >
      <span
        style={{
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {label}
      </span>
      <span className="muted" style={{ marginLeft: 8 }}>
        {open ? "−" : "+"}
      </span>
    </button>
  );
}

function TypePill({ typeKey }) {
  const es = TYPE_ES[typeKey] || typeKey;
  const iconUrl = `/types/${typeKey}.svg`;
  return (
    <span className="typeBadge" key={typeKey}>
      <span className={`typeCircle t-${typeKey}`}>
        <img src={iconUrl} alt={es} />
      </span>
      <span>{es}</span>
    </span>
  );
}

function Group({ title, types }) {
  if (!types || types.length === 0) return null;
  return (
    <>
      <div className="matchupLabel">{title}</div>
      <div className="typeRow">
        {types.map((t) => (
          <TypePill key={t} typeKey={t} />
        ))}
      </div>
    </>
  );
}

export default function PokemonCard({
  pokemon,
  spanishName,
  flavor,
  abilitiesInfo = {},
  matchups,
  generation, // ✅ nuevo
}) {
  const [openAbility, setOpenAbility] = useState(null);
  const [openMatchup, setOpenMatchup] = useState(null); // "strong" | "weak" | null

  const sprite =
    pokemon.sprites?.other?.["official-artwork"]?.front_default ||
    pokemon.sprites?.front_default;

  const abilities = pokemon.abilities.map((a) => a.ability.name);

  function toggleAbility(aName) {
    setOpenAbility((prev) => (prev === aName ? null : aName));
  }

  return (
    <div className="card" style={{ maxWidth: 780 }}>
      {/* HEADER CENTRADO */}
      <div className="pokeHeader">
        {sprite && (
          <img
            className="pokeSprite"
            src={sprite}
            alt={spanishName}
            width="160"
            height="160"
          />
        )}

        <div style={{ fontSize: 32, fontWeight: 850 }}>
          {spanishName} <span className="muted">#{pokemon.id}</span>
        </div>

        {flavor && (
          <div className="muted" style={{ marginTop: 8, maxWidth: 680 }}>
            {flavor}
          </div>
        )}

        <div className="typeLabel">Tipo:</div>
        <div className="typeRow typeRowCenter" style={{ marginTop: 8 }}>
          {pokemon.types.map((t) => {
            const key = t.type.name;
            const es = TYPE_ES[key] || key;
            const iconUrl = `/types/${key}.svg`;

            return (
              <span key={key} className="typeBadge">
                <span className={`typeCircle t-${key}`}>
                  <img src={iconUrl} alt={es} />
                </span>
                <span>{es}</span>
              </span>
            );
          })}
        </div>
      </div>

      {/* MATCHUPS */}
      {matchups && (
        <div className="matchupBlock">
          <div className="row" style={{ gap: 10 }}>
            <button
              type="button"
              className="pillBtn pillBtnStrong"
              onClick={() =>
                setOpenMatchup((p) => (p === "strong" ? null : "strong"))
              }
            >
              <span className="pillIcon">⚔️</span>
              Fuerte VS{" "}
              <span className="muted">
                {openMatchup === "strong" ? "−" : "+"}
              </span>
            </button>

            <button
              type="button"
              className="pillBtn pillBtnWeak"
              onClick={() =>
                setOpenMatchup((p) => (p === "weak" ? null : "weak"))
              }
            >
              <span className="pillIcon">🛡️</span>
              Débil VS{" "}
              <span className="muted">
                {openMatchup === "weak" ? "−" : "+"}
              </span>
            </button>
          </div>

          {openMatchup === "strong" && (
            <div
              className="card matchupCard"
              style={{ padding: 12, marginTop: 10 }}
            >
              <div
                style={{
                  fontWeight: 900,
                  marginBottom: 8,
                  textAlign: "center",
                }}
              >
                Daño que haces (con tus tipos)
              </div>
              <Group title="200% (x2)" types={matchups.offensive.x2} />
              <Group title="50% (x1/2)" types={matchups.offensive.x05} />
              <Group title="0% (x0 no afecta)" types={matchups.offensive.x0} />
              <Group title="100% (x1 normal)" types={matchups.offensive.x1} />
            </div>
          )}

          {openMatchup === "weak" && (
            <div
              className="card matchupCard"
              style={{ padding: 12, marginTop: 10 }}
            >
              <div
                style={{
                  fontWeight: 900,
                  marginBottom: 8,
                  textAlign: "center",
                }}
              >
                Daño que recibes
              </div>
              <Group title="400% (x4)" types={matchups.defensive.x4} />
              <Group title="200% (x2)" types={matchups.defensive.x2} />
              <Group title="50% (x1/2)" types={matchups.defensive.x05} />
              <Group title="25% (x1/4)" types={matchups.defensive.x025} />
              <Group title="0% (x0 inmune)" types={matchups.defensive.immune} />
              <Group title="100% (x1 normal)" types={matchups.defensive.x1} />
            </div>
          )}
        </div>
      )}

      {/* DATOS */}
      <div className="cardSection">
        <div className="sectionTitle">Datos</div>
        <div className="metaLine metaLineStrong">
          {generation && (
            <span>
              <span className="metaKey">Generación:</span> {generation}
            </span>
          )}
          <span>
            <span className="metaKey">Altura:</span> {pokemon.height / 10}m
          </span>
          <span>
            <span className="metaKey">Peso:</span> {pokemon.weight / 10}kg
          </span>
        </div>
      </div>

      {/* HABILIDADES */}
      <div className="cardSection">
        <div className="sectionTitle">Habilidades</div>

        <div className="row" style={{ gap: 10, minWidth: 0 }}>
          {abilities.map((aName) => {
            const data = abilitiesInfo[aName];
            const label = data?.esName || aName;
            const open = openAbility === aName;

            return (
              <AbilityTag
                key={aName}
                label={label}
                open={open}
                onClick={() => toggleAbility(aName)}
              />
            );
          })}
        </div>

        {openAbility && (
          <div className="card" style={{ padding: 12, marginTop: 10 }}>
            <div style={{ fontWeight: 900, marginBottom: 6 }}>
              {abilitiesInfo[openAbility]?.esName || openAbility}
            </div>
            <div className="muted">
              {abilitiesInfo[openAbility]?.esEffect ||
                "Cargando descripción..."}
            </div>
          </div>
        )}
      </div>

      {/* ESTADÍSTICAS */}
      <div className="cardSection">
        <div className="sectionTitle">Estadísticas</div>

        <div style={{ display: "grid", gap: 8 }}>
          {pokemon.stats.map((s) => {
            const key = s.stat.name;
            const label = STAT_ES[key] || key;
            const val = s.base_stat;
            const pct = Math.min(100, Math.round((val / 200) * 100));

            return (
              <div
                key={key}
                style={{
                  display: "grid",
                  gridTemplateColumns: "120px 44px 1fr",
                  gap: 10,
                  alignItems: "center",
                  minWidth: 0,
                }}
              >
                <div className="statLabel">{label}</div>
                <div style={{ fontWeight: 900 }}>{val}</div>

                <div
                  style={{
                    height: 10,
                    borderRadius: 999,
                    border: "1px solid var(--border)",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: `${pct}%`,
                      height: "100%",
                      background: "rgba(255,255,255,0.25)",
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
