import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "./",
  build: {
    outDir: "dist",
  },
  server: {
    watch: {
      usePolling: true, 
    },
    proxy: {
      '/api': {
        target: 'http://13.209.7.3:8080',
        changeOrigin: true,
      },
    },
  },
});