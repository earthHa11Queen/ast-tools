import type { RawElement, ResolvedElement, ModuleResult } from "./types"

// ===================================================
// LabelResolver
// RawElement の各要素に対してlabelTextを解決する
//
// 優先順位：
//   1. aria-label属性
//   2. label属性（MUI等のコンポーネントライブラリのprops）
//   3. placeholder属性
//   4. title属性
//   5. null（未解決）
//
// 以下はv1未解決：
//   - aria-labelledby（別要素IDとの照合が必要）
//   - htmlFor（labelタグとの対応付けが必要）
//   - FormControl・FormLabel等のネスト構造
// ===================================================

export class LabelResolver {

  resolve(
    elementsMap: Map<string, RawElement[]>
  ): ModuleResult<Map<string, ResolvedElement[]>> {

    const result = new Map<string, ResolvedElement[]>()

    for (const [componentName, elements] of elementsMap) {
      const resolved: ResolvedElement[] = elements.map((el) =>
        this.resolveOne(el)
      )
      result.set(componentName, resolved)
    }

    console.log(`LabelResolver 完了: ${result.size}コンポーネント`)
    return { errorCode: 0, data: result }
  }

  private resolveOne(el: RawElement): ResolvedElement {
    let labelText: string | null = null
    let labelUnresolved = false

    // 優先順位1: aria-label
    if (el.ariaLabel) {
      labelText = el.ariaLabel
    // 優先順位2: label属性（MUI等）
    } else if (el.labelProp) {
      labelText = el.labelProp
    // 優先順位3: placeholder
    } else if (el.placeholder) {
      labelText = el.placeholder
    // 優先順位4: title
    } else if (el.title) {
      labelText = el.title
    // 未解決
    } else {
      labelText = null
    }

    // aria-labelledby または htmlFor が存在するがlabelTextが未解決の場合にフラグを立てる
    if (!labelText && (el.ariaLabelledBy || el.htmlFor)) {
      labelUnresolved = true
    }

    return { ...el, labelText, labelUnresolved }
  }
}
