import type { NodeInfo, AdjacencyRow, PathRow, ReachabilityRow, ModuleResult } from "./types"

// ===================================================
// TierClassifier [更新・v2：viaPath算出を「最長パス群からの割り当て」＋「BFSフォールバック」に変更]
// ルート定義（NodeInfo）と隣接テーブル（AdjacencyRow）を突き合わせ、
// 画面ごとにTier1（直接URL到達可能）/Tier2（経由操作が必要）を判定する
//
// v1（初版）からの変更点：
//   viaPathの算出を、Tier2画面ごとに個別BFSで求める方式から、
//   PathTableBuilder.extractMaximalPaths が出す「独立した固有の最長パス群」への
//   割り当てを第一手段とする方式に変更した。
//   同じ最長パスに含まれる画面群は、共通の pathGroupId を持つ（モジュールB側で
//   共通スクリプトとしてまとめる際の手がかりとする）。
//   どの最長パスにも含まれない画面のみ、既存のBFS（findShortestComponentPath）で
//   個別にフォールバック算出する。
// ===================================================

const UNRESOLVED_MARKERS = ["__common__", "__unresolved__", "__back__"]
const PATH_SEPARATOR = "｜"

export class TierClassifier {

  classify(
    nodes: NodeInfo[],
    adjacency: AdjacencyRow[],
    maximalPaths: PathRow[],
    startPath: string
  ): ModuleResult<ReachabilityRow[]> {

    const screens = this.collectScreens(adjacency)
    const nodeByComponent = new Map(nodes.map((n) => [n.componentName, n]))
    const startComponent = nodes.find((n) => n.path === startPath)?.componentName ?? "TopPage"

    // path文字列（URLパスの列）→コンポーネント名の対応表を隣接テーブルから構築する
    const pathToComponent = this.buildPathToComponentMap(adjacency, startPath, startComponent)

    // 各最長パスを、コンポーネント名の列にあらかじめ変換しておく
    const componentPaths = maximalPaths.map((p) => ({
      pathGroupId: this.generateGroupId(p.path),
      components: p.path.split(PATH_SEPARATOR).map((seg) => pathToComponent.get(seg) ?? seg),
    }))

    const rows: ReachabilityRow[] = []
    let assignedFromMaximalPath = 0
    let assignedFromFallback = 0

    for (const screen of screens) {
      const node = nodeByComponent.get(screen)

      if (node) {
        // Tier1: ルート定義に存在する画面
        rows.push({
          screenComponent: screen,
          tier: "tier1",
          url: node.path,
          hasDynamicSegment: node.hasDynamicSegment,
          viaPath: null,
          viaPathCost: null,
          sourceStrategy: node.sourceStrategy,
          pathGroupId: null,
        })
        continue
      }

      // Tier2: まず最長パス群の中にこの画面が含まれるかを探す
      const foundInMaximalPath = this.findInMaximalPaths(screen, componentPaths)

      if (foundInMaximalPath) {
        assignedFromMaximalPath++
        rows.push({
          screenComponent: screen,
          tier: "tier2",
          url: null,
          hasDynamicSegment: false,
          viaPath: foundInMaximalPath.viaPath,
          viaPathCost: foundInMaximalPath.viaPath.length - 1,
          sourceStrategy: null,
          pathGroupId: foundInMaximalPath.pathGroupId,
        })
        continue
      }

      // どの最長パスにも含まれない画面のみ、個別のBFSでフォールバック算出する
      const via = this.findShortestComponentPath(startComponent, screen, adjacency)

      if (via) {
        assignedFromFallback++
        rows.push({
          screenComponent: screen,
          tier: "tier2",
          url: null,
          hasDynamicSegment: false,
          viaPath: via.path,
          viaPathCost: via.cost,
          sourceStrategy: null,
          pathGroupId: null,
        })
      } else {
        console.warn(`TierClassifier: 経由パスが見つかりませんでした（要個別調査）: ${screen}`)
        rows.push({
          screenComponent: screen,
          tier: "tier2",
          url: null,
          hasDynamicSegment: false,
          viaPath: null,
          viaPathCost: null,
          sourceStrategy: null,
          pathGroupId: null,
        })
      }
    }

    const tier1Count = rows.filter((r) => r.tier === "tier1").length
    const tier2Count = rows.filter((r) => r.tier === "tier2").length
    console.log(
      `TierClassifier: Tier1=${tier1Count}画面, Tier2=${tier2Count}画面` +
      `（うち最長パス群から割り当て: ${assignedFromMaximalPath}画面、BFSフォールバック: ${assignedFromFallback}画面）`
    )

    return { errorCode: 0, data: rows }
  }

