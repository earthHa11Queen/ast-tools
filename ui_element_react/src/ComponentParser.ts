import * as fs from "fs"
import * as path from "path"
import type { ComponentInfo, ModuleResult } from "./types"
import { TARGET_DIR_PATTERNS } from "../config"

// ===================================================
// ComponentParser
// 解析対象のTSX/TSファイルを収集し ComponentInfo の配列を返す
// デフォルトは presentation/pages 配下のファイルのみを対象とする
// ===================================================

export class ComponentParser {

  parse(targetAppDir: string): ModuleResult<ComponentInfo[]> {

    if (!targetAppDir || !fs.existsSync(targetAppDir)) {
      return { errorCode: 1, message: `TARGET_APP_DIR が存在しません: ${targetAppDir}` }
    }

    const allFiles = this.walkFiles(targetAppDir, [".tsx", ".ts"])

    // TARGET_DIR_PATTERNSに一致するファイルのみを対象とする
    const targetFiles = allFiles.filter((f) =>
      TARGET_DIR_PATTERNS.some((pattern) => f.replace(/\\/g, "/").includes(pattern))
    )

    if (targetFiles.length === 0) {
      return {
        errorCode: 1,
        message: `対象ファイルが見つかりませんでした（パターン: ${TARGET_DIR_PATTERNS.join(", ")}）`,
      }
    }

    const components: ComponentInfo[] = targetFiles.map((f) => ({
      filePath: f,
      componentName: path.basename(f, path.extname(f)),
    }))

    console.log(`対象コンポーネント数: ${components.length}`)
    components.forEach((c) => console.log(`  ${c.componentName} ← ${c.filePath}`))

    return { errorCode: 0, data: components }
  }

  // 対象ディレクトリ配下の全ファイルを再帰的に収集する
  // node_modules は除外する
  private walkFiles(dir: string, extensions: string[]): string[] {
    const results: string[] = []
    if (!fs.existsSync(dir)) return results

    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === "node_modules") continue
      const fullPath = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        results.push(...this.walkFiles(fullPath, extensions))
      } else if (extensions.some((ext) => entry.name.endsWith(ext))) {
        results.push(fullPath)
      }
    }
    return results
  }
}
