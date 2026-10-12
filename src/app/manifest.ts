import type { MetadataRoute } from "next";

/**
 * Web App Manifest — enables "Add to Home Screen" (PWA install) on Android/Chrome
 * and "Add to Home Screen" on iOS Safari. Next.js serves this at /manifest.webmanifest.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Opportune — Student Opportunities",
    short_name: "Opportune",
    description:
      "Discover hackathons, scholarships, internships, competitions, and events in one place. Built for students in Pakistan.",
    start_url: "/feed",
    display: "standalone",
    orientation: "portrait",
    background_color: "#060b18",
    theme_color: "#10b981",
    categories: ["education", "social", "productivity"],
    lang: "en",
    icons: [
      {
        src: "/icons/icon-72x72.png",
        sizes: "72x72",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-96x96.png",
        sizes: "96x96",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-128x128.png",
        sizes: "128x128",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-144x144.png",
        sizes: "144x144",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-152x152.png",
        sizes: "152x152",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/icon-384x384.png",
        sizes: "384x384",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    screenshots: [],
    shortcuts: [
      {
        name: "Global Feed",
        short_name: "Feed",
        description: "Browse latest opportunities",
        url: "/feed",
        icons: [{ src: "/icons/icon-96x96.png", sizes: "96x96" }],
      },
      {
        name: "My Page",
        short_name: "Page",
        description: "Manage your page posts",
        url: "/my-page",
        icons: [{ src: "/icons/icon-96x96.png", sizes: "96x96" }],
      },
    ],
  };
}
