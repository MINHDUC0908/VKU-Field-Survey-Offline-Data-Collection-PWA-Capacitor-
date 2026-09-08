/**
 * Service Worker — Cache-First strategy cho App Shell
 * Đảm bảo app hoạt động offline hoàn toàn
 *
 * Chiến lược:
 *   - App Shell (HTML/CSS/JS/icons) → Cache First
 *   - API requests → Network Only (không cache dữ liệu)
 *   - Ảnh từ cache → Cache First
 */

const CACHE_NAME = "vku-inspector-v1";
const OFFLINE_URL = "/";

// Danh sách tài nguyên App Shell cần cache
const APP_SHELL_URLS = [
  "/",
  "/index.html",
  "/manifest.json",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

// =============================================
// Install Event — Cache App Shell
// =============================================
self.addEventListener("install", (event) => {
  console.log("[SW] Cài đặt Service Worker...");

  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        console.log("[SW] Cache App Shell:", APP_SHELL_URLS);
        return cache.addAll(APP_SHELL_URLS);
      })
      .then(() => {
        // Kích hoạt ngay lập tức, không chờ tab cũ đóng
        return self.skipWaiting();
      })
  );
});

// =============================================
// Activate Event — Xóa cache cũ
// =============================================
self.addEventListener("activate", (event) => {
  console.log("[SW] Kích hoạt Service Worker...");

  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name !== CACHE_NAME)
            .map((name) => {
              console.log("[SW] Xóa cache cũ:", name);
              return caches.delete(name);
            })
        );
      })
      .then(() => {
        // Kiểm soát tất cả client ngay lập tức
        return self.clients.claim();
      })
  );
});

// =============================================
// Fetch Event — Cache First cho App Shell
// =============================================
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Bỏ qua API requests — luôn dùng network
  if (url.pathname.startsWith("/api/")) {
    return; // Không intercept, dùng network bình thường
  }

  // Bỏ qua non-GET requests
  if (request.method !== "GET") return;

  // Bỏ qua chrome-extension và các scheme khác
  if (!url.protocol.startsWith("http")) return;

  // Cache First: Tìm trong cache trước, fallback sang network
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        // Tìm thấy trong cache → trả về ngay
        // Background: cập nhật cache từ network (stale-while-revalidate)
        const networkFetch = fetch(request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const responseClone = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(request, responseClone);
              });
            }
            return networkResponse;
          })
          .catch(() => {
            /* offline, không sao */
          });

        // Không await background update, trả về cache ngay
        void networkFetch;
        return cachedResponse;
      }

      // Không có trong cache → fetch từ network
      return fetch(request)
        .then((networkResponse) => {
          // Cache response mới (chỉ cache thành công)
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // Offline và không có cache → trả về offline page
          console.log("[SW] Offline, trả về cached home page");
          return caches.match(OFFLINE_URL).then(
            (fallback) =>
              fallback ||
              new Response("VKU Inspector - Offline", {
                headers: { "Content-Type": "text/html" },
              })
          );
        });
    })
  );
});
