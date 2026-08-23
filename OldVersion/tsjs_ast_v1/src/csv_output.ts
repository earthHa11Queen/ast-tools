import fs from "fs";
import path, { join } from "path";
import * as Config from "../config";
import { CsvHeader, CsvHeaderType } from "./method_info";
import * as iconv from "iconv-lite";

// --- 修正履歴（2026-07） ---
// 【バグ修正D】escapeCsv内、ダブルクォートのエスケープが stringValue.replace('"', '""') のままだと
//   JavaScriptの String.replace() は第一引数が文字列（正規表現でない）の場合、
//   最初に見つかった1箇所しか置換しない。role列（コメントから取得する「役割」）等に
//   ダブルクォートが2つ以上含まれる場合、2つ目以降が未エスケープのままCSVに出力され、
//   CSVとして壊れる（列がずれる）不具合があった。
//   正規表現 /"/g を使った全置換に修正した（Java移植版で既に同様の修正が行われていたものを、
//   TS版オリジナルにも反映した）。

export async function writeCsvFile(csvData: CsvHeaderType[]) {
  let headerCsv;
  let rowCsv: string[][] = [];
  
  if (csvData[0] == CsvHeader) {
    headerCsv = Object.values(csvData[0]).join(',');
    rowCsv = await createRowCsv(csvData, 1);
  } else {
    headerCsv = Object.values(CsvHeader).join(',');
    rowCsv = await createRowCsv(csvData, 0);
  }
  const csvWriteData = iconv.encode(`${headerCsv}\n${rowCsv.join("\n")}`, "shiftjis");
  fs.writeFileSync(path.join(Config.DEFAULT_OUTPUT_DIR, Config.CSV_FILENAME), csvWriteData);
  
}

export async function createRowCsv(csvData: CsvHeaderType[], startNum: number) {
  let rowCsv: string[][] = [];
  for ( let i = startNum; i < csvData.length; i++) {
    const element = Object.values(csvData[i]);
    let values: string[] = [];
    for(const e of element) {
      values.push(await escapeCsv(e));
    }

    rowCsv.push(values);
    // rowCsv.push(["\n"]);
  }
  return rowCsv;
}
export async function escapeCsv(jsonValue: any) {
  const stringValue = String(jsonValue);
  if (/[",\n\r]/.test(stringValue)) {
    // 【バグ修正D】ダブルクォーテーションを2つに置き換え、全体をダブルクォーテーションで囲む
    // 修正前: stringValue.replace('"', '""') → 最初の1箇所しか置換されない
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  
  return stringValue;
  
}