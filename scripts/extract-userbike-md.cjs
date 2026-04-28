const fs = require("fs");
const path = require("path");
const md = fs.readFileSync(
  path.join(__dirname, "../../HerRidez/data/userbike.md"),
  "utf8",
);
const inner = md.includes("```json") ? md.split("```json")[1] || md : md;
const open = inner.indexOf("[");
const close = inner.lastIndexOf("]");
const raw = inner.slice(open, close + 1);
const j = JSON.parse(raw);
console.log("bikes:", j.length);
const out = path.join(__dirname, "../src/seeds/data/bikeCatalog.json");
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify(j, null, 2));
