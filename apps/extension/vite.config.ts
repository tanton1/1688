import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        sidepanel: resolve(import.meta.dirname, "src/sidepanel/index.html"),
        background: resolve(import.meta.dirname, "src/background/service-worker.ts"),
        content: resolve(import.meta.dirname, "src/content/index.ts")
      },
      output: {
        entryFileNames: "src/[name]/index.js",
        chunkFileNames: "assets/[name].[hash].js",
        assetFileNames: "assets/[name].[ext]"
      }
    }
  }
});
