export type SubThemePill = {
  id: string;
  name: string;
  promptGuide: string;
  iconName?: string;
};

export type ThemeCategory = {
  id: string;
  name: string;
  iconName: string;
  pills: SubThemePill[];
  isCustom?: boolean;
};

export const THEME_CATEGORIES: ThemeCategory[] = [
  {
    id: "trending",
    name: "Trending",
    iconName: "TrendingUp",
    pills: [
      {
        id: "trending-hits",
        name: "Trending Hits",
        promptGuide: "Viral, energetic, and top trending karaoke crowd-pleasers and chart-toppers right now",
        iconName: "Flame",
      },
    ],
  },
  {
    id: "vocalists",
    name: "♂ ♀ Vocals",
    iconName: "Users",
    pills: [
      {
        id: "male-icons",
        name: "Males",
        promptGuide: "Iconic male pop, rock, and soul vocalists and frontmen karaoke anthems",
        iconName: "Mic2",
      },
      {
        id: "divas",
        name: "Divas",
        promptGuide: "Powerhouse female vocalists, pop divas, and soul queens karaoke anthems",
        iconName: "Crown",
      },
      {
        id: "duets",
        name: "Duets",
        promptGuide: "Famous karaoke duets, two-singer harmonies, and collaborative party songs",
        iconName: "Users",
      },
    ],
  },
  {
    id: "holidays",
    name: "Holidays",
    iconName: "Gift",
    pills: [
      {
        id: "christmas",
        name: "Christmas",
        promptGuide: "Holiday and Christmas party karaoke classics and festive winter singalongs",
        iconName: "Snowflake",
      },
      {
        id: "halloween",
        name: "Halloween",
        promptGuide: "Spooky, energetic Halloween party karaoke favorites and dark anthems",
        iconName: "Ghost",
      },
    ],
  },
  {
    id: "decades",
    name: "Decades",
    iconName: "Disc",
    pills: [
      {
        id: "70s",
        name: "70's",
        promptGuide: "Classic 1970s disco, glam rock, funk, and classic rock singalongs",
        iconName: "Radio",
      },
      {
        id: "80s",
        name: "80's",
        promptGuide: "Iconic 1980s pop, synthpop, new wave, and arena rock karaoke singalongs",
        iconName: "Disc",
      },
      {
        id: "90s",
        name: "90's",
        promptGuide: "Top 1990s pop, boybands, R&B, Britpop, and alternative rock karaoke hits",
        iconName: "Radio",
      },
      {
        id: "00s",
        name: "00's",
        promptGuide: "2000s millennial pop, pop-punk, hip-hop hooks, and R&B karaoke anthems",
        iconName: "Zap",
      },
      {
        id: "10s",
        name: "10's",
        promptGuide: "2010s modern pop, EDM crossovers, and global karaoke singalong hits",
        iconName: "Sparkles",
      },
    ],
  },
  {
    id: "rock",
    name: "Rock",
    iconName: "Flame",
    pills: [
      {
        id: "hard-rock",
        name: "Hard Rock",
        promptGuide: "High-energy classic hard rock and arena anthem karaoke favorites",
        iconName: "Flame",
      },
      {
        id: "alternative",
        name: "Alternative",
        promptGuide: "90s and 2000s grunge, indie rock, and alternative rock karaoke classics",
        iconName: "Zap",
      },
      {
        id: "metal",
        name: "Metal",
        promptGuide: "Heavy metal, hair metal, and headbanging karaoke anthems",
        iconName: "Music",
      },
    ],
  },
  {
    id: "hiphop",
    name: "Hip-Hop",
    iconName: "Mic",
    pills: [
      {
        id: "hiphop-groups",
        name: "Groups",
        promptGuide: "Classic hip-hop groups, crews, and collaborative rap party singalongs",
        iconName: "Users",
      },
      {
        id: "b-boys",
        name: "B-Boys",
        promptGuide: "Golden era 80s and 90s boom-bap, old school hip-hop, and breakbeat karaoke hits",
        iconName: "Radio",
      },
      {
        id: "ladies-hiphop",
        name: "Ladies",
        promptGuide: "Iconic female MCs and powerhouse women of hip-hop karaoke anthems",
        iconName: "Crown",
      },
    ],
  },
  {
    id: "movies-theater",
    name: "Movies & Theater",
    iconName: "Clapperboard",
    pills: [
      {
        id: "disney",
        name: "Disney",
        promptGuide: "Beloved Disney animated classics, princess songs, and family singalongs",
        iconName: "Sparkles",
      },
      {
        id: "movies",
        name: "Movies",
        promptGuide: "Iconic movie soundtrack hits, cinematic power ballads, and blockbuster film songs",
        iconName: "Film",
      },
      {
        id: "broadway",
        name: "Broadway",
        promptGuide: "Broadway, West End, and musical theater showstoppers and dramatic karaoke hits",
        iconName: "Theater",
      },
    ],
  },
  {
    id: "international",
    name: "International",
    iconName: "Globe",
    pills: [
      {
        id: "kpop",
        name: "K-Pop",
        promptGuide: "Global K-Pop sensations, viral dance tracks, iconic girl groups and boybands",
        iconName: "Sparkles",
      },
      {
        id: "jpop",
        name: "J-Pop",
        promptGuide: "J-Pop, anime opening themes, City Pop, and Japanese karaoke classics",
        iconName: "Music",
      },
      {
        id: "reggaeton",
        name: "Reggaeton",
        promptGuide: "High-energy Latin pop, reggaeton, and tropical dance karaoke hits",
        iconName: "Flame",
      },
      {
        id: "caribbean",
        name: "Caribbean",
        promptGuide: "Reggae, dancehall, soca, and Caribbean feel-good party singalongs",
        iconName: "Sun",
      },
    ],
  },
  {
    id: "custom-vibe",
    name: "Custom Vibe",
    iconName: "Wand2",
    isCustom: true,
    pills: [],
  },
];

// Helper to flatten all preset pills for backend pre-caching and lookup
export const ALL_PRESET_PILLS: SubThemePill[] = THEME_CATEGORIES.flatMap((c) => c.pills);

export function getPresetPillById(pillId: string): SubThemePill | undefined {
  return ALL_PRESET_PILLS.find((p) => p.id === pillId);
}
