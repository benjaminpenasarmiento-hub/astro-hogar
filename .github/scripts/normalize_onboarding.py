from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]

wizard = ROOT / "src/components/OnboardingWizard.tsx"
s = wizard.read_text(encoding="utf-8")

# New users should enter the profile flow directly after Google authentication.
s = s.replace('const [flow, setFlow] = useState<Flow>("choose");', 'const [flow, setFlow] = useState<Flow>("create");')

# Keep a compact invitation link available inside the profile flow without restoring a chooser screen.
needle = '<button onClick={createHome} disabled={isProcessing} className={primary}>{isProcessing?"Milo está conociéndote... 🐾":"Conocerme y despertar a Milo →"}</button>'
replacement = needle + '<button type="button" onClick={() => { setFlow("join"); setStep(1); resetError(); }} className="mx-auto block text-xs font-black text-amber-700 underline underline-offset-4">Tengo un código de invitación</button>'
s = s.replace(needle, replacement)

# Never ask for a household name during onboarding; it is a system-generated identity.
s = s.replace('homeName: "AstroHogar", userName:', 'homeName: "", userName:')

# Use the authenticated account directly instead of a duplicated local email field.
s = s.replace('const authEmail = localStorage.getItem("astro_auth_email") || "";', 'const authEmail = window.__ASTRO_AUTH_EMAIL__ || localStorage.getItem("astro_auth_email") || "";')

wizard.write_text(s, encoding="utf-8")

# Remove the obsolete click hook that existed only for the deleted chooser screen.
main = ROOT / "src/main.tsx"
m = main.read_text(encoding="utf-8")
start = m.find('  window.addEventListener("click", (event) => {')
if start != -1:
    end = m.find('\n  });', start)
    if end != -1:
        end += len('\n  });')
        m = m[:start] + m[end:]
main.write_text(m, encoding="utf-8")

print("Automatic Google onboarding normalized.")
