// ===================================================
// 型定義（v2）
// JSON系の型（JsonAppLevelType等）はすべて廃止し、
// 2種類のCSV行に対応する型のみを定義する
// ===================================================

// ソースファイルレベルCSVの1行
// 1ファイルにつき「クラス外(-)行」が必ず1行、加えてクラス数分の行が追加される
export type SourceFileRow = {
  appName: string;
  fileName: string;
  directoryPath: string;
  className: string;      // クラスが無い/クラス外の場合は "-"
  importList: string;     // クラス外(-)行にのみ実際の値。クラス行では "-"
  lineCount: number;      // クラス外(-)行にのみ実際の値。クラス行では -1 固定
  methodCount: number;    // その行が表すスコープ内のメソッド数
  variableCount: number;  // その行が表すスコープ内の変数の数
  constantCount: number;  // その行が表すスコープ内の定数の数
};

export const SOURCE_FILE_ROW_HEADER: string[] = [
  "appName",
  "fileName",
  "directoryPath",
  "className",
  "importList",
  "lineCount",
  "methodCount",
  "variableCount",
  "constantCount",
];

// メソッドレベルCSVの1行
// 1メソッド/関数につき、制御構造の処理単位ごとに1行＋引数専用行が1行
export type MethodRow = {
  filePath: string;
  className: string;        // クラスが無ければ拡張子付きファイル名（ソースファイルレベルの"-"ルールとは異なる）
  methodName: string;
  processCoords: number[];  // 長さ9固定 [処理1, 処理2, ..., 処理9]
  processContent: string;   // 処理2〜9で表現する処理単位の実装概要。引数専用行では固定文字列「引数」
  role: string;              // なければ「記載なし」
  returnType: string;
  methodType: string;       // 例: "非同期+静的"。該当なしは "-"
  accessModifier: string;   // 修飾子そのまま。なければ "-"
  args: string[];            // 長さ20固定。空きは "-"
};

export const MAX_ARG_COLUMNS = 20;
export const MAX_NEST_DEPTH = 9;

export function buildMethodRowHeader(): string[] {
  const header = ["filePath", "className", "methodName"];
  for (let i = 1; i <= MAX_NEST_DEPTH; i++) {
    header.push(`process${i}`);
  }
  header.push("processContent", "role", "returnType", "methodType", "accessModifier");
  for (let i = 1; i <= MAX_ARG_COLUMNS; i++) {
    header.push(`arg${i}`);
  }
  return header;
}

// ===================================================
// フィールドレベルCSVの1行（3つ目のCSV）
// クラスのプロパティ（fieldKind="field"）と、メソッド/関数の引数
// （fieldKind="parameter"）の両方を、同じ構造で扱う。
//
// センチネル値の方針（Java版と共通）：
//   validationMin / validationMax = -1 … 該当する検証デコレータが見つからなかった
//   nullable = -1 … NotNull系の有無を判定できるデコレータ自体が見つからなかった
//                    0: 明示的にnullable不可、1: 明示的にnullable可
//   TSはフレームワーク（class-validator等）依存でデコレータ自体が無いことも多いため、
//   「デコレータが取れるなら取る、取れなければセンチネル値」という運用になる
// ===================================================
export type FieldRow = {
  filePath: string;
  className: string;
  methodName: string | null;  // fieldKind="field"の場合はnull
  fieldKind: "field" | "parameter";
  fieldName: string;
  fieldType: string;
  isFinal: boolean;           // readonly修飾の有無
  validationMin: number;      // -1: 該当なし
  validationMax: number;      // -1: 該当なし
  nullable: number;           // -1: 判定不能 / 0: NotNull系あり / 1: 明示的にnullable
  rawAnnotations: string;     // 付与されている全デコレータの生テキスト。無ければ HYPHEN
};

export const FIELD_ROW_HEADER: string[] = [
  "filePath", "className", "methodName", "fieldKind", "fieldName", "fieldType",
  "isFinal", "validationMin", "validationMax", "nullable", "rawAnnotations",
];

// 引数専用行（processCoords[1..8]がすべて0）の処理内容列に入れる固定文字列
export const ARGUMENT_ROW_CONTENT = "引数";

// 役割が取得できなかった場合の固定文字列
export const NO_ROLE_TEXT = "記載なし";

// 値が存在しない場合に一律で入れるプレースホルダー
export const HYPHEN = "-";
