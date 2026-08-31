import fs from "node:fs";

function patch(path, transform, label) {
  const source = fs.readFileSync(path, "utf8");
  const next = transform(source);
  if (next !== source) {
    fs.writeFileSync(path, next, "utf8");
    console.log(`[AstroHogar placement] ${label}`);
  } else {
    console.log(`[AstroHogar placement] ${label}: no changes needed`);
  }
}

patch("src/components/HomeDashboard.tsx", (source) => {
  let next = source;

  // The onboarding build injects these near the top of HomeDashboard. Remove only those injections.
  next = next.replace(/import HomeEnvironmentStrip from \"\.\/HomeEnvironmentStrip\";\s*\n?/, "");
  next = next.replace(/import MiloLearningCard from \"\.\/MiloLearningCard\";\s*\n?/, "");
  next = next.replace(/\n\s*<HomeEnvironmentStrip home=\{home\} users=\{users\} activeUserId=\{activeUserId\} onRefreshAll=\{onRefreshAll\} \/>\s*\n\s*<MiloLearningCard home=\{home\} onRefreshAll=\{onRefreshAll\} \/>\s*/, "\n");

  // Re-add only the environment strip after the location/date block in the hero.
  next = next.replace(
    'import { Avatar } from "./Avatar";',
    'import { Avatar } from "./Avatar";\nimport HomeEnvironmentStrip from "./HomeEnvironmentStrip";',
    1
  );

  const locationDate = /(<div className=\"flex items-center gap-2 pt-2 border-t border-\[#F3EFE6\]\">[\s\S]*?<\/div>\s*<div className=\"flex items-center gap-2 text-\[10px\][\s\S]*?<\/div>)/;
  if (!next.includes('<HomeEnvironmentStrip home={home}')) {
    next = next.replace(locationDate, (block) => `${block}\n            <HomeEnvironmentStrip home={home} users={users} activeUserId={activeUserId} onRefreshAll={onRefreshAll} />`);
  }

  return next;
}, "HomeEnvironmentStrip moved below location/date; MiloLearningCard removed from Home");

patch("src/components/HomeEnvironmentStrip.tsx", (source) => {
  let next = source;
  next = next.replace(
    'className="rounded-2xl border border-amber-100 bg-amber-50/70 p-2.5"',
    'className="hidden rounded-2xl border border-amber-100 bg-amber-50/70 p-2.5"',
    1
  );
  next = next.replace(
    'className="rounded-2xl border border-violet-100 bg-violet-50/70 p-2.5"',
    'className="hidden rounded-2xl border border-violet-100 bg-violet-50/70 p-2.5"',
    1
  );
  return next;
}, "Sun and moon cards removed from the small Home environment strip");

console.log("[AstroHogar placement] Final placement pass complete.");
