import sharp from "sharp";
import { mkdirSync } from "fs";

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <!-- 背景 -->
  <rect width="512" height="512" rx="78" ry="78" fill="#1a1a1a"/>

  <!-- ショッピングカート（ラインアート） -->
  <g fill="none" stroke="#ffffff" stroke-width="18" stroke-linecap="round" stroke-linejoin="round">
    <!-- カートハンドル -->
    <path d="M120 150 L160 150 L200 320 L380 320"/>
    <!-- カート本体 -->
    <path d="M175 200 L370 200 L350 290 L210 290 Z"/>
    <!-- ホイール -->
    <circle cx="230" cy="365" r="22" fill="#ffffff" stroke="none"/>
    <circle cx="340" cy="365" r="22" fill="#ffffff" stroke="none"/>
  </g>

  <!-- コーラルオレンジバッジ -->
  <circle cx="400" cy="120" r="60" fill="#e8725a"/>
  <!-- ¥マーク -->
  <text x="400" y="140" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-size="70" font-weight="bold" fill="#ffffff">¥</text>
</svg>`;

const sizes = [
  { name: "icon-192x192.png", size: 192 },
  { name: "icon-512x512.png", size: 512 },
  { name: "apple-touch-icon.png", size: 180 },
];

for (const { name, size } of sizes) {
  await sharp(Buffer.from(svg))
    .resize(size, size)
    .png()
    .toFile(`public/${name}`);
  console.log(`Generated public/${name} (${size}x${size})`);
}
