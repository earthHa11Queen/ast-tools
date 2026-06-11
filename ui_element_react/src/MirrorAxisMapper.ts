import type { ScopedElement, UiElement, InteractionType, ModuleResult } from "./types"
import { CUSTOM_COMPONENT_MAP } from "../config"

// ===================================================
// MirrorAxisMapper
// 519のX軸定義と510の命名規則に従い
// interactionType・mirrorAxisX・playwrightMethodPrefixを付与する
// ===================================================

type MappingRule = {
  interactionType: InteractionType
  mirrorAxisX: string
  playwrightMethodPrefix: string
}

export class MirrorAxisMapper {

  map(
    elementsMap: Map<string, ScopedElement[]>
  ): ModuleResult<Map<string, UiElement[]>> {

    const result = new Map<string, UiElement[]>()

    for (const [componentName, elements] of elementsMap) {
      const mapped: UiElement[] = elements.map((el) => {
        const rule = this.resolveMapping(el)
        return { ...el, ...rule }
      })
      result.set(componentName, mapped)
    }

    console.log(`MirrorAxisMapper 完了: ${result.size}コンポーネント`)
    return { errorCode: 0, data: result }
  }

  private resolveMapping(el: ScopedElement): MappingRule {
    const tag  = el.tag.toLowerCase()
    const type = (el.typeAttr ?? "").toLowerCase()
    const role = (el.roleAttr ?? "").toLowerCase()

    // カスタムコンポーネントの優先チェック
    const custom = CUSTOM_COMPONENT_MAP.find((c) => c.componentName === el.tag)
    if (custom) {
      return {
        interactionType:      custom.interactionType,
        mirrorAxisX:          custom.mirrorAxisX,
        playwrightMethodPrefix: custom.playwrightMethodPrefix,
      }
    }

    // ネイティブHTMLタグのマッピング
    if (tag === "input") {
      if (type === "checkbox")                    return m("binary_input",       "input_checkbox",      "check")
      if (type === "radio")                       return m("binary_input",       "input_radio",         "check")
      if (type === "file" && el.isMultiple)       return m("file_input",         "input_file_multiple", "input")
      if (type === "file")                        return m("file_input",         "input_file_single",   "input")
      if (type === "submit" || type === "image")  return m("navigation_trigger", "button_submit",       "submit")
      // text / password / email / number / tel / url / search / date / time 等
      return m("text_input", "text_input", "input")
    }

    if (tag === "textarea") {
      return m("text_input", "textarea_multiline", "input")
    }

    if (tag === "select") {
      if (el.isMultiple) return m("selection_input", "select_multiple", "input")
      return m("selection_input", "select_single", "input")
    }

    if (tag === "button") {
      if (type === "submit") return m("navigation_trigger", "button_submit",  "submit")
      if (type === "reset")  return m("navigation_trigger", "button_normal",  "click")
      return m("navigation_trigger", "button_normal", "click")
    }

    if (tag === "a") {
      // hrefがある場合は遷移トリガー、ない場合はpseudo_trigger
      if (el.href) return m("navigation_trigger", "anchor_link", "click")
      return m("pseudo_trigger", "pseudo_trigger", "click")
    }

    // role=button のdiv/span/i等
    if (role === "button") {
      return m("pseudo_trigger", "div_button", "click")
    }

    return m("unknown", "unknown", "click")
  }
}

// MappingRule生成のショートハンド
function m(
  interactionType: InteractionType,
  mirrorAxisX: string,
  playwrightMethodPrefix: string
): MappingRule {
  return { interactionType, mirrorAxisX, playwrightMethodPrefix }
}
