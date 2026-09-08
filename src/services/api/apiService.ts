/**
 * apiService.ts — Giao tiếp với REST API backend
 * Sử dụng VITE_API_URL từ .env
 */

import type { Inspection, ApiResponse } from "../../types/inspection";

// Lấy base URL từ env (fallback về localhost)
const API_BASE =
  (import.meta.env.VITE_API_URL as string | undefined) ??
  "http://localhost:3000/api";

/**
 * Gửi một inspection lên server
 * @param inspection - Dữ liệu khảo sát đầy đủ
 * @returns ApiResponse với success và id
 * @throws Error nếu network lỗi hoặc server trả về lỗi
 */
export async function postInspection(
  inspection: Inspection
): Promise<ApiResponse> {
  const response = await fetch(`${API_BASE}/inspections`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(inspection),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "Unknown error");
    throw new Error(`API lỗi ${response.status}: ${errorText}`);
  }

  const data = (await response.json()) as ApiResponse;
  return data;
}

/**
 * Kiểm tra server còn sống không
 */
export async function checkHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/health`, { method: "GET" });
    return res.ok;
  } catch {
    return false;
  }
}
