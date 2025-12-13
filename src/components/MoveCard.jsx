import { TYPE_ES } from "../utils/types.js";

const DMG_ES = { physical: "Físico", special: "Especial", status: "Estado" };

const TARGET_ES = {
  "selected-pokemon": "Un objetivo",
  "all-opponents": "Todos los rivales",
  "all-other-pokemon": "Todos menos tú",
  "all-pokemon": "Todos",
  user: "A ti",
  "user-and-allies": "Tú y aliados",
  "random-opponent": "Rival aleatorio",
  "entire-field": "Todo el campo",
};

function romanGen(genName = "") {
  const k = genName.replace("generation-", "");
  const map = {
    i: "I",
    ii: "II",
    iii: "III",
    iv: "IV",
    v: "V",
    vi: "VI",
    vii: "VII",
    viii: "VIII",
    ix: "IX",
  };
  return map[k] || k.toUpperCase();
}

function Chip({ children }) {
  return <span className="chip">{children}</span>;
}

function TypePill({ typeKey }) {
  const es = TYPE_ES[typeKey] || typeKey;
  const iconUrl = `/types/${typeKey}.svg`;
  return (
    <span className="typeBadge">
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

export default function MoveCard({ move, esName, enName }) {
  if (!move) return null;

  const dmg = DMG_ES[move.damage_class?.name] || move.damage_class?.name;
  const gen = romanGen(move.generation?.name);
  const target = TARGET_ES[move.target?.name] || move.target?.name;

  // Descripción corta ES (si existe)
  const esEffect =
    move.effect_entries?.find((x) => x.language?.name === "es")?.short_effect ||
    move.flavor_text_entries?.find((x) => x.language?.name === "es")
      ?.flavor_text ||
    "";

  const meta = move.meta || {};
  const hits =
    meta.min_hits && meta.max_hits
      ? `${meta.min_hits}-${meta.max_hits} golpes`
      : null;

  const turns =
    meta.min_turns && meta.max_turns
      ? `${meta.min_turns}-${meta.max_turns} turnos`
      : null;

  const chance = move.effect_chance ? `${move.effect_chance}%` : null;

  return (
    <div className="card moveCard" style={{ maxWidth: 780 }}>
      <div className="moveTop">
        <div style={{ minWidth: 0 }}>
          <div className="moveTitle">
            {esName || move.name}{" "}
            <span className="muted">
              #{move.id} {enName ? `(${enName})` : ""}
            </span>
          </div>
          <div className="muted" style={{ marginTop: 6 }}>
            {move.name} · Gen {gen}
          </div>
        </div>

        <div className="moveBadges">
          <TypePill typeKey={move.type?.name} />
          <Chip>{dmg}</Chip>
          {target && <Chip>{target}</Chip>}
        </div>
      </div>

      {esEffect && <div className="muted moveDesc">{esEffect}</div>}

      <div className="moveGrid">
        <div className="moveStat">
          <span className="muted">Potencia</span>
          <b>{move.power ?? "—"}</b>
        </div>
        <div className="moveStat">
          <span className="muted">Precisión</span>
          <b>{move.accuracy ?? "—"}</b>
        </div>
        <div className="moveStat">
          <span className="muted">PP</span>
          <b>{move.pp ?? "—"}</b>
        </div>
        <div className="moveStat">
          <span className="muted">Prioridad</span>
          <b>{move.priority ?? 0}</b>
        </div>
        {chance && (
          <div className="moveStat">
            <span className="muted">Prob. efecto</span>
            <b>{chance}</b>
          </div>
        )}
        {hits && (
          <div className="moveStat">
            <span className="muted">Golpes</span>
            <b>{hits}</b>
          </div>
        )}
        {turns && (
          <div className="moveStat">
            <span className="muted">Turnos</span>
            <b>{turns}</b>
          </div>
        )}
        {meta.contact ? (
          <div className="moveStat">
            <span className="muted">Contacto</span>
            <b>Sí</b>
          </div>
        ) : null}
      </div>
    </div>
  );
}
