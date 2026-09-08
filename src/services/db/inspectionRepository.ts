/**
 * inspectionRepository.ts — CRUD operations cho IndexedDB
 * Tất cả tương tác với database đi qua module này
 */

import { getDB } from "./database";
import type { Inspection, InspectionFormState, SyncStatus } from "../../types/inspection";

// Key cố định cho draft (chỉ lưu 1 draft tại một thời điểm)
const DRAFT_KEY = "current-draft";

// =============================================
// Inspections Store
// =============================================

/**
 * Thêm một inspection mới vào store
 * @param inspection - Object khảo sát đầy đủ
 */
export async function addInspection(inspection: Inspection): Promise<void> {
  const db = await getDB();
  await db.add("inspections", inspection);
  console.log(`[DB] Thêm inspection: ${inspection.id}`);
}

/**
 * Cập nhật inspection (ghi đè toàn bộ)
 * @param inspection - Object khảo sát cập nhật
 */
export async function updateInspection(inspection: Inspection): Promise<void> {
  const db = await getDB();
  await db.put("inspections", inspection);
}

/**
 * Lấy một inspection theo id
 * @param id - UUID của inspection
 */
export async function getInspection(id: string): Promise<Inspection | undefined> {
  const db = await getDB();
  const raw = await db.get("inspections", id);
  return raw as Inspection | undefined;
}

/**
 * Lấy tất cả inspections, sắp xếp mới nhất trước
 */
export async function getAllInspections(): Promise<Inspection[]> {
  const db = await getDB();
  const all = await db.getAllFromIndex("inspections", "by-createdAt");
  // Reverse để mới nhất lên đầu
  return (all as Inspection[]).reverse();
}

/**
 * Lấy các inspections đang chờ đồng bộ (PENDING_SYNC hoặc FAILED)
 * Dùng cho SyncManager
 */
export async function getPendingInspections(): Promise<Inspection[]> {
  const db = await getDB();
  const pending = await db.getAllFromIndex(
    "inspections",
    "by-syncStatus",
    "PENDING_SYNC"
  );
  const failed = await db.getAllFromIndex(
    "inspections",
    "by-syncStatus",
    "FAILED"
  );
  // Gộp và sắp xếp theo thời gian tạo
  return [...(pending as Inspection[]), ...(failed as Inspection[])].sort(
    (a, b) => a.createdAt - b.createdAt
  );
}

/**
 * Cập nhật chỉ syncStatus và retryCount của một inspection
 * @param id - UUID
 * @param status - Trạng thái mới
 * @param retryCount - Số lần đã retry (optional)
 */
export async function updateSyncStatus(
  id: string,
  status: SyncStatus,
  retryCount?: number
): Promise<void> {
  const db = await getDB();
  const inspection = await db.get("inspections", id);
  if (!inspection) {
    console.warn(`[DB] Không tìm thấy inspection để update status: ${id}`);
    return;
  }

  const updated = {
    ...inspection,
    syncStatus: status,
    updatedAt: Date.now(),
    ...(retryCount !== undefined ? { retryCount } : {}),
  };

  await db.put("inspections", updated);
  console.log(`[DB] Update sync status: ${id} → ${status}`);
}

// =============================================
// Drafts Store
// =============================================

/**
 * Lưu draft hiện tại vào IndexedDB
 * Auto-save khi người dùng thay đổi form
 * @param data - State của form
 */
export async function saveDraft(data: InspectionFormState): Promise<void> {
  const db = await getDB();
  await db.put("drafts", {
    key: DRAFT_KEY,
    data,
    savedAt: Date.now(),
  });
}

/**
 * Lấy draft đã lưu (nếu có)
 * @returns InspectionFormState hoặc null nếu không có draft
 */
export async function getDraft(): Promise<InspectionFormState | null> {
  const db = await getDB();
  const record = await db.get("drafts", DRAFT_KEY);
  if (!record) return null;
  return record.data as InspectionFormState;
}

/**
 * Xóa draft sau khi submit thành công
 */
export async function deleteDraft(): Promise<void> {
  const db = await getDB();
  await db.delete("drafts", DRAFT_KEY);
  console.log("[DB] Đã xóa draft");
}
