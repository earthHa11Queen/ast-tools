import {
  TARGET_APP_DIR,
  DEFAULT_OUTPUT_DIR,
  TARGET_APP_NAME,
  START_PATH,
} from "./config"
import { RouteDefinitionParser } from "./src/RouteDefinitionParser"
import { TransitionExtractor } from "./src/TransitionExtractor"
import { AdjacencyTableBuilder } from "./src/AdjacencyTableBuilder"
import { PathTableBuilder } from "./src/PathTableBuilder"
import { PathCostClassifier } from "./src/PathCostClassifier"
import { AdjacencyOutputWriter } from "./src/AdjacencyOutputWriter"

// ===================================================
// main.ts（エントリーポイント）
// 各モジュールを順に呼び出し、エラーコードで処理を制御する
// ===================================================

async function main() {

  console.log("=== transition_react ===")
  console.log(`対象アプリ : ${TARGET_APP_NAME}`)
  console.log(`解析ディレクトリ: ${TARGET_APP_DIR}`)
  console.log(`出力先    : ${DEFAULT_OUTPUT_DIR}`)
  console.log(`起点パス  : ${START_PATH}`)
  console.log("")

  // 1. ルート定義の解析
  console.log("[1/6] RouteDefinitionParser")
  const routeResult = new RouteDefinitionParser().parse(TARGET_APP_DIR)
  if (routeResult.errorCode !== 0) {
    console.error(`ERROR: ${routeResult.message}`)
    process.exit(1)
  }
  const nodes = routeResult.data!

  // 2. 遷移記述の抽出
  console.log("[2/6] TransitionExtractor")
  const edgeResult = new TransitionExtractor().extract(TARGET_APP_DIR)
  if (edgeResult.errorCode !== 0) {
    console.error(`ERROR: ${edgeResult.message}`)
    process.exit(1)
  }
  const edges = edgeResult.data!

  // 3. 隣接テーブルの構築
  console.log("[3/6] AdjacencyTableBuilder")
  const adjResult = new AdjacencyTableBuilder().build(nodes, edges, START_PATH)
  if (adjResult.errorCode !== 0) {
    console.error(`ERROR: ${adjResult.message}`)
    process.exit(1)
  }
  const adjacency = adjResult.data!

  const builder = new PathTableBuilder()

  // 4. 順行パステーブルの生成
  console.log("[4/6] PathTableBuilder.buildForward")
  const fwdResult = builder.buildForward(adjacency, START_PATH)
  if (fwdResult.errorCode !== 0) {
    console.error(`ERROR: ${fwdResult.message}`)
    process.exit(1)
  }
  const { levels: forwardLevels, maxCost } = fwdResult.data!

  // 5. 逆行パステーブルの生成
  console.log("[5/6] PathTableBuilder.buildReverse")
  const revResult = builder.buildReverse(adjacency, START_PATH)
  if (revResult.errorCode !== 0) {
    console.error(`ERROR: ${revResult.message}`)
    process.exit(1)
  }
  const { levels: reverseLevels } = revResult.data!

  // 6. テスト工程区分の付与
  console.log("[6/6] PathCostClassifier + AdjacencyOutputWriter")
  const classifyResult = new PathCostClassifier().classify(
    forwardLevels,
    reverseLevels,
    maxCost
  )
  if (classifyResult.errorCode !== 0) {
    console.error(`ERROR: ${classifyResult.message}`)
    process.exit(1)
  }
  const { forward, reverse } = classifyResult.data!

  // 7. ファイル出力
  const writeResult = new AdjacencyOutputWriter().write(
    DEFAULT_OUTPUT_DIR,
    TARGET_APP_NAME,
    START_PATH,
    adjacency,
    forward,
    reverse,
    maxCost
  )
  if (writeResult.errorCode !== 0) {
    console.error(`ERROR: ${writeResult.message}`)
    process.exit(1)
  }

  console.log("")
  console.log("=== 処理完了 ===")
}

main().catch((e) => {
  console.error("予期しないエラーが発生しました:", e)
  process.exit(1)
})
