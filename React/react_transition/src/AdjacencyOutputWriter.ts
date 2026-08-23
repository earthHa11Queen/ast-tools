import * as fs from "fs"
import * as path from "path"
import type {AdjacencyRow,ClassifiedPathRow,PathSummary,ModuleResult,} from "./types"
import {ADJACENCY_CSV_FILENAME,FORWARD_CSV_FILENAME,REVERSE_CSV_FILENAME,SUMMARY_JSON_FILENAME,CSV_ENCODING,} from "../../config"

// ===================================================
// AdjacencyOutputWriter
// 隣接テーブル・パステーブル・サマリーを出力する
//
// 出力ファイル：
//   adjacency_table.csv
//   path_forward.csv
//   path_reverse.csv
//   path_summary.json
//
// エンコーディング：UTF-8（BOMなし）
//
// cost=-1は、CSV出力時にcost列だけを
// "MAX-OVER"へ変換する。
// ===================================================

export class AdjacencyOutputWriter {
  write(outputDir: string,appName: string,startPath: string,adjacency: AdjacencyRow[],forward: ClassifiedPathRow[],reverse: ClassifiedPathRow[],maxCost: number): ModuleResult<void> {
    try {
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      } else {
        // nothing
      }
    } catch (e) {
      return {errorCode: 1,message: `出力ディレクトリの作成に失敗しました: ${e}`,}
    }

    const adjacencyResult = this.writeAdjacencyCsv(outputDir,adjacency);

    if (adjacencyResult.errorCode !== 0) {
      return adjacencyResult;
    } else {
      // nothing
    }

    const forwardResult = this.writePathCsv(outputDir,FORWARD_CSV_FILENAME,forward);
    if (forwardResult.errorCode !== 0) {
      return forwardResult;
    } else {
      // nothing
    }

    const reverseResult = this.writePathCsv(outputDir,REVERSE_CSV_FILENAME,reverse);
    if (reverseResult.errorCode !== 0) {
      return reverseResult;
    } else {
      // nothing
    }
    const summaryResult = this.writeSummary(outputDir,appName,startPath,forward,reverse,maxCost,adjacency);
    if (summaryResult.errorCode !== 0) {
      return summaryResult;
    } else {
      // nothing
    }

    console.log(`出力完了: ${outputDir}`);

    return {errorCode: 0,}
  }

  private writeAdjacencyCsv(outputDir: string,rows: AdjacencyRow[]): ModuleResult<void> {
    const header ="fromPath,fromComponent,toPath,toComponent,sourceFile,transitionType";
    const lines = rows.map((row) =>
      [
        this.escape(row.fromPath),
        this.escape(row.fromComponent),
        this.escape(row.toPath),
        this.escape(row.toComponent),
        this.escape(row.sourceFile),
        this.escape(row.transitionType),
      ].join(",")
    );

    return this.writeCsv(outputDir,ADJACENCY_CSV_FILENAME,header,lines);
  }

  private writePathCsv(outputDir: string,filename: string,rows: ClassifiedPathRow[]): ModuleResult<void> {
    const header = "cost,fromPath,toPath,testPhase"
    const lines = rows.map((row) =>
      [
        row.cost === -1? "MAX-OVER": row.cost,
        this.escape(row.fromPath),
        this.escape(row.toPath),
        this.escape(row.testPhase),
      ].join(",")
    );

    return this.writeCsv(outputDir,filename,header,lines);
  }

  private writeCsv(outputDir: string,filename: string,header: string,lines: string[]): ModuleResult<void> {
    try {
      const content = [header, ...lines].join("\n");
      fs.writeFileSync(path.join(outputDir, filename),content,CSV_ENCODING);

      console.log(`  ${filename}: ${lines.length}行`);
      return {errorCode: 0,}

    } catch (e) {
      return {errorCode: 1,message:`${filename} の出力に失敗しました: ${e}`,}
    }
  }

  private writeSummary(outputDir: string,appName: string,startPath: string,forward: ClassifiedPathRow[],reverse: ClassifiedPathRow[],maxCost: number,adjacency: AdjacencyRow[]): ModuleResult<void> {
    const unresolvedPaths = [...new Set(adjacency.filter((row) =>
      row.toComponent === "__unresolved__")
      .map((row) => row.toPath)
    ),
  ];
    const summary: PathSummary = {
      appName,
      startPath,
      maxCost,
      forward:this.countPhases(forward),
      reverse:this.countPhases(reverse),
      unresolvedPaths,
    }

    try {
      fs.writeFileSync(path.join(outputDir,SUMMARY_JSON_FILENAME),JSON.stringify(summary,null,2),CSV_ENCODING);
      console.log(`  ${SUMMARY_JSON_FILENAME}: ` +`未解決パス ${unresolvedPaths.length}件`);
      return {errorCode: 0,}

    } catch (e) {
      return {errorCode: 1,message:`${SUMMARY_JSON_FILENAME} の出力に失敗しました: ${e}`,}
    }
  }

  private countPhases(
    rows: ClassifiedPathRow[]
  ) {
    return {
      total:rows.length,
      単体テスト:rows.filter((row) => row.testPhase === "単体テスト").length,
      結合テスト:rows.filter((row) => row.testPhase === "結合テスト").length,
      総合テスト:rows.filter((row) => row.testPhase === "総合テスト").length,
    }
  }

  private escape(value: string): string {
    if (value.includes(",") || value.includes("\n") || value.includes('"')) {
      return `"${value.replace(/"/g, '""')}"`;
    } else {
      // nothing
    }
    return value;
  }
}