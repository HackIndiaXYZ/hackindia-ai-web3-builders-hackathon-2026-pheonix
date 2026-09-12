import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Vite configuration for TitleLock Explorer
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:5001",
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: false,
    rollupOptions: {
      output: {
        entryFileNames: "bundle.js",
        assetFileNames: "bundle.[ext]",
      },
    },
  },
});
