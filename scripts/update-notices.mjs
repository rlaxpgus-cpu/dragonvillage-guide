import fs from "node:fs/promises";
import { url } from "node:inspector";
import { chromium } from "playwright";

const BOARDS = [
  {
    url: "https://community.withhive.com/dvc/ko/board/5",
    category: "공지사항"
  },
  {
     url: "https://community.withhive.com/dvc/ko/board/6",
    category: "업데이트"
  }
];
async function scrapeBoard(page, board) {
  await page.goto(board.url, { waitUntil: "networkidle" });
  await page.waitForTimeout(5000);

  const items = await page.evaluate((board) => {
    const results = [];
    const lines = [...document.querySelectorAll("li, div, article")];

    for (const el of lines) {
      const text = (el.innerText || "").trim();
      if (!text) continue;

      const firstLine = text.split("\n")[0].trim();

      if (!firstLine) continue;
      if (firstLine.length < 5) continue;
      if (firstLine.length > 80) continue;

      if (
        firstLine.includes("브랜드 사이트") ||
        firstLine.includes("전체글") ||
        firstLine.includes("새소식") ||
        firstLine.includes("공지사항") ||
        firstLine.includes("업데이트") ||
        firstLine.includes("이벤트") ||
        firstLine.includes("마케팅&컨텐츠") ||
        firstLine.includes("개발자 노트") ||
        firstLine.includes("게임 가이드") ||
        firstLine.includes("커뮤니티")
      ) {
        continue;
      }

      if (
        firstLine === "한국어" ||
        firstLine === "English" ||
        firstLine === "日本語"
      ) {
        continue;
      }

      if (!firstLine.includes("[") && !/\d{4}/.test(text)) continue;

      results.push({
        title: firstLine,
        link: board.url,
        date: "",
        category: board.category,
        image: "images/default-notice.png"
      });
    }

    const unique = [];
    const seen = new Set();

    for (const item of results) {
      if (seen.has(item.title)) continue;
      seen.add(item.title);
      unique.push(item);
    }

    return unique.slice(0, 5);
  }, board);

  return items;
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  let all = [];

  for (const board of BOARDS) {
    const result = await scrapeBoard(page, board);
    console.log(`[${board.category}] ${result.length}개 수집`);
    console.log(result);
    all.push(...result);
  }

  await browser.close();

  const payload = {
    updatedAt: new Date().toISOString(),
    items: all
  };

  await fs.writeFile(
    "notices.json",
    JSON.stringify(payload, null, 2),
    { encoding: "utf-8" }
  );

  console.log(`notices.json 저장 완료: ${all.length}개`);
}

main().catch(console.error);