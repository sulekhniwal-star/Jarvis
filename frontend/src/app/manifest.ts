import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "STARK INDUSTRIES // J.A.R.V.I.S.",
    short_name: "J.A.R.V.I.S.",
    description: "Personal Autonomous AI Engineering & Defense Platform",
    start_url: "/",
    display: "standalone",
    background_color: "#01060e",
    theme_color: "#00f0ff",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}

