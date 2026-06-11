import type { InteractionType } from "./src/types"

// ===== User Configuration =====

// 解析対象アプリのルートディレクトリ（srcディレクトリ直上を指定する）
export const TARGET_APP_DIR = "../../spreadsheet-like-db-editor/frontend/"

// 出力先ディレクトリ
export const DEFAULT_OUTPUT_DIR = "../results/ui_element_react"

// 解析対象アプリ名（サマリーファイルのラベルとして使用）
export const TARGET_APP_NAME = "spreadsheet-like-db-editor"

// 解析対象ディレクトリパターン（ルートからの相対パスの一部に一致するもの）
// デフォルトはpresentation/pages配下のコンポーネントのみを対象とする
export const TARGET_DIR_PATTERNS: string[] = [
  "presentation/pages",
]

// 対象とするネイティブHTMLタグ
export const NATIVE_TARGET_TAGS: string[] = [
  "input", "button", "select", "textarea", "a",
]

// カスタムコンポーネントのマッピング定義
// MUI・shadcn等のコンポーネントライブラリを使用している場合に追加する
export type CustomComponentDef = {
  componentName: string
  interactionType: InteractionType
  mirrorAxisX: string
  playwrightMethodPrefix: string
}

export const CUSTOM_COMPONENT_MAP: CustomComponentDef[] = [
  { componentName: "TextField", interactionType: "text_input",        mirrorAxisX: "text_input",       playwrightMethodPrefix: "input"  },
  { componentName: "Button",    interactionType: "navigation_trigger", mirrorAxisX: "button_normal",    playwrightMethodPrefix: "click"  },
  { componentName: "Select",    interactionType: "selection_input",    mirrorAxisX: "select_single",    playwrightMethodPrefix: "input"  },
  { componentName: "Checkbox",  interactionType: "binary_input",       mirrorAxisX: "input_checkbox",   playwrightMethodPrefix: "check"  },
]

// ===== End of User Configuration =====

export const ADJACENCY_CSV_FILENAME  = "ui_elements.csv"
export const UI_ELEMENTS_JSON_FILENAME = "ui_elements.json"
export const UI_ELEMENTS_MD_FILENAME   = "ui_elements.md"
