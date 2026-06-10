import * as fs from "fs"
import * as path from "path"
import type {
  AdjacencyRow,
  ClassifiedPathRow,
  PathSummary,
  ModuleResult,
} from "./types"
import {
  ADJACENCY_CSV_FILENAME,
  FORWARD_CSV_FILENAME,
  REVERSE_CSV_FILENAME,
  SUMMARY_JSON_FILENAME,
} from "../config"

// ===================================================
// AdjacencyOutputWriter
// 隣接テーブル・パステーブル・サマリーを出力する
//
// 出力ファイル：
//   adjacency_table.csv  隣接テーブル（全カラム）
//   path_forward.csv     コスト別順行パステーブル
//   path_reverse.csv     コスト別逆行パステーブル
//   path_summary.json    maxCost・パス数・未解決パスのサマリー
//
// エンコーディング: UTF-8（BOM付き）
// BOM付きにすることで Excel での文字化けを防ぐ
// ===================================================

const BOM = "\uFEFF"

export class AdjacencyOutputWriter {

  write(
    outputDir: string,
    appName: string,
    startPath: string,
    adjacency: AdjacencyRow[],
    forward: ClassifiedPathRow[],
    reverse: ClassifiedPathRow[],
    maxCost: number
  ): ModuleResult<void> {

    try {
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true })
      }
    } catch (e) {
      return { errorCode: 1, message: `出力ディレクトリの作成に失敗しました: ${e}` }
    }

    // adjacency_table.csv
    const adjResult = this.writeAdjacencyCsv(outputDir, adjacency)
    if (adjResult.errorCode !== 0) return adjResult

    // path_forward.csv
    const fwdResult = this.writePathCsv(outputDir, FORWARD_CSV_FILENAME, forward)
    if (fwdResult.errorCode !== 0) return fwdResult

    // path_reverse.csv
    const revResult = this.writePathCsv(outputDir, REVERSE_CSV_FILENAME, reverse)
    if (revResult.errorCode !== 0) return revResult

    // path_summary.json
    const sumResult = this.writeSummary(
      outputDir, appName, startPath, forward, reverse, maxCost, adjacency
    )
    if (sumResult.errorCode !== 0) return sumResult

    console.log(`出力完了: ${outputDir}`)
    return { errorCode: 0 }
  }

  private writeAdjacencyCsv(
    outputDir: string,
    rows: AdjacencyRow[]
  ): ModuleResult<void> {
    const header = "fromPath,fromComponent,toPath,toComponent,sourceFile,transitionType"
    const lines = rows.map((r) =>
      [
        this.escape(r.fromPath),
        this.escape(r.fromComponent),
        this.escape(r.toPath),
        this.escape(r.toComponent),
        this.escape(r.sourceFile),
        this.escape(r.transitionType),
      ].join(",")
    )
    return this.writeCsv(outputDir, ADJACENCY_CSV_FILENAME, header, lines)
  }

  private writePathCsv(
    outputDir: string,
    filename: string,
    rows: ClassifiedPathRow[]
  ): ModuleResult<void> {
    const header = "cost,fromPath,toPath,testPhase"
    const lines = rows.map((r) =>
      [
        r.cost,
        this.escape(r.fromPath),
        this.escape(r.toPath),
        this.escape(r.testPhase),
      ].join(",")
    )
    return this.writeCsv(outputDir, filename, header, lines)
  }

  private writeCsv(
    outputDir: string,
    filename: string,
    header: string,
    lines: string[]
  ): ModuleResult<void> {
    try {
      const content = BOM + [header, ...lines].join("\n")
      fs.writeFileSync(path.join(outputDir, filename), content, "utf-8")
      console.log(`  ${filename}: ${lines.length}行`)
      return { errorCode: 0 }
    } catch (e) {
      return { errorCode: 1, message: `${filename} の出力に失敗しました: ${e}` }
    }
  }

  private writeSummary(
    outputDir: string,
    appName: string,
    startPath: string,
    forward: ClassifiedPathRow[],
    reverse: ClassifiedPathRow[],
    maxCost: number,
    adjacency: AdjacencyRow[]
  ): ModuleResult<void> {
    const unresolvedPaths = [
      ...new Set(
        adjacency
          .filter((r) => r.toComponent === "__unresolved__")
          .map((r) => r.toPath)
      ),
    ]

    const summary: PathSummary = {
      appName,
      startPath,
      maxCost,
      forward: this.countPhases(forward),
      reverse: this.countPhases(reverse),
      unresolvedPaths,
    }

    try {
      fs.writeFileSync(
        path.join(outputDir, SUMMARY_JSON_FILENAME),
        JSON.stringify(summary, null, 2),
        "utf-8"
      )
      console.log(`  ${SUMMARY_JSON_FILENAME}: 未解決パス ${unresolvedPaths.length}件`)
      return { errorCode: 0 }
    } catch (e) {
      return { errorCode: 1, message: `${SUMMARY_JSON_FILENAME} の出力に失敗しました: ${e}` }
    }
  }

  private countPhases(rows: ClassifiedPathRow[]) {
    return {
      total: rows.length,
      単体テスト: rows.filter((r) => r.testPhase === "単体テスト").length,
      結合テスト: rows.filter((r) => r.testPhase === "結合テスト").length,
      総合テスト: rows.filter((r) => r.testPhase === "総合テスト").length,
    }
  }

  // CSV のセルをエスケープする
  // カンマ・改行・ダブルクォートを含む場合はダブルクォートで囲む
  private escape(value: string): string {
    if (value.includes(",") || value.includes("\n") || value.includes('"')) {
      return `"${value.replace(/"/g, '""')}"`
    }
    return value
  }
}
