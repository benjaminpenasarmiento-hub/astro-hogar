import fs from "node:fs";

// Repair/wrap the smart-home dashboard injections made during the existing build preparation.
// The resulting JSX is intentionally normalized here so repeated Vercel builds remain idempotent.
const dashboardPath = "src/components/HomeDashboard.tsx";
let dashboardSource = fs.readFileSync(dashboardPath, "utf8");

const fragmentStart = 'return (\n    <>\n      <HomeEnvironmentStrip home={home} users={users} activeUserId={activeUserId} onRefreshAll={onRefreshAll} />';
const siblingStart = 'return (\n    <HomeEnvironmentStrip home={home} users={users} activeUserId={activeUserId} onRefreshAll={onRefreshAll} />';

if (dashboardSource.includes(siblingStart) && !dashboardSource.includes(fragmentStart)) {
  dashboardSource = dashboardSource.replace(
    siblingStart,
    fragmentStart,
    1
  );

  const closingNeedle = '\n  );\n}';
  const closingIndex = dashboardSource.lastIndexOf(closingNeedle);
  if (closingIndex === -1) throw new Error("No se encontró el cierre del HomeDashboard para cerrar el fragmento.");
  dashboardSource = dashboardSource.slice(0, closingIndex) + '\n    </>' + dashboardSource.slice(closingIndex);
}

fs.writeFileSync(dashboardPath, dashboardSource, "utf8");
console.log("[AstroHogar] Smart-home dashboard JSX normalized.");
