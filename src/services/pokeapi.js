import { cacheGet, cacheSet } from "../utils/cache";

const BASE = "https://pokeapi.co/api/v2";

async function cachedFetch(url) {
  const hit = cacheGet(url);
  if (hit) return hit;

  const res = await fetch(url);
  if (!res.ok) throw new Error("No encontrado. Prueba con otro nombre/ID.");
  const data = await res.json();
  cacheSet(url, data);
  return data;
}

export const normQuery = (q) =>
  String(q || "")
    .trim()
    .toLowerCase();

export const getPokemon = (nameOrId) =>
  cachedFetch(`${BASE}/pokemon/${normQuery(nameOrId)}`);

export const getSpeciesByPokemonId = (id) =>
  cachedFetch(`${BASE}/pokemon-species/${id}`);

export const getEvolutionChainByUrl = (url) => cachedFetch(url);

export const getItemByName = (name) =>
  cachedFetch(`${BASE}/item/${normQuery(name)}`);

export function pickSpanishName(species) {
  const es = species.names?.find((n) => n.language?.name === "es");
  return es?.name || species.name;
}

export function pickSpanishItemName(item) {
  const es = item.names?.find((n) => n.language?.name === "es");
  return es?.name || item.name;
}

export function pickSpanishFlavor(species) {
  const es = species.flavor_text_entries?.find(
    (f) => f.language?.name === "es"
  );
  if (!es?.flavor_text) return "";
  return es.flavor_text.replace(/\s+/g, " ").replace("POKéMON", "Pokémon");
}

export const getSpeciesByNameOrId = (q) =>
  cachedFetch(`${BASE}/pokemon-species/${normQuery(q)}`);

export async function getPokemonSmart(q) {
  try {
    return await getPokemon(q);
  } catch (e) {
    // si es número, no hay fallback
    if (/^\d+$/.test(String(q).trim())) throw e;

    // fallback: buscar species y usar la variedad "is_default"
    const sp = await getSpeciesByNameOrId(q);
    const def = sp.varieties?.find((v) => v.is_default)?.pokemon?.name;
    if (!def) throw e;

    return await getPokemon(def);
  }
}

// Árbol de evoluciones con detalles en los "enlaces"
export function buildEvolutionTree(chainNode) {
  function walk(node) {
    return {
      name: node.species.name,
      next: node.evolves_to.map((child) => ({
        details: child.evolution_details?.[0] ?? null,
        node: walk(child),
      })),
    };
  }
  return walk(chainNode);
}

export function collectSpeciesNames(tree) {
  const set = new Set();
  (function walk(t) {
    set.add(t.name);
    t.next.forEach((e) => walk(e.node));
  })(tree);
  return [...set];
}

export function collectEvoItemNames(tree) {
  const set = new Set();
  (function walk(t) {
    t.next.forEach((e) => {
      const d = e.details;
      if (d?.item?.name) set.add(d.item.name);
      if (d?.held_item?.name) set.add(d.held_item.name);
      walk(e.node);
    });
  })(tree);
  return [...set];
}

export const getAbilityByName = (name) =>
  cachedFetch(`${BASE}/ability/${normQuery(name)}`);

export function pickSpanishAbilityName(ability) {
  const es = ability.names?.find((n) => n.language?.name === "es");
  return es?.name || ability.name;
}

export function pickSpanishAbilityEffect(ability) {
  const es = ability.flavor_text_entries?.find(
    (f) => f.language?.name === "es"
  );
  return (es?.flavor_text || "").replace(/\s+/g, " ");
}

