/**
 * database.ts — Khởi tạo IndexedDB với thư viện idb
 * Schema: 2 stores (inspections + drafts), có index
 */

import { openDB, type IDBPDatabase } from "idb";

const DB_NAME = "vku-facility-inspector";
const DB_VERSION = 1;

// Type cho database instance
export type VkuDB = IDBPDatabase<VkuDBSchema>;

// Schema định nghĩa các stores và indexes
export interface VkuDBSchema {
  inspections: {
    key: string;
    value: {
      id: string;
      building: string;
      floor: string;
      room: string;
      category: string;
      rating: number;
      note: string;
      photos: string[];
      createdAt: number;
      updatedAt: number;
      syncStatus: string;
      retryCount: number;
    };
    indexes: {
      "by-syncStatus": string;
      "by-createdAt": number;
      "by-updatedAt": number;
    };
  };
  drafts: {
    key: string;
    value: {
      key: string;
      data: object;
      savedAt: number;
    };
  };
}

// Singleton instance
let dbInstance: VkuDB | null = null;

/**
 * Lấy (hoặc tạo) database instance — Singleton pattern
 * Đảm bảo chỉ mở kết nối 1 lần duy nhất
 */
export async function getDB(): Promise<VkuDB> {
  if (dbInstance) return dbInstance;

  dbInstance = await openDB<VkuDBSchema>(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion) {
      console.log(`[DB] Nâng cấp schema từ v${oldVersion} lên v${DB_VERSION}`);

      // ===== Store: inspections =====
      if (!db.objectStoreNames.contains("inspections")) {
        const inspectionStore = db.createObjectStore("inspections", {
          keyPath: "id",
        });

        // Index để lọc theo trạng thái sync (dùng cho Sync Queue)
        inspectionStore.createIndex("by-syncStatus", "syncStatus");

        // Index để sắp xếp theo thời gian
        inspectionStore.createIndex("by-createdAt", "createdAt");
        inspectionStore.createIndex("by-updatedAt", "updatedAt");

        console.log("[DB] Tạo store: inspections (với 3 indexes)");
      }

      // ===== Store: drafts =====
      if (!db.objectStoreNames.contains("drafts")) {
        db.createObjectStore("drafts", { keyPath: "key" });
        console.log("[DB] Tạo store: drafts");
      }
    },
    blocked() {
      console.warn(
        "[DB] Database bị block bởi tab khác. Vui lòng đóng tab cũ."
      );
    },
    blocking() {
      // Version mới cần upgrade, đóng kết nối hiện tại
      dbInstance?.close();
      dbInstance = null;
    },
    terminated() {
      console.error("[DB] Kết nối database bị chấm dứt bất ngờ.");
      dbInstance = null;
    },
  });

  console.log(`[DB] Kết nối thành công: ${DB_NAME} v${DB_VERSION}`);
  return dbInstance;
}
