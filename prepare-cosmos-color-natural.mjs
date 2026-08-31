import fs from "node:fs";

const path = "src/components/CosmosModule.tsx";
let source = fs.readFileSync(path, "utf8");

const replacements = [
  ["return { hex: \"#EF4444\", name: \"Rojo\" }", "return { hex: \"#B85C4A\", name: \"Terracota rojo\" }"],
  ["return { hex: \"#EAB308\", name: \"Amarillo\" }", "return { hex: \"#C7A94A\", name: \"Mostaza suave\" }"],
  ["return { hex: \"#1D4ED8\", name: \"Azul marino\" }", "return { hex: \"#466A86\", name: \"Azul petróleo suave\" }"],
  ["return { hex: \"#0EA5E9\", name: \"Azul claro\" }", "return { hex: \"#79A9C2\", name: \"Azul cielo suave\" }"],
  ["return { hex: \"#15803D\", name: \"Verde oscuro\" }", "return { hex: \"#527A59\", name: \"Verde salvia profundo\" }"],
  ["return { hex: \"#10B981\", name: \"Verde claro\" }", "return { hex: \"#7FA77B\", name: \"Verde salvia\" }"],
  ["return { hex: \"#EC4899\", name: \"Rosa\" }", "return { hex: \"#C98F9E\", name: \"Rosa viejo\" }"],
  ["return { hex: \"#F97316\", name: \"Naranja\" }", "return { hex: \"#C9794D\", name: \"Terracota\" }"],
  ["return { hex: \"#8B5CF6\", name: \"Morado\" }", "return { hex: \"#8C7AAE\", name: \"Lavanda profunda\" }"],
  ["return { hex: \"#F8FAFC\", name: \"Blanco\" }", "return { hex: \"#F1E9D8\", name: \"Marfil cálido\" }"],
  ["return { hex: \"#F59E0B\", name: \"Dorado\" }", "return { hex: \"#C79A52\", name: \"Dorado suave\" }"],
  ["return { hex: \"#9CA3AF\", name: \"Plateado\" }", "return { hex: \"#9A9388\", name: \"Peltre suave\" }"],
  ["return { hex: \"#B45309\", name: \"Café\" }", "return { hex: \"#956B4D\", name: \"Café canela\" }"],
  ["Vestimenta y Color de Poder", "Color recomendado para ti hoy"],
  ["Tu color de poder hoy", "Tu color recomendado hoy"]
];

for (const [from, to] of replacements) source = source.replaceAll(from, to);

fs.writeFileSync(path, source, "utf8");
console.log("[AstroHogar] Cosmos: colores personales suavizados y orientados al estilo natural.");
