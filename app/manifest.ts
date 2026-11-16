import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Kirkbrae Hi Lo Jack League",
    short_name: "Hi Lo Jack",
    description: "Standings and this week's matchups",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#1d3d24",
    theme_color: "#1d3d24",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
