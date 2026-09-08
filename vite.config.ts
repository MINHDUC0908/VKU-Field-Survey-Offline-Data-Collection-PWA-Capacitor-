import { defineConfig } from "vite";

// Cấu hình Vite cho VKU Facility Inspector
// Service Worker được tự viết thủ công (không dùng vite-plugin-pwa)
// để kiểm soát hoàn toàn Cache-First strategy
export default defineConfig({
  root: ".",
  publicDir: "public",
  build: {
    outDir: "dist",
    rollupOptions: {
      input: {
        main: "index.html",
      },
    },
  },
  server: {
    port: 5173,
    // Proxy API requests đến mock backend khi dev
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
    },
  },
});
