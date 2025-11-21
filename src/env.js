import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    DATABASE_URL: z.string().url(),
    YOUTUBE_API_KEY: z.string(),
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    EVENT_DEBUG: z.string().optional(),
    
    // --- ADDED AS OPTIONAL ---
    SPOTIFY_CLIENT_ID: z.string().optional(),
    SPOTIFY_CLIENT_SECRET: z.string().optional(),
    // -------------------------
  },
  client: {
    NEXT_PUBLIC_APP_URL: z.string().url(),
    NEXT_PUBLIC_EVENT_DEBUG: z.string().optional(),
    NEXT_PUBLIC_MKP_APP_VER: z.string().default("0.0.0-BETA"),
    NEXT_PUBLIC_APPLAUSE_SOUND_CDN_URL: z.string().url().optional(), // <-- ADDED
  },
  runtimeEnv: {
    DATABASE_URL: process.env.DATABASE_URL,
    YOUTUBE_API_KEY: process.env.YOUTUBE_API_KEY,
    NODE_ENV: process.env.NODE_ENV,
    EVENT_DEBUG: process.env.EVENT_DEBUG,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_EVENT_DEBUG: process.env.NEXT_PUBLIC_EVENT_DEBUG,
    NEXT_PUBLIC_MKP_APP_VER: process.env.NEXT_PUBLIC_MKP_APP_VER,
    // --- MAP THE KEYS ---
    SPOTIFY_CLIENT_ID: process.env.SPOTIFY_CLIENT_ID,
    SPOTIFY_CLIENT_SECRET: process.env.SPOTIFY_CLIENT_SECRET,
    NEXT_PUBLIC_APPLAUSE_SOUND_CDN_URL: process.env.NEXT_PUBLIC_APPLAUSE_SOUND_CDN_URL, // <-- MAPPED
  },
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  emptyStringAsUndefined: true,
});
