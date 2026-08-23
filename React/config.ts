import path from "node:path"

// ===================================================
// Reactツール共通設定
// ===================================================

// ts-node実行時:
//   React/config.ts
//
// tsc実行後:
//   React/<tool>/dist/config.js
//
// どちらから実行してもReactディレクトリを基準にする。
const REACT_ROOT_DIR =
  path.basename(__dirname) === "dist"
    ? path.resolve(__dirname, "../..")
    : __dirname

// ===================================================
// 共通ユーザー設定
// ===================================================

// 解析対象Reactアプリのルートディレクトリ。
// 原則として絶対パスを指定する。
export const TARGET_APP_DIR = "YOUR APP DIR"

// 解析対象アプリ名。
export const TARGET_APP_NAME = "YOUR APP NAME"

// 両ツールの共通出力先。
export const DEFAULT_OUTPUT_DIR = path.resolve(
  REACT_ROOT_DIR,
  "results",
)

// ===================================================
// react_transition設定
// ===================================================

// 画面遷移の起点パス。
export const START_PATH = "/"

// Next.jsなどのファイルベースルーティングで使用する
// ページルートディレクトリ。
// TARGET_APP_DIRからの相対パスを指定する。
export const PAGES_ROOT_DIR = "YOUR PAGES ROOT DIR"

// ページファイルとして認識するファイル名。
export const PAGE_FILE_PATTERNS = [
  "page.tsx",
  "page.ts",
]

// パス展開の打ち切り閾値。
// 画面数 × MAX_PATH_MULTIPLIERを上限とする。
export const MAX_PATH_MULTIPLIER = 5

// ===================================================
// react_ui_element設定
// ===================================================

// 解析対象ディレクトリ。
// TARGET_APP_DIRからの相対パスの一部と照合する。
export const TARGET_DIR_PATTERNS: string[] = [
  "presentation/pages",
]

// 解析対象とするネイティブHTMLタグ。
export const NATIVE_TARGET_TAGS: string[] = [
  "input",
  "button",
  "select",
  "textarea",
  "a",
]

export type CustomComponentDef = {
  componentName: string

  interactionType:
    | "text_input"
    | "binary_input"
    | "selection_input"
    | "file_input"
    | "navigation_trigger"
    | "pseudo_trigger"
    | "unknown"

  mirrorAxisX: string
  playwrightMethodPrefix: string
}

// MUI、shadcnなどのカスタムコンポーネント定義。
export const CUSTOM_COMPONENT_MAP: CustomComponentDef[] = [
  {
    componentName: "TextField",
    interactionType: "text_input",
    mirrorAxisX: "text_input",
    playwrightMethodPrefix: "input",
  },
  {
    componentName: "Button",
    interactionType: "navigation_trigger",
    mirrorAxisX: "button_normal",
    playwrightMethodPrefix: "click",
  },
  {
    componentName: "Select",
    interactionType: "selection_input",
    mirrorAxisX: "select_single",
    playwrightMethodPrefix: "input",
  },
  {
    componentName: "Checkbox",
    interactionType: "binary_input",
    mirrorAxisX: "input_checkbox",
    playwrightMethodPrefix: "check",
  },
]

// ===================================================
// 共通出力設定
// ===================================================

export const CSV_ENCODING = "utf-8"

// react_transition
export const ADJACENCY_CSV_FILENAME =
  "adjacency_table.csv"

export const FORWARD_CSV_FILENAME =
  "path_forward.csv"

export const REVERSE_CSV_FILENAME =
  "path_reverse.csv"

export const SUMMARY_JSON_FILENAME =
  "path_summary.json"

export const REACHABILITY_CSV_FILENAME =
  "screen_reachability.csv"

// react_ui_element
export const UI_ELEMENTS_CSV_FILENAME =
  "ui_elements.csv"

export const UI_ELEMENTS_JSON_FILENAME =
  "ui_elements.json"

export const UI_ELEMENTS_MD_FILENAME =
  "ui_elements.md"