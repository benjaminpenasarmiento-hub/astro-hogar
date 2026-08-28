import React from "react";

export interface CustomAvatar {
  id: string;
  name: string;
  emoji: string; // The standard emoji identifier/fallback
  colorLabel: string;
}

export const CUSTOM_AVATARS: CustomAvatar[] = [
  { id: "gamer_girl", name: "Gamer Girl 🎧", emoji: "👩‍🎤", colorLabel: "rosa neón" },
  { id: "gamer_boy", name: "Gamer Boy 🎮", emoji: "👨‍💻", colorLabel: "azul eléctrico" },
  { id: "cyber_hacker", name: "Hacker Neón 🕶️", emoji: "🕶️", colorLabel: "verde cyberpunk" },
  { id: "cosmic_wizard", name: "Mago Celestial 🧙‍♂️", emoji: "🧙‍♂️", colorLabel: "violeta cósmico" },
  { id: "space_pilot", name: "Piloto Xbox 🚀", emoji: "🚀", colorLabel: "verde xbox" },
  { id: "retro_pixel", name: "Pixel Hero 👾", emoji: "👾", colorLabel: "amarillo retro" },
  { id: "cat_cosmic", name: "Gatito Astral 🌌", emoji: "🌌", colorLabel: "púrpura celestial" },
  { id: "cat_ginger", name: "Gatito Sabio 👑", emoji: "🐈", colorLabel: "dorado imperial" }
];

export function getAvatarEmojiChar(emojiStr: string): string {
  const custom = CUSTOM_AVATARS.find(a => a.id === emojiStr);
  if (custom) return custom.emoji;
  if (emojiStr === "astronaut") return "👨‍🚀";
  if (emojiStr === "fairy_light") return "🧚‍♀️";
  return emojiStr || "🐱";
}

interface AvatarProps {
  emoji?: string;
  className?: string;
}

