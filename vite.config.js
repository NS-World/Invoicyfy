import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";

/**
 * Writes sw.js (service worker) and the web app manifest next to index.html, with the list of built files,
 * so the app opens without internet. A new build gets a new cache name, so old files are cleaned up.
 */
function offlineApp() {
  return {
    name: "invoicyfy-offline-app",
    apply: "build",
    generateBundle(_, bundle) {
      const assets = Object.keys(bundle)
        .filter((f) => !f.endsWith(".map") && f !== "index.html")
        .sort();
      const build = createHash("sha256").update(assets.join("|")).digest("hex").slice(0, 12);
      const template = readFileSync(new URL("./src/pwa/sw-template.js", import.meta.url), "utf8");
      const source = template
        .replace('/* global __ASSETS__ */\n', "")
        .replace('"__BUILD__"', JSON.stringify(build))
        .replace("const ASSETS = __ASSETS__;", `const ASSETS = ${JSON.stringify(assets.map((f) => `./${f}`))};`);
      this.emitFile({ type: "asset", fileName: "sw.js", source });
      this.emitFile({
        type: "asset",
        fileName: "manifest.webmanifest",
        source: JSON.stringify(
          {
            name: "Invoicyfy Billing",
            short_name: "Invoicyfy",
            start_url: "./",
            scope: "./",
            display: "standalone",
            background_color: "#ffffff",
            theme_color: "#1a1d21",
            icons: [{ src: "vite.svg", sizes: "any", type: "image/svg+xml" }],
          },
          null,
          2
        ),
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), offlineApp()],
  build: {
    rollupOptions: {
      output: {
        // Only split large, self-contained libraries (a catch-all vendor chunk can create circular chunk imports).
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined;
          if (id.includes("@mui/x-data-grid")) return "vendor-datagrid";
          if (id.includes("recharts") || id.includes("/d3-") || id.includes("victory-vendor")) return "vendor-charts";
          if (id.includes("lottie")) return "vendor-lottie";
          return undefined;
        },
      },
    },
    chunkSizeWarningLimit: 1000, // exceljs is ~940 kB but only loads when a file is downloaded
  },
});
