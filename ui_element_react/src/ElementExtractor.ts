import { Project, SyntaxKind } from "ts-morph"
import type { ComponentInfo, RawElement, ModuleResult } from "./types"
import { NATIVE_TARGET_TAGS, CUSTOM_COMPONENT_MAP } from "../config"

// ===================================================
// ElementExtractor
// 各コンポーネントのreturn文内JSXを解析し RawElement の配列を返す
// 取得対象：ネイティブHTMLタグ + CUSTOM_COMPONENT_MAPに定義されたコンポーネント
// ===================================================

const CUSTOM_NAMES = new Set(CUSTOM_COMPONENT_MAP.map((c) => c.componentName))

export class ElementExtractor {

  extract(components: ComponentInfo[]): ModuleResult<Map<string, RawElement[]>> {

    const project = new Project({ skipAddingFilesFromTsConfig: true })
    components.forEach((c) => project.addSourceFileAtPath(c.filePath))

    const result = new Map<string, RawElement[]>()

    for (const sourceFile of project.getSourceFiles()) {
      const componentName = components.find(
        (c) => c.filePath === sourceFile.getFilePath()
      )?.componentName ?? sourceFile.getBaseName()

      const elements: RawElement[] = []
      this.processedNodeIds = new Set<number>()  // コンポーネントごとにリセット

      try {
        this.collectReturnJsx(sourceFile, componentName, sourceFile.getFilePath(), elements)
      } catch (e) {
        console.warn(`スキップ（解析エラー）: ${componentName} - ${e}`)
      }

      result.set(componentName, elements)
      console.log(`  ${componentName}: ${elements.length}件`)
    }

    console.log(`ElementExtractor 完了: ${result.size}コンポーネント`)
    return { errorCode: 0, data: result }
  }

  private collectReturnJsx(
    sourceFile: any,
    componentName: string,
    filePath: string,
    elements: RawElement[]
  ): void {
    sourceFile.getDescendantsOfKind(SyntaxKind.ReturnStatement).forEach((ret: any) => {
      const expr = ret.getExpression()
      if (!expr) return
      this.walkJsx(expr, componentName, filePath, elements, false)
    })
  }

  // 重複防止用：処理済みノードのIDを記録する
  private processedNodeIds = new Set<number>()

  private walkJsx(
    node: any,
    componentName: string,
    filePath: string,
    elements: RawElement[],
    isDynamicContext: boolean
  ): void {
    if (!node) return

    const kind = node.getKind()

    // isDynamic判定：map/filter/forEachのコールバック内かどうか
    let isDynamic = isDynamicContext
    if (kind === SyntaxKind.CallExpression) {
      const propAccess = node.getExpression()
      if (propAccess?.getKind() === SyntaxKind.PropertyAccessExpression) {
        const methodName = propAccess.getName?.() ?? ""
        if (["map", "filter", "forEach"].includes(methodName)) {
          isDynamic = true
        }
      }
    }

    if (
      kind === SyntaxKind.JsxOpeningElement ||
      kind === SyntaxKind.JsxSelfClosingElement
    ) {
      const tagName = node.getTagNameNode?.()?.getText() ?? ""
      const isNative = NATIVE_TARGET_TAGS.includes(tagName.toLowerCase())
      const isCustom = CUSTOM_NAMES.has(tagName)

      if (isNative || isCustom) {
        // 重複防止：同一ノードを二重に処理しない
        const nodeId = node.getPos?.() ?? -1
        if (this.processedNodeIds.has(nodeId)) {
          // skip
        } else {
          this.processedNodeIds.add(nodeId)
          // JsxOpeningElementの場合は親（JsxElement）からchildrenTextを取得する
          const childrenText = kind === SyntaxKind.JsxOpeningElement
            ? this.getChildrenText(node.getParent())
            : null

          const raw = this.buildRawElement(
            node, tagName, componentName, filePath, isDynamic, childrenText
          )
          elements.push(raw)
        }
      }
    }

    node.forEachChild?.((child: any) => {
      this.walkJsx(child, componentName, filePath, elements, isDynamic)
    })
  }

  // JsxElementのchildrenからテキストを取得する
  // <Button>新規接続設定</Button> や {testing ? 'テスト中...' : '接続テスト'} に対応する
  private getChildrenText(jsxElement: any): string | null {
    if (!jsxElement || jsxElement.getKind() !== SyntaxKind.JsxElement) return null

    const textParts: string[] = []
    for (const child of jsxElement.getJsxChildren?.() ?? []) {
      const kind = child.getKind()

      // 通常のテキストノード: <Button>テキスト</Button>
      if (kind === SyntaxKind.JsxText) {
        const text = child.getText().trim()
        if (text) textParts.push(text)
        continue
      }

      // JsxExpression: {expr} 形式
      if (kind === SyntaxKind.JsxExpression) {
        const expr = child.getExpression?.()
        if (!expr) continue
        const str = this.extractStringFromExpr(expr)
        if (str) textParts.push(str)
      }
    }
    return textParts.length > 0 ? textParts.join(" ") : null
  }

