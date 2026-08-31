import fs from "node:fs";

const chatPath = "src/components/GatitoAiChat.tsx";
let chat = fs.readFileSync(chatPath, "utf8");

if (!chat.includes('import MiloDailyQuestion from "./MiloDailyQuestion";')) {
  chat = chat.replace(
    'import { askGatitoChat } from "../api";',
    'import { askGatitoChat } from "../api";\nimport MiloDailyQuestion from "./MiloDailyQuestion";'
  );
}

const chatPanelMarker = '<div ref={containerRef}';
if (!chat.includes("<MiloDailyQuestion />") && chat.includes(chatPanelMarker)) {
  chat = chat.replace(
    chatPanelMarker,
    '<MiloDailyQuestion />\n\n      ' + chatPanelMarker,
    1
  );
}
fs.writeFileSync(chatPath, chat, "utf8");

const dashboardPath = "src/components/HomeDashboard.tsx";
let dashboard = fs.readFileSync(dashboardPath, "utf8");

if (!dashboard.includes('import HomePermissionsBar from "./HomePermissionsBar";')) {
  dashboard = dashboard.replace(
    'import { Avatar } from "./Avatar";',
    'import { Avatar } from "./Avatar";\nimport HomePermissionsBar from "./HomePermissionsBar";',
    1
  );
}
const locationRowEnd = `            </div>\n          </div>\n\n        {/* LADO DERECHO: FOTO DEL NIDO DE AMOR */}`;
if (!dashboard.includes('<HomePermissionsBar')) {
  dashboard = dashboard.replace(
    locationRowEnd,
    `            </div>\n            <HomePermissionsBar activeUser={activeUser} onRefreshAll={onRefreshAll} />\n          </div>\n\n        {/* LADO DERECHO: FOTO DEL NIDO DE AMOR */}`,
    1
  );
}
fs.writeFileSync(dashboardPath, dashboard, "utf8");

console.log("[AstroHogar] Milo daily question and permission controls attached.");
