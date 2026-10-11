import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
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
    chunkSizeWarningLimit: 900,
  },
});
