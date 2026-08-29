import fs from "node:fs";

const path = "prepare-milo-build.mjs";
let source = fs.readFileSync(path, "utf8");

const bad = '${isSpeaking ? " · Milo habla" : ""}';
const good = '\\${isSpeaking ? " · Milo habla" : ""}';
if (source.includes(bad)) {
  source = source.replace(bad, good);
  fs.writeFileSync(path, source, "utf8");
  console.log("[AstroHogar] Sanitized Milo voice template interpolation.");
}
