import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Bajrang Badminton Academy",
    short_name: "Bajrang",
    description: "Badminton coaching for kids, adults and competitive players.",
    start_url: "/",
    display: "standalone",
    background_color: "#05070f",
    theme_color: "#05070f",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
