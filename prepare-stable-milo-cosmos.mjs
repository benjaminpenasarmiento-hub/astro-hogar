import fs from "node:fs";

const appPath = "src/App.tsx";
let app = fs.readFileSync(appPath, "utf8");

const replaceImport = (source, symbol, path) => {
  const re = new RegExp(`import\\s+${symbol}\\s+from\\s+[\"']\\.\\/components\\/[^\"']+[\"'];`);
  const next = `import ${symbol} from \"./components/${path}\";`;
  return re.test(source) ? source.replace(re, next) : `${next}\n${source}`;
};

app = replaceImport(app, "GatitoAiChat", "GatitoAiChatVoiceHome");
app = replaceImport(app, "CosmosModule", "CosmosModuleStable");

fs.writeFileSync(appPath, app, "utf8");
console.log("[AstroHogar] Milo and Cosmos imports forced to stable components.");
