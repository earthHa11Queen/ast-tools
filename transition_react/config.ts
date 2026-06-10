// ===================================================
// ユーザー設定ファイル
// 解析対象アプリのパスと出力先を設定する
// ===================================================

// ===== User Configuration =====

// 解析対象アプリのルートディレクトリ（srcディレクトリ直上を指定する）
export const TARGET_APP_DIR = "YOUR APP DIR"

// 出力先ディレクトリ
export const DEFAULT_OUTPUT_DIR = "../results/transition_react"

// 解析対象アプリ名（サマリーファイルのラベルとして使用）
export const TARGET_APP_NAME = "YOUR APP NAME"

// 画面遷移の起点パス（通常はトップページのパス）
export const START_PATH = "/"

// ===== End of User Configuration =====

export const CSV_ENCODING = "utf-8"
export const ADJACENCY_CSV_FILENAME = "adjacency_table.csv"
export const FORWARD_CSV_FILENAME = "path_forward.csv"
export const REVERSE_CSV_FILENAME = "path_reverse.csv"
export const SUMMARY_JSON_FILENAME = "path_summary.json"
