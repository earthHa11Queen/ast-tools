import * as fs from "fs"
import * as path from "path"
import type { NodeInfo, ModuleResult } from "./types"

// ===================================================
// FileBasedRouteParser [新規]
// Next.js App Router等のファイルベースルーティング
// （ディレクトリ構造そのものがURLを表す方式）からノード情報を抽出する
//
// 変換例：
//   app/page.tsx                 → /            (TopPage)
//   app/users/[id]/page.tsx      → /users/:id
//   app/(marketing)/about/page.tsx → /about     （Route Groupは無視する）
//   app/blog/[...slug]/page.tsx  → /blog/:slug*  （Catch-allセグメント）
// ===================================================

export class FileBasedRouteParser {

  parse(
    pagesRootDir: string,
    pageFilePatterns: string[] = ["page.tsx", "page.ts"]
  ): ModuleResult<NodeInfo[]> {

    if (!pagesRootDir || !fs.existsSync(pagesRootDir)) {
      // ファイルベースルーティングを採用していないアプリもあるため、
      // ディレクトリが存在しないこと自体はエラーとしない
      console.log("FileBasedRouteParser: PAGES_ROOT_DIR が存在しません（スキップ）")
      return { errorCode: 0, data: [] }
    }

    const nodes: NodeInfo[] = []

    try {
      this.walkPagesDir(pagesRootDir, pagesRootDir, pageFilePatterns, nodes)
    } catch (e) {
      return { errorCode: 1, message: `ファイルベースルーティングの解析中にエラーが発生しました: ${e}` }
    }

    console.log(`FileBasedRouteParser: ノード数: ${nodes.length}`)
    nodes.forEach(n => console.log(`  ${n.path} → ${n.componentName}`))
    return { errorCode: 0, data: nodes }
  }

  // ディレクトリを再帰的に走査し、ページファイルを見つけたらURLへ変換する
  private walkPagesDir(
    currentDir: string,
    pagesRootDir: string,
    pageFilePatterns: string[],
    nodes: NodeInfo[]
  ): void {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true })

    for (const entry of entries) {
      if (entry.name === "node_modules") continue
      const fullPath = path.join(currentDir, entry.name)

      if (entry.isDirectory()) {
        this.walkPagesDir(fullPath, pagesRootDir, pageFilePatterns, nodes)
        continue
      }

      if (!pageFilePatterns.includes(entry.name)) continue

      const urlPath = this.convertDirToUrl(path.dirname(fullPath), pagesRootDir)
      const componentName = this.resolveComponentName(currentDir, pagesRootDir)

      nodes.push({
        path: urlPath,
        normalizedPath: this.normalizePath(urlPath),
        componentName,
        sourceStrategy: "file-based",
        hasDynamicSegment: this.hasDynamicSegment(urlPath),
      })
    }
  }

  // ディレクトリパスをURLパスへ変換する
  private convertDirToUrl(dirPath: string, pagesRootDir: string): string {
    const relative = path.relative(pagesRootDir, dirPath).split(path.sep)

    const segments = relative
      .filter((seg) => seg.length > 0)
      // Route Group（括弧のみのディレクトリ）はURLセグメントとして扱わない
      .filter((seg) => !(seg.startsWith("(") && seg.endsWith(")")))
      .map((seg) => {
        // Catch-all: [...slug] → :slug*
        const catchAll = seg.match(/^\[\.\.\.(.+)\]$/)
        if (catchAll) return `:${catchAll[1]}*`
        // 通常の動的セグメント: [id] → :id
        const dynamic = seg.match(/^\[(.+)\]$/)
        if (dynamic) return `:${dynamic[1]}`
        return seg
      })

    const urlPath = "/" + segments.join("/")
    return urlPath === "//" ? "/" : urlPath
  }

  // コンポーネント名をディレクトリ名から推定する
  // ルートページ（app直下のpage.tsx）は "TopPage" とする
  private resolveComponentName(dirPath: string, pagesRootDir: string): string {
    if (path.resolve(dirPath) === path.resolve(pagesRootDir)) {
      return "TopPage"
    }
    const dirName = path.basename(dirPath)
    // 動的セグメントの角括弧・catch-allの ... を除去してコンポーネント名候補とする
    const cleaned = dirName.replace(/[\[\].]/g, "").replace(/^\.\.\./, "")
    const pascalCase = cleaned.charAt(0).toUpperCase() + cleaned.slice(1)
    return `${pascalCase}Page`
  }

  private normalizePath(p: string): string {
    return p.replace(/:[^/]+\*?/g, "").replace(/\/+$/, "/")
  }

  private hasDynamicSegment(p: string): boolean {
    return /:[^/]+/.test(p)
  }
}
