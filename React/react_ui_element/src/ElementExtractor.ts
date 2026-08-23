import {Project,SyntaxKind,} from "ts-morph"
import type {ComponentInfo,RawElement,ModuleResult,} from "./types"
import {NATIVE_TARGET_TAGS,CUSTOM_COMPONENT_MAP,} from "../../config"

// ===================================================
// ElementExtractor
// 各コンポーネントのreturn文内JSXを解析しRawElementの配列を返す
// 取得対象：ネイティブHTMLタグ + CUSTOM_COMPONENT_MAPに定義されたコンポーネント
// ===================================================

const CUSTOM_NAMES = new Set(CUSTOM_COMPONENT_MAP.map((component) => component.componentName))

export class ElementExtractor {

  private processedNodeIds = new Set<number>()

  extract(components: ComponentInfo[]): ModuleResult<Map<string,RawElement[]>> {

    const project = new Project({skipAddingFilesFromTsConfig: true,})
    components.forEach((component) => project.addSourceFileAtPath(component.filePath))

    const result = new Map<string,RawElement[]>()

    for (const sourceFile of project.getSourceFiles()) {
      const componentName = components.find(
        (component) => component.filePath === sourceFile.getFilePath()
      )?.componentName ?? sourceFile.getBaseName()

      const elements: RawElement[] = []
      this.processedNodeIds = new Set<number>()

      try {
        this.collectReturnJsx(sourceFile,componentName,sourceFile.getFilePath(),elements)
      } catch (e) {
        console.warn(`スキップ（解析エラー）: ${componentName} - ${e}`)
      }

      result.set(componentName,elements)
      console.log(`  ${componentName}: ${elements.length}件`)
    }

    console.log(`ElementExtractor 完了: ${result.size}コンポーネント`)
    return {errorCode: 0,data: result,}
  }

  private collectReturnJsx(sourceFile: any,componentName: string,filePath: string,elements: RawElement[]): void {
    sourceFile.getDescendantsOfKind(SyntaxKind.ReturnStatement).forEach((returnStatement: any) => {
      const expression = returnStatement.getExpression()

      if (!expression) {
        return
      } else {
        // nothing
      }

      this.walkJsx(expression,componentName,filePath,elements,false)
    })
  }

  private walkJsx(
    node: any,
    componentName: string,
    filePath: string,
    elements: RawElement[],
    isDynamicContext: boolean
  ): void {

    if (!node) {
      return
    } else {
      // nothing
    }

    const kind = node.getKind()
    let isDynamic = isDynamicContext

    if (kind === SyntaxKind.CallExpression) {
      const propertyAccess = node.getExpression()

      if (propertyAccess?.getKind() === SyntaxKind.PropertyAccessExpression) {
        const methodName = propertyAccess.getName?.() ?? ""

        if (["map","filter","forEach"].includes(methodName)) {
          isDynamic = true
        } else {
          // nothing
        }
      } else {
        // nothing
      }
    } else {
      // nothing
    }

    if (kind === SyntaxKind.JsxOpeningElement || kind === SyntaxKind.JsxSelfClosingElement) {
      const tagName = node.getTagNameNode?.()?.getText() ?? ""
      const isNative = NATIVE_TARGET_TAGS.includes(tagName.toLowerCase())
      const isCustom = CUSTOM_NAMES.has(tagName)

      if (isNative || isCustom) {
        const nodeId = node.getPos?.() ?? -1

        if (this.processedNodeIds.has(nodeId)) {
          // skip
        } else {
          this.processedNodeIds.add(nodeId)

          const childrenText = kind === SyntaxKind.JsxOpeningElement
            ? this.getChildrenText(node.getParent())
            : null

          const raw = this.buildRawElement(node,tagName,componentName,filePath,isDynamic,childrenText)
          elements.push(raw)
        }
      } else {
        // nothing
      }
    } else {
      // nothing
    }

    node.forEachChild?.((child: any) => {
      this.walkJsx(child,componentName,filePath,elements,isDynamic)
    })
  }

  private getChildrenText(jsxElement: any): string | null {
    if (!jsxElement || jsxElement.getKind() !== SyntaxKind.JsxElement) {
      return null
    } else {
      // nothing
    }

    const textParts: string[] = []

    for (const child of jsxElement.getJsxChildren?.() ?? []) {
      const kind = child.getKind()

      if (kind === SyntaxKind.JsxText) {
        const text = child.getText().trim()

        if (text) {
          textParts.push(text)
        } else {
          // nothing
        }

        continue
      } else {
        // nothing
      }

      if (kind === SyntaxKind.JsxExpression) {
        const expression = child.getExpression?.()

        if (!expression) {
          continue
        } else {
          // nothing
        }

        const text = this.extractStringFromExpr(expression)

        if (text) {
          textParts.push(text)
        } else {
          // nothing
        }
      } else {
        // nothing
      }
    }

    return textParts.length > 0 ? textParts.join(" ") : null
  }

