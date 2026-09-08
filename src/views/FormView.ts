/**
 * FormView.ts — Multi-step form khảo sát (6 bước)
 *
 * Bước 1: Vị trí (Tòa nhà / Tầng / Phòng)
 * Bước 2: Hạng mục khảo sát
 * Bước 3: Đánh giá sao (1–5)
 * Bước 4: Ghi chú
 * Bước 5: Upload ảnh
 * Bước 6: Xem lại & Submit
 *
 * Auto-save vào IndexedDB sau mỗi thay đổi
 * Khôi phục draft khi refresh/mở lại
 */

import { inspectionStore } from "../store/inspectionStore";
import {
  saveDraft,
  getDraft,
  deleteDraft,
  addInspection,
} from "../services/db/inspectionRepository";
import { triggerSync } from "../services/sync/syncManager";
import { renderStepIndicator } from "../components/StepIndicator";
import {
  BUILDINGS,
  CATEGORY_LABELS,
  type InspectionFormState,
  type InspectionCategory,
} from "../types/inspection";
import { showToast } from "./toast";

const TOTAL_STEPS = 6;
let currentStep = 1;
let autoSaveTimer: ReturnType<typeof setTimeout> | null = null;
let onBackCallback: (() => void) | null = null;
// Lưu container gốc (main element) — tránh dùng querySelector bắt nhầm header
let mainContainer: HTMLElement | null = null;

// Nhãn các bước
const STEP_TITLES: Record<number, string> = {
  1: "Vị trí phòng",
  2: "Hạng mục",
  3: "Đánh giá",
  4: "Ghi chú",
  5: "Hình ảnh",
  6: "Xem lại & Gửi",
};

/**
 * Render toàn bộ form view vào container
 */
export async function renderForm(
  container: HTMLElement,
  onBack: () => void
): Promise<void> {
  onBackCallback = onBack;
  currentStep = 1;
  mainContainer = container; // lưu lại để dùng trong navigation
  inspectionStore.reset();

  // Kiểm tra draft đã lưu chưa
  const savedDraft = await getDraft();
  if (savedDraft) {
    const restoreDraft = await confirmRestoreDraft(container);
    if (restoreDraft) {
      inspectionStore.setState(savedDraft);
    } else {
      await deleteDraft();
    }
  }

  renderCurrentStep(container);
}

/** Hỏi người dùng có muốn phục hồi draft không */
function confirmRestoreDraft(container: HTMLElement): Promise<boolean> {
  return new Promise((resolve) => {
    // Render tạm banner
    container.innerHTML = `
      <div class="container">
        <div class="card" style="text-align:center; padding:2.5rem;">
          <div style="font-size:2.5rem; margin-bottom:1rem;">📝</div>
          <h2 style="margin-bottom:0.5rem; font-size:1.25rem;">Tiếp tục từ lần trước?</h2>
          <p style="color:var(--color-text-secondary); margin-bottom:1.5rem; font-size:0.9rem;">
            Bạn có một bản nháp chưa hoàn thành. Bạn muốn tiếp tục hay bắt đầu mới?
          </p>
          <div style="display:flex; gap:0.75rem; justify-content:center;">
            <button id="btn-discard" class="btn btn-secondary">🗑 Bỏ qua, làm mới</button>
            <button id="btn-restore" class="btn btn-primary">↩ Tiếp tục</button>
          </div>
        </div>
      </div>
    `;
    document.getElementById("btn-restore")?.addEventListener("click", () =>
      resolve(true)
    );
    document.getElementById("btn-discard")?.addEventListener("click", () =>
      resolve(false)
    );
  });
}

