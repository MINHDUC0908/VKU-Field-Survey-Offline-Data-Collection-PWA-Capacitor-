/**
 * main.ts — Entry point của ứng dụng
 * Khởi tạo app, đăng ký Service Worker, import CSS
 */

import "./styles/main.css";
import { initApp } from "./app";

// Khởi động ứng dụng ngay khi DOM ready
document.addEventListener("DOMContentLoaded", () => {
  void initApp();
});

// Đăng ký Service Worker (PWA)
// Chỉ register trong môi trường production build (hoặc khi file sw.js tồn tại)
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then((registration) => {
        console.log("[SW] Đã đăng ký Service Worker:", registration.scope);

        // Kiểm tra cập nhật SW
        registration.addEventListener("updatefound", () => {
          const newWorker = registration.installing;
          if (!newWorker) return;

          newWorker.addEventListener("statechange", () => {
            if (
              newWorker.state === "installed" &&
              navigator.serviceWorker.controller
            ) {
              console.log("[SW] Cập nhật mới sẵn sàng. Reload để áp dụng.");
            }
          });
        });
      })
      .catch((error: unknown) => {
        console.warn("[SW] Đăng ký thất bại:", error);
      });
  });
}
