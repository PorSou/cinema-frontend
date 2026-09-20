export default function robots() {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/api/", "/login", "/register"],
    },
    sitemap: "https://cinema-frontend-py8v.vercel.app/sitemap.xml",
  };
}
