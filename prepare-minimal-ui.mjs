import fs from "node:fs";

const patch = (path, replacements) => {
  let source = fs.readFileSync(path, "utf8");
  const original = source;
  for (const [from, to] of replacements) {
    if (!source.includes(from)) {
      console.warn(`[AstroHogar minimal UI] No se encontró: ${from.slice(0, 70)}`);
      continue;
    }
    source = source.replace(from, to);
  }
  if (source !== original) fs.writeFileSync(path, source, "utf8");
};

patch("src/components/HomeDashboard.tsx", [
  [
    `                  {miloContextState?.harmonyScore && (\n                    <span className="text-[10px] font-extrabold px-2 py-0.5 bg-emerald-100 text-emerald-900 border border-emerald-200 rounded-full">\n                      Armonía: {miloContextState.harmonyScore}%\n                    </span>\n                  )}`,
    ""
  ],
  [
    `                <p className="text-xs sm:text-sm text-[#5C5552] italic leading-relaxed">\n                  "{dailyGreeting}"\n                </p>`,
    `                <p className="text-xs sm:text-sm text-[#5C5552] leading-relaxed">\n                  {(dailyGreeting || "Estoy aquí para acompañarte hoy.").replace(/^[\\s\\"“”]+|[\\s\\"“”]+$/g, "")}\n                </p>`
  ],
  [
    `                    Hola {users.length > 0 ? users.map(u => u.name).join(" & ") : "Inquilinos Cósmicos"}`,
    `                    Hola {users.length === 1 ? (activeUser.name || "hogar") : users.length > 1 ? users.map(u => u.name).join(" & ") : "Hogar"}`
  ]
]);

patch("src/components/HomeEnvironmentStrip.tsx", [
  [
    `          <div className="xl:col-span-2 rounded-2xl bg-[#FAF7F2] p-4">`,
    `          <div className="xl:col-span-2 rounded-2xl bg-[#FAF7F2] p-2.5 xl:order-last">`
  ],
  [
    `                <p className="text-base font-black text-[#2C2723] capitalize mt-1">{formattedDate}</p>`,
    `                <p className="text-xs font-black text-[#2C2723] capitalize mt-0.5">{formattedDate}</p>`
  ],
  [
    `                <p className="text-2xl font-black text-[#2C2723] mt-1 flex items-center gap-2"><Clock3 size={20}/>{formattedTime}</p>`,
    `                <p className="text-sm font-black text-[#2C2723] mt-0.5 flex items-center gap-1"><Clock3 size={14}/>{formattedTime}</p>`
  ]
]);

console.log("[AstroHogar minimal UI] Only requested visual changes applied.");
