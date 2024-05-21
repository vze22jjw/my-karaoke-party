import type { MetadataRoute } from "next";
import { getUrl } from "~/utils/url";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: getUrl("/"),
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 1,
    },
  ];
}
