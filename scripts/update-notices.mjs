import fs from "node:fs/promises";
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

async function scrapeBoard(page, board){

  await page.goto(board.url,{ waitUntil:"networkidle" });

  await page.waitForTimeout(5000);

  const items = await page.evaluate((board)=>{

    const posts = [];

    const links = document.querySelectorAll("a");

    links.forEach(a=>{

      const href = a.href || "";

      if(!href.includes("/dvc/ko/board/")) return;

      const title = a.textContent.trim();

      if(!title) return;
      if(title.length < 4) return;
      if(title.length > 120) return;

      posts.push({
        title,
        link: href,
        date:"",
        category: board.category,
        image:"images/default-notice.png"
      });

    });

    return posts;

  },board);

  const unique = [];
  const seen = new Set();

  for(const item of items){

    if(seen.has(item.link)) continue;

    seen.add(item.link);
    unique.push(item);

  }

  return unique.slice(0,5);
}

async function main(){

  const browser = await chromium.launch({ headless:true });

  const page = await browser.newPage();

  let all = [];

  for(const board of BOARDS){

    const result = await scrapeBoard(page,board);

    console.log(`${board.category}: ${result.length}개 수집`);

    all.push(...result);

  }

  await browser.close();

  const payload = {
    updatedAt: new Date().toISOString(),
    items: all
  };

  await fs.writeFile(
    "notices.json",
    JSON.stringify(payload,null,2),
    {encoding:"utf-8"}
  );

  console.log(`notices.json 저장 완료: ${all.length}개`);

}

main().catch(console.error);