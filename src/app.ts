/**
 * app.ts — Điều phối ứng dụng chính
 * Quản lý routing đơn giản (view switching), khởi tạo components
 */

import { renderHeader, updateNetworkBadge } from "./components/Header";
import { renderSyncStatus, updateSyncStatus } from "./components/SyncStatus";
import { initSyncManager } from "./services/sync/syncManager";

// Trạng thái view hiện tại
let currentView: "home" | "form" | "success" | "history" = "home";

/** Khởi tạo ứng dụng */
export async function initApp(): Promise<void> {
  const appEl = document.getElementById("app");
  if (!appEl) throw new Error("Không tìm thấy #app");

  // 1. Render header
  renderHeader(appEl);

  // 2. Tạo main content area
  const main = document.createElement("main");
  main.className = "main-content";
  main.id = "main-content";
  appEl.appendChild(main);

  // 3. Render home view
  await renderHomeView(main);

  // 4. Khởi động SyncManager (theo dõi online/offline, sync pending)
  initSyncManager();

  // 5. Theo dõi mạng để cập nhật UI header
  setupNetworkListeners();
}

/** Render màn hình chính */
async function renderHomeView(container: HTMLElement): Promise<void> {
  currentView = "home";
  container.innerHTML = `
    <div class="container">
      <div class="card">
        <div class="home-hero">
          <div class="home-hero-icon">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round"
                d="M11.35 3.836c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m8.9-4.414c.376.023.75.05 1.124.08 1.131.094 1.976 1.057 1.976 2.192V16.5A2.25 2.25 0 0 1 18 18.75h-2.25m-7.5-10.5H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V18.75m-7.5-10.5h6.375c.621 0 1.125.504 1.125 1.125V18.75" />
            </svg>
          </div>
          <h1 class="home-title">VKU Facility Inspector</h1>
          <p class="home-desc">Khảo sát cơ sở vật chất · Đại học Việt–Hàn (VKU)</p>
          <button id="btn-start" class="btn btn-primary btn-lg">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
              stroke-width="2.5" stroke="currentColor" width="16" height="16">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Bắt đầu khảo sát
          </button>
        </div>
      </div>

      <div id="sync-status-container"></div>

      <div class="card" style="margin-top:0;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
          <span style="font-size:14px;font-weight:700;">Lịch sử khảo sát</span>
          <button id="btn-history" class="btn btn-secondary btn-sm">Xem tất cả</button>
        </div>
        <div id="recent-inspections">
          <div class="empty-state">
            <div class="empty-state-icon">📋</div>
            <div class="empty-state-title">Chưa có khảo sát nào</div>
          </div>
        </div>
      </div>
    </div>
  `;


  // Mount sync status panel
  const syncContainer = document.getElementById("sync-status-container");
  if (syncContainer) renderSyncStatus(syncContainer);

  // Bind events
  document.getElementById("btn-start")?.addEventListener("click", () => {
    void navigateToForm(container);
  });

  document.getElementById("btn-history")?.addEventListener("click", () => {
    void navigateToHistory(container);
  });

  // Load danh sách gần đây
  await loadRecentInspections(container);
}

/** Điều hướng đến form */
async function navigateToForm(container: HTMLElement): Promise<void> {
  currentView = "form";
  const { renderForm } = await import("./views/FormView");
  await renderForm(container, () => {
    void renderHomeView(container);
  });
}

/** Điều hướng đến lịch sử */
async function navigateToHistory(container: HTMLElement): Promise<void> {
  currentView = "history";
  const { renderHistory } = await import("./views/HistoryView");
  await renderHistory(container, () => {
    void renderHomeView(container);
  });
}

/** Load 3 inspections gần nhất */
async function loadRecentInspections(mainContainer: HTMLElement): Promise<void> {
  const container = document.getElementById("recent-inspections");
  if (!container) return;

  try {
    const { getAllInspections } = await import("./services/db/inspectionRepository");
    const inspections = await getAllInspections();
    const recent = inspections.slice(0, 3);

    if (recent.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📋</div>
          <div class="empty-state-title">Chưa có khảo sát nào</div>
        </div>
      `;
      return;
    }

    const { CATEGORY_LABELS } = await import("./types/inspection");
    const { renderDetail } = await import("./views/DetailView");

    container.innerHTML = recent
      .map((ins) => {
        const stars = "★".repeat(ins.rating) + "☆".repeat(5 - ins.rating);
        const date = new Date(ins.createdAt).toLocaleDateString("vi-VN");
        const catLabel =
          CATEGORY_LABELS[ins.category as keyof typeof CATEGORY_LABELS] ??
          ins.category;

        return `
          <div class="inspection-card" data-id="${ins.id}" role="button" tabindex="0" title="Nhấn để xem chi tiết">
            <div class="inspection-card-header">
              <div>
                <div class="inspection-location">
                  Tòa ${ins.building} · Tầng ${ins.floor} · ${ins.room}
                </div>
                <div class="inspection-meta">${catLabel} · ${date}</div>
              </div>
              <div class="inspection-rating">${stars}</div>
            </div>
            <div style="display:flex; align-items:center; justify-content:space-between; margin-top:0.4rem;">
              ${getSyncBadgeHTML(ins.syncStatus)}
              <span style="font-size:0.75rem; color:var(--primary, #0284c7); font-weight:600;">Xem chi tiết →</span>
            </div>
          </div>
        `;
      })
      .join("");

    container.querySelectorAll(".inspection-card").forEach((cardEl) => {
      const handleOpen = () => {
        const id = (cardEl as HTMLElement).dataset["id"];
        const ins = recent.find((item) => item.id === id);
        if (ins) {
          renderDetail(mainContainer, ins, () => {
            void renderHomeView(mainContainer);
          });
        }
      };

      cardEl.addEventListener("click", handleOpen);
      cardEl.addEventListener("keydown", (e) => {
        if ((e as KeyboardEvent).key === "Enter" || (e as KeyboardEvent).key === " ") {
          e.preventDefault();
          handleOpen();
        }
      });
    });
  } catch (err) {
    console.warn("[App] Không thể load inspections:", err);
  }
}

function getSyncBadgeHTML(status: string): string {
  const map: Record<string, string> = {
    SYNCED: '<span class="sync-badge synced">✅ Đã đồng bộ</span>',
    PENDING_SYNC: '<span class="sync-badge pending">⏳ Chờ đồng bộ</span>',
    SYNCING: '<span class="sync-badge syncing">🔄 Đang đồng bộ</span>',
    FAILED: '<span class="sync-badge failed">❌ Thất bại</span>',
  };
  return map[status] ?? "";
}

/** Theo dõi online/offline */
function setupNetworkListeners(): void {
  const handleOnline = (): void => {
    updateNetworkBadge(true);
    updateSyncStatus({ isOnline: true, pendingCount: 0, isSyncing: false, lastError: null, syncedCount: 0 });
  };

  const handleOffline = (): void => {
    updateNetworkBadge(false);
    updateSyncStatus({ isOnline: false, pendingCount: 0, isSyncing: false, lastError: null, syncedCount: 0 });
  };

  window.addEventListener("online", handleOnline);
  window.addEventListener("offline", handleOffline);
}

export function getCurrentView(): string {
  return currentView;
}

export { updateSyncStatus };
