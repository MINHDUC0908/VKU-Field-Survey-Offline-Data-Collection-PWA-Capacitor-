/**
 * SyncStatus Component — compact sync state panel
 * Hiển thị: Kết nối, Trạng thái đồng bộ, nút Retry khi có lỗi
 */

export interface SyncStatusData {
  isOnline: boolean;
  pendingCount: number;
  isSyncing: boolean;
  lastError: string | null;
  syncedCount: number;
}

let syncPanelEl: HTMLElement | null = null;

export function renderSyncStatus(container: HTMLElement): void {
  const panel = document.createElement("div");
  panel.id = "sync-status-panel";
  panel.className = "sync-panel";
  panel.innerHTML = buildHTML({
    isOnline: navigator.onLine,
    pendingCount: 0,
    isSyncing: false,
    lastError: null,
    syncedCount: 0,
  });
  container.appendChild(panel);
  syncPanelEl = panel;
}

export function updateSyncStatus(data: SyncStatusData): void {
  if (!syncPanelEl) return;
  syncPanelEl.innerHTML = buildHTML(data);

  // Gắn sự kiện nút retry (nếu có)
  syncPanelEl.querySelector("#btn-retry-sync")?.addEventListener("click", () => {
    void import("../services/sync/syncManager").then(({ retryFailedInspections }) => {
      void retryFailedInspections();
    });
  });
}

function buildHTML(data: SyncStatusData): string {
  const rows: string[] = [];

  // Network row
  rows.push(
    row(
      "Kết nối",
      data.isOnline
        ? '<span class="sync-badge synced">🟢 Online</span>'
        : '<span class="sync-badge failed">🔴 Offline</span>'
    )
  );

  // Sync state row
  if (data.isSyncing) {
    rows.push(row("Đồng bộ", '<span class="sync-badge syncing"><span class="spinner"></span> Đang gửi...</span>'));
  } else if (data.lastError && data.isOnline) {
    rows.push(
      row(
        "Đồng bộ",
        `<span class="sync-badge failed">❌ Lỗi đồng bộ</span>`
      )
    );
    // Nút retry
    rows.push(`
      <div style="margin-top:6px;">
        <button id="btn-retry-sync" class="btn btn-secondary btn-sm" style="width:100%;font-size:11px;">
          🔄 Thử đồng bộ lại
        </button>
      </div>
    `);
  } else if (data.pendingCount > 0) {
    rows.push(row("Chờ đồng bộ", `<span class="sync-badge pending">⏳ ${data.pendingCount}</span>`));
  } else {
    rows.push(row("Đồng bộ", '<span class="sync-badge synced">✓ Đã đồng bộ</span>'));
  }

  return `
    <div class="sync-panel-title">🔄 Trạng thái đồng bộ</div>
    ${rows.join("")}
  `;
}

function row(label: string, badge: string): string {
  return `<div class="sync-row"><span>${label}</span>${badge}</div>`;
}
