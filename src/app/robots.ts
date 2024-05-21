import type { MetadataRoute } from "next";
import { getUrl } from "~/utils/url";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/party/", "/join/"],
    },
    sitemap: getUrl("sitemap.xml"),
  };
}
