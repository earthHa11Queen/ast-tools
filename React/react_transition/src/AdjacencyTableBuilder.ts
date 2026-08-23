import * as path from "path"
import type { NodeInfo, EdgeInfo, AdjacencyRow, ModuleResult } from "./types"

// ===================================================
// AdjacencyTableBuilder [更新・v2："__back__"の専用分岐を追加]
// ルート定義ノードと遷移エッジを突き合わせ、隣接テーブルを構築する
//
// v1からの変更点：
//   toPath === "__back__"（navigate.back由来）のエッジは、resolveToNodeによる
//   通常のパス解決を行わず、toComponent="__back__" を直接設定する。
//   unresolvedPaths（要警告リスト）にも追加しない。
//   これは「ルート定義漏れ」ではなく「そもそも照合すべき固定の遷移先が存在しない」という
//   意味的に異なる状態であるため。
// ===================================================

const COMMON_HEADER_FILES = ["Header"]
const BROWSER_BACK_MARKER = "__back__"

export class AdjacencyTableBuilder {

  build(nodes: NodeInfo[],edges: EdgeInfo[],startPath: string = "/"): ModuleResult<AdjacencyRow[]> {
    const rows: AdjacencyRow[] = [];
    const unresolvedPaths = new Set<string>();
    let backEdgeCount = 0;

    for (const edge of edges) {
      const fileName = path.basename(edge.sourceFile, path.extname(edge.sourceFile));
      const fromNode = nodes.find((n) => n.componentName === fileName);
      const fromPath = fromNode ? fromNode.path : "__common__";
      const fromComponent = fromNode ? fromNode.componentName : fileName;

      // [新規・v2] navigate.back は解決対象外（意図的に行き先を追跡しない）
      if (edge.toPath === BROWSER_BACK_MARKER) {
        backEdgeCount++
        rows.push({
          fromPath,
          fromComponent,
          toPath: BROWSER_BACK_MARKER,
          toComponent: BROWSER_BACK_MARKER,
          sourceFile: edge.sourceFile,
          transitionType: edge.transitionType,
        });
        continue;
      }
      const toNode = this.resolveToNode(edge.toPath, nodes);
      if (!toNode) unresolvedPaths.add(edge.toPath);
      rows.push({
        fromPath,
        fromComponent,
        toPath: edge.toPath,
        toComponent: toNode ? toNode.componentName : "__unresolved__",
        sourceFile: edge.sourceFile,
        transitionType: edge.transitionType,
      });
    }

    const startComponent = nodes.find((n) => n.path === startPath)?.componentName ?? "TopPage"
    const headerRows = rows.filter((r) => r.fromPath === "__common__" && COMMON_HEADER_FILES.includes(r.fromComponent));

    for (const row of headerRows) {
      if (row.toPath === startPath) continue;

      rows.push({
        ...row,
        fromPath: startPath,
        fromComponent: startComponent,
      });
    }

    const deduped = this.deduplicateRows(rows);

    if (unresolvedPaths.size > 0) {
      console.warn(`未解決パス（${unresolvedPaths.size}件）: ${[...unresolvedPaths].join(", ")}`);
    } else {
      // nothing
    }

    console.log(`隣接テーブル行数: ${deduped.length}（重複除去・__common__展開後、` +`うちnavigate.back: ${backEdgeCount}件）`);
    return { errorCode: 0, data: deduped }
  }

  private deduplicateRows(rows: AdjacencyRow[]): AdjacencyRow[] {
    const seen = new Set<string>();
    return rows.filter((row) => {
      const key = `${row.fromPath}__${row.toPath}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    });
  }

  private resolveToNode(toPath: string, nodes: NodeInfo[]): NodeInfo | null {
    const exact = nodes.find((n) => n.path === toPath || n.normalizedPath === toPath)
    if (exact) return exact;
    const candidates = nodes.filter((n) =>
      toPath.startsWith(n.normalizedPath) && n.normalizedPath !== "/"
    );
    if (candidates.length === 0) return null;

    return candidates.reduce((a, b) =>a.normalizedPath.length >= b.normalizedPath.length ? a : b);
  }
}
