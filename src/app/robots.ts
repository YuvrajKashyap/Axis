import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/how"],
      disallow: [
        "/api/",
        "/claude/",
        "/daily",
        "/designs/",
        "/domain/",
        "/domaindesign/",
        "/reset",
        "/signupdesign/",
      ],
    },
    sitemap: "https://axis.yuvrajkashyap.com/sitemap.xml",
  };
}
