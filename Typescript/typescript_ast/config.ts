// ===================================================
// ユーザー設定ファイル（v2）
// JSON出力を全廃し、ソースファイルレベルCSV・メソッドレベルCSVの
// 2種類のみを出力する構成に変更
// ===================================================

// ===== User Configuration =====

export const TARGET_APP_DIR = "YOUR-APP-DIR";
export const TARGET_APP_NAME = "YOUR-APP-NAME";
export const DEFAULT_OUTPUT_DIR = "../results/tsjs";
export const EXTENSIONS = [".ts", ".tsx"];
export const ENCODING = "utf-8";

// ===== End of User Configuration =====

// ソースファイルレベルCSV（1ファイルにつき「クラス外(-)行」1行＋クラス数分の行）
export const SOURCE_FILE_CSV_FILENAME = "ast_source_file_level.csv";

// メソッドレベルCSV（1メソッド/関数につき、構造単位ごとの行＋引数専用行）
export const METHOD_CSV_FILENAME = "ast_method_level.csv";

// 【新規】フィールドレベルCSV（クラスのプロパティ＋メソッド/関数の引数、検証デコレータ込み）
export const FIELD_CSV_FILENAME = "ast_field_level.csv";

// 処理2〜9列で表現できるネスト階層の最大値（処理9まで）
// これを超えるネストは対象外とする
export const MAX_NEST_DEPTH = 9;

// メソッドレベルCSVの引数列の固定列数
export const MAX_ARG_COLUMNS = 20;
