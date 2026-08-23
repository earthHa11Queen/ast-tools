import { Project, SyntaxKind } from "ts-morph"
import * as fs from "fs"
import * as path from "path"
import type { EdgeInfo, ModuleResult } from "./types"

// ===================================================
// TransitionExtractor [更新・v2：navigate(-1)（戻る遷移）の抽出に対応]
// 全ソースファイルを走査し、画面遷移を引き起こす記述（エッジ）を抽出する
//
// v1からの変更点：
//   extractNavigateCalls内で、navigate()の第一引数が数値リテラル（navigate(-1)等）の場合、
//   実行時の履歴スタックに依存し静的にtoPathを確定できないため、
//   toPath="__back__" / transitionType="navigate.back" として専用に抽出する
// ===================================================

export class TransitionExtractor {

  extract(targetAppDir: string): ModuleResult<EdgeInfo[]> {

    if (!targetAppDir || !fs.existsSync(targetAppDir)) {
      return { errorCode: 1, message: `TARGET_APP_DIR が存在しません: ${targetAppDir}` }
    }

    const files = this.walkFiles(targetAppDir, [".tsx", ".ts"])
    if (files.length === 0) {
      return { errorCode: 1, message: "解析対象のファイルが見つかりませんでした" }
    }

    const project = new Project({ skipAddingFilesFromTsConfig: true })
    files.forEach((f) => project.addSourceFileAtPath(f))

    const edges: EdgeInfo[] = []

    for (const sourceFile of project.getSourceFiles()) {
      const filePath = sourceFile.getFilePath()

      try {
        this.extractNavigateCalls(sourceFile, filePath, edges)
        this.extractLocationHref(sourceFile, filePath, edges)
        this.extractLinkTo(sourceFile, filePath, edges)
        this.extractWindowOpen(sourceFile, filePath, edges)
      } catch (e) {
        console.warn(`スキップ（解析エラー）: ${filePath} - ${e}`)
      }
    }

    console.log(`エッジ数: ${edges.length}`)
    edges.forEach(e => console.log(`  ${e.sourceFile.split('/').pop()} → ${e.toPath} [${e.transitionType}]`))
    return { errorCode: 0, data: edges }
  }

  // navigate() 呼び出しからパスを抽出する
  // navigate(-1) のような数値引数（履歴を戻る/進める記法）は navigate.back として別途抽出する
  private extractNavigateCalls(sourceFile: any, filePath: string, edges: EdgeInfo[]): void {
    sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression).forEach((call: any) => {
      if (call.getExpression().getText() !== "navigate") return
      const args = call.getArguments()
      if (args.length === 0) return

      // [新規・v2] navigate(-1) 等、数値引数による戻る遷移の検出
      // 戻り先は実行時の履歴スタックに依存するため静的には確定できない
      if (this.isNumericArgument(args[0])) {
        edges.push({ sourceFile: filePath, toPath: "__back__", transitionType: "navigate.back" })
        return
      }

      const toPath = this.extractStaticPath(args[0])
      if (!toPath) return
      edges.push({ sourceFile: filePath, toPath, transitionType: "navigate" })
    })
  }

  // [新規・v2] 数値リテラル引数かどうかを判定する
  // 符号なし（NumericLiteral）と符号付き（PrefixUnaryExpression + NumericLiteral、例：-1）の両方に対応する
  private isNumericArgument(node: any): boolean {
    const kind = node.getKind()
    if (kind === SyntaxKind.NumericLiteral) return true
    if (kind === SyntaxKind.PrefixUnaryExpression) {
      const operand = node.getOperand?.()
      if (operand?.getKind() === SyntaxKind.NumericLiteral) return true
    }
    return false
  }

  // window.location.href = 'パス' からパスを抽出する
  private extractLocationHref(sourceFile: any, filePath: string, edges: EdgeInfo[]): void {
    sourceFile.getDescendantsOfKind(SyntaxKind.BinaryExpression).forEach((bin: any) => {
      if (bin.getLeft().getText() !== "window.location.href") return
      const toPath = this.extractStaticPath(bin.getRight())
      if (!toPath) return
      edges.push({ sourceFile: filePath, toPath, transitionType: "location.href" })
    })
  }

  // <Link to="パス"> から to 属性を抽出する
  private extractLinkTo(sourceFile: any, filePath: string, edges: EdgeInfo[]): void {
    const kinds = [SyntaxKind.JsxOpeningElement, SyntaxKind.JsxSelfClosingElement]
    for (const kind of kinds) {
      sourceFile.getDescendantsOfKind(kind).forEach((jsxEl: any) => {
        if ((jsxEl.getTagNameNode?.()?.getText() ?? "") !== "Link") return
        for (const attr of jsxEl.getAttributes?.() ?? []) {
          if (attr.getNameNode?.()?.getText() !== "to") continue
          const initializer = attr.getInitializer?.()
          if (!initializer) continue
          const toPath = this.extractStaticPath(initializer)
          if (!toPath) continue
          edges.push({ sourceFile: filePath, toPath, transitionType: "Link" })
        }
      })
    }
  }

  // window.open('パス', '_blank') からパスを抽出する
  // 新規タブで開く遷移もテスト設計上は遷移エッジとして扱う
  private extractWindowOpen(sourceFile: any, filePath: string, edges: EdgeInfo[]): void {
    sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression).forEach((call: any) => {
      if (call.getExpression().getText() !== "window.open") return
      const args = call.getArguments()
      if (args.length === 0) return
      const toPath = this.extractStaticPath(args[0])
      if (!toPath) return
      edges.push({ sourceFile: filePath, toPath, transitionType: "window.open" })
    })
  }

  // AST ノードから静的なパス文字列を取得する
  // - 文字列リテラル: '/path' → '/path'
  // - テンプレートリテラル: `/path/${id}` → '/path'（動的部分・クエリを除去）
  // - 変数や式: null を返す（対象外）
  private extractStaticPath(node: any): string | null {
    const kind = node.getKind()

    // 文字列リテラル
    if (kind === SyntaxKind.StringLiteral) {
      const pathOnly = node.getLiteralValue().split("?")[0]
      return pathOnly.startsWith("/") ? pathOnly : null
    }

    // テンプレートリテラル（動的セグメントあり）
    if (kind === SyntaxKind.TemplateExpression) {
      const headText = node.getHead().getText()
      const cleaned = headText.replace(/^`/, "").replace(/\$\{$/, "").split("?")[0]
      return cleaned.startsWith("/") ? cleaned : null
    }

    // テンプレートリテラル（動的セグメントなし）
    if (kind === SyntaxKind.NoSubstitutionTemplateLiteral) {
      const cleaned = node.getText().replace(/^`/, "").replace(/`$/, "").split("?")[0]
      return cleaned.startsWith("/") ? cleaned : null
    }

    // JsxExpression でラップされている場合は中身を取り出す
    if (kind === SyntaxKind.JsxExpression) {
      const expr = node.getExpression?.()
      if (expr) return this.extractStaticPath(expr)
    }

    return null
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
