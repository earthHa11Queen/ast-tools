import { Project, SyntaxKind } from "ts-morph"
import * as fs from "fs"
import * as path from "path"
import type { NodeInfo, ModuleResult } from "./types"

// ===================================================
// JsxRouteParser [新規：中身はv1のRouteDefinitionParser.tsを移設]
// React Router v6 の JSXスタイル <Route path=... element=...> から
// ノード情報（path↔componentName）を抽出する
//
// v1との差分：
//   - ルート定義ファイルが見つからない場合、v1ではerrorCode=1で処理中断していたが、
//     v2では他の2ストラテジー（オブジェクト設定型・ファイルベース）と併用される前提のため、
//     0件（errorCode=0, data=[]）として正常終了し、RouteDefinitionParser側の統合判定に委ねる
//   - sourceStrategy: "jsx" / hasDynamicSegment を各ノードに付与する
// ===================================================

export class JsxRouteParser {

  parse(targetAppDir: string): ModuleResult<NodeInfo[]> {

    if (!targetAppDir || !fs.existsSync(targetAppDir)) {
      return { errorCode: 1, message: `TARGET_APP_DIR が存在しません: ${targetAppDir}` }
    }

    const routeFile = this.findRouteFile(targetAppDir)
    if (!routeFile) {
      // JSXスタイルのルート定義が見つからないのは異常ではない
      // （オブジェクト設定型・ファイルベースルーティングのみのアプリもあるため）
      console.log("JsxRouteParser: JSXスタイルのルート定義ファイルは見つかりませんでした（スキップ）")
      return { errorCode: 0, data: [] }
    }

    console.log(`JsxRouteParser: ルート定義ファイル: ${routeFile}`)

    const project = new Project({ skipAddingFilesFromTsConfig: true })
    project.addSourceFileAtPath(routeFile)
    const sourceFile = project.getSourceFile(routeFile)!

    const nodes: NodeInfo[] = []

    try {
      // <Route /> は JsxSelfClosingElement として現れる
      sourceFile.getDescendantsOfKind(SyntaxKind.JsxSelfClosingElement).forEach((el) => {
        const tagName = el.getTagNameNode().getText()
        if (tagName !== "Route") return

        let pathValue = ""
        let componentName = ""

        el.getAttributes().forEach((attr: any) => {
          const name = attr.getNameNode?.()?.getText?.()
          const initializer = attr.getInitializer?.()
          if (!initializer) return

          if (name === "path") {
            // path="/..." の文字列リテラルを取得する
            pathValue = initializer.getText().replace(/['"]/g, "")
          }

          if (name === "element") {
            // element={<ComponentName />} からコンポーネント名を取得する
            const text = initializer.getText()
            const match = text.match(/<([A-Z][a-zA-Z0-9]*)/)
            if (match) componentName = match[1]
          }
        })

        if (pathValue && componentName) {
          nodes.push({
            path: pathValue,
            normalizedPath: this.normalizePath(pathValue),
            componentName,
            sourceStrategy: "jsx",
            hasDynamicSegment: this.hasDynamicSegment(pathValue),
          })
        }
      })
    } catch (e) {
      return { errorCode: 1, message: `ルート定義の解析中にエラーが発生しました: ${e}` }
    }

    console.log(`JsxRouteParser: ノード数: ${nodes.length}`)
    nodes.forEach(n => console.log(`  ${n.path} → ${n.componentName}`))
    return { errorCode: 0, data: nodes }
  }

  private findRouteFile(targetAppDir: string): string | null {
    const files = this.walkFiles(targetAppDir, [".tsx", ".ts"])
    for (const file of files) {
      const content = fs.readFileSync(file, "utf-8")
      if (
        content.includes("react-router-dom") &&
        content.includes("<Route") &&
        content.includes('path=')
      ) {
        return file
      }
    }
    return null
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

    const entries = fs.readdirSync(dir, { withFileTypes: true })
    for (const entry of entries) {
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
