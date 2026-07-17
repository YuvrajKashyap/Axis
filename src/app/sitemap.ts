import type { MetadataRoute } from "next";

const baseUrl = "https://axis.yuvrajkashyap.com";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: baseUrl,
      changeFrequency: "weekly",
      priority: 1,
      images: [`${baseUrl}/showcase/axis-orrery.png`],
    },
    {
      url: `${baseUrl}/how`,
      changeFrequency: "monthly",
      priority: 0.8,
      images: [`${baseUrl}/showcase/how-it-works.png`],
    },
  ];
}
