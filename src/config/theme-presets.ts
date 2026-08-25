export type ThemePreset = {
  id: string;
  labelKey: string;
  defaultLabel: string;
  icon: string;
  prompt: string;
};

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: "80s",
    labelKey: "guest.history.themes.80s",
    defaultLabel: "80's Classics",
    icon: "Disc",
    prompt: "Iconic 1980s pop, synthpop, new wave, and rock karaoke singalongs",
  },
  {
    id: "90s",
    labelKey: "guest.history.themes.90s",
    defaultLabel: "90's Throwback",
    icon: "Radio",
    prompt: "Top 1990s pop, boybands, R&B, Britpop, and alternative rock karaoke hits",
  },
  {
    id: "00s",
    labelKey: "guest.history.themes.00s",
    defaultLabel: "2000's Pop",
    icon: "Zap",
    prompt: "Memorable 2000-2009 pop, hip-hop, and party karaoke classics",
  },
  {
    id: "male",
    labelKey: "guest.history.themes.male",
    defaultLabel: "Male Hits",
    icon: "Mic2",
    prompt: "Top karaoke songs by male solo artists and male-fronted bands",
  },
  {
    id: "divas",
    labelKey: "guest.history.themes.divas",
    defaultLabel: "Pop Divas",
    icon: "Crown",
    prompt: "Powerful female vocalists, pop divas, and dance karaoke anthems",
  },
  {
    id: "duets",
    labelKey: "guest.history.themes.duets",
    defaultLabel: "Duets",
    icon: "Users",
    prompt: "Famous karaoke duets, two-singer harmonies, and collaborative party songs",
  },
  {
    id: "rock",
    labelKey: "guest.history.themes.rock",
    defaultLabel: "Rock Bangers",
    icon: "Flame",
    prompt: "High-energy classic rock, hard rock, and arena anthem karaoke favorites",
  },
  {
    id: "disney",
    labelKey: "guest.history.themes.disney",
    defaultLabel: "Disney & Soundtracks",
    icon: "Sparkles",
    prompt: "Beloved Disney classics, animated movie songs, and musical theater karaoke hits",
  },
  {
    id: "christmas",
    labelKey: "guest.history.themes.christmas",
    defaultLabel: "Holiday / Xmas",
    icon: "Snowflake",
    prompt: "Festive Christmas and holiday party karaoke classics",
  },
];
