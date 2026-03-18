import fs from "node:fs/promises";
import { chromium } from "playwright";

const BOARD_URL = "https://community.withhive.com/dvc/ko/board/5";
const DEFAULT_IMAGE = "images/default-notice.png";
const MAX_ITEMS = 5;
const ALLOWED_PREFIXES = ["[공지]", "[이벤트]", "[안내]"];

function normalize(text) {
  return String(text || "")
    .replace(/\u00A0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function makeKey(text) {
  return normalize(text)
    .replace(/\s+/g, "")
    .replace(/[^\[\]가-힣a-zA-Z0-9]/g, "");
}

function toAbsoluteUrl(url) {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  if (url.startsWith("//")) return `https:${url}`;
  if (url.startsWith("/")) return `https://community.withhive.com${url}`;
  return "";
}

function isAllowedTitle(title) {
  const text = normalize(title);

  if (!text) return false;
  if (text.length < 5 || text.length > 120) return false;

  const hasAllowedPrefix = ALLOWED_PREFIXES.some((prefix) => text.startsWith(prefix));
  if (!hasAllowedPrefix) return false;

  if (text.includes("업데이트")) return false;

  return true;
}

async function openBoard(page) {
  await page.goto(BOARD_URL, { waitUntil: "networkidle", timeout: 120000 });
  await page.waitForTimeout(2500);
}

async function collectTitles(page) {
  await openBoard(page);

  const lines = await page.evaluate(() => {
    const text = document.body.innerText || "";
    let arr = text
      .split("\n")
      .map((v) => v.trim())
      .filter(Boolean);

    const startIndex = arr.findIndex((v) => /^공지사항\(\d+\)$/.test(v));
    if (startIndex !== -1) {
      arr = arr.slice(startIndex + 1);
    }

    return arr;
  });

  const seen = new Set();
  const result = [];

  for (const rawLine of lines) {
    const line = normalize(rawLine);

    if (!isAllowedTitle(line)) continue;

    const key = makeKey(line);
    if (seen.has(key)) continue;

    seen.add(key);
    result.push(line);

    if (result.length >= MAX_ITEMS) break;
  }

  return result;
}

async function tryClickCandidate(page, locator) {
  const oldUrl = page.url();
  const popupPromise = page.context().waitForEvent("page", { timeout: 3000 }).catch(() => null);

  try {
    await locator.scrollIntoViewIfNeeded().catch(() => {});
    await page.waitForTimeout(300);
    await locator.click({ force: true, timeout: 5000 });
    await page.waitForTimeout(1500);

    const popup = await popupPromise;
    if (popup) {
      await popup.waitForLoadState("networkidle").catch(() => {});
      const popupUrl = popup.url();
      await popup.close().catch(() => {});

      if (popupUrl && popupUrl !== "about:blank" && !popupUrl.startsWith("javascript:")) {
        return popupUrl;
      }
    }

    const newUrl = page.url();
    if (newUrl && newUrl !== oldUrl && !newUrl.startsWith("javascript:")) {
      return newUrl;
    }
  } catch {
    // ignore
  }

  return null;
}

async function markClickableParent(locator) {
  return locator.evaluate((el) => {
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
}

async function findRealLink(page, title) {
  await openBoard(page);

  const exactCount = await page.getByText(title, { exact: true }).count().catch(() => 0);
  if (!exactCount) return BOARD_URL;

  for (let i = exactCount - 1; i >= 0; i--) {
    await openBoard(page);

    const textNode = page.getByText(title, { exact: true }).nth(i);

    let url = await tryClickCandidate(page, textNode);
    if (url && url !== BOARD_URL) return url;

    await openBoard(page);

    const freshTextNode = page.getByText(title, { exact: true }).nth(i);
    const marked = await markClickableParent(freshTextNode);

    if (marked) {
      const markedLocator = page.locator('[data-oai-click-target="true"]').last();
      url = await tryClickCandidate(page, markedLocator);
      if (url && url !== BOARD_URL) return url;
    }
  }

  return BOARD_URL;
}

async function extractImageFromArticle(browser, articleUrl) {
  if (!articleUrl || articleUrl === BOARD_URL) return DEFAULT_IMAGE;

  const page = await browser.newPage();
  try {
    await page.goto(articleUrl, { waitUntil: "networkidle", timeout: 120000 });
    await page.waitForTimeout(2000);

    const image = await page.evaluate(() => {
      const getAttr = (selector, attr = "content") => {
        const el = document.querySelector(selector);
        return el ? el.getAttribute(attr) || "" : "";
      };

      return (
        getAttr('meta[property="og:image"]') ||
        getAttr('meta[name="twitter:image"]') ||
        getAttr("article img", "src") ||
        getAttr("img", "src")
      );
    });

    return toAbsoluteUrl(image) || DEFAULT_IMAGE;
  } catch {
    return DEFAULT_IMAGE;
  } finally {
    await page.close().catch(() => {});
  }
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    const titles = await collectTitles(page);
    const items = [];

    for (const title of titles) {
      const link = await findRealLink(page, title);
      const image = await extractImageFromArticle(browser, link);

      items.push({
        title,
        link,
        date: "",
        category: "공지사항",
        image
      });
    }

    const payload = {
      updatedAt: new Date().toISOString(),
      items: items.slice(0, MAX_ITEMS)
    };

    await fs.writeFile(
      "notices.json",
      JSON.stringify(payload, null, 2),
      { encoding: "utf-8" }
    );

    console.log(JSON.stringify(payload, null, 2));
    console.log(`notices.json 저장 완료: ${payload.items.length}개`);
  } finally {
    await page.close().catch(() => {});
    await browser.close().catch(() => {});
  }
}

main().catch((error) => {
  console.error("공지사항 업데이트 실패:", error);
  process.exit(1);
});
