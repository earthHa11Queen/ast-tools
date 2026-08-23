import * as fs from "fs"
import * as path from "path"
import type { ModuleResult } from "./dom_tree_ast_types"

// ===================================================
// HtmlLoader
// キャプチャ済みの実HTMLファイル一式を読み込む
// ===================================================

export type LoadedHtml = {
  screenName: string
  html: string
}

export class HtmlLoader {

  load(htmlCapturedDir: string): ModuleResult<LoadedHtml[]> {

    if (!htmlCapturedDir || !fs.existsSync(htmlCapturedDir)) {
      return {
        errorCode: 1,
        message: `HTML_CAPTURED_DIR が存在しません: ${htmlCapturedDir}` +
          `（dom_capture_gen経由でのHTML取得が未実施の可能性があります）`,
      }
    }

    const files = fs.readdirSync(htmlCapturedDir, { withFileTypes: true })
      .filter((entry) => entry.isFile() && entry.name.endsWith(".html"))
      .map((entry) => path.join(htmlCapturedDir, entry.name))

    if (files.length === 0) {
      return {
        errorCode: 1,
        message: `HTML_CAPTURED_DIR にHTMLファイルが1件も見つかりませんでした: ${htmlCapturedDir}`,
      }
    }

    const results: LoadedHtml[] = []

    for (const file of files) {
      try {
        const html = fs.readFileSync(file, "utf-8")
        const screenName = path.basename(file, ".html")
        results.push({ screenName, html })
      } catch (e) {
        console.warn(`HtmlLoader: スキップ（読み込みエラー）: ${file} - ${e}`)
      }
    }

    console.log(`HtmlLoader: 対象HTML: ${results.length}画面`)
    return { errorCode: 0, data: results }
  }
}
