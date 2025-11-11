import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  /**
   * Specify your server-side environment variables schema here. This way you can ensure the app
   * isn't built with invalid env vars.
   */
  server: {
    DATABASE_URL: z.string().url(),
    YOUTUBE_API_KEY: z.string(),
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    EVENT_DEBUG: z.string().optional(),
    // NEXT_PUBLIC_APP_URL removed from here
  },

  /**
   * Specify your client-side environment variables schema here. This way you can ensure the app
   * isn't built with invalid env vars. To expose them to the client, prefix them with
   * `NEXT_PUBLIC_`.
   */
  client: {
    // --- THIS IS THE FIX ---
    // NEXT_PUBLIC_APP_URL belongs in the client block.
    NEXT_PUBLIC_APP_URL: z.string().url(),
    // --- END THE FIX ---
    NEXT_PUBLIC_EVENT_DEBUG: z.string().optional(),
    NEXT_PUBLIC_MKP_APP_VER: z.string().default("0.0.0-BETA"),
  },

  /**
   * You can't destruct `process.env` as a regular object in the Next.js edge runtimes (e.g.
   * middlewares) or client-side so we need to destruct manually.
   */
  runtimeEnv: {
    DATABASE_URL: process.env.DATABASE_URL,
    YOUTUBE_API_KEY: process.env.YOUTUBE_API_KEY,
    NODE_ENV: process.env.NODE_ENV,
    EVENT_DEBUG: process.env.EVENT_DEBUG,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL, // This is correct
    NEXT_PUBLIC_EVENT_DEBUG: process.env.NEXT_PUBLIC_EVENT_DEBUG,
    NEXT_PUBLIC_MKP_APP_VER: process.env.NEXT_PUBLIC_MKP_APP_VER,
  },
  /**
   * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially
   * useful for Docker builds.
   */
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  /**
   * Makes it so that empty strings are treated as undefined. `SOME_VAR: z.string()` and
   * `SOME_VAR=''` will throw an error.
   */
  emptyStringAsUndefined: true,
});
