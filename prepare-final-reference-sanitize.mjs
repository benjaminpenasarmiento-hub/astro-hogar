import fs from "node:fs";
import path from "node:path";

const REPLACEMENTS = [
  ["activdeUserName", "activeUserName"],
];

const TEXT_EXTENSIONS = new Set([
  ".ts", ".tsx", ".js", ".mjs", ".cjs", ".jsx", ".json", ".css", ".html", ".md"
]);

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if ([".git", "node_modules", "dist"].includes(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else if (TEXT_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) files.push(full);
  }
  return files;
}

function sanitizeRoot() {
  let changed = 0;
  for (const file of walk(process.cwd())) {
    let source;
    try { source = fs.readFileSync(file, "utf8"); } catch { continue; }
    let next = source;
    for (const [bad, good] of REPLACEMENTS) next = next.split(bad).join(good);
    if (next !== source) {
      fs.writeFileSync(file, next, "utf8");
      changed++;
      console.log(`[AstroHogar sanitize] Corregido ${path.relative(process.cwd(), file)}`);
    }
  }
  console.log(`[AstroHogar sanitize] Archivos corregidos: ${changed}`);
}

function sanitizeDist() {
  const dist = path.join(process.cwd(), "dist");
  if (!fs.existsSync(dist)) return;
  let changed = 0;
  for (const file of walk(dist)) {
    let source;
    try { source = fs.readFileSync(file, "utf8"); } catch { continue; }
    let next = source;
    for (const [bad, good] of REPLACEMENTS) next = next.split(bad).join(good);
    if (next !== source) {
      fs.writeFileSync(file, next, "utf8");
      changed++;
      console.log(`[AstroHogar sanitize] Bundle corregido ${path.relative(process.cwd(), file)}`);
    }
  }
  console.log(`[AstroHogar sanitize] Bundles corregidos: ${changed}`);
}

sanitizeRoot();
if (process.argv.includes("--dist")) sanitizeDist();
