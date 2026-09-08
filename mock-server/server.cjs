/**
 * Mock Backend — VKU Facility Inspector
 * Express server mô phỏng REST API
 *
 * Cách chạy:
 *   cd mock-server
 *   npm install
 *   npm start
 *
 * Endpoint:
 *   POST /api/inspections  → Nhận dữ liệu khảo sát
 */

const express = require("express");
const cors = require("cors");

const app = express();
const PORT = 3000;

// Lưu trữ tạm trong memory (không cần DB cho mock)
const inspections = [];

// Middleware
app.use(cors({ origin: "*" }));
app.use(express.json({ limit: "50mb" })); // 50mb để chứa ảnh base64

// Biến để giả lỗi API (dùng khi test retry)
let shouldFail = false;
let failCount = 0;
const MAX_FAILS = 2; // Thất bại 2 lần rồi thành công

/**
 * POST /api/inspections
 * Nhận dữ liệu khảo sát, trả về success/error
 */
app.post("/api/inspections", (req, res) => {
  // Delay giả 800ms để quan sát quá trình sync
  setTimeout(() => {
    // Giả lỗi để test retry (nếu shouldFail = true)
    if (shouldFail && failCount < MAX_FAILS) {
      failCount++;
      console.log(`[API] ❌ Giả lỗi lần ${failCount}/${MAX_FAILS}`);
      return res.status(500).json({
        success: false,
        message: `Giả lỗi server (lần ${failCount})`,
      });
    }

    // Reset fail counter
    if (failCount >= MAX_FAILS) {
      failCount = 0;
    }

    const inspection = req.body;

    // Validate dữ liệu cơ bản
    if (!inspection.id || !inspection.building || !inspection.room) {
      return res.status(400).json({
        success: false,
        message: "Thiếu dữ liệu bắt buộc (id, building, room)",
      });
    }

    // Lưu vào memory
    inspections.push({
      ...inspection,
      receivedAt: new Date().toISOString(),
    });

    console.log(
      `[API] ✅ Nhận inspection: ${inspection.id} | Tòa ${inspection.building} · Tầng ${inspection.floor} · ${inspection.room}`
    );
    console.log(`[API] 📊 Tổng đã nhận: ${inspections.length} khảo sát`);

    return res.status(201).json({
      success: true,
      id: inspection.id,
      message: "Khảo sát đã được lưu thành công",
    });
  }, 800);
});

/**
 * GET /api/inspections
 * Lấy danh sách đã nhận (để debug)
 */
app.get("/api/inspections", (_req, res) => {
  res.json({
    count: inspections.length,
    data: inspections.map((ins) => ({
      id: ins.id,
      building: ins.building,
      floor: ins.floor,
      room: ins.room,
      category: ins.category,
      rating: ins.rating,
      syncStatus: ins.syncStatus,
      receivedAt: ins.receivedAt,
    })),
  });
});

/**
 * POST /api/debug/toggle-fail
 * Bật/tắt chế độ giả lỗi để test retry
 */
app.post("/api/debug/toggle-fail", (_req, res) => {
  shouldFail = !shouldFail;
  failCount = 0;
  console.log(`[DEBUG] Chế độ giả lỗi: ${shouldFail ? "BẬT" : "TẮT"}`);
  res.json({ shouldFail, message: `Giả lỗi đã ${shouldFail ? "bật" : "tắt"}` });
});

/** GET /api/health — Kiểm tra server còn sống */
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", uptime: process.uptime() });
});

app.listen(PORT, () => {
  console.log(`\n🚀 VKU Mock Server chạy tại http://localhost:${PORT}`);
  console.log(`\nEndpoints:`);
  console.log(`  POST   http://localhost:${PORT}/api/inspections`);
  console.log(`  GET    http://localhost:${PORT}/api/inspections`);
  console.log(`  POST   http://localhost:${PORT}/api/debug/toggle-fail`);
  console.log(`  GET    http://localhost:${PORT}/api/health`);
  console.log(`\nĐang chờ dữ liệu từ client...\n`);
});
