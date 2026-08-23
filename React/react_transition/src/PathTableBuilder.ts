import type {AdjacencyRow,PathRow,ModuleResult,} from "./types"
import {MAX_PATH_MULTIPLIER,} from "../../config"

// ===================================================
// PathTableBuilder
// 隣接テーブルを1ホップずつ展開し、起点パスからの順行パス・
// 起点パスへの逆行パスをコスト付きで算出する
//
// 画面数 × MAX_PATH_MULTIPLIERを超えても終了しない枝は、
// cost=-1としてマークして打ち切る。
//
// 各PathRowには起点からの累積パス文字列を持たせ、
// 葉に至る経路を「独立した固有の最長パス」として抽出する。
// ===================================================

const BROWSER_BACK_MARKER = "__back__"
const PATH_SEPARATOR = "｜"

export class PathTableBuilder {

  buildForward(adjacency: AdjacencyRow[],startPath: string): ModuleResult<{levels: Map<number,PathRow[]>;maxCost: number;}> {

    const level1: PathRow[] = adjacency
      .filter((row) => row.fromPath === startPath)
      .map((row) => ({
        cost: 1,
        fromPath: row.fromPath,
        toPath: row.toPath,
        path: `${row.fromPath}${PATH_SEPARATOR}${row.toPath}`,
      }))

    if (level1.length === 0) {
      return {
        errorCode: 1,
        message: `起点パス "${startPath}" に一致するエッジが隣接テーブルに存在しません`,
      }
    } else {
      // nothing
    }

    const levels = new Map<number,PathRow[]>()
    levels.set(1,level1)

    const threshold = this.calculateThreshold(adjacency)
    const patternCounts = new Map<string,number>()
    const warnedPatterns = new Set<string>()

    let currentLevel = level1
    let cost = 1
    let cutoffCount = 0

    while (true) {
      const nextLevel = this.expandOneHop(currentLevel,adjacency,patternCounts,warnedPatterns)
      if (nextLevel.length === 0) {
        break
      } else {
        // nothing
      }

      cost++

      if (cost > threshold) {
        const cutoffLevel = nextLevel.map((row) => ({
          ...row,
          cost: -1,
        }))

        levels.set(cost,cutoffLevel)
        cutoffCount = cutoffLevel.length

        console.warn(
          `PathTableBuilder: cost=${cost} 到達。閾値(${threshold})超過のため` +
          `${cutoffCount}件の枝を打ち切りました（cost=-1としてマーク）`
        )
        break
      } else {
        // nothing
      }

      levels.set(cost,nextLevel)
      currentLevel = nextLevel
    }

    const maxCost = this.calculateMaxCost(levels)
    console.log(`順行 maxCost: ${maxCost}, 総行数: ${this.totalRows(levels)}（打ち切り行: ${cutoffCount}件）`)
    return {errorCode: 0,data: {levels,maxCost,},}
  }

  buildReverse(adjacency: AdjacencyRow[],startPath: string): ModuleResult<{levels: Map<number,PathRow[]>;}> {

    const reverseAdjacency: AdjacencyRow[] = adjacency
      .filter((row) => row.fromPath !== "__common__")
      .map((row) => ({
        ...row,
        fromPath: row.toPath,
        toPath: row.fromPath,
      }))

    const result = this.buildForward(reverseAdjacency,startPath)

    if (result.errorCode !== 0) {
      return {errorCode: result.errorCode,message: result.message,}
    } else {
      // nothing
    }

    console.log(`逆行 maxCost: ${result.data!.maxCost}, 総行数: ${this.totalRows(result.data!.levels)}`)
    return {errorCode: 0,data: {levels: result.data!.levels,},}
  }

  extractMaximalPaths(adjacency: AdjacencyRow[],startPath: string,levels: Map<number,PathRow[]>): PathRow[] {

    const leaves = this.identifyLeafScreens(adjacency,startPath)
    const result: PathRow[] = []
    const seenPaths = new Set<string>()

    for (const rows of levels.values()) {
      for (const row of rows) {
        if (row.cost === -1) {
          continue
        } else {
          // nothing
        }

        if (!leaves.has(row.toPath)) {
          continue
        } else {
          // nothing
        }

        if (seenPaths.has(row.path)) {
          continue
        } else {
          // nothing
        }

        seenPaths.add(row.path)
        result.push(row)
      }
    }

    console.log(`葉（終端画面）: ${leaves.size}画面, 独立した固有の最長パス: ${result.length}本`)
    return result
  }

  private identifyLeafScreens(adjacency: AdjacencyRow[],startPath: string): Set<string> {
    const hasOutgoing = new Set<string>()

    for (const row of adjacency) {
      if (row.toPath === startPath) {
        continue
      } else {
        // nothing
      }

      hasOutgoing.add(row.fromPath)
    }

    const leaves = new Set<string>()

    for (const row of adjacency) {
      if (row.toPath === BROWSER_BACK_MARKER) {
        continue
      } else {
        // nothing
      }

      if (!hasOutgoing.has(row.toPath)) {
        leaves.add(row.toPath)
      } else {
        // nothing
      }
    }

    return leaves
  }

  private calculateThreshold(adjacency: AdjacencyRow[]): number {
    const screens = new Set<string>()

    for (const row of adjacency) {
      if (row.fromPath !== "__common__") {
        screens.add(row.fromPath)
      } else {
        // nothing
      }

      if (row.toPath !== BROWSER_BACK_MARKER) {
        screens.add(row.toPath)
      } else {
        // nothing
      }
    }

    const totalScreenCount = screens.size
    return totalScreenCount * MAX_PATH_MULTIPLIER
  }

  private calculateMaxCost(levels: Map<number,PathRow[]>): number {
    let max = 0

    for (const [levelCost,rows,] of levels) {
      const isCutoffLevel = rows.length > 0 && rows.every((row) => row.cost === -1)

      if (!isCutoffLevel && levelCost > max) {
        max = levelCost
      } else {
        // nothing
      }
    }

    return max
  }

  private expandOneHop(
    currentLevel: PathRow[],
    adjacency: AdjacencyRow[],
    patternCounts: Map<string,number>,
    warnedPatterns: Set<string>
  ): PathRow[] {

    const nextLevel: PathRow[] = []

    for (const current of currentLevel) {
      for (const adjacent of adjacency) {
        if (current.toPath !== adjacent.fromPath) {
          continue
        } else {
          // nothing
        }

        if (adjacent.toPath === current.fromPath) {
          continue
        } else {
          // nothing
        }

        const patternKey = `${adjacent.fromPath}__${adjacent.toPath}`
        const count = (patternCounts.get(patternKey) ?? 0) + 1
        patternCounts.set(patternKey,count)

        if (count >= 3 && !warnedPatterns.has(patternKey)) {
          warnedPatterns.add(patternKey)
          console.warn(
            `PathTableBuilder: 同一遷移パターンが3回以上検出されました（要確認）: ` +
            `${adjacent.fromPath} → ${adjacent.toPath}`
          )
        } else {
          // nothing
        }

        nextLevel.push({
          cost: current.cost + 1,
          fromPath: current.fromPath,
          toPath: adjacent.toPath,
          path: `${current.path}${PATH_SEPARATOR}${adjacent.toPath}`,
        })
      }
    }

    return nextLevel
  }

  private totalRows(levels: Map<number,PathRow[]>): number {
    let total = 0

    for (const rows of levels.values()) {
      total += rows.length
    }

    return total
  }
}