import type {ScopedElement,UiElement,InteractionType,ModuleResult,} from "./types"
import {CUSTOM_COMPONENT_MAP,} from "../../config"

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

  map(elementsMap: Map<string,ScopedElement[]>): ModuleResult<Map<string,UiElement[]>> {

    const result = new Map<string,UiElement[]>()

    for (const [componentName,elements,] of elementsMap) {
      const mapped: UiElement[] = elements.map((element) => {
        const rule = this.resolveMapping(element)
        return {...element,...rule,}
      })

      result.set(componentName,mapped)
    }

    console.log(`MirrorAxisMapper 完了: ${result.size}コンポーネント`)
    return {errorCode: 0,data: result,}
  }

  private resolveMapping(element: ScopedElement): MappingRule {
    const tag = element.tag.toLowerCase()
    const type = (element.typeAttr ?? "").toLowerCase()
    const role = (element.roleAttr ?? "").toLowerCase()

    const custom = CUSTOM_COMPONENT_MAP.find((component) => component.componentName === element.tag)
    if (custom) {
      return {
        interactionType: custom.interactionType,
        mirrorAxisX: custom.mirrorAxisX,
        playwrightMethodPrefix: custom.playwrightMethodPrefix,
      }
    } else {
      // nothing
    }

    if (tag === "input") {
      if (type === "checkbox") return createMapping("binary_input","input_checkbox","check")
      if (type === "radio") return createMapping("binary_input","input_radio","check")
      if (type === "file" && element.isMultiple) return createMapping("file_input","input_file_multiple","input")
      if (type === "file") return createMapping("file_input","input_file_single","input")
      if (type === "submit" || type === "image") return createMapping("navigation_trigger","button_submit","submit")
      return createMapping("text_input","text_input","input")
    } else {
      // nothing
    }

    if (tag === "textarea") {
      return createMapping("text_input","textarea_multiline","input")
    } else {
      // nothing
    }

    if (tag === "select") {
      if (element.isMultiple) {
        return createMapping("selection_input","select_multiple","input")
      } else {
        return createMapping("selection_input","select_single","input")
      }
    } else {
      // nothing
    }

    if (tag === "button") {
      if (type === "submit") return createMapping("navigation_trigger","button_submit","submit")
      if (type === "reset") return createMapping("navigation_trigger","button_normal","click")
      return createMapping("navigation_trigger","button_normal","click")
    } else {
      // nothing
    }

    if (tag === "a") {
      if (element.href) {
        return createMapping("navigation_trigger","anchor_link","click")
      } else {
        return createMapping("pseudo_trigger","pseudo_trigger","click")
      }
    } else {
      // nothing
    }

    if (role === "button") {
      return createMapping("pseudo_trigger","div_button","click")
    } else {
      // nothing
    }

    return createMapping("unknown","unknown","click")
  }
}

function createMapping(
  interactionType: InteractionType,
  mirrorAxisX: string,
  playwrightMethodPrefix: string
): MappingRule {

  return {
    interactionType,
    mirrorAxisX,
    playwrightMethodPrefix,
  }
}