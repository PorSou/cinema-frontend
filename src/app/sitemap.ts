export default function sitemap() {
  const base = "https://cinema-frontend-py8v.vercel.app";
  return [
    { url: base, lastModified: new Date() },
    { url: `${base}/movies`, lastModified: new Date() },
    { url: `${base}/cinemas`, lastModified: new Date() },
  ];
}