/** Render bước hiện tại */
function renderCurrentStep(container: HTMLElement): void {
  const state = inspectionStore.getState();

  container.innerHTML = `
    <div class="container">
      <div class="card" id="form-card">
        <div id="step-indicator-mount"></div>
        <div class="step-header">
          <div class="step-label">Bước ${currentStep} / ${TOTAL_STEPS}</div>
          <h2 class="step-title">${STEP_TITLES[currentStep]}</h2>
        </div>
        <div id="step-content"></div>
        <div id="autosave-indicator" class="autosave-indicator">Đã lưu tự động</div>
      </div>
    </div>
  `;

  // Mount step indicator
  const indicatorMount = document.getElementById("step-indicator-mount");
  if (indicatorMount) {
    renderStepIndicator(indicatorMount, currentStep, TOTAL_STEPS);
  }

  // Render nội dung từng bước
  const content = document.getElementById("step-content");
  if (!content) return;

  switch (currentStep) {
    case 1: renderStep1(content, state); break;
    case 2: renderStep2(content, state); break;
    case 3: renderStep3(content, state); break;
    case 4: renderStep4(content, state); break;
    case 5: renderStep5(content, state); break;
    case 6: renderStep6(content, state); break;
  }
}

// =============================================
// Bước 1: Vị trí
// =============================================
function renderStep1(content: HTMLElement, state: Readonly<InspectionFormState>): void {
  const floors = Array.from({ length: 10 }, (_, i) => String(i + 1));

  content.innerHTML = `
    <div class="form-group">
      <label class="form-label">Tòa nhà <span class="required">*</span></label>
      <select id="input-building" class="form-control">
        <option value="">-- Chọn tòa nhà --</option>
        ${BUILDINGS.map(
          (b) =>
            `<option value="${b}" ${state.building === b ? "selected" : ""}>Tòa ${b}</option>`
        ).join("")}
      </select>
    </div>
    <div class="form-group">
      <label class="form-label">Tầng <span class="required">*</span></label>
      <select id="input-floor" class="form-control">
        <option value="">-- Chọn tầng --</option>
        ${floors.map(
          (f) =>
            `<option value="${f}" ${state.floor === f ? "selected" : ""}>Tầng ${f}</option>`
        ).join("")}
      </select>
    </div>
    <div class="form-group">
      <label class="form-label">Số phòng <span class="required">*</span></label>
      <input
        type="text"
        id="input-room"
        class="form-control"
        placeholder="VD: A301, B205..."
        value="${state.room}"
        maxlength="20"
      />
      <div class="form-hint">Nhập số phòng theo ký hiệu trên cửa phòng</div>
    </div>
    <div class="form-nav">
      <button id="btn-back" class="btn btn-secondary">← Quay lại</button>
      <button id="btn-next" class="btn btn-primary">Tiếp tục →</button>
    </div>
  `;

  // Auto-save events
  ["input-building", "input-floor", "input-room"].forEach((id) => {
    document.getElementById(id)?.addEventListener("change", () => {
      const building = (document.getElementById("input-building") as HTMLSelectElement).value;
      const floor = (document.getElementById("input-floor") as HTMLSelectElement).value;
      const room = (document.getElementById("input-room") as HTMLInputElement).value.trim();
      inspectionStore.setState({ building, floor, room });
      scheduleAutoSave();
    });
  });

  document.getElementById("input-room")?.addEventListener("input", () => {
    const room = (document.getElementById("input-room") as HTMLInputElement).value.trim();
    inspectionStore.updateField("room", room);
    scheduleAutoSave();
  });

  document.getElementById("btn-back")?.addEventListener("click", () => {
    onBackCallback?.();
  });

  document.getElementById("btn-next")?.addEventListener("click", () => {
    const s = inspectionStore.getState();
    if (!s.building || !s.floor || !s.room) {
      showToast("Vui lòng điền đầy đủ thông tin vị trí", "error");
      return;
    }
    goToStep(currentStep + 1);
  });
}

