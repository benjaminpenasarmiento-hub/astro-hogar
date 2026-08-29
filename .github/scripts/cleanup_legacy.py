from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[2]
server = ROOT / "serverStore.ts"
s = server.read_text(encoding="utf-8")

s = s.replace(
    'export function getActiveHomeCode(): string {\n  return homeContextStorage.getStore() || "HOGARPELUDO"; // fallback code during bootstrap\n}',
    'export function getActiveHomeCode(): string {\n  return homeContextStorage.getStore() || "";\n}'
)

s = s.replace(
    'export function normalizeHomeCode(code: string): string {\n  if (!code) return "NIDO-YCV5W";\n  let clean = code.toUpperCase().trim();\n  if (clean === "HOGARPELUDO" || clean === "HOGAR-PELUDO" || clean === "NIDO-HOGARPELUDO" || clean === "HOGAR PELUDO") {\n    return "NIDO-YCV5W";\n  }',
    'export function normalizeHomeCode(code: string): string {\n  let clean = String(code || "").toUpperCase().trim();\n  if (!clean) return "";\n  if (["HOGARPELUDO", "HOGAR-PELUDO", "NIDO-HOGARPELUDO", "HOGAR PELUDO", "NIDO-YCV5W"].includes(clean)) {\n    return "";\n  }'
)

needle = 'export function getStoreByCode(code: string): DBStore {\n  const cleanCode = normalizeHomeCode(code);'
replacement = 'const UNSCOPED_STORE: DBStore = JSON.parse(JSON.stringify(INITIAL_DATA));\n\nexport function getStoreByCode(code: string): DBStore {\n  const cleanCode = normalizeHomeCode(code);\n  if (!cleanCode) return UNSCOPED_STORE;'
s = s.replace(needle, replacement)

start = s.find('  // Dynamic seed / recovery for any home partition that has no users')
end = s.find('  // Ensure array structures exist without injecting mock data', start)
if start != -1 and end != -1:
    s = s[:start] + s[end:]
else:
    end2 = s.find('  // Ensure arrays exist for all keys without injecting mock data', start)
    if start != -1 and end2 != -1:
        s = s[:start] + s[end2:]

legacy_auth = "  // Allow Mafe and Benja by default for primary home\n  if (!isMember && (userId.toLowerCase() === 'mafe' || userId.toLowerCase() === 'benja' || userId.toLowerCase() === 'benjamín')) {\n    return true;\n  }\n"
s = s.replace(legacy_auth, '')
s = s.replace('  if (userId === "mafe") return "Mafe";\n  if (userId === "benja") return "Benja";\n', '')

old_save = '''export function saveToDisk() {\n  try {\n    fs.writeFileSync(DB_FILE, JSON.stringify(multiStore, null, 2), "utf8");\n    hasUnsyncedChanges = true;\n  } catch (err) {\n    console.error("Error saving database to disk db_sim.json:", err);\n  }'''
new_save = '''export function saveToDisk() {\n  if (process.env.NODE_ENV !== "production") {\n    try {\n      fs.writeFileSync(DB_FILE, JSON.stringify(multiStore, null, 2), "utf8");\n    } catch (err) {\n      console.error("Error saving local development database:", err);\n    }\n  }\n  hasUnsyncedChanges = true;'''
s = s.replace(old_save, new_save)

marker = '// Load all households from disk db_sim.json as Primary Source of Truth\nexport function loadDatabase() {'
if marker in s:
    i = s.index(marker)
    j = s.index('\nexport function normalizeHomeCode', i)
    replacement_load = '''// Load local development data only outside production.\nexport function loadDatabase() {\n  if (process.env.NODE_ENV === "production") {\n    multiStore = {};\n    return UNSCOPED_STORE;\n  }\n\n  try {\n    if (fs.existsSync(DB_FILE)) {\n      const content = fs.readFileSync(DB_FILE, "utf8");\n      const parsed = JSON.parse(content);\n      if (parsed && parsed.home && (parsed.home.id !== undefined || parsed.home.name !== undefined)) {\n        const code = normalizeHomeCode(parsed.home.code || "");\n        multiStore = code ? { [code]: sanitizeStoreData(parsed) } : {};\n      } else {\n        multiStore = parsed || {};\n      }\n    } else {\n      multiStore = {};\n    }\n  } catch (err) {\n    console.error("Error al cargar base local de desarrollo:", err);\n    multiStore = {};\n  }\n  return getStore();\n}\n'''
    s = s[:i] + replacement_load + s[j:]

# Ensure the sentinel is declared exactly once, even after repeated cleanup runs.
sentinel = 'const UNSCOPED_STORE: DBStore = JSON.parse(JSON.stringify(INITIAL_DATA));'
first = s.find(sentinel)
if first != -1:
    tail = s[first + len(sentinel):]
    tail = tail.replace(sentinel, '')
    s = s[:first + len(sentinel)] + tail
else:
    marker_get = 'export function getStoreByCode(code: string): DBStore {'
    idx = s.find(marker_get)
    if idx != -1:
        s = s[:idx] + sentinel + '\n\n' + s[idx:]

# Never resurrect a hard-coded household name for an unknown partition.
s = s.replace('multiStore[cleanCode].home.name = `Hogar de Mafe y Benjamin`;', 'multiStore[cleanCode].home.name = "";')

server.write_text(s, encoding="utf-8")

print("Legacy cleanup applied.")
