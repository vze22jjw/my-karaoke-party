import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    DATABASE_URL: z.string().url(),
    YOUTUBE_API_KEY: z.string(),
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    EVENT_DEBUG: z.string().optional(),
    SPOTIFY_CLIENT_ID: z.string().optional(),
    SPOTIFY_CLIENT_SECRET: z.string().optional(),
    PORT: z.string().optional(),
    ADMIN_TOKEN: z.string(),
  },
  client: {
    NEXT_PUBLIC_APP_URL: z.string().url().optional(),
    NEXT_PUBLIC_EVENT_DEBUG: z.string().optional(),
    NEXT_PUBLIC_MKP_APP_VER: z.string().default("0.0.0-BETA"),
    NEXT_PUBLIC_APPLAUSE_SOUND_CDN_URL: z.string().optional(),
    NEXT_PUBLIC_BUILD_DATE: z.string().optional(),
    NEXT_PUBLIC_GIT_COMMIT_SHA: z.string().optional(),
    // NEW: Default Locale (defaulting to 'en')
    NEXT_PUBLIC_DEFAULT_LOCALE: z.string().default("en"),
    // NEW: Show Footer (defaulting to 'true')
    NEXT_PUBLIC_SHOW_FOOTER: z.string().default("true"),
  },
  runtimeEnv: {
    DATABASE_URL: process.env.DATABASE_URL,
    YOUTUBE_API_KEY: process.env.YOUTUBE_API_KEY,
    NODE_ENV: process.env.NODE_ENV,
    EVENT_DEBUG: process.env.EVENT_DEBUG,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_EVENT_DEBUG: process.env.NEXT_PUBLIC_EVENT_DEBUG,
    NEXT_PUBLIC_MKP_APP_VER: process.env.NEXT_PUBLIC_MKP_APP_VER,
    SPOTIFY_CLIENT_ID: process.env.SPOTIFY_CLIENT_ID,
    SPOTIFY_CLIENT_SECRET: process.env.SPOTIFY_CLIENT_SECRET,
    PORT: process.env.PORT,
    ADMIN_TOKEN: process.env.ADMIN_TOKEN,
    NEXT_PUBLIC_APPLAUSE_SOUND_CDN_URL: process.env.NEXT_PUBLIC_APPLAUSE_SOUND_CDN_URL,
    NEXT_PUBLIC_BUILD_DATE: process.env.NEXT_PUBLIC_BUILD_DATE,
    NEXT_PUBLIC_GIT_COMMIT_SHA: process.env.NEXT_PUBLIC_GIT_COMMIT_SHA,
    // NEW ENV VARS
    NEXT_PUBLIC_DEFAULT_LOCALE: process.env.NEXT_PUBLIC_DEFAULT_LOCALE,
    NEXT_PUBLIC_SHOW_FOOTER: process.env.NEXT_PUBLIC_SHOW_FOOTER,
  },
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  emptyStringAsUndefined: true,
});
