import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import * as cheerio from "cheerio";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");

const PAGE_URL =
  process.env.BANNER_PAGE_URL ||
  "https://community.withhive.com/dvc/ko"; // ⭐ 공식 페이지 주소

const OUTPUT_DIR = path.join(ROOT, "images");
const OUTPUT_JSON = path.join(ROOT, "banner.json");

function toAbsoluteUrl(src, baseUrl) {
  try {
    return new URL(src, baseUrl).href;
  } catch {
    return null;
  }
}

function getExtFromUrl(url) {
  const pathname = new URL(url).pathname.toLowerCase();

  if (pathname.endsWith(".png")) return ".png";
  if (pathname.endsWith(".jpg")) return ".jpg";
  if (pathname.endsWith(".jpeg")) return ".jpeg";
  if (pathname.endsWith(".webp")) return ".webp";

  return ".png";
}

async function fetchHtml(url) {
  const res = await fetch(url, {
    headers: {
      "user-agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome"
    }
  });

  if (!res.ok) {
    throw new Error("페이지 요청 실패");
  }

  return await res.text();
}

function findBannerImage(html, baseUrl) {
  const $ = cheerio.load(html);

  const selectors = [
    ".swiper-slide-active img",
    ".swiper img",
    ".banner img",
    ".visual img",
    "img"
  ];

  for (const selector of selectors) {
    const imgs = $(selector).toArray();

    for (const el of imgs) {
      const src = $(el).attr("src");
      if (!src) continue;

      const abs = toAbsoluteUrl(src, baseUrl);
      if (!abs) continue;

      if (abs.includes("image")) {
        return abs;
      }
    }
  }

  return null;
}

async function downloadImage(url, outputPath) {
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error("이미지 다운로드 실패");
  }

  const buffer = Buffer.from(await res.arrayBuffer());
  await fs.writeFile(outputPath, buffer);
}

async function main() {
  console.log("배너 업데이트 시작");

  const html = await fetchHtml(PAGE_URL);
  const imageUrl = findBannerImage(html, PAGE_URL);

  if (!imageUrl) {
    throw new Error("배너 이미지 못 찾음");
  }

  console.log("찾은 이미지:", imageUrl);

  const ext = getExtFromUrl(imageUrl);
  const fileName = `main-banner${ext}`;
  const outputPath = path.join(OUTPUT_DIR, fileName);

  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  await downloadImage(imageUrl, outputPath);

  const bannerData = {
    updatedAt: new Date().toISOString(),
    imageUrl: `./images/${fileName}`
  };

  await fs.writeFile(
    OUTPUT_JSON,
    JSON.stringify(bannerData, null, 2),
    "utf-8"
  );

  console.log("완료");
}

main().catch(console.error);
