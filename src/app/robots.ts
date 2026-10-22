import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/kk/admin", "/ru/admin", "/kk/me", "/ru/me", "/kk/auth", "/ru/auth", "/auth/"] }],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