// =============================================
// Bước 2: Hạng mục
// =============================================
function renderStep2(content: HTMLElement, state: Readonly<InspectionFormState>): void {
  const categories: Array<{ id: InspectionCategory; icon: string }> = [
    { id: "hardware", icon: "🖥️" },
    { id: "projector", icon: "📽️" },
    { id: "aircon", icon: "❄️" },
    { id: "electricity", icon: "⚡" },
    { id: "furniture", icon: "🪑" },
  ];

  content.innerHTML = `
    <div class="category-grid" style="grid-template-columns: 1fr 1fr;">
      ${categories.map(
        (cat) => `
        <div class="category-item">
          <input
            type="radio"
            name="category"
            id="cat-${cat.id}"
            value="${cat.id}"
            ${state.category === cat.id ? "checked" : ""}
          />
          <label class="category-label" for="cat-${cat.id}">
            <span class="category-icon">${cat.icon}</span>
            <span class="category-name">${CATEGORY_LABELS[cat.id]}</span>
          </label>
        </div>
      `
      ).join("")}
    </div>
    <div class="form-nav" style="margin-top:1.5rem;">
      <button id="btn-back" class="btn btn-secondary">← Quay lại</button>
      <button id="btn-next" class="btn btn-primary">Tiếp tục →</button>
    </div>
  `;

  // Radio change event
  content.querySelectorAll('input[name="category"]').forEach((radio) => {
    radio.addEventListener("change", (e) => {
      const val = (e.target as HTMLInputElement).value;
      inspectionStore.updateField("category", val);
      scheduleAutoSave();
    });
  });

  document.getElementById("btn-back")?.addEventListener("click", () =>
    goToStep(currentStep - 1)
  );

  document.getElementById("btn-next")?.addEventListener("click", () => {
    if (!inspectionStore.getState().category) {
      showToast("Vui lòng chọn hạng mục khảo sát", "error");
      return;
    }
    goToStep(currentStep + 1);
  });
}

// =============================================
// Bước 3: Đánh giá sao
// =============================================
function renderStep3(content: HTMLElement, state: Readonly<InspectionFormState>): void {
  const ratingLabels: Record<number, string> = {
    0: "Chưa chọn",
    1: "Rất kém",
    2: "Kém",
    3: "Trung bình",
    4: "Tốt",
    5: "Rất tốt",
  };

  content.innerHTML = `
    <div style="text-align:center; padding: 1rem 0;">
      <p style="color:var(--color-text-secondary); margin-bottom:1rem; font-size:0.9rem;">
        Nhấn vào ngôi sao để đánh giá tình trạng
      </p>
      <div class="star-rating" id="star-container">
        ${[1, 2, 3, 4, 5]
          .map(
            (n) =>
              `<button class="star-btn ${state.rating >= n ? "active" : ""}"
                data-value="${n}" type="button" title="${ratingLabels[n]}">★</button>`
          )
          .join("")}
      </div>
      <div class="rating-label" id="rating-label">${ratingLabels[state.rating]}</div>
    </div>
    <div class="form-nav">
      <button id="btn-back" class="btn btn-secondary">← Quay lại</button>
      <button id="btn-next" class="btn btn-primary">Tiếp tục →</button>
    </div>
  `;

  // Star click events
  const starContainer = document.getElementById("star-container");
  const ratingLabel = document.getElementById("rating-label");

  starContainer?.querySelectorAll(".star-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const val = Number((btn as HTMLButtonElement).dataset["value"]);
      inspectionStore.updateField("rating", val);
      scheduleAutoSave();

      // Cập nhật visual
      starContainer.querySelectorAll(".star-btn").forEach((s, i) => {
        s.classList.toggle("active", i < val);
      });
      if (ratingLabel) ratingLabel.textContent = ratingLabels[val];
    });

    // Hover preview
    btn.addEventListener("mouseenter", () => {
      const val = Number((btn as HTMLButtonElement).dataset["value"]);
      if (ratingLabel) ratingLabel.textContent = ratingLabels[val];
    });

    btn.addEventListener("mouseleave", () => {
      const current = inspectionStore.getState().rating;
      if (ratingLabel) ratingLabel.textContent = ratingLabels[current];
    });
  });

  document.getElementById("btn-back")?.addEventListener("click", () =>
    goToStep(currentStep - 1)
  );

  document.getElementById("btn-next")?.addEventListener("click", () => {
    if (inspectionStore.getState().rating === 0) {
      showToast("Vui lòng chọn đánh giá (1–5 sao)", "error");
      return;
    }
    goToStep(currentStep + 1);
  });
}

