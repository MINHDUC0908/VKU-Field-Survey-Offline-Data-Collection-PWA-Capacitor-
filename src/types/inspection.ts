/**
 * Core TypeScript types cho VKU Facility Inspector
 * Định nghĩa tất cả interfaces dùng xuyên suốt ứng dụng
 */

// Trạng thái đồng bộ của một inspection
export type SyncStatus =
  | "PENDING_SYNC"  // Chờ đồng bộ (tạo offline)
  | "SYNCING"        // Đang gửi lên server
  | "SYNCED"         // Đã đồng bộ thành công
  | "FAILED";        // Đồng bộ thất bại

// Interface chính cho dữ liệu khảo sát
export interface Inspection {
  id: string;             // UUID
  building: string;       // Tòa nhà (VD: "A", "B", "C")
  floor: string;          // Tầng (VD: "1", "2", "3")
  room: string;           // Phòng (VD: "A101")
  category: string;       // Hạng mục khảo sát
  rating: number;         // Đánh giá 1–5 sao
  note: string;           // Ghi chú
  photos: string[];       // Base64 ảnh lưu offline
  createdAt: number;      // Unix timestamp tạo
  updatedAt: number;      // Unix timestamp cập nhật
  syncStatus: SyncStatus; // Trạng thái đồng bộ
  retryCount: number;     // Số lần retry đã thực hiện
}

// State của form đa bước (chưa submit)
export interface InspectionFormState {
  building: string;
  floor: string;
  room: string;
  category: string;
  rating: number;
  note: string;
  photos: string[]; // Base64 strings
}

// Danh sách hạng mục khảo sát
export type InspectionCategory =
  | "hardware"       // Phần cứng (máy tính, màn hình)
  | "projector"      // Máy chiếu
  | "aircon"         // Điều hòa
  | "electricity"    // Điện (ổ cắm, đèn)
  | "furniture";     // Nội thất (bàn, ghế)

// Map tên hiển thị tiếng Việt cho từng hạng mục
export const CATEGORY_LABELS: Record<InspectionCategory, string> = {
  hardware: "Phần cứng",
  projector: "Máy chiếu",
  aircon: "Điều hòa",
  electricity: "Điện",
  furniture: "Nội thất",
};

// Danh sách tòa nhà VKU
export const BUILDINGS = ["A", "B", "C", "D", "E"] as const;
export type Building = (typeof BUILDINGS)[number];

// State mạng
export interface NetworkState {
  isOnline: boolean;
  pendingCount: number;
  isSyncing: boolean;
  lastSyncError: string | null;
}

// Response từ API server
export interface ApiResponse {
  success: boolean;
  id: string;
  message?: string;
}
