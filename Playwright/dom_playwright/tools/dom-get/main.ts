import {chromium,Page} from "playwright"
import {BASE_URL,DEFAULT_HEADLESS,DEFAULT_TIMEOUT,} from "../../config"
import {createHTML,ensureOutputDir,} from "./src/result_exporter"
import { DBExcelEditorTopPage } from "../../playwright/pages/DBExcelEditorTopPage";


// ===================================================
// DOM Get
//
// 現段階:
//
//   URL
//    ↓
//   Browser
//    ↓
//   page.content()
//    ↓
//   HTML
//
// 将来的には生成済みPage Objectを利用して
// 遷移先DOMを取得する。
// ===================================================

async function main():Promise<void> {
  // ===================================================
  // Output Directory
  // ===================================================

  if (!ensureOutputDir()) {
    console.error("DOM取得を中断します");
    process.exitCode = 1;
    return;
  }


  // ===================================================
  // Browser
  // ===================================================

  const browser =await chromium.launch({headless:DEFAULT_HEADLESS,});
  try {
    const page = await browser.newPage();
    page.setDefaultTimeout(DEFAULT_TIMEOUT);

    // ===================================================
    // Initial Screen
    // ===================================================
    console.log(`goto: ${BASE_URL}`);
    let i: number = 1;
    await page.goto(BASE_URL);
    await page.waitForLoadState("networkidle");
    const topPage = new DBExcelEditorTopPage(page);
    await topPage.setInitialization();
    await topPage.clickNewConnectionSetting();
    await page.waitForLoadState("networkidle");
    await capture(page, i);
    i += 1;

    
    // await browser.close();
    

  } finally {
    await browser.close();
  }
}

async function capture(page: Page, i: number) {
  // ===================================================
  // Capture
  // ===================================================
  const html = await page.content();
  const title = await page.title();
  const screenName = title.trim().length > 0? `${title}-p${i}`: `screen-p${i}`;
  const result = createHTML(html,screenName);
  console.log(result.message);
  if (!result.success) {
    process.exitCode = 1
  } else {
    // nothing
  }
}

main().catch((e) => {
      console.error("予期しないエラーが発生しました:",e);
      process.exitCode = 1
    });