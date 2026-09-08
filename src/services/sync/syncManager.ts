/**
 * syncManager.ts — Quản lý hàng đợi đồng bộ Offline → Online
 *
 * Flow:
 *   PENDING_SYNC → SYNCING → POST /api/inspections
 *                            → Success: SYNCED
 *                            → Error:   retryCount++ → PENDING_SYNC
 *                                       retryCount >= MAX_RETRY → FAILED (dừng hẳn)
 *
 * Tự động kích hoạt khi:
 *   - window.addEventListener("online", ...)
 *   - Sau khi submit form (triggerSync)
 */

import {
  getPendingInspections,
  updateSyncStatus,
  getAllInspections,
} from "../db/inspectionRepository";
import { postInspection } from "../api/apiService";
import type { Inspection } from "../../types/inspection";
import { updateSyncStatus as updateUI } from "../../components/SyncStatus";

// Số lần retry tối đa trước khi đánh dấu FAILED vĩnh viễn
const MAX_RETRY = 3;
// Delay exponential backoff (ms): retry 1 → 2s, retry 2 → 4s, retry 3 → 8s
const RETRY_DELAYS = [2000, 4000, 8000];

let isSyncing = false;
let syncedCount = 0;
let lastError: string | null = null;

/**
 * Khởi tạo SyncManager — gọi 1 lần duy nhất khi app load
 */
export function initSyncManager(): void {
  // Khi mạng trở lại → sync ngay
  window.addEventListener("online", () => {
    console.log("[Sync] 🌐 Mạng trở lại — bắt đầu sync...");
    lastError = null; // reset lỗi cũ
    void syncPendingInspections();
  });

  // Event từ app.ts
  document.addEventListener("vku:online", () => {
    void syncPendingInspections();
  });

  // Sync ngay khi app khởi động nếu đang online
  if (navigator.onLine) {
    void syncPendingInspections();
  }

  console.log("[Sync] SyncManager đã khởi tạo");
}

/**
 * Sync tất cả PENDING_SYNC items (không sync FAILED đã hết retry)
 * Gửi tuần tự từng record để tránh race condition
 */
export async function syncPendingInspections(): Promise<void> {
  if (isSyncing) return; // tránh chạy song song
  if (!navigator.onLine) return;

  // Chỉ lấy PENDING_SYNC — không retry FAILED đã hết lượt
  const pending = await getOnlyPendingSyncItems();

  if (pending.length === 0) {
    await refreshUI();
    return;
  }

  isSyncing = true;
  lastError = null;
  console.log(`[Sync] Bắt đầu sync ${pending.length} inspections...`);
  updateSyncUI(true, pending.length);

  for (const inspection of pending) {
    // Nếu mất mạng giữa chừng thì dừng
    if (!navigator.onLine) {
      console.log("[Sync] Mất mạng giữa chừng — dừng sync");
      break;
    }
    await syncOne(inspection);
  }

  isSyncing = false;
  await refreshUI();
}

/**
 * Sync một record duy nhất
 * Thất bại: tăng retryCount, nếu đủ MAX_RETRY → FAILED
 */
async function syncOne(inspection: Inspection): Promise<void> {
  console.log(`[Sync] ⬆ Đang sync: ${inspection.id.slice(0, 8)}...`);
  await updateSyncStatus(inspection.id, "SYNCING");

  try {
    await postInspection(inspection);

    // Thành công
    await updateSyncStatus(inspection.id, "SYNCED");
    syncedCount++;
    lastError = null;
    console.log(`[Sync] ✅ SYNCED: ${inspection.id.slice(0, 8)}`);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    const newRetryCount = inspection.retryCount + 1;
    lastError = msg;

    console.error(`[Sync] ❌ Lỗi (lần ${newRetryCount}/${MAX_RETRY}): ${msg}`);

    if (newRetryCount >= MAX_RETRY) {
      // Hết lần retry → đánh dấu FAILED, không retry nữa
      await updateSyncStatus(inspection.id, "FAILED", newRetryCount);
      console.error(`[Sync] 🛑 FAILED vĩnh viễn: ${inspection.id.slice(0, 8)}`);
    } else {
      // Còn lần retry → giữ PENDING_SYNC, tăng retryCount, backoff
      await updateSyncStatus(inspection.id, "PENDING_SYNC", newRetryCount);
      const delay = RETRY_DELAYS[newRetryCount - 1] ?? 8000;
      console.log(`[Sync] ⏳ Retry sau ${delay / 1000}s...`);
      await sleep(delay);
    }
  }
}

/**
 * Chỉ lấy items có syncStatus = PENDING_SYNC
 * Không lấy FAILED (đã hết retry) để tránh loop vô tận
 */
async function getOnlyPendingSyncItems(): Promise<Inspection[]> {
  const pending = await getPendingInspections();
  // getPendingInspections trả về cả PENDING_SYNC lẫn FAILED
  // Lọc chỉ lấy PENDING_SYNC có retryCount < MAX_RETRY
  return pending.filter(
    (ins) =>
      ins.syncStatus === "PENDING_SYNC" && ins.retryCount < MAX_RETRY
  );
}

/**
 * Cập nhật UI: đếm thực tế PENDING + FAILED để hiển thị
 */
async function refreshUI(): Promise<void> {
  const all = await getAllInspections();
  const pendingCount = all.filter(
    (ins) => ins.syncStatus === "PENDING_SYNC" || ins.syncStatus === "SYNCING"
  ).length;
  const hasError = all.some((ins) => ins.syncStatus === "FAILED");

  updateUI({
    isOnline: navigator.onLine,
    pendingCount,
    isSyncing: false,
    lastError: hasError ? "Một số khảo sát không thể đồng bộ" : null,
    syncedCount,
  });

  console.log(`[Sync] Hoàn tất. Pending: ${pendingCount}`);
}

function updateSyncUI(syncing: boolean, pendingCount: number): void {
  updateUI({
    isOnline: navigator.onLine,
    pendingCount,
    isSyncing: syncing,
    lastError,
    syncedCount,
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Trigger sync thủ công sau khi submit form
 */
export async function triggerSync(): Promise<void> {
  if (navigator.onLine) {
    await syncPendingInspections();
  } else {
    await refreshUI();
  }
}

/**
 * Reset FAILED items về PENDING_SYNC để thử lại (dùng cho nút "Retry thủ công")
 */
export async function retryFailedInspections(): Promise<void> {
  const all = await getAllInspections();
  const failed = all.filter((ins) => ins.syncStatus === "FAILED");
  for (const ins of failed) {
    await updateSyncStatus(ins.id, "PENDING_SYNC", 0); // reset retryCount
  }
  console.log(`[Sync] Reset ${failed.length} FAILED items về PENDING_SYNC`);
  await syncPendingInspections();
}