export function computeOffensiveMatchups(typeDatas) {
  const ALL_TYPES = [
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

  // Mejor multiplicador posible usando cualquiera de tus tipos (STAB)
  const best = {};
  ALL_TYPES.forEach((t) => (best[t] = 0));

  for (const td of typeDatas) {
    const local = {};
    ALL_TYPES.forEach((t) => (local[t] = 1));

    const r = td.damage_relations || {};
    for (const x of r.no_damage_to || []) local[x.name] = 0;
    for (const x of r.double_damage_to || []) local[x.name] = 2;
    for (const x of r.half_damage_to || []) local[x.name] = 0.5;

    for (const t of ALL_TYPES) {
      best[t] = Math.max(best[t], local[t]);
    }
  }

  const groups = { x0: [], x05: [], x1: [], x2: [] };
  for (const t of ALL_TYPES) {
    const m = best[t];
    if (m === 0) groups.x0.push(t);
    else if (m === 0.5) groups.x05.push(t);
    else if (m === 1) groups.x1.push(t);
    else if (m === 2) groups.x2.push(t);
  }
  return groups;
}

export function evoMethodToSpanish(details, itemsMap) {
  if (!details) return "";

  const trig = details.trigger?.name;

  const parts = [];

  // Amistad / afecto / belleza
  if (details.min_happiness) parts.push(`Amistad ${details.min_happiness}+`);
  if (details.min_affection)
    parts.push(`${details.min_affection} corazones de afecto+`);
  if (details.min_beauty) parts.push(`Belleza ${details.min_beauty}+`);

  // Día / noche
  if (details.time_of_day === "day") parts.push("(día)");
  if (details.time_of_day === "night") parts.push("(noche)");

  // Conocer movimiento / tipo de movimiento
  if (details.known_move?.name)
    parts.push(`Conocer ${details.known_move.name}`);
  if (details.known_move_type?.name)
    parts.push(`Conocer movimiento tipo ${details.known_move_type.name}`);

  // Localización (sale en inglés; si quieres luego lo traducimos)
  if (details.location?.name) parts.push(`En ${details.location.name}`);

  // ITEM usado
  if (trig === "use-item" && details.item?.name) {
    const it = itemsMap?.[details.item.name];
    return it ? `Usar ${it.es}` : `Usar ${details.item.name}`;
  }

  // Intercambio
  if (trig === "trade") {
    if (details.held_item?.name) {
      const it = itemsMap?.[details.held_item.name];
      return it
        ? `Intercambio (con ${it.es})`
        : `Intercambio (con ${details.held_item.name})`;
    }
    return "Intercambio";
  }

  // Subir nivel
  if (trig === "level-up") {
    if (details.min_level) parts.unshift(`Nivel ${details.min_level}`);
    else parts.unshift("Subir nivel");
    return parts.join(" ");
  }

  // fallback
  return parts.length ? parts.join(" ") : trig ? `Trigger: ${trig}` : "";
}

export const getTypeByName = (name) =>
  cachedFetch(`${BASE}/type/${normQuery(name)}`);

const ALL_TYPES = [
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

export function computeDefensiveMatchups(typeDatas) {
  const mult = {};
  ALL_TYPES.forEach((t) => (mult[t] = 1));

  for (const td of typeDatas) {
    const r = td.damage_relations;

    // inmunidades
    for (const x of r.no_damage_from || []) mult[x.name] = 0;

    // dobles
    for (const x of r.double_damage_from || []) {
      if (mult[x.name] !== 0) mult[x.name] *= 2;
    }

    // medias
    for (const x of r.half_damage_from || []) {
      if (mult[x.name] !== 0) mult[x.name] *= 0.5;
    }
  }

  const groups = {
    immune: [],
    x025: [],
    x05: [],
    x1: [],
    x2: [],
    x4: [],
  };

  for (const t of ALL_TYPES) {
    const m = mult[t];
    if (m === 0) groups.immune.push(t);
    else if (m === 0.25) groups.x025.push(t);
    else if (m === 0.5) groups.x05.push(t);
    else if (m === 1) groups.x1.push(t);
    else if (m === 2) groups.x2.push(t);
    else if (m === 4) groups.x4.push(t);
  }

  return groups;
}
