export default function sitemap() {
  const base = "https://www.porsou.store/";
  return [
    { url: base, lastModified: new Date() },
    { url: `${base}/REAL-MOVIES-PATH`, lastModified: new Date() },
    { url: `${base}/REAL-CINEMAS-PATH`, lastModified: new Date() },
  ];
}
