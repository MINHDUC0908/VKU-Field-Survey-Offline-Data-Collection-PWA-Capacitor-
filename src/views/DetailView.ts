/**
 * DetailView.ts — Xem chi tiết một inspection
 * Hiển thị đầy đủ thông tin, ảnh, trạng thái sync
 */

import type { Inspection, InspectionCategory } from "../types/inspection";
import { CATEGORY_LABELS } from "../types/inspection";
import { retryFailedInspections } from "../services/sync/syncManager";

/**
 * Render màn hình chi tiết inspection
 * @param container - Element để render vào (main-content)
 * @param inspection - Dữ liệu inspection cần xem
 * @param onBack - Callback quay lại
 */
export function renderDetail(
  container: HTMLElement,
  inspection: Inspection,
  onBack: () => void
): void {
  const stars = "★".repeat(inspection.rating) + "☆".repeat(5 - inspection.rating);
  const catLabel =
    CATEGORY_LABELS[inspection.category as InspectionCategory] ?? inspection.category;
  const createdAt = new Date(inspection.createdAt).toLocaleString("vi-VN");
  const updatedAt = new Date(inspection.updatedAt).toLocaleString("vi-VN");

  const syncBadge = getSyncBadge(inspection.syncStatus);
  const isRetryable = inspection.syncStatus === "FAILED";

  container.innerHTML = `
    <div class="container">
      <!-- Header hành động -->
      <div style="display:flex; align-items:center; gap:10px; margin-bottom:12px;">
        <button id="btn-detail-back" class="btn btn-secondary btn-sm">← Quay lại</button>
        <span style="font-size:13px; font-weight:700; color:var(--text);">Chi tiết khảo sát</span>
        <div style="margin-left:auto;">${syncBadge}</div>
      </div>

      <!-- Thông tin vị trí -->
      <div class="card" style="margin-bottom:10px;">
        <div style="display:flex; align-items:center; gap:8px; margin-bottom:14px;">
          <span style="font-size:18px;">📍</span>
          <span style="font-size:15px; font-weight:700; color:var(--text);">
            Tòa ${inspection.building} · Tầng ${inspection.floor} · Phòng ${inspection.room}
          </span>
        </div>

        <div class="detail-grid">
          <div class="detail-item">
            <div class="detail-label">Hạng mục</div>
            <div class="detail-value">${catLabel}</div>
          </div>
          <div class="detail-item">
            <div class="detail-label">Đánh giá</div>
            <div class="detail-value" style="color:#f59e0b; font-size:16px;">${stars}</div>
          </div>
          <div class="detail-item">
            <div class="detail-label">Tạo lúc</div>
            <div class="detail-value">${createdAt}</div>
          </div>
          <div class="detail-item">
            <div class="detail-label">Cập nhật</div>
            <div class="detail-value">${updatedAt}</div>
          </div>
        </div>

        ${
          inspection.note
            ? `<div style="margin-top:14px; padding-top:14px; border-top:1px solid var(--border);">
                <div class="detail-label" style="margin-bottom:6px;">📝 Ghi chú</div>
                <div style="font-size:13px; color:var(--text); white-space:pre-wrap; line-height:1.6;
                  background:var(--bg); border-radius:var(--r-md); padding:10px 12px;">
                  ${escapeHtml(inspection.note)}
                </div>
              </div>`
            : `<div style="margin-top:14px; padding-top:14px; border-top:1px solid var(--border);
                font-size:12px; color:var(--text-muted);">Không có ghi chú</div>`
        }
      </div>

      <!-- Ảnh -->
      ${
        inspection.photos.length > 0
          ? `<div class="card" style="margin-bottom:10px;">
              <div style="font-size:13px; font-weight:700; margin-bottom:10px;">
                📷 Hình ảnh (${inspection.photos.length})
              </div>
              <div class="detail-photo-grid" id="photo-grid">
                ${inspection.photos
                  .map(
                    (src, i) => `
                  <div class="detail-photo-thumb" data-index="${i}">
                    <img src="${src}" alt="Ảnh ${i + 1}" loading="lazy" />
                  </div>`
                  )
                  .join("")}
              </div>
            </div>`
          : `<div class="card" style="margin-bottom:10px;">
              <div style="font-size:12px; color:var(--text-muted); text-align:center; padding:12px 0;">
                📷 Không có hình ảnh
              </div>
            </div>`
      }

      <!-- Sync info -->
      <div class="card" style="margin-bottom:10px;">
        <div style="font-size:13px; font-weight:700; margin-bottom:10px;">🔄 Đồng bộ</div>
        <div class="sync-row">
          <span>Trạng thái</span>
          ${syncBadge}
        </div>
        <div class="sync-row">
          <span>Số lần thử</span>
          <span style="font-size:12px; color:var(--text-muted);">${inspection.retryCount} / 3</span>
        </div>
        <div class="sync-row">
          <span>ID</span>
          <span style="font-size:11px; color:var(--text-muted); font-family:monospace;">
            ${inspection.id.slice(0, 18)}...
          </span>
        </div>

        ${
          isRetryable
            ? `<button id="btn-retry-detail" class="btn btn-primary btn-sm btn-full"
                style="margin-top:12px;">🔄 Thử đồng bộ lại</button>`
            : ""
        }
      </div>
    </div>

    <!-- Lightbox ảnh -->
    <div id="photo-lightbox" style="
      display:none; position:fixed; inset:0; background:rgba(0,0,0,0.9);
      z-index:500; align-items:center; justify-content:center; padding:16px;">
      <button id="lb-close" style="
        position:absolute; top:12px; right:12px; background:rgba(255,255,255,0.15);
        border:none; color:white; width:36px; height:36px; border-radius:50%;
        font-size:18px; cursor:pointer; display:flex; align-items:center; justify-content:center;">✕</button>
      <button id="lb-prev" style="
        position:absolute; left:12px; background:rgba(255,255,255,0.15);
        border:none; color:white; width:40px; height:40px; border-radius:50%;
        font-size:20px; cursor:pointer; display:flex; align-items:center; justify-content:center;">‹</button>
      <img id="lb-img" src="" alt="" style="max-width:100%; max-height:90vh;
        border-radius:8px; object-fit:contain;" />
      <button id="lb-next" style="
        position:absolute; right:12px; background:rgba(255,255,255,0.15);
        border:none; color:white; width:40px; height:40px; border-radius:50%;
        font-size:20px; cursor:pointer; display:flex; align-items:center; justify-content:center;">›</button>
      <div id="lb-counter" style="
        position:absolute; bottom:16px; color:rgba(255,255,255,0.7);
        font-size:12px;"></div>
    </div>
  `;

  // === Events ===
  document.getElementById("btn-detail-back")?.addEventListener("click", onBack);

  // Retry button
  document.getElementById("btn-retry-detail")?.addEventListener("click", async () => {
    const btn = document.getElementById("btn-retry-detail") as HTMLButtonElement;
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Đang thử...';
    await retryFailedInspections();
    onBack(); // quay lại sau khi trigger sync
  });

  // Lightbox cho ảnh
  if (inspection.photos.length > 0) {
    setupLightbox(inspection.photos);
  }
}

/** Setup lightbox xem ảnh fullscreen */
function setupLightbox(photos: string[]): void {
  let current = 0;
  const lightbox = document.getElementById("photo-lightbox") as HTMLElement;
  const img = document.getElementById("lb-img") as HTMLImageElement;
  const counter = document.getElementById("lb-counter");

  const open = (idx: number): void => {
    current = idx;
    img.src = photos[current] ?? "";
    if (counter) counter.textContent = `${current + 1} / ${photos.length}`;
    lightbox.style.display = "flex";
    // Ẩn prev/next nếu chỉ 1 ảnh
    const prev = document.getElementById("lb-prev") as HTMLElement;
    const next = document.getElementById("lb-next") as HTMLElement;
    prev.style.display = photos.length <= 1 ? "none" : "flex";
    next.style.display = photos.length <= 1 ? "none" : "flex";
  };

  const close = (): void => {
    lightbox.style.display = "none";
  };

  // Nhấn vào thumbnail
  document.querySelectorAll(".detail-photo-thumb").forEach((thumb) => {
    thumb.addEventListener("click", () => {
      const idx = Number((thumb as HTMLElement).dataset["index"]);
      open(idx);
    });
  });

  document.getElementById("lb-close")?.addEventListener("click", close);
  lightbox.addEventListener("click", (e) => {
    if (e.target === lightbox) close();
  });

  document.getElementById("lb-prev")?.addEventListener("click", () => {
    open((current - 1 + photos.length) % photos.length);
  });

  document.getElementById("lb-next")?.addEventListener("click", () => {
    open((current + 1) % photos.length);
  });

  // Keyboard navigation
  document.addEventListener("keydown", function onKey(e: KeyboardEvent) {
    if (lightbox.style.display === "none") {
      document.removeEventListener("keydown", onKey);
      return;
    }
    if (e.key === "Escape") close();
    if (e.key === "ArrowLeft") open((current - 1 + photos.length) % photos.length);
    if (e.key === "ArrowRight") open((current + 1) % photos.length);
  });
}

/** Lấy HTML badge theo syncStatus */
function getSyncBadge(status: string): string {
  const map: Record<string, string> = {
    SYNCED:       '<span class="sync-badge synced">✅ Đã đồng bộ</span>',
    PENDING_SYNC: '<span class="sync-badge pending">⏳ Chờ đồng bộ</span>',
    SYNCING:      '<span class="sync-badge syncing">🔄 Đang đồng bộ</span>',
    FAILED:       '<span class="sync-badge failed">❌ Thất bại</span>',
  };
  return map[status] ?? "";
}

/** Escape HTML để tránh XSS */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
