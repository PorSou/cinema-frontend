export default function robots() {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/api/", "/login", "/register"],
    },
    sitemap: "https://www.porsou.store/sitemap.xml",
  };
}
