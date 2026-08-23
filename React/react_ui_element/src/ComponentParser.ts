import * as fs from "fs"
import * as path from "path"
import type {ComponentInfo,ModuleResult,} from "./types"
import {TARGET_DIR_PATTERNS,} from "../../config"

// ===================================================
// ComponentParser
// 解析対象のTSX/TSファイルを収集しComponentInfoの配列を返す
// デフォルトはpresentation/pages配下のファイルのみを対象とする
// ===================================================

export class ComponentParser {

  parse(targetAppDir: string): ModuleResult<ComponentInfo[]> {

    if (!targetAppDir || !fs.existsSync(targetAppDir)) {
      return {errorCode: 1,message: `TARGET_APP_DIR が存在しません: ${targetAppDir}`,}
    } else {
      // nothing
    }

    const allFiles = this.walkFiles(targetAppDir,[".tsx",".ts"])

    const targetFiles = allFiles.filter((filePath) =>
      TARGET_DIR_PATTERNS.some((pattern) => filePath.replace(/\\/g,"/").includes(pattern))
    )

    if (targetFiles.length === 0) {
      return {
        errorCode: 1,
        message: `対象ファイルが見つかりませんでした（パターン: ${TARGET_DIR_PATTERNS.join(", ")}）`,
      }
    } else {
      // nothing
    }

    const components: ComponentInfo[] = targetFiles.map((filePath) => ({
      filePath,
      componentName: path.basename(filePath,path.extname(filePath)),
    }))

    console.log(`対象コンポーネント数: ${components.length}`)
    components.forEach((component) => console.log(`  ${component.componentName} ← ${component.filePath}`))

    return {errorCode: 0,data: components,}
  }

  private walkFiles(directory: string,extensions: string[]): string[] {
    const results: string[] = []

    if (!fs.existsSync(directory)) {
      return results
    } else {
      // nothing
    }

    for (const entry of fs.readdirSync(directory,{withFileTypes: true,})) {
      if (entry.name === "node_modules") {
        continue
      } else {
        // nothing
      }

      const fullPath = path.join(directory,entry.name)

      if (entry.isDirectory()) {
        results.push(...this.walkFiles(fullPath,extensions))
      } else if (extensions.some((extension) => entry.name.endsWith(extension))) {
        results.push(fullPath)
      } else {
        // nothing
      }
    }

    return results
  }
}