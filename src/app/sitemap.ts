import type { MetadataRoute } from "next";

// Set NEXT_PUBLIC_SITE_URL to the school's verified public domain to enable absolute sitemap URLs.
export default function sitemap(): MetadataRoute.Sitemap {
  const configuredUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (!configuredUrl) return [];
  let base: URL;
  try { base = new URL(configuredUrl); } catch { return []; }
  if (base.protocol !== "https:" && base.protocol !== "http:") return [];
  const publicRoutes = ["/", "/about", "/classes", "/teachers", "/notices", "/gallery", "/admissions", "/contact"];
  return publicRoutes.map((route) => ({
    url: new URL(route, base).toString(),
    changeFrequency: "weekly",
    priority: route === "/" ? 1 : 0.7,
  }));
}
