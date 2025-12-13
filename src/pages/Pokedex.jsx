import { useState } from "react";
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
          // no rompemos carga
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

    try {
      const p = await getPokemonSmart(query);
      setPokemon(p);

      // Matchups (ofensivo + defensivo)
      const typeDatas = await Promise.all(
        p.types.map((t) => getTypeByName(t.type.name))
      );
      setMatchups({
        offensive: computeOffensiveMatchups(typeDatas),
        defensive: computeDefensiveMatchups(typeDatas),
      });

      // Prefetch habilidades
      prefetchAbilities(p);

      const species = await getSpeciesByPokemonId(p.id);
      setSpanishName(pickSpanishName(species));
      setFlavor(pickSpanishFlavor(species));

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
      setErr(e2.message || "Error");
    } finally {
      setLoading(false);
    }
  }

  async function onSearch(e) {
    e.preventDefault();
    const query = normQuery(q);
    if (!query) return setErr("Escribe un nombre o número (ej: pikachu / 25)");
    await loadPokemon(query);
  }

  async function onSelectEvolution(name) {
    setQ(name);
    window.scrollTo({ top: 0, behavior: "smooth" });
    await loadPokemon(name);
  }

  return (
    <div className="container">
      <h2 style={{ margin: "8px 0 12px" }}>Pokédex</h2>

      <form onSubmit={onSearch} className="row" style={{ marginBottom: 12 }}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Ej: pikachu o 25"
          style={{ width: 320 }}
        />
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
