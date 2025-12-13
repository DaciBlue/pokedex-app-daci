import fs from "node:fs/promises";

const API = "https://pokeapi.co/api/v2";

const roman = (genName) => {
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
  const key = (genName || "").replace("generation-", "");
  return map[key] || key.toUpperCase();
};

const pickEsName = (move, fallback) =>
  move?.names?.find((n) => n.language.name === "es")?.name || fallback;

const pickEsDesc = (move) => {
  const ft = move.flavor_text_entries?.find((f) => f.language.name === "es");
  return (ft?.flavor_text || "").replace(/\s+/g, " ").trim();
};

async function main() {
  console.log("Descargando lista de movimientos...");
  const list = await fetch(`${API}/move?limit=2000&offset=0`).then((r) =>
    r.json()
  );
  const moves = list.results;

  const out = [];
  const batchSize = 15;

  for (let i = 0; i < moves.length; i += batchSize) {
    const chunk = moves.slice(i, i + batchSize);

    const details = await Promise.all(
      chunk.map(async (m) => {
        const data = await fetch(m.url).then((r) => {
          if (!r.ok) throw new Error(`Move fetch failed: ${m.name}`);
          return r.json();
        });

        return {
          id: data.id,
          name_en: m.name,
          name_es: pickEsName(data, m.name),
          gen: roman(data.generation?.name),
          type: data.type?.name || "",
          class: data.damage_class?.name || "", // physical/special/status
          power: data.power ?? null,
          accuracy: data.accuracy ?? null,
          pp: data.pp ?? null,
          desc_es: pickEsDesc(data),
        };
      })
    );

    out.push(...details);
    console.log(
      `Progreso: ${Math.min(i + batchSize, moves.length)}/${moves.length}`
    );
    await new Promise((r) => setTimeout(r, 200)); // suave con la API
  }

  out.sort((a, b) => a.id - b.id);

  await fs.mkdir("public/data", { recursive: true });
  await fs.writeFile(
    "public/data/moves-index.json",
    JSON.stringify(out, null, 2),
    "utf8"
  );

  console.log("✅ Generado: public/data/moves-index.json");
}

main().catch((e) => {
  console.error("❌ Error:", e.message);
  process.exit(1);
});
