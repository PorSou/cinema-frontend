export default function sitemap() {
  const base = "https://cinema-frontend-py8v.vercel.app";
  return [
    { url: base, lastModified: new Date() },
    { url: `${base}/REAL-MOVIES-PATH`, lastModified: new Date() },
    { url: `${base}/REAL-CINEMAS-PATH`, lastModified: new Date() },
  ];
}
