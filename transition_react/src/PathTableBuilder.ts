import type { AdjacencyRow, PathRow, ModuleResult } from "./types"


export class PathTableBuilder {

  buildForward(
    adjacency: AdjacencyRow[],
    startPath: string
  ): ModuleResult<{ levels: Map<number, PathRow[]>; maxCost: number }> {

    const level1: PathRow[] = adjacency
      .filter((row) => row.fromPath === startPath)
      .map((row) => ({ cost: 1, fromPath: row.fromPath, toPath: row.toPath }))

    if (level1.length === 0) {
      return {
        errorCode: 1,
        message: `起点パス "${startPath}" に一致するエッジが隣接テーブルに存在しません`,
      }
    }

    const levels = new Map<number, PathRow[]>()
    levels.set(1, level1)

    let currentLevel = level1
    let cost = 1

    while (true) {
      const nextLevel = this.expandOneHop(currentLevel, adjacency)
      if (nextLevel.length === 0) break
      cost++
      levels.set(cost, nextLevel)
      currentLevel = nextLevel
    }

    console.log(`順行 maxCost: ${cost}, 総行数: ${this.totalRows(levels)}`)
    return { errorCode: 0, data: { levels, maxCost: cost } }
  }

  buildReverse(
    adjacency: AdjacencyRow[],
    startPath: string
  ): ModuleResult<{ levels: Map<number, PathRow[]> }> {

    const reverseAdjacency: AdjacencyRow[] = adjacency
      .filter((row) => row.fromPath !== "__common__")
      .map((row) => ({
        ...row,
        fromPath: row.toPath,
        toPath: row.fromPath,
      }))

    const result = this.buildForward(reverseAdjacency, startPath)

    if (result.errorCode !== 0) {
      return { errorCode: result.errorCode, message: result.message }
    }

    console.log(`逆行 maxCost: ${result.data!.maxCost}, 総行数: ${this.totalRows(result.data!.levels)}`)
    return { errorCode: 0, data: { levels: result.data!.levels } }
  }

  private expandOneHop(
    currentLevel: PathRow[],
    adjacency: AdjacencyRow[]
  ): PathRow[] {
    const nextLevel: PathRow[] = []

    for (const current of currentLevel) {
      for (const adj of adjacency) {
        // 条件A: 通常の結合条件
        if (current.toPath !== adj.fromPath) continue
        // 条件B: ピンポン往復の除外
        if (adj.toPath === current.fromPath) continue

        nextLevel.push({
          cost: current.cost + 1,
          fromPath: current.fromPath,
          toPath: adj.toPath,
        })
      }
    }

    return nextLevel
  }

  private totalRows(levels: Map<number, PathRow[]>): number {
    let total = 0
    for (const rows of levels.values()) total += rows.length
    return total
  }
}
