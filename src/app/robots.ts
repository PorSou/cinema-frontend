export default function robots() {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/api/"],
    },
    sitemap: "https://cinema-frontend-py8v.vercel.app/sitemap.xml",
  };
}