  private extractStringFromExpr(expression: any): string | null {
    const kind = expression.getKind()

    if (kind === SyntaxKind.StringLiteral) {
      return expression.getLiteralValue() ?? null
    } else {
      // nothing
    }

    if (kind === SyntaxKind.ConditionalExpression) {
      const whenFalse = expression.getWhenFalse?.()

      if (whenFalse) {
        const result = this.extractStringFromExpr(whenFalse)

        if (result) {
          return result
        } else {
          // nothing
        }
      } else {
        // nothing
      }

      const whenTrue = expression.getWhenTrue?.()

      if (whenTrue) {
        return this.extractStringFromExpr(whenTrue)
      } else {
        // nothing
      }
    } else {
      // nothing
    }

    return null
  }

  private extractInputPropsValues(node: any): {
    min: number | null
    max: number | null
    maxLength: number | null
    minLength: number | null
  } {

    const result = {
      min: null as number | null,
      max: null as number | null,
      maxLength: null as number | null,
      minLength: null as number | null,
    }

    const attributes = node.getAttributes?.() ?? []

    for (const attribute of attributes) {
      const name = attribute.getNameNode?.()?.getText()

      if (name !== "inputProps") {
        continue
      } else {
        // nothing
      }

      const initializer = attribute.getInitializer?.()

      if (!initializer || initializer.getKind() !== SyntaxKind.JsxExpression) {
        continue
      } else {
        // nothing
      }

      const inner = initializer.getExpression?.()

      if (!inner || inner.getKind() !== SyntaxKind.ObjectLiteralExpression) {
        continue
      } else {
        // nothing
      }

      for (const property of inner.getProperties?.() ?? []) {
        const key = property.getNameNode?.()?.getText()
        const valueNode = property.getInitializer?.()

        if (!valueNode) {
          continue
        } else {
          // nothing
        }

        const valueText = valueNode.getText()
        const numberValue = Number(valueText)
        const normalizedValue = isNaN(numberValue) ? null : numberValue

        if (key === "min") {
          result.min = normalizedValue
        } else {
          // nothing
        }

        if (key === "max") {
          result.max = normalizedValue
        } else {
          // nothing
        }

        if (key === "maxLength") {
          result.maxLength = normalizedValue
        } else {
          // nothing
        }

        if (key === "minLength") {
          result.minLength = normalizedValue
        } else {
          // nothing
        }
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

    const getString = (name: string): string | null => this.getAttrString(node,name)
    const getBoolean = (name: string): boolean => this.getAttrBool(node,name)
    const getNumber = (name: string): number | null => this.getAttrNumber(node,name)

    const typeAttr = getString("type")
    const inputProps = this.extractInputPropsValues(node)

    const isHiddenByType = typeAttr === "hidden"
    const isHiddenByAttribute = getBoolean("hidden")
    const ariaHiddenValue = getString("aria-hidden")
    const isHidden = isHiddenByType || isHiddenByAttribute || ariaHiddenValue === "true"

    const {parentScopeTag,parentScopeClass,parentScopeId,} = this.getParentScope(node)

    return {
      componentName,
      filePath,

      tag: tagName,
      idAttr: getString("id"),
      nameAttr: getString("name"),
      classNameAttr: getString("className"),
      dataTestId: getString("data-testid"),
      typeAttr,
      roleAttr: getString("role"),

      ariaLabel: getString("aria-label"),
      ariaLabelledBy: getString("aria-labelledby"),
      htmlFor: getString("htmlFor"),
      placeholder: getString("placeholder"),
      labelProp: getString("label") ?? childrenText,
      title: getString("title"),

      maxLength: getNumber("maxLength") ?? getNumber("maxlength") ?? inputProps.maxLength,
      minLength: getNumber("minLength") ?? getNumber("minlength") ?? inputProps.minLength,
      maxValue: getNumber("max") ?? inputProps.max,
      minValue: getNumber("min") ?? inputProps.min,
      step: getNumber("step"),
      pattern: getString("pattern"),
      inputMode: getString("inputMode") ?? getString("inputmode"),
      accept: getString("accept"),
      autocomplete: getString("autoComplete") ?? getString("autocomplete"),

      href: getString("href"),
      target: getString("target"),
      formAction: getString("formAction") ?? getString("formaction"),
      formId: getString("form"),

      isRequired: getBoolean("required"),
      isDisabled: getBoolean("disabled"),
      isReadonly: getBoolean("readOnly") || getBoolean("readonly"),
      isHidden,
      isMultiple: getBoolean("multiple"),
      isChecked: getBoolean("defaultChecked") || getBoolean("checked"),
      defaultValue: getString("defaultValue") ?? getString("value"),
      tabIndex: getNumber("tabIndex") ?? getNumber("tabindex"),

      ariaExpanded: getString("aria-expanded"),
      ariaControls: getString("aria-controls"),
      ariaHaspopup: getString("aria-haspopup"),
      ariaSelected: getString("aria-selected"),
      ariaChecked: getString("aria-checked"),

      isDynamic,

      parentScopeTag,
      parentScopeClass,
      parentScopeId,

      lineNumber: node.getStartLineNumber?.() ?? 0,
    }
  }

  private getAttrString(node: any,attributeName: string): string | null {
    const attributes = node.getAttributes?.() ?? []

    for (const attribute of attributes) {
      if (attribute.getNameNode?.()?.getText() !== attributeName) {
        continue
      } else {
        // nothing
      }

      const initializer = attribute.getInitializer?.()

      if (!initializer) {
        return "true"
      } else {
        // nothing
      }

      const kind = initializer.getKind()

      if (kind === SyntaxKind.StringLiteral) {
        return initializer.getLiteralValue() ?? null
      } else {
        // nothing
      }

      if (kind === SyntaxKind.JsxExpression) {
        const inner = initializer.getExpression?.()

        if (!inner) {
          return null
        } else {
          // nothing
        }

        const innerKind = inner.getKind()

        if (innerKind === SyntaxKind.StringLiteral) {
          return inner.getLiteralValue() ?? null
        } else {
          // nothing
        }

        if (innerKind === SyntaxKind.NoSubstitutionTemplateLiteral) {
          return inner.getLiteralValue() ?? null
        } else {
          // nothing
        }

        return null
      } else {
        // nothing
      }
    }

    return null
  }

  private getAttrBool(node: any,attributeName: string): boolean {
    const attributes = node.getAttributes?.() ?? []

    for (const attribute of attributes) {
      if (attribute.getNameNode?.()?.getText() !== attributeName) {
        continue
      } else {
        // nothing
      }

      const initializer = attribute.getInitializer?.()

      if (!initializer) {
        return true
      } else {
        // nothing
      }

      const kind = initializer.getKind()

      if (kind === SyntaxKind.JsxExpression) {
        const inner = initializer.getExpression?.()

        if (inner?.getKind() === SyntaxKind.TrueKeyword) {
          return true
        } else {
          // nothing
        }

        if (inner?.getKind() === SyntaxKind.FalseKeyword) {
          return false
        } else {
          // nothing
        }
      } else {
        // nothing
      }

      return true
    }

    return false
  }

  private getAttrNumber(node: any,attributeName: string): number | null {
    const stringValue = this.getAttrString(node,attributeName)

    if (stringValue === null) {
      return null
    } else {
      // nothing
    }

    const numberValue = Number(stringValue)
    return isNaN(numberValue) ? null : numberValue
  }

  private getParentScope(node: any): {
    parentScopeTag: string
    parentScopeClass: string | null
    parentScopeId: string | null
  } {

    const SCOPE_TAGS = new Set([
      "form","div","section","article","aside","nav",
      "ul","ol","li","table","tbody","tr","td","th",
      "fieldset","header","footer","main",
    ])

    let current = node.getParent?.()

    while (current) {
      const kind = current.getKind()

      if (kind === SyntaxKind.JsxOpeningElement || kind === SyntaxKind.JsxSelfClosingElement) {
        const tagName = current.getTagNameNode?.()?.getText()?.toLowerCase() ?? ""

        if (SCOPE_TAGS.has(tagName)) {
          const scopeClass = this.getAttrString(current,"className")
          const scopeId = this.getAttrString(current,"id")

          return {
            parentScopeTag: tagName,
            parentScopeClass: scopeClass,
            parentScopeId: scopeId,
          }
        } else {
          // nothing
        }
      } else {
        // nothing
      }

      current = current.getParent?.()
    }

    return {
      parentScopeTag: "root",
      parentScopeClass: null,
      parentScopeId: null,
    }
  }
}