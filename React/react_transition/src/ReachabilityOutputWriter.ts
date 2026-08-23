import * as fs from "fs";
import * as path from "path";
import type {ReachabilityRow,ModuleResult,} from "./types";
import {REACHABILITY_CSV_FILENAME,CSV_ENCODING,} from "../../config";

// ===================================================
// ReachabilityOutputWriter
// TierClassifierの出力をCSVへ出力する
//
// 出力ファイル：
//   screen_reachability.csv
//
// エンコーディング：UTF-8（BOMなし）
// ===================================================

export class ReachabilityOutputWriter {
  write(outputDir: string,rows: ReachabilityRow[]): ModuleResult<void> {
    try {
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir,{recursive: true,});
      } else {
        // nothing
      }

    } catch (e) {
      return {errorCode: 1,message:`出力ディレクトリの作成に失敗しました: ${e}`,}
    }

    const header = "screenComponent,tier,url,hasDynamicSegment," + "viaPath,viaPathCost,sourceStrategy,pathGroupId";
    const lines = rows.map((row) => [
      this.escape(row.screenComponent),
      this.escape(row.tier),
      this.escape(row.url ?? ""),
      String(row.hasDynamicSegment),
      this.escape(row.viaPath? row.viaPath.join("|"): ""),
      row.viaPathCost === null? "": String(row.viaPathCost),
      this.escape(row.sourceStrategy ?? ""),
      this.escape(row.pathGroupId ?? ""),
    ].join(",")
  );

    try {
      const content = [header, ...lines].join("\n");
      fs.writeFileSync(path.join(outputDir,REACHABILITY_CSV_FILENAME),content,CSV_ENCODING);
      console.log(`  ${REACHABILITY_CSV_FILENAME}: ` +`${lines.length}行`);
      return {errorCode: 0,}

    } catch (e) {
      return {errorCode: 1,message:`${REACHABILITY_CSV_FILENAME} ` + `の出力に失敗しました: ${e}`,}
    }
  }

  private escape(value: string): string {
    if (value.includes(",") || value.includes("\n") || value.includes('"')) {
      return `"${value.replace(/"/g, '""')}"`;
    } else {
      // nothing
    }

    return value
  }
}