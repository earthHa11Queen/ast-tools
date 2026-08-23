import {TARGET_APP_DIR,DEFAULT_OUTPUT_DIR,TARGET_APP_NAME,START_PATH,} from "../config"
import { RouteDefinitionParser } from "./src/RouteDefinitionParser"
import { TransitionExtractor } from "./src/TransitionExtractor"
import { AdjacencyTableBuilder } from "./src/AdjacencyTableBuilder"
import { PathTableBuilder } from "./src/PathTableBuilder"
import { PathCostClassifier } from "./src/PathCostClassifier"
import { TierClassifier } from "./src/TierClassifier"
import { AdjacencyOutputWriter } from "./src/AdjacencyOutputWriter"
import { ReachabilityOutputWriter } from "./src/ReachabilityOutputWriter"

// ===================================================
// main.ts（エントリーポイント）v2
// 各モジュールを順に呼び出し、エラーコードで処理を制御する
//
// 今回の変更点：
//   [5/9] PathTableBuilder.extractMaximalPaths を新規追加
//         （「独立した固有の最長パス」を隣接テーブルの集合演算のみで抽出する）
//   [8/9] TierClassifier に maximalPaths を渡すよう変更
//         （viaPathの算出を、最長パス群からの割り当て＋BFSフォールバックの構成に変更）
//   その他はロジック変更なし、9ステップ構成に振り直し
// ===================================================

async function main() {

  console.log("=== transition_react v2 ===")
  console.log(`対象アプリ : ${TARGET_APP_NAME}`)
  console.log(`解析ディレクトリ: ${TARGET_APP_DIR}`)
  console.log(`出力先    : ${DEFAULT_OUTPUT_DIR}`)
  console.log(`起点パス  : ${START_PATH}`)
  console.log("")

  // 1. ルート定義の解析（JSX / オブジェクト設定型 / ファイルベースの3ストラテジー統合）
  console.log("[1/9] RouteDefinitionParser")
  const routeResult = new RouteDefinitionParser().parse(TARGET_APP_DIR)
  if (routeResult.errorCode !== 0) {
    console.error(`ERROR: ${routeResult.message}`)
    process.exit(1)
  }
  const nodes = routeResult.data!

  // 2. 遷移記述の抽出
  console.log("[2/9] TransitionExtractor")
  const edgeResult = new TransitionExtractor().extract(TARGET_APP_DIR)
  if (edgeResult.errorCode !== 0) {
    console.error(`ERROR: ${edgeResult.message}`)
    process.exit(1)
  }
  const edges = edgeResult.data!

  // 3. 隣接テーブルの構築
  console.log("[3/9] AdjacencyTableBuilder")
  const adjResult = new AdjacencyTableBuilder().build(nodes,edges,START_PATH)
  if (adjResult.errorCode !== 0) {
    console.error(`ERROR: ${adjResult.message}`)
    process.exit(1)
  }
  const adjacency = adjResult.data!

  const builder = new PathTableBuilder()

  // 4. 順行パステーブルの生成
  console.log("[4/9] PathTableBuilder.buildForward")
  const fwdResult = builder.buildForward(adjacency,START_PATH)
  if (fwdResult.errorCode !== 0) {
    console.error(`ERROR: ${fwdResult.message}`)
    process.exit(1)
  }
  const {levels: forwardLevels,maxCost,} = fwdResult.data!

  // 5. 独立した固有の最長パスの抽出
  console.log("[5/9] PathTableBuilder.extractMaximalPaths")
  const maximalPaths = builder.extractMaximalPaths(adjacency,START_PATH,forwardLevels)

  // 6. 逆行パステーブルの生成
  console.log("[6/9] PathTableBuilder.buildReverse")
  const revResult = builder.buildReverse(adjacency,START_PATH)
  if (revResult.errorCode !== 0) {
    console.error(`ERROR: ${revResult.message}`)
    process.exit(1)
  }
  const {levels: reverseLevels,} = revResult.data!

  // 7. テスト工程区分の付与
  console.log("[7/9] PathCostClassifier")
  const classifyResult = new PathCostClassifier().classify(forwardLevels,reverseLevels,maxCost)
  if (classifyResult.errorCode !== 0) {
    console.error(`ERROR: ${classifyResult.message}`)
    process.exit(1)
  }
  const {forward,reverse,} = classifyResult.data!

  // 8. Tier1/Tier2判定
  console.log("[8/9] TierClassifier")
  const tierResult = new TierClassifier().classify(nodes,adjacency,maximalPaths,START_PATH)
  if (tierResult.errorCode !== 0) {
    console.error(`ERROR: ${tierResult.message}`)
    process.exit(1)
  }
  const reachability = tierResult.data!

  // 9. ファイル出力
  console.log("[9/9] AdjacencyOutputWriter + ReachabilityOutputWriter")
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

  const reachabilityWriteResult = new ReachabilityOutputWriter().write(DEFAULT_OUTPUT_DIR,reachability)
  if (reachabilityWriteResult.errorCode !== 0) {
    console.error(`ERROR: ${reachabilityWriteResult.message}`)
    process.exit(1)
  }

  console.log("")
  console.log("=== 処理完了 ===")
}

main().catch((e) => {
  console.error("予期しないエラーが発生しました:",e)
  process.exit(1)
})