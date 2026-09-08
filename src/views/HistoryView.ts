/**
 * HistoryView.ts — Danh sách lịch sử khảo sát
 * Hiển thị tất cả inspections với sync status, filter và xem chi tiết
 */

import { getAllInspections } from "../services/db/inspectionRepository";
import { CATEGORY_LABELS, type Inspection, type InspectionCategory } from "../types/inspection";
import { renderDetail } from "./DetailView";

/**
 * Render danh sách lịch sử vào container
 */
export async function renderHistory(
  container: HTMLElement,
  onBack: () => void
): Promise<void> {
  container.innerHTML = `
    <div class="container">
      <div style="display:flex; align-items:center; gap:0.75rem; margin-bottom:1rem;">
        <button id="btn-back-history" class="btn btn-secondary btn-sm">← Quay lại</button>
        <h1 style="font-size:1.25rem; font-weight:700;">Lịch sử khảo sát</h1>
      </div>

      <div class="tab-bar" id="filter-tabs">
        <button class="tab-btn active" data-filter="all">Tất cả</button>
        <button class="tab-btn" data-filter="PENDING_SYNC">Chờ sync</button>
        <button class="tab-btn" data-filter="SYNCED">Đã sync</button>
        <button class="tab-btn" data-filter="FAILED">Thất bại</button>
      </div>

      <div id="inspection-list"></div>
    </div>
  `;

  document.getElementById("btn-back-history")?.addEventListener("click", onBack);

  // Load và hiển thị data
  const inspections = await getAllInspections();
  renderList(container, inspections, "all", onBack);

  // Filter tabs
  document.getElementById("filter-tabs")?.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      const filter = (btn as HTMLElement).dataset["filter"] ?? "all";
      renderList(container, inspections, filter, onBack);
    });
  });
}

/** Render danh sách với filter và gắn sự kiện xem chi tiết */
function renderList(
  container: HTMLElement,
  inspections: Inspection[],
  filter: string,
  onBack: () => void
): void {
  const list = document.getElementById("inspection-list");
  if (!list) return;

  const filtered =
    filter === "all"
      ? inspections
      : inspections.filter((ins) => ins.syncStatus === filter);

  if (filtered.length === 0) {
    list.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📋</div>
        <div class="empty-state-title">Không có dữ liệu</div>
      </div>
    `;
    return;
  }

  list.innerHTML = filtered
    .map((ins) => {
      const stars = "★".repeat(ins.rating) + "☆".repeat(5 - ins.rating);
      const date = new Date(ins.createdAt).toLocaleString("vi-VN");
      const catLabel =
        CATEGORY_LABELS[ins.category as InspectionCategory] ?? ins.category;

      const syncBadge = getSyncBadge(ins.syncStatus);

      return `
        <div class="inspection-card" data-id="${ins.id}" role="button" tabindex="0" title="Nhấn để xem chi tiết">
          <div class="inspection-card-header">
            <div>
              <div class="inspection-location">
                Tòa ${ins.building} · Tầng ${ins.floor} · ${ins.room}
              </div>
              <div class="inspection-meta">${catLabel} · ${date}</div>
            </div>
            <div>
              <div class="inspection-rating">${stars}</div>
            </div>
          </div>
          <div style="display:flex; align-items:center; justify-content:space-between; margin-top:0.5rem;">
            ${syncBadge}
            <div style="display:flex; align-items:center; gap:8px;">
              ${ins.photos.length > 0 ? `<span style="font-size:0.75rem; color:var(--color-text-muted, #64748b);">📷 ${ins.photos.length} ảnh</span>` : ""}
              <span style="font-size:0.75rem; color:var(--primary, #0284c7); font-weight:600;">Xem chi tiết →</span>
            </div>
          </div>
          ${ins.note ? `<div style="font-size:0.8rem; color:var(--color-text-secondary, #475569); margin-top:0.5rem; padding-top:0.5rem; border-top:1px solid var(--color-border, #e2e8f0);">${ins.note.slice(0, 80)}${ins.note.length > 80 ? "..." : ""}</div>` : ""}
        </div>
      `;
    })
    .join("");

  // Bắt sự kiện click vào từng card để xem chi tiết
  list.querySelectorAll(".inspection-card").forEach((cardEl) => {
    const handleOpen = () => {
      const id = (cardEl as HTMLElement).dataset["id"];
      const ins = inspections.find((item) => item.id === id);
      if (ins) {
        renderDetail(container, ins, () => {
          void renderHistory(container, onBack);
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
}

function getSyncBadge(status: string): string {
  const map: Record<string, string> = {
    SYNCED: '<span class="sync-badge synced">✅ Đã đồng bộ</span>',
    PENDING_SYNC: '<span class="sync-badge pending">⏳ Chờ đồng bộ</span>',
    SYNCING: '<span class="sync-badge syncing">🔄 Đang đồng bộ</span>',
    FAILED: '<span class="sync-badge failed">❌ Thất bại</span>',
  };
  return map[status] ?? "";
}
