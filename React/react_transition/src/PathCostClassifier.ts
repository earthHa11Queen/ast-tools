import type { PathRow, ClassifiedPathRow, ModuleResult } from "./types"

// ===================================================
// PathCostClassifier [継続・v1から変更なし]
// パスコストからテスト工程区分（単体／結合／総合）を判定する
// ===================================================

export class PathCostClassifier {

  classify(
    forwardLevels: Map<number, PathRow[]>,
    reverseLevels: Map<number, PathRow[]>,
    maxCost: number
  ): ModuleResult<{
    forward: ClassifiedPathRow[]
    reverse: ClassifiedPathRow[]
  }> {

    const forward = this.classifyRows(forwardLevels, maxCost)
    const reverse = this.classifyRows(reverseLevels, maxCost)

    console.log(`工程区分付与完了 - 順行: ${forward.length}行, 逆行: ${reverse.length}行`)
    return { errorCode: 0, data: { forward, reverse } }
  }

  private classifyRows(
    levels: Map<number, PathRow[]>,
    maxCost: number
  ): ClassifiedPathRow[] {
    const result: ClassifiedPathRow[] = []

    for (const [, rows] of levels) {
      for (const row of rows) {
        result.push({
          ...row,
          testPhase: this.getPhase(row.cost, maxCost),
        })
      }
    }

    // コスト昇順でソートする
    result.sort((a, b) => a.cost - b.cost)
    return result
  }

  private getPhase(cost: number, maxCost: number) {
    if (cost === 0) return "単体テスト"
    if (cost === maxCost) return "総合テスト"
    return "結合テスト"
  }
}
