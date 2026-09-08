/**
 * Script tạo PWA icons (192x192 và 512x512)
 * Chạy: node generate-icons.cjs
 */
const fs = require("fs");
const path = require("path");

// Tạo SVG icon và convert thành base64 PNG placeholder
// Dùng raw Buffer với PNG header đơn giản
// Trong production nên dùng icon thật

function createSimplePNG(size) {
  // Tạo SVG trước
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${size * 0.2}" fill="#0284c7"/>
  <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" 
    font-family="Arial, sans-serif" font-weight="bold" fill="white" 
    font-size="${size * 0.25}">VKU</text>
  <text x="50%" y="72%" dominant-baseline="middle" text-anchor="middle"
    font-family="Arial, sans-serif" fill="rgba(255,255,255,0.8)"
    font-size="${size * 0.1}">Inspector</text>
</svg>`;
  return Buffer.from(svg);
}

const iconsDir = path.join(__dirname, "public", "icons");
fs.mkdirSync(iconsDir, { recursive: true });

// Lưu SVG (browser chấp nhận SVG cho PWA icons trong một số trường hợp)
// và tạo placeholder PNG bằng cách encode SVG thành "fake PNG" buffer
// NOTE: Dùng canvas hoặc sharp để tạo PNG thật trong production

for (const size of [192, 512]) {
  const svgBuf = createSimplePNG(size);
  // Lưu dạng SVG với đuôi .png (workaround khi không có canvas)
  fs.writeFileSync(path.join(iconsDir, `icon-${size}.png`), svgBuf);
  console.log(`✓ Tạo icon-${size}.png`);
}

console.log("Icons đã được tạo trong public/icons/");
