const fs = require("fs");
const path = require("path");
const md = fs.readFileSync(
  path.join(__dirname, "../../HerRidez/data/user.md"),
  "utf8",
);

let inner = md;
const fence = md.match(/```json\s*([\s\S]*)/);
if (fence) {
  inner = fence[1];
}

const open = inner.indexOf("[");
const close = inner.lastIndexOf("]");
if (open === -1 || close === -1 || close <= open) {
  throw new Error("Could not locate JSON array in user.md");
}

const raw = inner.slice(open, close + 1);
const j = JSON.parse(raw);

console.log("users:", j.length);
const out = path.join(__dirname, "../src/seeds/data/userProfiles.json");
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify(j, null, 2));
