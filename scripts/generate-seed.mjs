// -----------------------------------------------------------------------------
// Cabler Parts — regenerate supabase/seed.sql from src/lib/data.js (the single
// source of truth for the catalog). Keeps the seeded DB brand-accurate.
//
//   node scripts/generate-seed.mjs
// -----------------------------------------------------------------------------
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { PRODUCTS } from "../src/lib/data.js";

const here = dirname(fileURLToPath(import.meta.url));
const out = resolve(here, "../supabase/seed.sql");
const esc = (s) => String(s).replace(/'/g, "''");

const lines = [
  "-- Cabler Parts — catalog seed (GENERATED from src/lib/data.js; do not hand-edit).",
  "-- Regenerate with:  node scripts/generate-seed.mjs",
  "-- Run AFTER the migrations (0001 -> 0003). Idempotent (upsert by id).",
  "--",
  "-- Promote your admin account after first sign-up:",
  "--   update public.profiles set role = 'admin' where email = 'admin@cablerparts.com';",
  "",
];

for (const p of PRODUCTS) {
  const json = esc(JSON.stringify(p));
  lines.push(
    `insert into public.products (id, data) values ('${esc(p.id)}', '${json}'::jsonb) ` +
      "on conflict (id) do update set data = excluded.data;"
  );
}
lines.push("");

writeFileSync(out, lines.join("\n"), "utf8");
console.log(`Wrote ${out} with ${PRODUCTS.length} products.`);