// =============================================
// Bước 4: Ghi chú
// =============================================
function renderStep4(content: HTMLElement, state: Readonly<InspectionFormState>): void {
  content.innerHTML = `
    <div class="form-group">
      <label class="form-label">Ghi chú / Mô tả vấn đề</label>
      <textarea
        id="input-note"
        class="form-control"
        placeholder="Mô tả chi tiết tình trạng thiết bị, vấn đề phát hiện..."
        rows="5"
      >${state.note}</textarea>
      <div class="form-hint">Không bắt buộc. Tối đa 500 ký tự.</div>
    </div>
    <div id="char-count" style="text-align:right; font-size:0.75rem; color:var(--color-text-muted); margin-top:-1rem; margin-bottom:1rem;">
      ${state.note.length}/500
    </div>
    <div class="form-nav">
      <button id="btn-back" class="btn btn-secondary">← Quay lại</button>
      <button id="btn-next" class="btn btn-primary">Tiếp tục →</button>
    </div>
  `;

  const textarea = document.getElementById("input-note") as HTMLTextAreaElement;
  const charCount = document.getElementById("char-count");

  textarea?.addEventListener("input", () => {
    const val = textarea.value.slice(0, 500);
    if (textarea.value.length > 500) textarea.value = val;
    if (charCount) charCount.textContent = `${val.length}/500`;
    inspectionStore.updateField("note", val);
    scheduleAutoSave();
  });

  document.getElementById("btn-back")?.addEventListener("click", () =>
    goToStep(currentStep - 1)
  );

  document.getElementById("btn-next")?.addEventListener("click", () =>
    goToStep(currentStep + 1)
  );
}

// =============================================
// Bước 5: Upload ảnh
// =============================================
function renderStep5(content: HTMLElement, state: Readonly<InspectionFormState>): void {
  content.innerHTML = `
    <div>
      <label for="photo-input" class="photo-upload-area" id="upload-area">
        <div class="photo-upload-icon">📷</div>
        <div class="photo-upload-text">Chụp ảnh hoặc chọn từ thư viện</div>
        <div class="photo-upload-hint">Hỗ trợ JPG, PNG · Tối đa 5 ảnh</div>
      </label>
      <input
        type="file"
        id="photo-input"
        accept="image/*"
        multiple
        style="display:none;"
      />
    </div>
    <div id="photo-preview-grid" class="photo-preview-grid"></div>
    <div class="form-nav">
      <button id="btn-back" class="btn btn-secondary">← Quay lại</button>
      <button id="btn-next" class="btn btn-primary">Tiếp tục →</button>
    </div>
  `;

  // Hiển thị ảnh đã có sẵn
  renderPhotoPreviews(state.photos);

  const fileInput = document.getElementById("photo-input") as HTMLInputElement;
  const uploadArea = document.getElementById("upload-area");

  // Click vào area = mở file picker
  uploadArea?.addEventListener("click", () => fileInput.click());

  fileInput?.addEventListener("change", async () => {
    const files = Array.from(fileInput.files ?? []);
    const current = inspectionStore.getState().photos;

    if (current.length + files.length > 5) {
      showToast("Tối đa 5 ảnh", "error");
      return;
    }

    // Convert từng file sang base64
    const newPhotos: string[] = [];
    for (const file of files) {
      const base64 = await fileToBase64(file);
      newPhotos.push(base64);
    }

    const updated = [...current, ...newPhotos];
    inspectionStore.updateField("photos", updated);
    scheduleAutoSave();
    renderPhotoPreviews(updated);

    // Reset input để có thể chọn lại cùng file
    fileInput.value = "";
  });

  // Drag and drop
  uploadArea?.addEventListener("dragover", (e) => {
    e.preventDefault();
    uploadArea.style.borderColor = "var(--color-primary)";
  });

  uploadArea?.addEventListener("dragleave", () => {
    uploadArea.style.borderColor = "";
  });

  uploadArea?.addEventListener("drop", async (e) => {
    e.preventDefault();
    uploadArea.style.borderColor = "";
    const files = Array.from(e.dataTransfer?.files ?? []).filter((f) =>
      f.type.startsWith("image/")
    );
    if (!files.length) return;

    const current = inspectionStore.getState().photos;
    const newPhotos: string[] = [];
    for (const file of files.slice(0, 5 - current.length)) {
      newPhotos.push(await fileToBase64(file));
    }
    const updated = [...current, ...newPhotos];
    inspectionStore.updateField("photos", updated);
    scheduleAutoSave();
    renderPhotoPreviews(updated);
  });

  document.getElementById("btn-back")?.addEventListener("click", () =>
    goToStep(currentStep - 1)
  );

  document.getElementById("btn-next")?.addEventListener("click", () =>
    goToStep(currentStep + 1)
  );
}

