import type { MetadataRoute } from "next"

export default function robots(): MetadataRoute.Robots {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
  const isProd = process.env.NODE_ENV === "production"

  return {
    rules: isProd
      ? {
          userAgent: "*",
          allow: "/",
        }
      : {
          userAgent: "*",
          disallow: "/",
        },
    sitemap: `${appUrl}/sitemap.xml`,
  }
}
