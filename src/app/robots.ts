import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const configuredUrl = process.env.NEXT_PUBLIC_SITE_URL;
  let sitemapUrl: string | undefined;
  if (configuredUrl) {
    try {
      const base = new URL(configuredUrl);
      if (base.protocol === "https:" || base.protocol === "http:") sitemapUrl = new URL("/sitemap.xml", base).toString();
    } catch {
      sitemapUrl = undefined;
    }
  }
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/admin/", "/teacher", "/teacher/", "/student", "/student/", "/api/", "/login", "/register", "/forgot-password"],
    },
    ...(sitemapUrl ? { sitemap: sitemapUrl } : {}),
  };
}
