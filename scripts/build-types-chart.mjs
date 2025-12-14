// scripts/build-types-chart.mjs
import fs from "node:fs/promises";
import path from "node:path";

const API = "https://pokeapi.co/api/v2";
const CORE_TYPE_IDS = Array.from({ length: 18 }, (_, i) => i + 1);

const outFile = path.resolve("public/data/types-chart.json");

const toNames = (arr) => (arr || []).map((x) => x.name);

function atkMultiplier(atkRel, defKey) {
  // atkRel = damage_relations del tipo atacante
  if (atkRel.no_damage_to?.some((t) => t.name === defKey)) return 0;
  if (atkRel.double_damage_to?.some((t) => t.name === defKey)) return 2;
  if (atkRel.half_damage_to?.some((t) => t.name === defKey)) return 0.5;
  return 1;
}

async function main() {
  const types = await Promise.all(
    CORE_TYPE_IDS.map(async (id) => {
      const r = await fetch(`${API}/type/${id}/`);
      if (!r.ok) throw new Error(`Type ${id} => ${r.status}`);
      const t = await r.json();
      return {
        id: t.id,
        key: t.name,
        damage_relations: t.damage_relations,
      };
    })
  );

  const typeKeys = types.map((t) => t.key);

  // Matriz: chart[atk][def] = 0 | 0.5 | 1 | 2
  const chart = {};
  for (const atk of types) {
    chart[atk.key] = {};
    for (const defKey of typeKeys) {
      chart[atk.key][defKey] = atkMultiplier(atk.damage_relations, defKey);
    }
  }

  const payload = {
    generatedAt: new Date().toISOString(),
    source: "pokeapi.co",
    types: typeKeys,
    chart,
  };

  await fs.mkdir(path.dirname(outFile), { recursive: true });
  await fs.writeFile(outFile, JSON.stringify(payload, null, 2), "utf-8");
  console.log(`✅ Wrote ${outFile}`);
}

main().catch((e) => {
  console.error("❌ build-types-chart failed:", e);
  process.exit(1);
});