/** Render grid preview ảnh với nút xóa */
function renderPhotoPreviews(photos: readonly string[]): void {
  const grid = document.getElementById("photo-preview-grid");
  if (!grid) return;

  if (photos.length === 0) {
    grid.innerHTML = "";
    return;
  }

  grid.innerHTML = photos
    .map(
      (src, i) => `
      <div class="photo-preview-item">
        <img src="${src}" alt="Ảnh ${i + 1}" loading="lazy" />
        <button class="photo-remove-btn" data-index="${i}" title="Xóa ảnh">✕</button>
      </div>
    `
    )
    .join("");

  // Xóa ảnh
  grid.querySelectorAll(".photo-remove-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const idx = Number((btn as HTMLButtonElement).dataset["index"]);
      const current = [...inspectionStore.getState().photos];
      current.splice(idx, 1);
      inspectionStore.updateField("photos", current);
      scheduleAutoSave();
      renderPhotoPreviews(current);
    });
  });
}

/** Convert File sang base64 string */
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// =============================================
// Bước 6: Xem lại & Submit
// =============================================
function renderStep6(content: HTMLElement, state: Readonly<InspectionFormState>): void {
  const stars = "★".repeat(state.rating) + "☆".repeat(5 - state.rating);
  const categoryLabel =
    CATEGORY_LABELS[state.category as InspectionCategory] ?? state.category;

  content.innerHTML = `
    <div class="review-section">
      <div class="review-label">📍 Vị trí</div>
      <div class="review-value">Tòa ${state.building} · Tầng ${state.floor} · Phòng ${state.room}</div>
    </div>

    <div class="review-section">
      <div class="review-label">🔧 Hạng mục</div>
      <div class="review-value">${categoryLabel}</div>
    </div>

    <div class="review-section">
      <div class="review-label">⭐ Đánh giá</div>
      <div class="review-value" style="color:#f59e0b; font-size:1.25rem;">${stars}</div>
    </div>

    <div class="review-section">
      <div class="review-label">📝 Ghi chú</div>
      <div class="review-value" style="white-space: pre-wrap;">${state.note || "(Không có ghi chú)"}</div>
    </div>

    ${
      state.photos.length > 0
        ? `<div class="review-section">
        <div class="review-label">📷 Hình ảnh (${state.photos.length})</div>
        <div class="review-photos">
          ${state.photos.map((src, i) => `<img src="${src}" alt="Ảnh ${i + 1}" />`).join("")}
        </div>
      </div>`
        : ""
    }

    <div style="background:var(--primary-light); border-radius:var(--r-lg); padding:10px 14px; margin-bottom:12px; font-size:12px; color:var(--primary-dark);">
      ${
        navigator.onLine
          ? "🟢 <strong>Online</strong> — Dữ liệu sẽ được gửi lên server ngay."
          : "🔴 <strong>Offline</strong> — Dữ liệu sẽ lưu và đồng bộ khi có mạng."
      }
    </div>

    <div class="form-nav">
      <button id="btn-back" class="btn btn-secondary">← Quay lại</button>
      <button id="btn-submit" class="btn btn-primary">
        ✅ Gửi khảo sát
      </button>
    </div>
  `;

  document.getElementById("btn-back")?.addEventListener("click", () =>
    goToStep(currentStep - 1)
  );

  document.getElementById("btn-submit")?.addEventListener("click", () =>
    void handleSubmit()
  );
}