  // 隣接テーブルに登場する全画面（コンポーネント名）を収集する
  // __common__ / __unresolved__ / __back__ のマーカー自体は画面として扱わない
  private collectScreens(adjacency: AdjacencyRow[]): string[] {
    const set = new Set<string>()
    for (const row of adjacency) {
      if (!UNRESOLVED_MARKERS.includes(row.fromComponent)) set.add(row.fromComponent)
      if (!UNRESOLVED_MARKERS.includes(row.toComponent)) set.add(row.toComponent)
    }
    return [...set]
  }

  // path文字列のセグメント（URLパス）→コンポーネント名の対応表を構築する
  private buildPathToComponentMap(
    adjacency: AdjacencyRow[],
    startPath: string,
    startComponent: string
  ): Map<string, string> {
    const map = new Map<string, string>()
    map.set(startPath, startComponent)
    for (const row of adjacency) {
      if (!UNRESOLVED_MARKERS.includes(row.toComponent)) {
        map.set(row.toPath, row.toComponent)
      }
    }
    return map
  }

  // 対象画面が、いずれかの最長パスのコンポーネント列に含まれるかを検索する
  // 含まれていれば、起点からその画面までの部分列を返す
  private findInMaximalPaths(
    targetComponent: string,
    componentPaths: { pathGroupId: string; components: string[] }[]
  ): { viaPath: string[]; pathGroupId: string } | null {
    for (const cp of componentPaths) {
      const index = cp.components.indexOf(targetComponent)
      if (index === -1) continue
      return { viaPath: cp.components.slice(0, index + 1), pathGroupId: cp.pathGroupId }
    }
    return null
  }

  // 最長パスの累積path文字列から、簡易なグループ識別子を生成する
  private generateGroupId(path: string): string {
    let hash = 0
    for (let i = 0; i < path.length; i++) {
      hash = (hash * 31 + path.charCodeAt(i)) >>> 0
    }
    return `path-${hash.toString(16)}`
  }

  // [フォールバック] 起点コンポーネントから対象コンポーネントまでの最短経路をBFSで探索する
  // 最長パス群（extractMaximalPaths）でカバーできなかった画面のみ、ここで個別に拾う
  private findShortestComponentPath(
    startComponent: string,
    targetComponent: string,
    adjacency: AdjacencyRow[]
  ): { path: string[]; cost: number } | null {

    if (startComponent === targetComponent) {
      return { path: [startComponent], cost: 0 }
    }

    const queue: { component: string; path: string[] }[] = [
      { component: startComponent, path: [startComponent] },
    ]
    const visited = new Set<string>([startComponent])

    while (queue.length > 0) {
      const current = queue.shift()!

      const outgoing = adjacency.filter((row) => row.fromComponent === current.component)
      for (const edge of outgoing) {
        const next = edge.toComponent
        if (UNRESOLVED_MARKERS.includes(next)) continue
        if (visited.has(next)) continue

        const nextPath = [...current.path, next]
        if (next === targetComponent) {
          return { path: nextPath, cost: nextPath.length - 1 }
        }

        visited.add(next)
        queue.push({ component: next, path: nextPath })
      }
    }

    return null
  }
}
