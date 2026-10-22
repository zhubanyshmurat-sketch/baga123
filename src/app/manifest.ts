import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "StudentMind",
    short_name: "StudentMind",
    description: "Өзіңді түсін. Эмоцияларыңды басқар. Мақсатыңа жет! · Пойми себя. Управляй эмоциями. Достигай цели!",
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f7f8fc",
    theme_color: "#2eb5a6",
    lang: "kk",
    categories: ["health", "education", "lifestyle"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Шұғыл көмек · Срочная помощь", url: "/kk/help" },
      { name: "4-7-8", url: "/kk/exercises/breathing-478" },
    ],
  };
}
