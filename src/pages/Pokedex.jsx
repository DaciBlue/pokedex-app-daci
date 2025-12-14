import { useEffect, useRef, useState } from "react";

import PokemonCard from "../components/PokemonCard.jsx";
import EvolutionChain from "../components/EvolutionChain.jsx";
import {
  getPokemonSmart,
  getSpeciesByPokemonId,
  getEvolutionChainByUrl,
  getItemByName,
  getAbilityByName,
  pickSpanishName,
  pickSpanishFlavor,
  pickSpanishItemName,
  pickSpanishAbilityName,
  pickSpanishAbilityEffect,
  buildEvolutionTree,
  collectSpeciesNames,
  collectEvoItemNames,
  normQuery,
  getTypeByName,
  computeDefensiveMatchups,
  computeOffensiveMatchups,
} from "../services/pokeapi.js";

function normLite(s) {
  return (s || "")
    .toString()
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export default function Pokedex() {
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const [pokemon, setPokemon] = useState(null);
  const [spanishName, setSpanishName] = useState("");
  const [flavor, setFlavor] = useState("");
  const [abilitiesInfo, setAbilitiesInfo] = useState({});
  const [matchups, setMatchups] = useState(null);

  const [tree, setTree] = useState(null);
  const [namesMap, setNamesMap] = useState({});
  const [spritesMap, setSpritesMap] = useState({});
  const [itemsMap, setItemsMap] = useState({});
  const [generation, setGeneration] = useState("");

  // --- AUTOCOMPLETE ---
  const [dexList, setDexList] = useState([]); // [{ id, name }]
  const [dexLoading, setDexLoading] = useState(true);
  const [sugs, setSugs] = useState([]);
  const [openSugs, setOpenSugs] = useState(false);
  const [activeSug, setActiveSug] = useState(0);
  const wrapRef = useRef(null);
  const justPickedRef = useRef(false);

  const GEN_ROMAN = {
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
  const genToRoman = (gName) => {
    const key = (gName || "").replace("generation-", "");
    return GEN_ROMAN[key] || key.toUpperCase();
  };

  // 1) Cargar listado (cacheado) para sugerencias
  useEffect(() => {
    let alive = true;

    async function loadDexList() {
      try {
        setDexLoading(true);

        // Intentar leer cache, pero sin romper si está corrupta
        try {
          const cached = localStorage.getItem("pokedex_dexlist_v1");
          if (cached) {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed) && parsed.length) {
              if (alive) setDexList(parsed);
              return;
            }
          }
        } catch {
          // si falla el JSON, ignoramos cache
        }

        const res = await fetch(
          "https://pokeapi.co/api/v2/pokemon?limit=2000&offset=0"
        );
        if (!res.ok) throw new Error("No se pudo cargar el listado de Pokémon");

        const data = await res.json();
        const list = (data.results || [])
          .map((r) => {
            const m = r.url.match(/\/pokemon\/(\d+)\//);
            const id = m ? Number(m[1]) : null;
            return { id, name: r.name };
          })
          .filter((x) => x.id && x.name);

        // ✅ IMPORTANTE: primero guardamos en memoria para que SIEMPRE haya sugerencias
        if (alive) setDexList(list);

        // ✅ luego intentamos cachear (y si falla por cuota, no pasa nada)
        try {
          localStorage.setItem("pokedex_dexlist_v1", JSON.stringify(list));
        } catch (e) {
          console.warn(
            "No se pudo cachear dexlist (cuota llena). Sugerencias seguirán funcionando en memoria.",
            e
          );
        }
      } catch (e) {
        console.warn("Dex list error:", e);
      } finally {
        if (alive) setDexLoading(false);
      }
    }

    loadDexList();
    return () => {
      alive = false;
    };
  }, []);

  // 2) Calcular sugerencias cuando cambia el input
  useEffect(() => {
    if (!dexList.length) return;

    const termRaw = q;
    const term = normLite(termRaw);
    if (!term) {
      setSugs([]);
      setOpenSugs(false);
      setActiveSug(0);
      return;
    }

    const isNum = /^\d+$/.test(term);
    const filtered = dexList
      .filter((p) =>
        isNum ? String(p.id).startsWith(term) : normLite(p.name).includes(term)
      )
      .slice(0, 10);

    setSugs(filtered);
    setOpenSugs(filtered.length > 0);
    setActiveSug(0);
  }, [q, dexList]);

  useEffect(() => {
    if (!dexList.length) return;

    // ✅ Si acabamos de elegir una sugerencia, NO recalcular ni reabrir
    if (justPickedRef.current) {
      justPickedRef.current = false;
      setOpenSugs(false);
      setSugs([]);
      setActiveSug(0);
      return;
    }

    const termRaw = q;
    const term = normLite(termRaw);
    if (!term) {
      setSugs([]);
      setOpenSugs(false);
      setActiveSug(0);
      return;
    }

    const isNum = /^\d+$/.test(term);
    const filtered = dexList
      .filter((p) =>
        isNum ? String(p.id).startsWith(term) : normLite(p.name).includes(term)
      )
      .slice(0, 10);

    setSugs(filtered);
    setOpenSugs(filtered.length > 0);
    setActiveSug(0);
  }, [q, dexList]);

  async function prefetchAbilities(p) {
    const abilityNames = p.abilities.map((a) => a.ability.name);
    const info = {};

    await Promise.all(
      abilityNames.map(async (aName) => {
        try {
          const ab = await getAbilityByName(aName);
          info[aName] = {
            esName: pickSpanishAbilityName(ab),
            esEffect: pickSpanishAbilityEffect(ab),
          };
        } catch {
          // ignore
        }
      })
    );

    setAbilitiesInfo(info);
  }

  async function loadPokemon(query) {
    setErr("");
    setLoading(true);

    setPokemon(null);
    setSpanishName("");
    setFlavor("");
    setAbilitiesInfo({});
    setMatchups(null);

    setTree(null);
    setNamesMap({});
    setSpritesMap({});
    setItemsMap({});
    setGeneration("");

    try {
      const p = await getPokemonSmart(query);
      setPokemon(p);

      const typeDatas = await Promise.all(
        p.types.map((t) => getTypeByName(t.type.name))
      );
      setMatchups({
        offensive: computeOffensiveMatchups(typeDatas),
        defensive: computeDefensiveMatchups(typeDatas),
      });

      prefetchAbilities(p);

      const species = await getSpeciesByPokemonId(p.id);
      setSpanishName(pickSpanishName(species));
      setFlavor(pickSpanishFlavor(species));
      setGeneration(genToRoman(species.generation?.name));

      const evoUrl = species.evolution_chain?.url;
      if (!evoUrl) return;

      const evo = await getEvolutionChainByUrl(evoUrl);
      const evoTree = buildEvolutionTree(evo.chain);
      setTree(evoTree);

      const names = collectSpeciesNames(evoTree);
      const nm = {};
      const sm = {};

      await Promise.all(
        names.map(async (name) => {
          const p2 = await getPokemonSmart(name);
          sm[name] =
            p2.sprites?.front_default ||
            p2.sprites?.other?.["official-artwork"]?.front_default ||
            "";

          const sp2 = await getSpeciesByPokemonId(p2.id);
          nm[name] = pickSpanishName(sp2);
        })
      );

      setNamesMap(nm);
      setSpritesMap(sm);

      const itemNames = collectEvoItemNames(evoTree);
      if (itemNames.length) {
        const im = {};
        await Promise.all(
          itemNames.map(async (iname) => {
            const item = await getItemByName(iname);
            im[iname] = {
              es: pickSpanishItemName(item),
              icon: item.sprites?.default || "",
            };
          })
        );
        setItemsMap(im);
      }
    } catch (e2) {
      setErr(e2?.message || "Error");
    } finally {
      setLoading(false);
    }
  }

  async function onSearch(e) {
    e.preventDefault();
    const query = normQuery(q);
    if (!query) return setErr("Escribe un nombre o número (ej: pikachu / 25)");
    setOpenSugs(false);
    await loadPokemon(query);
  }

  async function onSelectEvolution(name) {
    setQ(name);
    window.scrollTo({ top: 0, behavior: "smooth" });
    await loadPokemon(name);
  }

  function chooseSuggestion(p) {
    justPickedRef.current = true; // <- clave para que NO se reabra
    setQ(p.name);
    setOpenSugs(false);
    setSugs([]);
    setActiveSug(-1);
    loadPokemon(p.name);
  }

  function onInputKeyDown(e) {
    if (!sugs.length) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!openSugs) return setOpenSugs(true);
      setActiveSug((i) => Math.min(i + 1, sugs.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (!openSugs) return setOpenSugs(true);
      setActiveSug((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && openSugs) {
      e.preventDefault();
      chooseSuggestion(sugs[activeSug] || sugs[0]);
    } else if (e.key === "Escape") {
      setOpenSugs(false);
    }
  }

  return (
    <div className="container">
      <h2 style={{ margin: "8px 0 12px", textAlign: "left" }}>Pokédex</h2>

      <form
        onSubmit={onSearch}
        className="row"
        style={{ marginBottom: 12, overflow: "visible" }}
      >
        <div ref={wrapRef} className="suggestWrap">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onFocus={() => {
              if (sugs.length) setOpenSugs(true);
            }}
            onKeyDown={onInputKeyDown}
            className="searchInput"
            placeholder="Ej: pikachu o 25"
          />

          {openSugs && sugs.length > 0 && (
            <div className="suggestList">
              {sugs.map((p, idx) => (
                <button
                  key={p.id}
                  type="button"
                  className={`suggestItem ${idx === activeSug ? "active" : ""}`}
                  onMouseEnter={() => setActiveSug(idx)}
                  onClick={() => chooseSuggestion(p)}
                >
                  <span className="suggestId">#{p.id}</span>
                  <span className="suggestName">
                    {p.name.replaceAll("-", " ")}
                  </span>
                </button>
              ))}
            </div>
          )}

          {dexLoading && (
            <div className="muted" style={{ marginTop: 6, fontSize: 12 }}>
              Cargando sugerencias…
            </div>
          )}
        </div>

        <button type="submit" disabled={loading}>
          {loading ? "Buscando..." : "Buscar"}
        </button>

        <span className="muted">Tip: “charmander”, “1”, “eevee”…</span>
      </form>

      {err && !pokemon && (
        <div style={{ color: "#ff8a8a", marginBottom: 10 }}>{err}</div>
      )}

      {pokemon && (
        <>
          <PokemonCard
            pokemon={pokemon}
            spanishName={spanishName}
            flavor={flavor}
            abilitiesInfo={abilitiesInfo}
            matchups={matchups}
            generation={generation}
          />

          <EvolutionChain
            tree={tree}
            namesMap={namesMap}
            spritesMap={spritesMap}
            itemsMap={itemsMap}
            onSelect={onSelectEvolution}
          />
        </>
      )}
    </div>
  );
}
