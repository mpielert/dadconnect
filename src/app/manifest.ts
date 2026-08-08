import type { MetadataRoute } from "next";

// Web app manifest — served at /manifest.webmanifest and auto-linked by Next.
// Makes the site installable (Add to Home Screen) and launch full-screen.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "CMUDadConnect",
    short_name: "DadConnect", // shorter so it doesn't truncate under the icon
    description: "A private directory and hub for the CMUDadConnect group.",
    start_url: "/",
    display: "standalone",
    background_color: "#EAE3D3",
    theme_color: "#202A26",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
