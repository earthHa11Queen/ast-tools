import fs from "fs";
import path, { join } from "path";
import * as Config from "../config";
import { CsvHeader, CsvHeaderType } from "./method_info";
import * as iconv from "iconv-lite";

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
    // ダブルクォーテーションを2つに置き換え、全体をダブルクォーテーションで囲む
    return `"${stringValue.replace('"', '""')}"`;
  }
  
  return stringValue;
  
}