  // 式から静的な文字列を可能な範囲で抽出する
  // 三項演算子の「falseのとき（=通常状態）」の値を優先して採用する
  private extractStringFromExpr(expr: any): string | null {
    const kind = expr.getKind()

    // 文字列リテラル: '接続テスト'
    if (kind === SyntaxKind.StringLiteral) {
      return expr.getLiteralValue() ?? null
    }

    // 三項演算子: condition ? 'テスト中...' : '接続テスト'
    // false側（通常状態）の文字列を採用し、ネストした三項演算子も再帰的に処理する
    if (kind === SyntaxKind.ConditionalExpression) {
      const whenFalse = expr.getWhenFalse?.()
      if (whenFalse) {
        const result = this.extractStringFromExpr(whenFalse)
        if (result) return result
      }
      // falseが取れない場合はtrue側を試みる
      const whenTrue = expr.getWhenTrue?.()
      if (whenTrue) return this.extractStringFromExpr(whenTrue)
    }

    return null
  }

  // inputProps={{ min: 1, max: 65535 }} のようなネストしたオブジェクト属性を展開する
  // MUIのTextFieldで使われる制約属性を取得するために必要
  private extractInputPropsValues(node: any): {
    min: number | null
    max: number | null
    maxLength: number | null
    minLength: number | null
  } {
    const result = { min: null as number | null, max: null as number | null, maxLength: null as number | null, minLength: null as number | null }
    const attrs = node.getAttributes?.() ?? []

    for (const attr of attrs) {
      const name = attr.getNameNode?.()?.getText()
      if (name !== "inputProps") continue

      const init = attr.getInitializer?.()
      if (!init || init.getKind() !== SyntaxKind.JsxExpression) continue

      const inner = init.getExpression?.()
      if (!inner || inner.getKind() !== SyntaxKind.ObjectLiteralExpression) continue

      for (const prop of inner.getProperties?.() ?? []) {
        const key = prop.getNameNode?.()?.getText()
        const valNode = prop.getInitializer?.()
        if (!valNode) continue
        const valText = valNode.getText()
        const num = Number(valText)
        const numVal = isNaN(num) ? null : num
        if (key === "min")       result.min = numVal
        if (key === "max")       result.max = numVal
        if (key === "maxLength") result.maxLength = numVal
        if (key === "minLength") result.minLength = numVal
      }
    }
    return result
  }

  private buildRawElement(
    node: any,
    tagName: string,
    componentName: string,
    filePath: string,
    isDynamic: boolean,
    childrenText: string | null
  ): RawElement {

    const getStr  = (name: string): string | null => this.getAttrString(node, name)
    const getBool = (name: string): boolean       => this.getAttrBool(node, name)
    const getNum  = (name: string): number | null => this.getAttrNumber(node, name)

    const typeAttr = getStr("type")

    // inputProps内の制約を展開する（MUIのTextField等）
    const inputProps = this.extractInputPropsValues(node)

    const isHiddenByType  = typeAttr === "hidden"
    const isHiddenByAttr  = getBool("hidden")
    const ariaHiddenValue = getStr("aria-hidden")
    const isHidden = isHiddenByType || isHiddenByAttr || ariaHiddenValue === "true"

    const { parentScopeTag, parentScopeClass, parentScopeId } = this.getParentScope(node)

    return {
      componentName,
      filePath,

      // グループA：基本識別属性
      tag:           tagName,
      idAttr:        getStr("id"),
      nameAttr:      getStr("name"),
      classNameAttr: getStr("className"),
      dataTestId:    getStr("data-testid"),
      typeAttr,
      roleAttr:      getStr("role"),

      // グループB：ラベル・説明属性
      // childrenTextを最優先にする（MUIのButtonのテキストラベルに対応）
      ariaLabel:      getStr("aria-label"),
      ariaLabelledBy: getStr("aria-labelledby"),
      htmlFor:        getStr("htmlFor"),
      placeholder:    getStr("placeholder"),
      labelProp:      getStr("label") ?? childrenText,  // label属性 → childrenTextの順で採用
      title:          getStr("title"),

      // グループC：入力制約属性
      // 直接属性 → inputProps内の値の順でフォールバック
      maxLength:    getNum("maxLength") ?? getNum("maxlength") ?? inputProps.maxLength,
      minLength:    getNum("minLength") ?? getNum("minlength") ?? inputProps.minLength,
      maxValue:     getNum("max") ?? inputProps.max,
      minValue:     getNum("min") ?? inputProps.min,
      step:         getNum("step"),
      pattern:      getStr("pattern"),
      inputMode:    getStr("inputMode") ?? getStr("inputmode"),
      accept:       getStr("accept"),
      autocomplete: getStr("autoComplete") ?? getStr("autocomplete"),

      // グループD：画面遷移・フォーム送信属性
      href:       getStr("href"),
      target:     getStr("target"),
      formAction: getStr("formAction") ?? getStr("formaction"),
      formId:     getStr("form"),

      // グループE：状態・可視性属性
      isRequired:   getBool("required"),
      isDisabled:   getBool("disabled"),
      isReadonly:   getBool("readOnly") || getBool("readonly"),
      isHidden,
      isMultiple:   getBool("multiple"),
      isChecked:    getBool("defaultChecked") || getBool("checked"),
      defaultValue: getStr("defaultValue") ?? getStr("value"),
      tabIndex:     getNum("tabIndex") ?? getNum("tabindex"),

      // グループF：アクセシビリティ・インタラクション属性
      ariaExpanded:  getStr("aria-expanded"),
      ariaControls:  getStr("aria-controls"),
      ariaHaspopup:  getStr("aria-haspopup"),
      ariaSelected:  getStr("aria-selected"),
      ariaChecked:   getStr("aria-checked"),

      // グループG：動的生成判定
      isDynamic,

      // グループH：スコープ情報
      parentScopeTag,
      parentScopeClass,
      parentScopeId,

      // グループI：位置情報
      lineNumber: node.getStartLineNumber?.() ?? 0,
    }
  }

