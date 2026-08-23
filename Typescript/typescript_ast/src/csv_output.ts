import fs from "fs";
import path from "path";
import * as Config from "../config";
import * as MethodInfo from "./method_info";

// ===================================================
// csv_output.ts
// ソースファイルレベルCSV・メソッドレベルCSVの2種類のみを出力する。
// JSON出力は行わない（json_output.tsは廃止）。
//
// エスケープ処理は、前回tsjs_ast/src/csv_output.tsで修正済みの
// 「ダブルクォートの全置換版」をそのまま踏襲する。
// map()内で使うため、ここでは同期関数として実装する
// （元のescapeCsvはasyncだったが、for文でのawait前提の設計であり、
// map()に直接渡すとPromiseの配列になってしまうため、同期関数に変更した）。
// ===================================================

export function writeSourceFileCsv(rows: MethodInfo.SourceFileRow[]) {
  const header = MethodInfo.SOURCE_FILE_ROW_HEADER;
  const headerLine = header.map(escapeCsv).join(",");

  const lines = rows.map((r) =>
    [
      escapeCsv(r.appName),
      escapeCsv(r.fileName),
      escapeCsv(r.directoryPath),
      escapeCsv(r.className),
      escapeCsv(r.importList),
      escapeCsv(String(r.lineCount)),
      escapeCsv(String(r.methodCount)),
      escapeCsv(String(r.variableCount)),
      escapeCsv(String(r.constantCount)),
    ].join(",")
  );

  const content = `${headerLine}\n${lines.join("\n")}`;
  writeFile(Config.SOURCE_FILE_CSV_FILENAME, content);
}

export function writeMethodCsv(rows: MethodInfo.MethodRow[]) {
  const header = MethodInfo.buildMethodRowHeader();
  const headerLine = header.map(escapeCsv).join(",");

  const lines = rows.map((r) => {
    const cols: string[] = [
      escapeCsv(r.filePath),
      escapeCsv(r.className),
      escapeCsv(r.methodName),
    ];
    for (let i = 0; i < MethodInfo.MAX_NEST_DEPTH; i++) {
      cols.push(escapeCsv(String(r.processCoords[i] ?? 0)));
    }
    cols.push(escapeCsv(r.processContent));
    cols.push(escapeCsv(r.role));
    cols.push(escapeCsv(r.returnType));
    cols.push(escapeCsv(r.methodType));
    cols.push(escapeCsv(r.accessModifier));
    for (let i = 0; i < MethodInfo.MAX_ARG_COLUMNS; i++) {
      cols.push(escapeCsv(r.args[i] ?? MethodInfo.HYPHEN));
    }
    return cols.join(",");
  });

  const content = `${headerLine}\n${lines.join("\n")}`;
  writeFile(Config.METHOD_CSV_FILENAME, content);
}

// 【新規】フィールドレベルCSV（3つ目のCSV）の出力
export function writeFieldCsv(rows: MethodInfo.FieldRow[]) {
  const headerLine = MethodInfo.FIELD_ROW_HEADER.map(escapeCsv).join(",");

  const lines = rows.map((r) =>
    [
      escapeCsv(r.filePath),
      escapeCsv(r.className),
      escapeCsv(r.methodName ?? ""),
      escapeCsv(r.fieldKind),
      escapeCsv(r.fieldName),
      escapeCsv(r.fieldType),
      escapeCsv(r.isFinal ? "1" : "0"),
      escapeCsv(String(r.validationMin)),
      escapeCsv(String(r.validationMax)),
      escapeCsv(String(r.nullable)),
      escapeCsv(r.rawAnnotations),
    ].join(",")
  );

  const content = `${headerLine}\n${lines.join("\n")}`;
  writeFile(Config.FIELD_CSV_FILENAME, content);
}

function writeFile(filename: string, content: string) {
  if (!fs.existsSync(Config.DEFAULT_OUTPUT_DIR)) {
    fs.mkdirSync(Config.DEFAULT_OUTPUT_DIR, { recursive: true });
  }
  fs.writeFileSync(path.join(Config.DEFAULT_OUTPUT_DIR, filename), content, Config.ENCODING as BufferEncoding);
  console.log(`${filename}: ${content.split("\n").length - 1}行`);
}

// escapeCsv: ダブルクォートは全置換（前回修正済みの挙動を踏襲）
export function escapeCsv(jsonValue: any): string {
  const stringValue = String(jsonValue);
  if (/[",\n\r]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
}
