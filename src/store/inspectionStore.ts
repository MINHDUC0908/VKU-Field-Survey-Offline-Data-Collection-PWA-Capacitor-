/**
 * App Store — Quản lý state của multi-step form
 * Sử dụng Observer pattern để các component có thể subscribe thay đổi
 */

import type { InspectionFormState } from "../types/inspection";

// State ban đầu của form (khi bắt đầu hoặc reset)
const INITIAL_STATE: InspectionFormState = {
  building: "",
  floor: "",
  room: "",
  category: "",
  rating: 0,
  note: "",
  photos: [],
};

// Kiểu cho listener callback
type Listener<T> = (state: T) => void;

/**
 * InspectionStore — Singleton store quản lý form state
 * Không dùng global variable bừa bãi: state được đóng gói trong class
 */
class InspectionStore {
  private state: InspectionFormState = { ...INITIAL_STATE };
  private listeners: Set<Listener<InspectionFormState>> = new Set();

  /** Lấy snapshot của state hiện tại (immutable) */
  getState(): Readonly<InspectionFormState> {
    return { ...this.state };
  }

  /**
   * Ghi đè toàn bộ state (dùng khi restore draft)
   * @param newState - State mới để thay thế
   */
  setState(newState: Partial<InspectionFormState>): void {
    this.state = { ...this.state, ...newState };
    this.notify();
  }

  /**
   * Cập nhật một field cụ thể của form
   * @param field - Tên field cần cập nhật
   * @param value - Giá trị mới
   */
  updateField<K extends keyof InspectionFormState>(
    field: K,
    value: InspectionFormState[K]
  ): void {
    this.state = { ...this.state, [field]: value };
    this.notify();
  }

  /** Reset form về state ban đầu */
  reset(): void {
    this.state = { ...INITIAL_STATE };
    this.notify();
  }

  /**
   * Subscribe vào thay đổi state
   * @returns Hàm unsubscribe để cleanup
   */
  subscribe(listener: Listener<InspectionFormState>): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** Thông báo tất cả listeners về thay đổi */
  private notify(): void {
    const snapshot = this.getState();
    this.listeners.forEach((listener) => listener(snapshot));
  }
}

// Export singleton instance
export const inspectionStore = new InspectionStore();
