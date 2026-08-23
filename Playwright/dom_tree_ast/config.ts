// ===================================================
// ユーザー設定ファイル（dom_tree_ast）
// キャプチャ済みHTMLの格納パスと出力先を設定する
// ===================================================

// ===== User Configuration =====

// dom_capture_gen経由で生成・実行されたPlaywrightコードが出力した、実HTMLの格納ディレクトリ
export const HTML_CAPTURED_DIR = "../results/dom_tree_get"

// 出力先ディレクトリ
export const DEFAULT_OUTPUT_DIR = "../results/dom_tree_ast"

// 意味的グルーピングタグ（このタグのみを対象として再帰的に走査する）
// ui_element_reactのSCOPE_TAGSと重複する部分は表記を揃え、上位互換のスーパーセットとする
export const GROUPING_TAGS = [
  "html", "body", "main", "header", "footer",
  "div", "section", "article", "aside", "nav",
  "ul", "ol", "li", "table", "tbody", "tr", "td", "th",
  "form", "fieldset",
]

// 操作対象タグ（これに到達したら、それより深い階層への走査を打ち切る）
export const OPERATION_TAGS = ["input", "button", "select", "textarea", "a"]

// ===== End of User Configuration =====

export const CSV_ENCODING = "utf-8"
export const TREE_RAW_CSV_FILENAME = "dom_tree_raw.csv"
export const SCOPE_RESOLVED_CSV_FILENAME = "scope_resolved.csv"