export function Avatar({ emoji = "🐱", className = "w-10 h-10" }: AvatarProps) {
  // If the stored string matches any of our custom avatar IDs, render the high-quality SVG
  const avatarId = emoji;

  const widthHeight = className;

  // Let's implement beautiful custom stylized SVGs for our avatars!
  if (avatarId === "gamer_girl") {
    return (
      <div className={`relative ${widthHeight} flex-shrink-0`}>
        <svg viewBox="0 0 100 100" className="w-[110%] h-[110%] absolute -top-[5%] -left-[5%] filter drop-shadow-[0_4px_8px_rgba(236,72,153,0.4)]">
          <defs>
            <linearGradient id="gradGamerGirl" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ec4899" />
              <stop offset="100%" stopColor="#6366f1" />
            </linearGradient>
            <linearGradient id="gradHair" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#f472b6" />
              <stop offset="100%" stopColor="#312e81" />
            </linearGradient>
          </defs>
          <circle cx="50" cy="50" r="46" fill="url(#gradGamerGirl)" />
          {/* Back Hair */}
          <path d="M 25,50 Q 15,70 25,90 L 75,90 Q 85,70 75,50 Z" fill="url(#gradHair)" />
          {/* Head */}
          <circle cx="50" cy="48" r="22" fill="#fed7aa" />
          {/* Cute Eyes & Blush */}
          <ellipse cx="42" cy="48" rx="2" ry="3" fill="#1e1b4b" />
          <ellipse cx="58" cy="48" rx="2" ry="3" fill="#1e1b4b" />
          <circle cx="37" cy="53" r="3" fill="#f43f5e" opacity="0.6" />
          <circle cx="63" cy="53" r="3" fill="#f43f5e" opacity="0.6" />
          <path d="M 47,53 Q 50,56 53,53" stroke="#1e1b4b" strokeWidth="1.5" fill="none" strokeLinecap="round" />
          {/* Hair Front bangs */}
          <path d="M 28,40 Q 50,22 72,40 Q 60,35 50,42 Q 40,35 28,40" fill="url(#gradHair)" />
          <path d="M 28,40 Q 30,55 33,65 M 72,40 Q 70,55 67,65" stroke="url(#gradHair)" strokeWidth="6" strokeLinecap="round" />
          {/* Cat-ear Gaming Headphones */}
          <path d="M 25,48 A 25,25 0 0,1 75,48" fill="none" stroke="#ffffff" strokeWidth="4.5" />
          {/* Glowing Ears on Headset */}
          <polygon points="28,26 21,12 36,20" fill="#f472b6" stroke="#ffffff" strokeWidth="1" />
          <polygon points="31,24 26,15 35,21" fill="#ec4899" />
          <polygon points="72,26 79,12 64,20" fill="#f472b6" stroke="#ffffff" strokeWidth="1" />
          <polygon points="69,24 74,15 65,21" fill="#ec4899" />
          {/* Headphone earcups */}
          <rect x="22" y="42" width="7" height="13" rx="3.5" fill="#1e1b4b" stroke="#ffffff" strokeWidth="1.5" />
          <rect x="71" y="42" width="7" height="13" rx="3.5" fill="#1e1b4b" stroke="#ffffff" strokeWidth="1.5" />
          {/* Headphone Mic */}
          <path d="M 26,53 Q 34,64 42,61" stroke="#ffffff" strokeWidth="1.5" fill="none" />
          <circle cx="42" cy="61" r="2.5" fill="#ec4899" />
          {/* Sparkles */}
          <circle cx="80" cy="78" r="2" fill="#fff" opacity="0.8" />
        </svg>
      </div>
    );
  }

  if (avatarId === "gamer_boy") {
    return (
      <div className={`relative ${widthHeight} flex-shrink-0`}>
        <svg viewBox="0 0 100 100" className="w-[110%] h-[110%] absolute -top-[5%] -left-[5%] filter drop-shadow-[0_4px_8px_rgba(59,130,246,0.4)]">
          <defs>
            <linearGradient id="gradGamerBoy" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#10b981" />
            </linearGradient>
          </defs>
          <circle cx="50" cy="50" r="46" fill="url(#gradGamerBoy)" />
          {/* Head */}
          <circle cx="50" cy="51" r="21" fill="#ffedd5" />
          {/* Confident Smile & Cheek Blush */}
          <path d="M 46,57 Q 50,63 54,57" stroke="#111827" strokeWidth="2" fill="none" strokeLinecap="round" />
          <circle cx="36" cy="55" r="2.5" fill="#ef4444" opacity="0.3" />
          <circle cx="64" cy="55" r="2.5" fill="#ef4444" opacity="0.3" />
          {/* Black Gamer Glasses */}
          <rect x="33" y="42" width="13" height="10" rx="3" fill="none" stroke="#111827" strokeWidth="2.5" />
          <rect x="54" y="42" width="13" height="10" rx="3" fill="none" stroke="#111827" strokeWidth="2.5" />
          <line x1="46" y1="46" x2="54" y2="46" stroke="#111827" strokeWidth="2.5" />
          {/* Cap (sideways/forward) */}
          <path d="M 28,38 C 28,26, 72,26, 72,38 Z" fill="#1e293b" />
          <path d="M 45,36 C 60,34, 85,41, 85,47 C 80,47, 50,42, 45,36 Z" fill="#06b6d4" /> {/* Cap Visor */}
          <circle cx="50" cy="30" r="2" fill="#06b6d4" />
          {/* Big Gaming Headphones */}
          <path d="M 26,50 A 24,24 0 0,1 74,50" fill="none" stroke="#06b6d4" strokeWidth="4" />
          <rect x="23" y="44" width="7" height="14" rx="3" fill="#1e293b" stroke="#ffffff" strokeWidth="1.2" />
          <rect x="70" y="44" width="7" height="14" rx="3" fill="#1e293b" stroke="#ffffff" strokeWidth="1.2" />
          {/* Xbox/Gaming Logo on Cap */}
          <circle cx="50" cy="33" r="3.5" fill="#10b981" />
          <path d="M 48,32 L 50,34 L 52,32" stroke="#1e293b" strokeWidth="1" fill="none" />
        </svg>
      </div>
    );
  }

  if (avatarId === "cyber_hacker") {
    return (
      <div className={`relative ${widthHeight} flex-shrink-0`}>
        <svg viewBox="0 0 100 100" className="w-[110%] h-[110%] absolute -top-[5%] -left-[5%] filter drop-shadow-[0_4px_8px_rgba(16,185,129,0.4)]">
          <defs>
            <linearGradient id="gradHacker" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#111827" />
              <stop offset="100%" stopColor="#064e3b" />
            </linearGradient>
          </defs>
          <circle cx="50" cy="50" r="46" fill="url(#gradHacker)" />
          {/* Hacker Hood */}
          <path d="M 22,90 C 22,65, 30,35, 50,35 C 70,35, 78,65, 78,90 Z" fill="#022c22" />
          <path d="M 28,90 C 28,68, 32,44, 50,44 C 68,44, 72,68, 72,90 Z" fill="#047857" />
          {/* Shadow Face under hood */}
          <ellipse cx="50" cy="62" rx="16" ry="17" fill="#061f18" />
          {/* Glowing Cyber Glasses (Neon Visor) */}
          <polygon points="36,54 64,54 68,62 32,62" fill="#10b981" />
          <line x1="32" y1="58" x2="68" y2="58" stroke="#ffffff" strokeWidth="1" opacity="0.7" />
          {/* Cyber code patterns background */}
          <text x="15" y="25" fill="#10b981" fontSize="6" fontFamily="monospace" opacity="0.3">01</text>
          <text x="75" y="28" fill="#10b981" fontSize="6" fontFamily="monospace" opacity="0.3">10</text>
          <text x="20" y="75" fill="#10b981" fontSize="5" fontFamily="monospace" opacity="0.2">f(x)</text>
          <text x="72" y="75" fill="#10b981" fontSize="5" fontFamily="monospace" opacity="0.2">log</text>
        </svg>
      </div>
    );
  }

  if (avatarId === "cosmic_wizard") {
    return (
      <div className={`relative ${widthHeight} flex-shrink-0`}>
        <svg viewBox="0 0 100 100" className="w-[110%] h-[110%] absolute -top-[5%] -left-[5%] filter drop-shadow-[0_4px_8px_rgba(139,92,246,0.4)]">
          <defs>
            <linearGradient id="gradWizard" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#4c1d95" />
              <stop offset="50%" stopColor="#8b5cf6" />
              <stop offset="100%" stopColor="#db2777" />
            </linearGradient>
          </defs>
          <circle cx="50" cy="50" r="46" fill="url(#gradWizard)" />
          {/* Magic Beard */}
          <path d="M 32,58 Q 50,92 68,58 Q 50,75 32,58" fill="#f5f5f4" />
          {/* Wizard Face */}
          <circle cx="50" cy="50" r="16" fill="#fecdd3" />
          {/* Wise Eyes */}
          <circle cx="44" cy="48" r="1.5" fill="#1e1b4b" />
          <circle cx="56" cy="48" r="1.5" fill="#1e1b4b" />
          <path d="M 47,53 Q 50,55 53,53" stroke="#1e1b4b" strokeWidth="1" fill="none" />
          {/* Wizard Hat */}
          <polygon points="18,44 82,44 50,12" fill="#311068" />
          <polygon points="24,42 76,42 50,16" fill="#581c87" />
          {/* Crescent Moon on Hat */}
          <path d="M 46,24 Q 50,28 54,24 Q 51,26 46,24" fill="#fde047" />
          {/* Hat Brim */}
          <ellipse cx="50" cy="44" rx="34" ry="4" fill="#fde047" />
          {/* Magic Stars around */}
          <polygon points="15,60 17,57 19,60 22,61 19,62 17,65 15,62 12,61" fill="#fde047" />
          <polygon points="80,62 82,59 84,62 87,63 84,64 82,67 80,64 77,63" fill="#fde047" />
        </svg>
      </div>
    );
  }

  if (avatarId === "space_pilot") {
    return (
      <div className={`relative ${widthHeight} flex-shrink-0`}>
        <svg viewBox="0 0 100 100" className="w-[110%] h-[110%] absolute -top-[5%] -left-[5%] filter drop-shadow-[0_4px_8px_rgba(16,185,129,0.5)]">
          <defs>
            <linearGradient id="gradPilot" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#064e3b" />
              <stop offset="100%" stopColor="#10b981" />
            </linearGradient>
            <linearGradient id="gradVisorPilot" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fbbf24" />
              <stop offset="100%" stopColor="#f59e0b" />
            </linearGradient>
          </defs>
          <circle cx="50" cy="50" r="46" fill="url(#gradPilot)" />
          {/* Tech lines */}
          <circle cx="50" cy="50" r="41" fill="none" stroke="#ffffff" strokeWidth="1" opacity="0.25" strokeDasharray="4 4" />
          {/* Space Helmet */}
          <circle cx="50" cy="50" r="23" fill="#ffffff" />
          <rect x="25" y="40" width="50" height="22" rx="11" fill="#ffffff" />
          {/* Glowing Golden Visor */}
          <rect x="29" y="43" width="42" height="16" rx="8" fill="url(#gradVisorPilot)" />
          {/* Shiny glaze on visor */}
          <path d="M 33,45 Q 50,42 67,45 C 65,47 35,47 33,45 Z" fill="#ffffff" opacity="0.6" />
          {/* Ear pads */}
          <rect x="22" y="44" width="5" height="14" rx="2" fill="#1e293b" />
          <rect x="73" y="44" width="5" height="14" rx="2" fill="#1e293b" />
          {/* Xbox Green glowing star */}
          <circle cx="50" cy="22" r="2.5" fill="#10b981" />
        </svg>
      </div>
    );
  }

  if (avatarId === "retro_pixel") {
    return (
      <div className={`relative ${widthHeight} flex-shrink-0`}>
        <svg viewBox="0 0 100 100" className="w-[110%] h-[110%] absolute -top-[5%] -left-[5%] filter drop-shadow-[0_4px_8px_rgba(245,158,11,0.4)]">
          <defs>
            <linearGradient id="gradPixel" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#d97706" />
              <stop offset="100%" stopColor="#1e1b4b" />
            </linearGradient>
          </defs>
          <circle cx="50" cy="50" r="46" fill="url(#gradPixel)" />
          {/* Grid lines background */}
          <line x1="20" y1="50" x2="80" y2="50" stroke="#f59e0b" strokeWidth="0.5" opacity="0.2" />
          <line x1="50" y1="20" x2="50" y2="80" stroke="#f59e0b" strokeWidth="0.5" opacity="0.2" />
          {/* Pixel Hero Head */}
          <rect x="32" y="32" width="36" height="36" fill="#fef08a" rx="4" />
          <rect x="36" y="36" width="28" height="28" fill="#fde047" rx="2" />
          {/* Blocky pixel glasses */}
          <rect x="30" y="42" width="12" height="10" fill="#111827" />
          <rect x="58" y="42" width="12" height="10" fill="#111827" />
          <rect x="42" y="45" width="16" height="4" fill="#111827" />
          {/* Visor shine */}
          <rect x="32" y="44" width="4" height="4" fill="#ffffff" />
          <rect x="60" y="44" width="4" height="4" fill="#ffffff" />
          {/* Pixel Red Cap */}
          <rect x="28" y="24" width="44" height="10" fill="#dc2626" />
          <rect x="40" y="20" width="20" height="6" fill="#dc2626" />
          {/* Cute Pixel Mouth */}
          <rect x="46" y="56" width="8" height="3" fill="#111827" />
        </svg>
      </div>
    );
  }

  if (avatarId === "cat_cosmic") {
    return (
      <div className={`relative ${widthHeight} flex-shrink-0 animate-pulse-slow`}>
        <svg viewBox="0 0 100 100" className="w-[110%] h-[110%] absolute -top-[5%] -left-[5%] filter drop-shadow-[0_4px_10px_rgba(147,51,234,0.35)]">
          <defs>
            <linearGradient id="gradCatCosmic" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#7c3aed" />
              <stop offset="100%" stopColor="#c084fc" />
            </linearGradient>
          </defs>
          <circle cx="50" cy="50" r="46" fill="url(#gradCatCosmic)" />
          {/* Constellations */}
          <circle cx="30" cy="25" r="1" fill="#fff" opacity="0.8" />
          <line x1="30" y1="25" x2="40" y2="20" stroke="#ffffff" strokeWidth="0.5" opacity="0.5" strokeDasharray="1 1" />
          <circle cx="40" cy="20" r="1.5" fill="#fff" />
          <line x1="40" y1="20" x2="48" y2="25" stroke="#ffffff" strokeWidth="0.5" opacity="0.5" strokeDasharray="1 1" />
          <circle cx="70" cy="30" r="1" fill="#fff" opacity="0.6" />
          {/* Sparks */}
          <polygon points="20,55 22,50 24,55 29,57 24,59 22,64 20,59 15,57" fill="#fde047" />
          <polygon points="75,65 76,62 77,65 80,66 77,67 76,70 75,67 72,66" fill="#fde047" />
          {/* Cat Ears */}
          <polygon points="22,40 38,15 42,42" fill="#581c87" />
          <polygon points="25,38 35,20 38,40" fill="#f472b6" />
          <polygon points="78,40 62,15 58,42" fill="#581c87" />
          <polygon points="75,38 65,20 62,40" fill="#f472b6" />
          {/* Cat Face background */}
          <path d="M 25 50 C 25 35, 75 35, 75 50 C 75 68, 25 68, 25 50" fill="#ffffff" />
          <path d="M 32 50 C 32 40, 68 40, 68 50 C 68 64, 32 64, 32 50" fill="#fdf4ff" />
          {/* Eyes */}
          <circle cx="42" cy="51" r="5" fill="#581c87" />
          <circle cx="43" cy="49" r="1.8" fill="#fff" />
          <circle cx="58" cy="51" r="5" fill="#581c87" />
          <circle cx="59" cy="49" r="1.8" fill="#fff" />
          {/* Cute cheeks */}
          <circle cx="34" cy="56" r="3" fill="#f472b6" opacity="0.7" />
          <circle cx="66" cy="56" r="3" fill="#f472b6" opacity="0.7" />
          {/* Nose & Mouth */}
          <polygon points="50,55 47,53 53,53" fill="#f472b6" />
          <path d="M 47,56 Q 50,59 50,57 Q 50,59 53,56" stroke="#581c87" strokeWidth="1.5" fill="none" strokeLinecap="round" />
          {/* Third eye (Moon crescent) on forehead */}
          <path d="M 47,38 Q 50,42 53,38 Q 51,40 47,38" fill="#fde047" />
        </svg>
      </div>
    );
  }

  if (avatarId === "cat_ginger") {
    return (
      <div className={`relative ${widthHeight} flex-shrink-0 animate-pulse-slow`}>
        <svg viewBox="0 0 100 100" className="w-[110%] h-[110%] absolute -top-[5%] -left-[5%] filter drop-shadow-[0_4px_10px_rgba(245,158,11,0.35)]">
          <defs>
            <linearGradient id="gradCatGinger" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#f43f5e" />
            </linearGradient>
          </defs>
          <circle cx="50" cy="50" r="46" fill="url(#gradCatGinger)" />
          {/* Little Crown */}
          <polygon points="40,24 43,14 50,20 57,14 60,24" fill="#fde047" stroke="#b45309" strokeWidth="1" />
          <circle cx="43" cy="13" r="1" fill="#fff" />
          <circle cx="50" cy="19" r="1" fill="#fff" />
          <circle cx="57" cy="13" r="1" fill="#fff" />
          {/* Cat Ears */}
          <polygon points="21,43 35,18 40,43" fill="#b45309" />
          <polygon points="24,41 32,23 36,41" fill="#fecdd3" />
          <polygon points="79,43 65,18 60,43" fill="#b45309" />
          <polygon points="76,41 68,23 64,41" fill="#fecdd3" />
          {/* Head */}
          <circle cx="50" cy="55" r="24" fill="#f97316" />
          {/* Muzzle white marks */}
          <path d="M 34,60 C 34,50 42,50 50,55 C 58,50 66,50 66,60 C 66,70 34,70 34,60 Z" fill="#fff" opacity="0.9" />
          {/* Eyes (big friendly eyes) */}
          <circle cx="41" cy="51" r="5.5" fill="#1e1b4b" />
          <circle cx="43" cy="49" r="2" fill="#fff" />
          <circle cx="59" cy="51" r="5.5" fill="#1e1b4b" />
          <circle cx="61" cy="49" r="2" fill="#fff" />
          {/* Rosy cheeks */}
          <circle cx="34" cy="57" r="2.5" fill="#f43f5e" opacity="0.6" />
          <circle cx="66" cy="57" r="2.5" fill="#f43f5e" opacity="0.6" />
          {/* Nose & Mouth */}
          <polygon points="50,55 48,53 52,53" fill="#f43f5e" />
          <path d="M 47,57 Q 50,60 50,58 Q 50,60 53,57" stroke="#1e1b4b" strokeWidth="1.5" fill="none" strokeLinecap="round" />
          {/* Sparkles */}
          <path d="M 16,30 L 22,30 M 19,27 L 19,33" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M 80,28 L 86,28 M 83,25 L 83,31" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </div>
    );
  }

  if (avatarId === "fox_cosmic") {
    return (
      <div className={`relative ${widthHeight} flex-shrink-0 animate-pulse-slow`}>
        <svg viewBox="0 0 100 100" className="w-[110%] h-[110%] absolute -top-[5%] -left-[5%] filter drop-shadow-[0_4px_10px_rgba(29,78,216,0.35)]">
          <defs>
            <linearGradient id="gradFoxCosmic" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1d4ed8" />
              <stop offset="100%" stopColor="#0ea5e9" />
            </linearGradient>
          </defs>
          <circle cx="50" cy="50" r="46" fill="url(#gradFoxCosmic)" />
          {/* Fox Ears - Triangular */}
          <polygon points="20,45 38,15 46,45" fill="#ea580c" />
          <polygon points="24,43 35,21 40,43" fill="#ffffff" />
          <polygon points="80,45 62,15 54,45" fill="#ea580c" />
          <polygon points="76,43 65,21 60,43" fill="#ffffff" />
          {/* Fox Face Geometric Shape */}
          <polygon points="24,48 76,48 50,82" fill="#f97316" />
          {/* White Cheeks cheeks */}
          <polygon points="24,48 40,48 50,66 32,66" fill="#ffffff" />
          <polygon points="76,48 60,48 50,66 68,66" fill="#ffffff" />
          {/* Nose tip */}
          <polygon points="47,78 53,78 50,83" fill="#1e293b" />
          {/* Wise closed eyes (smiling eyes) */}
          <path d="M 32,53 Q 37,50 42,53" stroke="#1e293b" strokeWidth="2" fill="none" strokeLinecap="round" />
          <path d="M 68,53 Q 63,50 58,53" stroke="#1e293b" strokeWidth="2" fill="none" strokeLinecap="round" />
          {/* Diamond on forehead */}
          <polygon points="50,33 53,38 50,43 47,38" fill="#e0f2fe" />
          <circle cx="50" cy="38" r="1" fill="#fff" />
          {/* Stars */}
          <circle cx="18" cy="65" r="1.5" fill="#fff" opacity="0.8" />
          <circle cx="82" cy="65" r="1.5" fill="#fff" opacity="0.8" />
        </svg>
      </div>
    );
  }

  if (avatarId === "panda_cosmic") {
    return (
      <div className={`relative ${widthHeight} flex-shrink-0 animate-pulse-slow`}>
        <svg viewBox="0 0 100 100" className="w-[110%] h-[110%] absolute -top-[5%] -left-[5%] filter drop-shadow-[0_4px_10px_rgba(13,148,136,0.35)]">
          <defs>
            <linearGradient id="gradPandaCosmic" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0f766e" />
              <stop offset="100%" stopColor="#2dd4bf" />
            </linearGradient>
          </defs>
          <circle cx="50" cy="50" r="46" fill="url(#gradPandaCosmic)" />
          {/* Ears */}
          <circle cx="28" cy="35" r="10" fill="#1e293b" />
          <circle cx="28" cy="35" r="6" fill="#0f766e" />
          <circle cx="72" cy="35" r="10" fill="#1e293b" />
          <circle cx="72" cy="35" r="6" fill="#0f766e" />
          {/* Head */}
          <circle cx="50" cy="58" r="23" fill="#ffffff" />
          {/* Panda Eyes patches */}
          <ellipse cx="41" cy="55" rx="6" ry="8" fill="#1e293b" transform="rotate(-15 41 55)" />
          <ellipse cx="59" cy="55" rx="6" ry="8" fill="#1e293b" transform="rotate(15 59 55)" />
          {/* Glowing Eyes */}
          <circle cx="41" cy="54" r="2.5" fill="#5eead4" />
          <circle cx="41" cy="53" r="1" fill="#fff" />
          <circle cx="59" cy="54" r="2.5" fill="#5eead4" />
          <circle cx="59" cy="53" r="1" fill="#fff" />
          {/* Nose & Mouth */}
          <ellipse cx="50" cy="62" rx="3.5" ry="2" fill="#1e293b" />
          <path d="M 47,65 Q 50,67 53,65" stroke="#1e293b" strokeWidth="1.5" fill="none" strokeLinecap="round" />
          {/* Cosmic Leaf */}
          <path d="M 72,64 C 72,55, 84,55, 84,64 Z" fill="#5eead4" />
          <line x1="72" y1="64" x2="84" y2="64" stroke="#0f766e" strokeWidth="1" />
        </svg>
      </div>
    );
  }

  if (avatarId === "owl_mystic") {
    return (
      <div className={`relative ${widthHeight} flex-shrink-0 animate-pulse-slow`}>
        <svg viewBox="0 0 100 100" className="w-[110%] h-[110%] absolute -top-[5%] -left-[5%] filter drop-shadow-[0_4px_10px_rgba(79,70,229,0.35)]">
          <defs>
            <linearGradient id="gradOwlMystic" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#4f46e5" />
              <stop offset="100%" stopColor="#818cf8" />
            </linearGradient>
          </defs>
          <circle cx="50" cy="50" r="46" fill="url(#gradOwlMystic)" />
          {/* Feathered Ears */}
          <polygon points="26,30 20,48 35,42" fill="#312e81" />
          <polygon points="74,30 80,48 65,42" fill="#312e81" />
          {/* Body/Head */}
          <ellipse cx="50" cy="58" rx="24" ry="22" fill="#4338ca" />
          {/* Big Owl Eyes */}
          <circle cx="39" cy="52" r="9" fill="#ffffff" />
          <circle cx="39" cy="52" r="6" fill="#1e1b4b" />
          <circle cx="40" cy="50" r="2.2" fill="#ffffff" />
          <circle cx="61" cy="52" r="9" fill="#ffffff" />
          <circle cx="61" cy="52" r="6" fill="#1e1b4b" />
          <circle cx="62" cy="50" r="2.2" fill="#ffffff" />
          {/* Golden Glasses Frames */}
          <circle cx="39" cy="52" r="10.5" fill="none" stroke="#f59e0b" strokeWidth="1.5" />
          <circle cx="61" cy="52" r="10.5" fill="none" stroke="#f59e0b" strokeWidth="1.5" />
          <line x1="49.5" y1="52" x2="50.5" y2="52" stroke="#f59e0b" strokeWidth="2" />
          {/* Beak */}
          <polygon points="50,56 46,62 54,62" fill="#f59e0b" />
          {/* Chest feathers pattern */}
          <path d="M 44,69 Q 50,73 56,69 M 41,74 Q 50,78 59,74" stroke="#818cf8" strokeWidth="1.5" fill="none" strokeLinecap="round" />
          {/* Magic spark */}
          <polygon points="50,22 52,27 57,29 52,31 50,36 48,31 43,29 48,27" fill="#fde047" />
        </svg>
      </div>
    );
  }

  if (avatarId === "lion_solar") {
    return (
      <div className={`relative ${widthHeight} flex-shrink-0 animate-pulse-slow`}>
        <svg viewBox="0 0 100 100" className="w-[110%] h-[110%] absolute -top-[5%] -left-[5%] filter drop-shadow-[0_4px_10px_rgba(217,119,6,0.35)]">
          <defs>
            <linearGradient id="gradLionSolar" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#d97706" />
              <stop offset="100%" stopColor="#f59e0b" />
            </linearGradient>
          </defs>
          <circle cx="50" cy="50" r="46" fill="url(#gradLionSolar)" />
          {/* Mane Rays (sun rays representation) */}
          <g stroke="#fef08a" strokeWidth="3" opacity="0.8">
            <line x1="50" y1="18" x2="50" y2="28" />
            <line x1="50" y1="82" x2="50" y2="72" />
            <line x1="18" y1="50" x2="28" y2="50" />
            <line x1="82" y1="50" x2="72" y2="50" />
            <line x1="27" y1="27" x2="35" y2="35" />
            <line x1="73" y1="73" x2="65" y2="65" />
            <line x1="73" y1="27" x2="65" y2="35" />
            <line x1="27" y1="73" x2="35" y2="65" />
          </g>
          {/* Ears */}
          <circle cx="34" cy="38" r="6" fill="#78350f" />
          <circle cx="66" cy="38" r="6" fill="#78350f" />
          {/* Lion Face */}
          <circle cx="50" cy="54" r="19" fill="#fef08a" />
          <circle cx="50" cy="54" r="17" fill="#fef08a" stroke="#d97706" strokeWidth="1" />
          {/* Closed confident eyes */}
          <path d="M 38,49 Q 43,46 45,51" stroke="#78350f" strokeWidth="2" fill="none" strokeLinecap="round" />
          <path d="M 62,49 Q 57,46 55,51" stroke="#78350f" strokeWidth="2" fill="none" strokeLinecap="round" />
          {/* Red nose & cheeks */}
          <polygon points="50,56 46,52 54,52" fill="#b45309" />
          <path d="M 47,59 Q 50,61 53,59" stroke="#78350f" strokeWidth="1.5" fill="none" strokeLinecap="round" />
          <circle cx="34" cy="55" r="2" fill="#ea580c" opacity="0.5" />
          <circle cx="66" cy="55" r="2" fill="#ea580c" opacity="0.5" />
        </svg>
      </div>
    );
  }

  if (avatarId === "unicorn_magic") {
    return (
      <div className={`relative ${widthHeight} flex-shrink-0 animate-pulse-slow`}>
        <svg viewBox="0 0 100 100" className="w-[110%] h-[110%] absolute -top-[5%] -left-[5%] filter drop-shadow-[0_4px_10px_rgba(219,39,119,0.35)]">
          <defs>
            <linearGradient id="gradUnicorn" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#db2777" />
              <stop offset="100%" stopColor="#e9d5ff" />
            </linearGradient>
          </defs>
          <circle cx="50" cy="50" r="46" fill="url(#gradUnicorn)" />
          {/* Magic Sparkles */}
          <polygon points="25,25 27,21 29,25 33,26 29,27 27,31 25,27 21,26" fill="#fde047" />
          <polygon points="75,25 76,21 77,25 80,26 77,27 76,31 75,27 72,26" fill="#fde047" />
          {/* Ear */}
          <polygon points="32,45 20,25 32,30" fill="#ffffff" />
          <polygon points="30,42 22,28 30,32" fill="#fbcfe8" />
          {/* Horse/Unicorn profile silhouette head */}
          <path d="M 30,44 Q 31,34 45,35 Q 55,36 60,42 Q 62,45 68,48 Q 74,52 75,58 Q 76,64 68,66 L 45,66 Q 32,66 30,44 Z" fill="#ffffff" />
          {/* Closed dreamy eye */}
          <path d="M 48,46 Q 52,43 54,48" stroke="#db2777" strokeWidth="2.2" fill="none" strokeLinecap="round" />
          <line x1="53" y1="47" x2="56" y2="45" stroke="#db2777" strokeWidth="1.5" strokeLinecap="round" />
          {/* Mane */}
          <path d="M 30,44 Q 25,52 35,56" fill="#fbcfe8" />
          <path d="M 31,52 Q 22,60 38,62" fill="#e9d5ff" />
          {/* Golden horn */}
          <polygon points="50,33 58,11 55,33" fill="#f59e0b" stroke="#fde047" strokeWidth="1" />
          {/* Sparkles of the horn */}
          <circle cx="58" cy="8" r="2" fill="#fff" />
          {/* Cheeks */}
          <circle cx="58" cy="54" r="3" fill="#f9a8d4" opacity="0.8" />
        </svg>
      </div>
    );
  }

  if (avatarId === "rabbit_moon") {
    return (
      <div className={`relative ${widthHeight} flex-shrink-0 animate-pulse-slow`}>
        <svg viewBox="0 0 100 100" className="w-[110%] h-[110%] absolute -top-[5%] -left-[5%] filter drop-shadow-[0_4px_10px_rgba(30,58,138,0.35)]">
          <defs>
            <linearGradient id="gradRabbitMoon" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1e3a8a" />
              <stop offset="100%" stopColor="#3b82f6" />
            </linearGradient>
          </defs>
          <circle cx="50" cy="50" r="46" fill="url(#gradRabbitMoon)" />
          {/* Golden Crescent Moon */}
          <path d="M 23,23 A 20,20 0 0,0 43,43 A 17,17 0 0,1 27,27 A 20,20 0 0,1 23,23 Z" fill="#fde047" />
          {/* Rabbit Ears */}
          <ellipse cx="40" cy="27" rx="6" ry="17" fill="#ffffff" transform="rotate(-10 40 27)" />
          <ellipse cx="40" cy="27" rx="3.5" ry="12" fill="#fbcfe8" transform="rotate(-10 40 27)" />
          <ellipse cx="58" cy="27" rx="6" ry="17" fill="#ffffff" transform="rotate(10 58 27)" />
          <ellipse cx="58" cy="27" rx="3.5" ry="12" fill="#fbcfe8" transform="rotate(10 58 27)" />
          {/* Rabbit Head */}
          <ellipse cx="49" cy="56" rx="20" ry="18" fill="#ffffff" />
          {/* Fluffy Cheeks */}
          <circle cx="34" cy="58" r="3.5" fill="#fecdd3" opacity="0.8" />
          <circle cx="64" cy="58" r="3.5" fill="#fecdd3" opacity="0.8" />
          {/* Eyes (closed happy) */}
          <path d="M 37,51 Q 41,48 43,51" stroke="#1e3a8a" strokeWidth="1.8" fill="none" strokeLinecap="round" />
          <path d="M 61,51 Q 57,48 55,51" stroke="#1e3a8a" strokeWidth="1.8" fill="none" strokeLinecap="round" />
          {/* Small mouth & nose */}
          <polygon points="49,54 47,52 51,52" fill="#f43f5e" />
          <path d="M 47,56 Q 49,58 51,56" stroke="#1e3a8a" strokeWidth="1" fill="none" />
        </svg>
      </div>
    );
  }

  if (avatarId === "astronaut") {
    return (
      <div className={`relative ${widthHeight} flex-shrink-0 animate-pulse-slow`}>
        <svg viewBox="0 0 100 100" className="w-[110%] h-[110%] absolute -top-[5%] -left-[5%] filter drop-shadow-[0_4px_10px_rgba(15,23,42,0.45)]">
          <defs>
            <linearGradient id="gradAstronaut" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0f172a" />
              <stop offset="100%" stopColor="#334155" />
            </linearGradient>
            <linearGradient id="gradVisor" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#3b82f6" />
              <stop offset="50%" stopColor="#8b5cf6" />
              <stop offset="100%" stopColor="#ec4899" />
            </linearGradient>
          </defs>
          <circle cx="50" cy="50" r="46" fill="url(#gradAstronaut)" />
          {/* Little Stars */}
          <circle cx="20" cy="30" r="1" fill="#fff" opacity="0.8" />
          <circle cx="80" cy="25" r="1.5" fill="#fff" opacity="0.5" />
          <circle cx="75" cy="70" r="1" fill="#fff" opacity="0.7" />
          {/* Helmet Body */}
          <rect x="24" y="32" width="52" height="46" rx="20" fill="#ffffff" />
          {/* Helmet Chest collar */}
          <rect x="36" y="74" width="28" height="10" rx="3" fill="#cbd5e1" />
          <rect x="44" y="74" width="12" height="6" fill="#ef4444" />
          {/* Visor */}
          <rect x="30" y="38" width="40" height="30" rx="12" fill="url(#gradVisor)" />
          {/* Visor Glare */}
          <path d="M 34,42 Q 50,39 66,42 Q 62,45 38,45 Z" fill="#ffffff" opacity="0.5" />
          {/* Little Twinkling Reflection */}
          <polygon points="56,52 57,48 58,52 62,53 58,54 57,58 56,54 52,53" fill="#ffffff" opacity="0.9" />
        </svg>
      </div>
    );
  }

  if (avatarId === "fairy_light") {
    return (
      <div className={`relative ${widthHeight} flex-shrink-0 animate-pulse-slow`}>
        <svg viewBox="0 0 100 100" className="w-[110%] h-[110%] absolute -top-[5%] -left-[5%] filter drop-shadow-[0_4px_10px_rgba(244,63,94,0.35)]">
          <defs>
            <linearGradient id="gradFairy" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fda4af" />
              <stop offset="100%" stopColor="#f43f5e" />
            </linearGradient>
          </defs>
          <circle cx="50" cy="50" r="46" fill="url(#gradFairy)" />
          {/* Silvery Wings */}
          <path d="M 45,50 C 35,35, 10,38, 25,55 C 35,60, 45,55, 45,50 Z" fill="#ffffff" opacity="0.6" stroke="#fff" strokeWidth="0.5" />
          <path d="M 55,50 C 65,35, 90,38, 75,55 C 65,60, 55,55, 55,50 Z" fill="#ffffff" opacity="0.6" stroke="#fff" strokeWidth="0.5" />
          {/* Lower Small Wings */}
          <path d="M 46,54 C 40,50, 22,55, 32,68 C 40,70, 46,60, 46,54 Z" fill="#ffffff" opacity="0.4" />
          <path d="M 54,54 C 60,50, 78,55, 68,68 C 60,70, 54,60, 54,54 Z" fill="#ffffff" opacity="0.4" />
          {/* Sparkles */}
          <polygon points="50,18 52,24 58,26 52,28 50,34 48,28 42,26 48,24" fill="#fff" />
          {/* Head & Body Silhouette */}
          <circle cx="50" cy="42" r="9" fill="#fff" />
          <path d="M 46,51 L 54,51 L 52,68 L 48,68 Z" fill="#fff" />
          {/* Floating magic spark particles */}
          <circle cx="28" cy="27" r="1.5" fill="#fde047" />
          <circle cx="72" cy="27" r="1.5" fill="#fde047" />
          <circle cx="80" cy="62" r="2" fill="#fff" />
          <circle cx="20" cy="62" r="2" fill="#fff" />
        </svg>
      </div>
    );
  }

  // FALLBACK: If emoji is a normal text emoji, render standard high-tier double-ring avatar badge
  return (
    <div className={`relative ${widthHeight} flex-shrink-0 flex items-center justify-center rounded-2xl bg-gradient-to-br from-amber-100 to-rose-100 border-2 border-amber-300 shadow-xs group transition-all`}>
      <span className="text-xl sm:text-2xl select-none group-hover:scale-115 transition-transform">{emoji}</span>
      <div className="absolute -inset-0.5 rounded-2xl border border-white/60 pointer-events-none"></div>
    </div>
  );
}