// =============================================
// Submit
// =============================================
async function handleSubmit(): Promise<void> {
  if (!mainContainer) return;
  const submitBtn = document.getElementById("btn-submit") as HTMLButtonElement;
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner"></span> Đang lưu...';
  }

  const state = inspectionStore.getState();

  // Tạo inspection object với UUID
  const inspection = {
    id: crypto.randomUUID(),
    building: state.building,
    floor: state.floor,
    room: state.room,
    category: state.category,
    rating: state.rating,
    note: state.note,
    photos: state.photos,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    syncStatus: "PENDING_SYNC" as const,
    retryCount: 0,
  };

  try {
    // 1. Lưu vào IndexedDB
    await addInspection(inspection);

    // 2. Xóa draft
    await deleteDraft();

    // 3. Reset store
    inspectionStore.reset();

    // 4. Trigger sync (nếu online)
    void triggerSync();

    // 5. Hiển thị màn hình thành công
    renderSuccessScreen(mainContainer);
  } catch (error) {
    console.error("[Form] Submit thất bại:", error);
    showToast("Có lỗi khi lưu. Vui lòng thử lại.", "error");
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = "✅ Gửi khảo sát";
    }
  }
}

/** Màn hình thành công sau submit */
function renderSuccessScreen(container: HTMLElement): void {
  container.innerHTML = `
    <div class="container">
      <div class="card">
        <div class="success-screen">
          <div class="success-icon">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          </div>
          <h2 class="success-title">Đã lưu khảo sát!</h2>
          <p class="success-desc">
            ${
              navigator.onLine
                ? "Dữ liệu đang được đồng bộ lên server..."
                : "Dữ liệu đã lưu offline. Sẽ đồng bộ khi có mạng."
            }
          </p>
          <div style="display:flex; gap:0.75rem; justify-content:center;">
            <button id="btn-new-survey" class="btn btn-primary">+ Khảo sát mới</button>
            <button id="btn-go-home" class="btn btn-secondary">🏠 Trang chủ</button>
          </div>
        </div>
      </div>
    </div>
  `;

  document.getElementById("btn-new-survey")?.addEventListener("click", () => {
    if (!mainContainer) return;
    currentStep = 1;
    inspectionStore.reset();
    renderCurrentStep(mainContainer);
  });

  document.getElementById("btn-go-home")?.addEventListener("click", () => {
    onBackCallback?.();
  });
}

// =============================================
// Navigation helpers
// =============================================
function goToStep(step: number): void {
  if (!mainContainer) return;
  if (step < 1) {
    onBackCallback?.();
    return;
  }
  currentStep = Math.min(step, TOTAL_STEPS);
  renderCurrentStep(mainContainer);
}

// =============================================
// Auto-save
// =============================================
function scheduleAutoSave(): void {
  // Debounce 500ms để không save quá nhiều
  if (autoSaveTimer) clearTimeout(autoSaveTimer);
  autoSaveTimer = setTimeout(async () => {
    const state = inspectionStore.getState();
    await saveDraft(state);
    showAutosaveIndicator();
  }, 500);
}

/** Hiển thị indicator "✓ Đã lưu" trong 2 giây */
function showAutosaveIndicator(): void {
  const el = document.getElementById("autosave-indicator");
  if (!el) return;
  el.classList.add("visible");
  setTimeout(() => el.classList.remove("visible"), 2000);
}
