import fs from "node:fs";

const path = "serverStore.ts";
const source = fs.readFileSync(path, "utf8");
const declaration = "const UNSCOPED_STORE: DBStore = JSON.parse(JSON.stringify(INITIAL_DATA));";

// Deterministically remove every generated declaration, then restore exactly one
// immediately before getStoreByCode so the server bundle can never contain duplicates.
let next = source.split(declaration).join("");
const anchor = "export function getStoreByCode(code: string): DBStore {";
if (!next.includes(anchor)) throw new Error("No se encontró getStoreByCode en serverStore.ts");
next = next.replace(anchor, `${declaration}\n\n${anchor}`);

fs.writeFileSync(path, next, "utf8");
console.log("[AstroHogar] serverStore.ts normalizado: una sola UNSCOPED_STORE.");
