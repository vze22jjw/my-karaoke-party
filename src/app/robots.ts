import type { MetadataRoute } from "next";
import { env } from "~/env";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = env.NEXT_PUBLIC_APP_URL ?? "https://www.mykaraoke.party";

  return {
    rules: {
      userAgent: "*",
      allow: "/$",
      disallow: "/",
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}