import * as crypto from "crypto"
import type { ResolvedElement, ScopedElement, ModuleResult } from "./types"

// ===================================================
// ScopeAnalyzer
// 510のStatic Root / Current Scopeの考え方に基づき
// スコープ候補を分析してsiblingCountとscopeGroupIdを付与する
//
// スコープ特定の優先順位：
//   1. formId属性が存在する要素は同一formIdでグループ化する
//   2. parentScopeTag + parentScopeClassの組み合わせでグループ化する
//
// siblingCount≥2の要素グループをスコープ候補とし scopeGroupId を付与する
// ===================================================

export class ScopeAnalyzer {

  analyze(
    elementsMap: Map<string, ResolvedElement[]>
  ): ModuleResult<Map<string, ScopedElement[]>> {

    const result = new Map<string, ScopedElement[]>()

    for (const [componentName, elements] of elementsMap) {
      const scoped = this.analyzeComponent(componentName, elements)
      result.set(componentName, scoped)
    }

    console.log(`ScopeAnalyzer 完了: ${result.size}コンポーネント`)
    return { errorCode: 0, data: result }
  }

  private analyzeComponent(
    componentName: string,
    elements: ResolvedElement[]
  ): ScopedElement[] {

    // --- STEP1: formIdによるグループ化（優先） ---
    // formIdが存在する要素は同一formIdのグループに属する
    const formGroupMap = new Map<string, ResolvedElement[]>()
    const noFormElements: ResolvedElement[] = []

    for (const el of elements) {
      if (el.formId) {
        const group = formGroupMap.get(el.formId) ?? []
        group.push(el)
        formGroupMap.set(el.formId, group)
      } else {
        noFormElements.push(el)
      }
    }

    // --- STEP2: parentScope によるグループ化（formIdなし要素） ---
    const scopeGroupMap = new Map<string, ResolvedElement[]>()
    for (const el of noFormElements) {
      const key = `${el.parentScopeTag}__${el.parentScopeClass ?? ""}`
      const group = scopeGroupMap.get(key) ?? []
      group.push(el)
      scopeGroupMap.set(key, group)
    }

    // --- STEP3: ScopedElementの生成 ---
    const result: ScopedElement[] = []

    // formIdグループ
    for (const [formId, group] of formGroupMap) {
      const scopeGroupId = group.length >= 2
        ? this.hash(`${componentName}__form__${formId}`)
        : null
      for (const el of group) {
        result.push({ ...el, siblingCount: group.length, scopeGroupId })
      }
    }

    // parentScopeグループ
    for (const [key, group] of scopeGroupMap) {
      const scopeGroupId = group.length >= 2
        ? this.hash(`${componentName}__${key}`)
        : null
      for (const el of group) {
        result.push({ ...el, siblingCount: group.length, scopeGroupId })
      }
    }

    return result
  }

  // コンポーネント名 + スコープキーのハッシュ値（先頭8文字）
  private hash(input: string): string {
    return crypto.createHash("md5").update(input).digest("hex").slice(0, 8)
  }
}
