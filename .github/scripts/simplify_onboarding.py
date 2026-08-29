from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[2]
path = ROOT / "src/components/OnboardingWizard.tsx"
s = path.read_text(encoding="utf-8")

pattern = re.compile(r'  if \(flow === "choose"\) return \(.*?\n  \);\n\n  if \(flow === "enter"\)', re.S)
replacement = '''  if (flow === "choose") return (\n    <div className="min-h-screen w-full relative overflow-hidden bg-[#FAF7F2] flex items-center justify-center p-4 text-[#2C2723]">\n      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(245,158,11,0.12),transparent_34%),radial-gradient(circle_at_80%_80%,rgba(236,72,153,0.10),transparent_32%)]" />\n      <div className="relative z-10 w-full max-w-md rounded-[2.7rem] border-4 border-[#F3EFE6] bg-white/90 backdrop-blur-xl p-8 shadow-2xl text-center">\n        <div className="mx-auto mb-5 h-20 w-20 rounded-[1.7rem] bg-gradient-to-br from-amber-100 to-pink-100 flex items-center justify-center text-4xl shadow-inner">🐱</div>\n        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-amber-700">AstroHogar</p>\n        <h1 className="mt-2 text-3xl font-black tracking-tight">¿Cómo quieres comenzar?</h1>\n        <p className="mt-3 text-sm leading-6 text-[#776e67]">Tu cuenta de Google ya identifica quién eres. Ahora decide si quieres crear un nido nuevo o unirte al que te compartieron.</p>\n        <div className="mt-7 space-y-3">\n          <button onClick={() => { clearCreateState(); setFlow("create"); setStep(1); }} className="w-full rounded-2xl bg-[#2C2723] text-white px-5 py-4 text-sm font-black shadow-lg">✨ Fundar nuevo nido</button>\n          <button onClick={() => { setFlow("join"); setStep(1); resetError(); }} className="w-full rounded-2xl bg-[#FCFAF7] border border-[#E6DED2] px-5 py-4 text-sm font-black">🔗 Ingresar con código</button>\n        </div>\n      </div>\n    </div>\n  );\n\n  if (flow === "enter")'''
new_s, count = pattern.subn(replacement, s, count=1)
if count != 1:
    raise SystemExit("No se encontró la pantalla de selección del onboarding")

# El flujo ya no necesita una entrada duplicada para "volver al nido".
enter_pattern = re.compile(r'\n  if \(flow === "enter"\) return .*?;\n\n  if \(flow === "join"\)', re.S)
new_s, enter_count = enter_pattern.subn('\n  if (flow === "join")', new_s, count=1)
if enter_count != 1:
    raise SystemExit("No se pudo retirar el flujo duplicado de entrada por código")

path.write_text(new_s, encoding="utf-8")
print("Onboarding choice flow simplified.")
