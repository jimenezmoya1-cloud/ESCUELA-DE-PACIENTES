// scripts/build-cie10-json.mjs
// Genera public/data/cie10.json a partir del xlsx maestro.
// Uso: npm run build:cie10
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const XLSX = require("xlsx");
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "..");
const XLSX_PATH = resolve(
  REPO_ROOT,
  "insumos_construccion",
  "CIE 10 actualizada.xlsx",
);
const OUT_PATH = resolve(REPO_ROOT, "public/data/cie10.json");

function normalize(s) {
  return String(s ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

const wb = XLSX.readFile(XLSX_PATH);
const ws = wb.Sheets["CIE-10"];
if (!ws) {
  console.error("Sheet 'CIE-10' not found in", XLSX_PATH);
  process.exit(1);
}

const rows = XLSX.utils.sheet_to_json(ws, { defval: "" });

const entries = [];
for (const r of rows) {
  if (String(r.Habilitado).trim().toUpperCase() !== "SI") continue;
  const code = String(r.Codigo ?? "").trim();
  const name = String(r.Nombre ?? "").trim();
  const description = String(r.Descripcion ?? "").trim();
  if (!code || !name) continue;
  entries.push({
    code,
    name,
    description,
    search: normalize(`${code} ${name} ${description}`),
  });
}

mkdirSync(dirname(OUT_PATH), { recursive: true });
writeFileSync(OUT_PATH, JSON.stringify(entries));
console.log(`Wrote ${entries.length} CIE-10 entries to ${OUT_PATH}`);
