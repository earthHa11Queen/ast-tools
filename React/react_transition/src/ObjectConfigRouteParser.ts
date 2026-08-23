import { Project, SyntaxKind } from "ts-morph"
import * as fs from "fs"
import * as path from "path"
import type { NodeInfo, ModuleResult } from "./types"

// ===================================================
// ObjectConfigRouteParser [新規]
// createBrowserRouter([{path, element}]) / useRoutes([...]) のような
// オブジェクト設定型のルート定義からノード情報を抽出する
// ネストした children プロパティ（v6.4以降のネストルート）にも対応する
// ===================================================

const TARGET_CALL_NAMES = ["createBrowserRouter", "createHashRouter", "createMemoryRouter", "useRoutes"]

export class ObjectConfigRouteParser {

  parse(targetAppDir: string): ModuleResult<NodeInfo[]> {

    if (!targetAppDir || !fs.existsSync(targetAppDir)) {
      return { errorCode: 1, message: `TARGET_APP_DIR が存在しません: ${targetAppDir}` }
    }

    const files = this.walkFiles(targetAppDir, [".tsx", ".ts"])
    if (files.length === 0) {
      console.log("ObjectConfigRouteParser: 対象ファイルが見つかりませんでした（スキップ）")
      return { errorCode: 0, data: [] }
    }

    const project = new Project({ skipAddingFilesFromTsConfig: true })
    files.forEach((f) => project.addSourceFileAtPath(f))

    const nodes: NodeInfo[] = []

    for (const sourceFile of project.getSourceFiles()) {
      try {
        sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression).forEach((call: any) => {
          const exprText = call.getExpression().getText()
          if (!TARGET_CALL_NAMES.includes(exprText)) return

          const args = call.getArguments()
          if (args.length === 0) return

          const arrayArg = args[0]
          if (arrayArg.getKind() !== SyntaxKind.ArrayLiteralExpression) return

          this.extractFromArray(arrayArg, "", nodes)
        })
      } catch (e) {
        console.warn(`ObjectConfigRouteParser: スキップ（解析エラー）: ${sourceFile.getFilePath()} - ${e}`)
      }
    }

    console.log(`ObjectConfigRouteParser: ノード数: ${nodes.length}`)
    nodes.forEach(n => console.log(`  ${n.path} → ${n.componentName}`))
    return { errorCode: 0, data: nodes }
  }

  // ArrayLiteralExpression（ルート定義配列）を再帰的に走査する
  // parentPath: ネストしたchildrenの場合の親pathとの結合に使用する
  private extractFromArray(arrayLiteral: any, parentPath: string, nodes: NodeInfo[]): void {
    for (const element of arrayLiteral.getElements()) {
      if (element.getKind() !== SyntaxKind.ObjectLiteralExpression) continue
      this.extractFromObject(element, parentPath, nodes)
    }
  }

  private extractFromObject(objectLiteral: any, parentPath: string, nodes: NodeInfo[]): void {
    let pathValue: string | null = null
    let componentName = ""
    let childrenArray: any = null

    for (const prop of objectLiteral.getProperties()) {
      const name = prop.getNameNode?.()?.getText?.()
      const initializer = prop.getInitializer?.()
      if (!initializer) continue

      if (name === "path" && initializer.getKind() === SyntaxKind.StringLiteral) {
        pathValue = initializer.getLiteralValue()
      }

      if (name === "element") {
        const text = initializer.getText()
        const match = text.match(/<([A-Z][a-zA-Z0-9]*)/)
        if (match) componentName = match[1]
      }

      // lazy: () => import('./Page') からコンポーネント名を推定する（elementが無い場合のフォールバック）
      if (name === "lazy" && !componentName) {
        const text = initializer.getText()
        const match = text.match(/import\(['"].*\/([A-Za-z0-9_]+)['"]\)/)
        if (match) componentName = match[1]
      }

      if (name === "children" && initializer.getKind() === SyntaxKind.ArrayLiteralExpression) {
        childrenArray = initializer
      }
    }

    // 絶対パスの組み立て（ネストルート対応）
    const combinedPath = pathValue
      ? (parentPath ? this.joinPath(parentPath, pathValue) : pathValue)
      : parentPath

    if (pathValue && componentName) {
      nodes.push({
        path: combinedPath,
        normalizedPath: this.normalizePath(combinedPath),
        componentName,
        sourceStrategy: "object-config",
        hasDynamicSegment: this.hasDynamicSegment(combinedPath),
      })
    }

    // ネストしたchildrenを再帰的に処理する
    if (childrenArray) {
      this.extractFromArray(childrenArray, combinedPath, nodes)
    }
  }

  private joinPath(parent: string, child: string): string {
    const p = parent.endsWith("/") ? parent.slice(0, -1) : parent
    const c = child.startsWith("/") ? child : `/${child}`
    return `${p}${c}`
  }

  private normalizePath(p: string): string {
    return p.replace(/:[^/]+/g, "").replace(/\/+$/, "/")
  }

  private hasDynamicSegment(p: string): boolean {
    return /:[^/]+/.test(p)
  }

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
