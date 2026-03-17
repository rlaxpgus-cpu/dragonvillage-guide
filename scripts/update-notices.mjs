import fs from "node:fs/promises";
import { chromium } from "playwright";

const BOARD_URL = "https://community.withhive.com/dvc/ko/board/5";

function normalize(text) {
  return String(text)
    .replace(/\s+/g, " ")
    .replace(/\u00A0/g, " ")
    .trim();
}

function makeKey(text) {
  return normalize(text)
    .replace(/\s+/g, "")
    .replace(/[^\[\]가-힣a-zA-Z0-9]/g, "");
}

async function collectTitles(page) {
  await page.goto(BOARD_URL, { waitUntil: "networkidle" });
  await page.waitForTimeout(4000);

  const lines = await page.evaluate(() => {
    const text = document.body.innerText || "";
    let arr = text
      .split("\n")
      .map((v) => v.trim())
      .filter(Boolean);

    const start = arr.findIndex((v) => /^공지사항\(\d+\)$/.test(v));
    if (start !== -1) {
      arr = arr.slice(start + 1);
    }

    return arr;
  });

  const allowedPrefixes = ["[공지]", "[이벤트]", "[안내]"];
  const seen = new Set();
  const result = [];

  for (const rawLine of lines) {
    const line = normalize(rawLine);

    if (line.startsWith("[업데이트]")) continue;
    if (!allowedPrefixes.some((v) => line.startsWith(v))) continue;
    if (line.length < 5 || line.length > 100) continue;

    const key = makeKey(line);
    if (seen.has(key)) continue;

    seen.add(key);
    result.push(line);
  }

  return result.slice(0, 5);
}

async function tryClickCandidate(page, locator) {
  const oldUrl = page.url();

  const popupPromise = page.context().waitForEvent("page", { timeout: 3000 }).catch(() => null);

  try {
    await locator.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);

    await locator.click({ force: true, timeout: 3000 });
    await page.waitForTimeout(1500);

    const popup = await popupPromise;
    if (popup) {
      await popup.waitForLoadState("networkidle").catch(() => {});
      const popupUrl = popup.url();
      await popup.close().catch(() => {});
      if (popupUrl && popupUrl !== "about:blank") {
        return popupUrl;
      }
    }

    const newUrl = page.url();
    if (newUrl && newUrl !== oldUrl) {
      return newUrl;
    }
  } catch {
    // ignore
  }

  return null;
}

async function findRealLink(page, title) {
  await page.goto(BOARD_URL, { waitUntil: "networkidle" });
  await page.waitForTimeout(3000);

  const exact = page.getByText(title, { exact: true });
  const count = await exact.count().catch(() => 0);

  if (!count) {
    return BOARD_URL;
  }

  // 보통 아래 목록 쪽이 마지막에 있는 경우가 많음
  for (let i = count - 1; i >= 0; i--) {
    const textNode = exact.nth(i);

    // 1차: 텍스트 자체 클릭
    let url = await tryClickCandidate(page, textNode);
    if (url && url !== BOARD_URL && !url.startsWith("javascript:")) {
      return url;
    }

    // 다시 원래 페이지 복귀
    await page.goto(BOARD_URL, { waitUntil: "networkidle" });
    await page.waitForTimeout(1500);

    // 2차: 가장 가까운 클릭 가능한 부모를 JS로 표시
    const marked = await exact.nth(i).evaluate((el) => {
      let node = el;
      let depth = 0;

      while (node && depth < 8) {
        const tag = node.tagName?.toLowerCase?.() || "";
        const hasOnClick = typeof node.onclick === "function" || node.hasAttribute?.("onclick");
        const href = node.getAttribute?.("href");
        const role = node.getAttribute?.("role");

        if (
          tag === "a" ||
          tag === "button" ||
          hasOnClick ||
          href !== null ||
          role === "link"
        ) {
          node.setAttribute("data-oai-click-target", "true");
          return true;
        }

        node = node.parentElement;
        depth++;
      }

      return false;
    }).catch(() => false);

    if (marked) {
      const markedLocator = page.locator('[data-oai-click-target="true"]').last();
      url = await tryClickCandidate(page, markedLocator);
      if (url && url !== BOARD_URL && !url.startsWith("javascript:")) {
        return url;
      }
    }

    await page.goto(BOARD_URL, { waitUntil: "networkidle" });
    await page.waitForTimeout(1500);
  }

  return BOARD_URL;
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const titles = await collectTitles(page);
  const items = [];

  for (const title of titles) {
    const link = await findRealLink(page, title);

    items.push({
      title,
      link,
      date: "",
      category: "공지사항",
      image: "images/default-notice.png"
    });
  }

  await browser.close();

  const payload = {
    updatedAt: new Date().toISOString(),
    items
  };

  await fs.writeFile(
    "notices.json",
    JSON.stringify(payload, null, 2),
    { encoding: "utf-8" }
  );

  console.log(items);
  console.log(`notices.json 저장 완료: ${items.length}개`);
}

main().catch(console.error);