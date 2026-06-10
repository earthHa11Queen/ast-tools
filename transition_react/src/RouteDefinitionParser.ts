import { Project, SyntaxKind } from "ts-morph"
import * as fs from "fs"
import * as path from "path"
import type { NodeInfo, ModuleResult } from "./types"


export class RouteDefinitionParser {

  parse(targetAppDir: string): ModuleResult<NodeInfo[]> {

    if (!targetAppDir || !fs.existsSync(targetAppDir)) {
      return { errorCode: 1, message: `TARGET_APP_DIR が存在しません: ${targetAppDir}` }
    }

    const routeFile = this.findRouteFile(targetAppDir)
    if (!routeFile) {
      return { errorCode: 1, message: "React Router v6 のルート定義ファイルが見つかりませんでした" }
    }

    console.log(`ルート定義ファイル: ${routeFile}`)

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
          })
        }
      })
    } catch (e) {
      return { errorCode: 1, message: `ルート定義の解析中にエラーが発生しました: ${e}` }
    }

    if (nodes.length === 0) {
      return { errorCode: 1, message: "ルート定義が1件も抽出できませんでした" }
    }

    console.log(`ノード数: ${nodes.length}`)
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
