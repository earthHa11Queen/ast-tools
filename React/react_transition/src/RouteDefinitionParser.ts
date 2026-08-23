import type {NodeInfo,ModuleResult,RouteSourceStrategy,} from "./types"
import {JsxRouteParser,} from "./JsxRouteParser"
import {ObjectConfigRouteParser,} from "./ObjectConfigRouteParser"
import {FileBasedRouteParser,} from "./FileBasedRouteParser"
import {PAGES_ROOT_DIR,PAGE_FILE_PATTERNS,} from "../../config"

// ===================================================
// RouteDefinitionParser
//
// JsxRouteParser / ObjectConfigRouteParser /
// FileBasedRouteParserの3ストラテジーを実行し、
// 結果をマージする。
//
// 優先順位：
//   jsx > object-config > file-based
//
// 全ストラテジーが0件の場合のみerrorCode=1とする。
// ===================================================

const STRATEGY_PRIORITY: Record<RouteSourceStrategy,number> = {
  "jsx": 0,
  "object-config": 1,
  "file-based": 2,
}

export class RouteDefinitionParser {

  parse(targetAppDir: string): ModuleResult<NodeInfo[]> {

    const results: NodeInfo[] = []
    const errors: string[] = []

    // 1. JSXスタイル
    const jsxResult = new JsxRouteParser().parse(targetAppDir)
    if (jsxResult.errorCode === 0 && jsxResult.data) {
      results.push(...jsxResult.data)
    } else {
      errors.push(`JsxRouteParser: ${jsxResult.message}`)
    }

    // 2. オブジェクト設定型
    const objResult = new ObjectConfigRouteParser().parse(targetAppDir)
    if (objResult.errorCode === 0 && objResult.data) {
      results.push(...objResult.data)
    } else {
      errors.push(`ObjectConfigRouteParser: ${objResult.message}`)
    }

    // 3. ファイルベースルーティング
    const fileResult = new FileBasedRouteParser().parse(PAGES_ROOT_DIR,PAGE_FILE_PATTERNS)
    if (fileResult.errorCode === 0 && fileResult.data) {
      results.push(...fileResult.data)
    } else {
      errors.push(`FileBasedRouteParser: ${fileResult.message}`)
    }

    if (results.length === 0) {
      return {
        errorCode: 1,
        message: `いずれのストラテジーでもルート定義を抽出できませんでした。詳細: ${errors.join(" / ")}`,
      }
    }

    const merged = this.mergeAndDeduplicate(results)
    console.log(`RouteDefinitionParser: マージ後ノード数: ${merged.length}`)
    return {errorCode: 0,data: merged,}
  }

  private mergeAndDeduplicate(nodes: NodeInfo[]): NodeInfo[] {
    const byPath = new Map<string,NodeInfo>()

    for (const node of nodes) {
      const existing = byPath.get(node.path)
      if (!existing) {
        byPath.set(node.path,node)
        continue
      } else {
        // nothing
      }

      if (STRATEGY_PRIORITY[node.sourceStrategy] < STRATEGY_PRIORITY[existing.sourceStrategy]) {
        byPath.set(node.path,node)
      } else {
        // nothing
      }
    }

    return [...byPath.values()]
  }
}