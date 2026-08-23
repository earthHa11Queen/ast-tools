import { HTML_CAPTURED_DIR, DEFAULT_OUTPUT_DIR } from "./config"
import { HtmlLoader } from "./src/HtmlLoader"
import { TreeExtractor } from "./src/TreeExtractor"
import { TreeOutputWriter } from "./src/TreeOutputWriter"
import { TreeRawCsvReader } from "./src/TreeRawCsvReader"
import { ScopeCandidateBuilder } from "./src/ScopeCandidateBuilder"
import { ScopeResolver } from "./src/ScopeResolver"
import { ScopeOutputWriter } from "./src/ScopeOutputWriter"
import type { GroupingTagNode } from "./src/dom_tree_ast_types"

// ===================================================
// main.ts（エントリーポイント）dom_tree_ast
//
// 実行方法：
//   npx ts-node dom_tree_ast_main.ts             Phase1→Phase2を連続実行
//   npx ts-node dom_tree_ast_main.ts --phase=1    Phase1（機械的抽出）のみ実行
//   npx ts-node dom_tree_ast_main.ts --phase=2    Phase2（同定ロジック）のみ実行
//                                                 （Phase1が出力したdom_tree_raw.csvを読み込む）
// ===================================================

type Phase = "1" | "2" | "both"

function parsePhaseArg(): Phase {
  const arg = process.argv.find((a) => a.startsWith("--phase="))
  if (!arg) return "both"
  const value = arg.split("=")[1]
  if (value === "1" || value === "2") return value
  console.warn(`main.ts: 不明な --phase 指定 "${value}" のため、Phase1→Phase2を連続実行します`)
  return "both"
}

async function runPhase1(): Promise<GroupingTagNode[] | null> {
  console.log("[Phase1] HtmlLoader")
  const loadResult = new HtmlLoader().load(HTML_CAPTURED_DIR)
  if (loadResult.errorCode !== 0) {
    console.error(`ERROR: ${loadResult.message}`)
    process.exit(1)
  }
  const loadedHtmlList = loadResult.data!

  console.log("[Phase1] TreeExtractor")
  const extractResult = new TreeExtractor().extractAll(loadedHtmlList);
  if (extractResult.errorCode !== 0) {
    console.error(`ERROR: ${extractResult.message}`)
    process.exit(1)
  }
  const nodes = extractResult.data!

  console.log("[Phase1] TreeOutputWriter")
  const writeResult = new TreeOutputWriter().write(DEFAULT_OUTPUT_DIR, nodes)
  if (writeResult.errorCode !== 0) {
    console.error(`ERROR: ${writeResult.message}`)
    process.exit(1)
  }

  return nodes
}

async function runPhase2(nodes: GroupingTagNode[]): Promise<void> {
  console.log("[Phase2] ScopeCandidateBuilder")
  const candidates = new ScopeCandidateBuilder().build(nodes)

  console.log("[Phase2] ScopeResolver")
  const resolvedScopes = new ScopeResolver().resolve(candidates, nodes)

  console.log("[Phase2] ScopeOutputWriter")
  const writeResult = new ScopeOutputWriter().write(DEFAULT_OUTPUT_DIR, resolvedScopes)
  if (writeResult.errorCode !== 0) {
    console.error(`ERROR: ${writeResult.message}`)
    process.exit(1)
  }
}

async function main() {

  const phase = parsePhaseArg()

  console.log("=== dom_tree_ast ===")
  console.log("")

  if (phase === "1") {
    await runPhase1()
    console.log("")
    console.log("=== Phase1 完了（Phase2は未実行です） ===")
    return
  }

  if (phase === "2") {
    console.log("[Phase2] TreeRawCsvReader（Phase1の出力を読み込みます）")
    const readResult = new TreeRawCsvReader().read(DEFAULT_OUTPUT_DIR)
    if (readResult.errorCode !== 0) {
      console.error(`ERROR: ${readResult.message}`)
      process.exit(1)
    }
    await runPhase2(readResult.data!)
    console.log("")
    console.log("=== Phase2 完了 ===")
    return
  }

  // phase === "both"：Phase1→Phase2を連続実行する
  const nodes = await runPhase1()
  if (!nodes) return
  await runPhase2(nodes)

  console.log("")
  console.log("=== 処理完了 ===")
}

main().catch((e) => {
  console.error("予期しないエラーが発生しました:", e)
  process.exit(1)
})
