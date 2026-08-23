import * as fs from "fs"
import * as path from "path"

import {DOM_CAPTURE_OUTPUT_DIR,DEFAULT_ENCODING,} from "../../../config"


// ===================================================
// DOM Capture Result
// ===================================================

export type CreateHtmlResult = {
  success: boolean
  filePath: string | null
  message: string
}


// ===================================================
// Output Directory
// ===================================================

export function ensureOutputDir(): boolean {

  try {
    if (!fs.existsSync(DOM_CAPTURE_OUTPUT_DIR)) {
        fs.mkdirSync(DOM_CAPTURE_OUTPUT_DIR,{recursive: true,}
    )} else {
        // nothing
    }
    return true

  } catch (e) {
    console.error(`DOM出力ディレクトリ作成失敗: ${e}`);
    return false
  }
}


// ===================================================
// Create HTML
// ===================================================

export function createHTML(html: string,screenName: string): CreateHtmlResult {
  try {

    if (!ensureOutputDir()) {
      return {success: false,filePath: null,message:"DOM出力ディレクトリを作成できませんでした",}
    } else {
        // nothing
    }

    const safeScreenName =sanitizeFileName(screenName);
    const fileName =`${safeScreenName}.html`;
    const filePath =path.join(DOM_CAPTURE_OUTPUT_DIR,fileName);

    fs.writeFileSync(filePath,html,{encoding:DEFAULT_ENCODING,});

    return {success: true,filePath,message:`HTML出力成功: ${filePath}`,}

  } catch (e) {
    return {success: false,filePath: null,message:`HTML出力失敗: ${e}`,}
  }
}


// ===================================================
// File Name
// ===================================================

function sanitizeFileName(value: string): string {
  const normalized =value.trim().replace(/\s+/g,"_").replace(/[\\/:*?"<>|]/g,"_");

  if (normalized.length === 0) {
    return (`unknown_screen_${getJstTimestamp()}`);
  } else {
    // nothing
  }

  return normalized
}


// ===================================================
// JST Timestamp
// ===================================================

function getJstTimestamp(): string {

  const nowUtc =new Date();
  const jst =new Date(nowUtc.getTime()+(9*60*60*1000));
  const year =jst.getUTCFullYear()
  const month =String(jst.getUTCMonth() + 1).padStart(2,"0");
  const day =String(jst.getUTCDate()).padStart(2,"0");
  const hour =String(jst.getUTCHours()).padStart(2,"0");
  const minute =String(jst.getUTCMinutes()).padStart(2,"0");
  const second =String(jst.getUTCSeconds()).padStart(2,"0");
  const millisecond =String(jst.getUTCMilliseconds()).padStart(3,"0");
  return (`${year}` +`${month}` +`${day}` +`${hour}` +`${minute}` +`${second}` +`${millisecond}`);
}