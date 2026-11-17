import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

const api = { "/api": { target: "http://127.0.0.1:8000", changeOrigin: true } };

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      manifest: {
        name: "NEXUS LIFE OS",
        short_name: "NEXUS",
        description: "Il tuo sistema operativo personale",
        lang: "it",
        theme_color: "#0f0f10",
        background_color: "#0f0f10",
        display: "standalone",
        start_url: "/",
        icons: [
          { src: "pwa-192.png", sizes: "192x192", type: "image/png" },
          { src: "pwa-512.png", sizes: "512x512", type: "image/png", purpose: "any maskable" },
        ],
      },
      workbox: { navigateFallbackDenylist: [/^\/api/] },
    }),
  ],
  // host: true = raggiungibile dalla LAN (iPhone). Il proxy evita problemi di CORS.
  server: { host: true, port: 5173, proxy: api, allowedHosts: [".ts.net"] },
  preview: { host: true, port: 4173, proxy: api, allowedHosts: [".ts.net"] },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules/recharts") || id.includes("node_modules/d3-")) return "charts";
          if (id.includes("node_modules/react") || id.includes("node_modules/scheduler")) return "react-vendor";
        },
      },
    },
  },
});