  private getAttrString(node: any, attrName: string): string | null {
    const attrs = node.getAttributes?.() ?? []
    for (const attr of attrs) {
      if (attr.getNameNode?.()?.getText() !== attrName) continue
      const init = attr.getInitializer?.()
      if (!init) return "true"
      const kind = init.getKind()
      if (kind === SyntaxKind.StringLiteral) {
        return (init as any).getLiteralValue() ?? null
      }
      if (kind === SyntaxKind.JsxExpression) {
        const inner = (init as any).getExpression?.()
        if (!inner) return null
        const innerKind = inner.getKind()
        if (innerKind === SyntaxKind.StringLiteral) {
          return inner.getLiteralValue() ?? null
        }
        if (innerKind === SyntaxKind.NoSubstitutionTemplateLiteral) {
          return inner.getLiteralValue() ?? null
        }
        return null
      }
    }
    return null
  }

  private getAttrBool(node: any, attrName: string): boolean {
    const attrs = node.getAttributes?.() ?? []
    for (const attr of attrs) {
      if (attr.getNameNode?.()?.getText() !== attrName) continue
      const init = attr.getInitializer?.()
      if (!init) return true
      const kind = init.getKind()
      if (kind === SyntaxKind.JsxExpression) {
        const inner = (init as any).getExpression?.()
        if (inner?.getKind() === SyntaxKind.TrueKeyword)  return true
        if (inner?.getKind() === SyntaxKind.FalseKeyword) return false
      }
      return true
    }
    return false
  }

  private getAttrNumber(node: any, attrName: string): number | null {
    const str = this.getAttrString(node, attrName)
    if (str === null) return null
    const num = Number(str)
    return isNaN(num) ? null : num
  }

  private getParentScope(node: any): {
    parentScopeTag: string
    parentScopeClass: string | null
    parentScopeId: string | null
  } {
    const SCOPE_TAGS = new Set([
      "form", "div", "section", "article", "aside", "nav",
      "ul", "ol", "li", "table", "tbody", "tr", "td", "th",
      "fieldset", "header", "footer", "main",
    ])

    let current = node.getParent?.()
    while (current) {
      const kind = current.getKind()
      if (
        kind === SyntaxKind.JsxOpeningElement ||
        kind === SyntaxKind.JsxSelfClosingElement
      ) {
        const tagName = current.getTagNameNode?.()?.getText()?.toLowerCase() ?? ""
        if (SCOPE_TAGS.has(tagName)) {
          const scopeClass = this.getAttrString(current, "className")
          const scopeId    = this.getAttrString(current, "id")
          return { parentScopeTag: tagName, parentScopeClass: scopeClass, parentScopeId: scopeId }
        }
      }
      current = current.getParent?.()
    }

    return { parentScopeTag: "root", parentScopeClass: null, parentScopeId: null }
  }
}
