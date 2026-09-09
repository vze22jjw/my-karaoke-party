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
        promptGuide: "viral hits, modern pop, and chart music right now",
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
        promptGuide: "male pop, rock, and soul vocalists and frontmen",
        iconName: "Mic2",
      },
      {
        id: "divas",
        name: "Divas",
        promptGuide: "powerhouse female vocalists, pop divas, and soul queens",
        iconName: "Crown",
      },
      {
        id: "duets",
        name: "Duets",
        promptGuide: "two-singer harmonies, male-female duets, and collaborative tracks",
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
        promptGuide: "holiday, christmas party, and festive winter tracks",
        iconName: "Snowflake",
      },
      {
        id: "halloween",
        name: "Halloween",
        promptGuide: "spooky, dark, and energetic halloween party tracks",
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
        promptGuide: "1970s disco, funk, glam rock, and classic rock",
        iconName: "Radio",
      },
      {
        id: "80s",
        name: "80's",
        promptGuide: "1980s pop, synthpop, new wave, and arena rock",
        iconName: "Disc",
      },
      {
        id: "90s",
        name: "90's",
        promptGuide: "1990s pop, boybands, r&b, britpop, and alternative rock",
        iconName: "Radio",
      },
      {
        id: "00s",
        name: "00's",
        promptGuide: "2000s millennial pop, pop-punk, hip-hop hooks, and r&b",
        iconName: "Zap",
      },
      {
        id: "10s",
        name: "10's",
        promptGuide: "2010s modern pop, edm crossovers, and global hits",
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
        promptGuide: "classic hard rock, heavy guitar riffs, and arena bands",
        iconName: "Flame",
      },
      {
        id: "alternative",
        name: "Alternative",
        promptGuide: "90s and 2000s grunge, indie rock, and alternative bands",
        iconName: "Zap",
      },
      {
        id: "metal",
        name: "Metal",
        promptGuide: "heavy metal, hair metal, and headbanging tracks",
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
        promptGuide: "hip-hop groups, rap crews, and collaborative tracks",
        iconName: "Users",
      },
      {
        id: "b-boys",
        name: "B-Boys",
        promptGuide: "80s and 90s boom-bap, old school hip-hop, and breakbeats",
        iconName: "Radio",
      },
      {
        id: "ladies-hiphop",
        name: "Ladies",
        promptGuide: "female mcs, women of hip-hop, and rap queens",
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
        promptGuide: "disney animated movies, princess songs, and family soundtracks",
        iconName: "Sparkles",
      },
      {
        id: "movies",
        name: "Movies",
        promptGuide: "movie soundtrack hits, cinematic power ballads, and film themes",
        iconName: "Film",
      },
      {
        id: "broadway",
        name: "Broadway",
        promptGuide: "broadway, west end, and musical theater showstoppers",
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
        promptGuide: "k-pop girl groups, boybands, and viral korean dance tracks",
        iconName: "Sparkles",
      },
      {
        id: "jpop",
        name: "J-Pop",
        promptGuide: "j-pop, anime opening themes, and city pop",
        iconName: "Music",
      },
      {
        id: "reggaeton",
        name: "Reggaeton",
        promptGuide: "latin pop, reggaeton, and tropical dance beats",
        iconName: "Flame",
      },
      {
        id: "caribbean",
        name: "Caribbean",
        promptGuide: "reggae, dancehall, soca, and caribbean party music",
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
