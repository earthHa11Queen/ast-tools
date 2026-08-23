import {TARGET_APP_DIR,DEFAULT_OUTPUT_DIR,TARGET_APP_NAME,} from "../config"
import {ComponentParser,} from "./src/ComponentParser"
import {ElementExtractor,} from "./src/ElementExtractor"
import {LabelResolver,} from "./src/LabelResolver"
import {ScopeAnalyzer,} from "./src/ScopeAnalyzer"
import {MirrorAxisMapper,} from "./src/MirrorAxisMapper"
import {UiElementOutputWriter,} from "./src/UiElementOutputWriter"

// ===================================================
// main.ts（エントリーポイント）
// 各モジュールを順に呼び出し、エラーコードで処理を制御する
// ===================================================

async function main() {
  console.log("=== ui_element_react ===")
  console.log(`対象アプリ       : ${TARGET_APP_NAME}`)
  console.log(`解析ディレクトリ : ${TARGET_APP_DIR}`)
  console.log(`出力先           : ${DEFAULT_OUTPUT_DIR}`)
  console.log("")

  // [1/6] ComponentParser
  console.log("[1/6] ComponentParser")
  const parseResult = new ComponentParser().parse(TARGET_APP_DIR)
  if (parseResult.errorCode !== 0) {
    console.error(`ERROR: ${parseResult.message}`)
    process.exit(1)
  } else {
    // nothing
  }
  const components = parseResult.data!

  // [2/6] ElementExtractor
  console.log("[2/6] ElementExtractor")
  const extractResult = new ElementExtractor().extract(components)
  if (extractResult.errorCode !== 0) {
    console.error(`ERROR: ${extractResult.message}`)
    process.exit(1)
  } else {
    // nothing
  }
  const rawMap = extractResult.data!

  // [3/6] LabelResolver
  console.log("[3/6] LabelResolver")
  const labelResult = new LabelResolver().resolve(rawMap)
  if (labelResult.errorCode !== 0) {
    console.error(`ERROR: ${labelResult.message}`)
    process.exit(1)
  } else {
    // nothing
  }
  const resolvedMap = labelResult.data!

  // [4/6] ScopeAnalyzer
  console.log("[4/6] ScopeAnalyzer")
  const scopeResult = new ScopeAnalyzer().analyze(resolvedMap)
  if (scopeResult.errorCode !== 0) {
    console.error(`ERROR: ${scopeResult.message}`)
    process.exit(1)
  } else {
    // nothing
  }
  const scopedMap = scopeResult.data!

  // [5/6] MirrorAxisMapper
  console.log("[5/6] MirrorAxisMapper")
  const mapResult = new MirrorAxisMapper().map(scopedMap)
  if (mapResult.errorCode !== 0) {
    console.error(`ERROR: ${mapResult.message}`)
    process.exit(1)
  } else {
    // nothing
  }
  const uiElementMap = mapResult.data!

  // [6/6] UiElementOutputWriter
  console.log("[6/6] UiElementOutputWriter")
  const writeResult = new UiElementOutputWriter().write(DEFAULT_OUTPUT_DIR,TARGET_APP_NAME,uiElementMap)
  if (writeResult.errorCode !== 0) {
    console.error(`ERROR: ${writeResult.message}`)
    process.exit(1)
  } else {
    // nothing
  }

  console.log("")
  console.log("=== 処理完了 ===")
}

main().catch((e) => {
  console.error("予期しないエラーが発生しました:",e)
  process.exit(1)
})