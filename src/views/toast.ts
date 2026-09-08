/**
 * toast.ts — Hiển thị thông báo toast ngắn gọn
 * Dùng chung toàn app
 */

export type ToastType = "success" | "error" | "info";

/**
 * Hiển thị toast notification
 * @param message - Nội dung thông báo
 * @param type - Loại: success | error | info
 * @param duration - Thời gian hiển thị (ms), mặc định 3000
 */
export function showToast(
  message: string,
  type: ToastType = "info",
  duration = 3000
): void {
  const container = document.getElementById("toast-container");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = message;

  container.appendChild(toast);

  // Tự xóa sau duration
  setTimeout(() => {
    toast.style.animation = "toast-out 0.3s ease forwards";
    setTimeout(() => toast.remove(), 300);
  }, duration);
}
