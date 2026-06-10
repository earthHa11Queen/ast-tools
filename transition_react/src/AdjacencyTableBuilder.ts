import * as path from "path"
import type { NodeInfo, EdgeInfo, AdjacencyRow, ModuleResult } from "./types"

const COMMON_HEADER_FILES = ["Header"]

export class AdjacencyTableBuilder {

  build(
    nodes: NodeInfo[],
    edges: EdgeInfo[],
    startPath: string = "/"
  ): ModuleResult<AdjacencyRow[]> {

    const rows: AdjacencyRow[] = []
    const unresolvedPaths = new Set<string>()

    for (const edge of edges) {
      const fileName = path.basename(edge.sourceFile, path.extname(edge.sourceFile))
      const fromNode = nodes.find((n) => n.componentName === fileName)

      const fromPath = fromNode ? fromNode.path : "__common__"
      const fromComponent = fromNode ? fromNode.componentName : fileName

      const toNode = this.resolveToNode(edge.toPath, nodes)
      if (!toNode) unresolvedPaths.add(edge.toPath)

      rows.push({
        fromPath,
        fromComponent,
        toPath: edge.toPath,
        toComponent: toNode ? toNode.componentName : "__unresolved__",
        sourceFile: edge.sourceFile,
        transitionType: edge.transitionType,
      })
    }

    const startComponent = nodes.find((n) => n.path === startPath)?.componentName ?? "TopPage"
    const headerRows = rows.filter(
      (r) => r.fromPath === "__common__" && COMMON_HEADER_FILES.includes(r.fromComponent)
    )

    for (const row of headerRows) {
      if (row.toPath === startPath) continue

      rows.push({
        ...row,
        fromPath: startPath,
        fromComponent: startComponent,
      })
    }

    const deduped = this.deduplicateRows(rows)

    if (unresolvedPaths.size > 0) {
      console.warn(`未解決パス（${unresolvedPaths.size}件）: ${[...unresolvedPaths].join(", ")}`)
    }

    console.log(`隣接テーブル行数: ${deduped.length}（重複除去・__common__展開後）`)
    return { errorCode: 0, data: deduped }
  }

  private deduplicateRows(rows: AdjacencyRow[]): AdjacencyRow[] {
    const seen = new Set<string>()
    return rows.filter((row) => {
      const key = `${row.fromPath}__${row.toPath}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  }

  private resolveToNode(toPath: string, nodes: NodeInfo[]): NodeInfo | null {
    const exact = nodes.find((n) => n.path === toPath || n.normalizedPath === toPath)
    if (exact) return exact

    const candidates = nodes.filter((n) =>
      toPath.startsWith(n.normalizedPath) && n.normalizedPath !== "/"
    )
    if (candidates.length === 0) return null

    return candidates.reduce((a, b) =>
      a.normalizedPath.length >= b.normalizedPath.length ? a : b
    )
  }
}
