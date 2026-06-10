// import fs from "fs/promises";
// import path from "path";
// import { MethodInfo } from "./method_info";

// const MARKDOWN_FILE_NAME = "ast_result.md";
// const ENCODING = "utf-8";

// function escapeMarkdown(value: string): string {
//   return value.replace(/\|/g, "\\|").replace(/\r?\n/g, " ");
// }

// function normalizeArgs(args: string, language: string): string {
//   if (args && args.trim().length > 0) return args;
//   return language === "javascript" ? "(JavaScript)" : "";
// }

// function normalizeReturnType(returnType: string, language: string): string {
//   if (returnType && returnType.trim().length > 0) return returnType;
//   return language === "javascript" ? "(JavaScript)" : "戻り値なし";
// }

// export async function writeMarkdownOutput(methods: MethodInfo[], outputDir: string): Promise<void> {
//   const header = [
//     "| ファイルパス | ファイル名 | 言語 | クラス名 | メソッド名 | 役割 | 引数 | 戻り値 | 開始行 | 終了行 | アクセス修飾子 | 静的 | 非同期 | 抽象 |",
//     "|---|---|---|---|---|---|---|---|---|---|---|---|---|---|"
//   ].join("\n");

//   const lines = methods.map((method) => {
//     const columns = [
//       escapeMarkdown(method.filePath),
//       escapeMarkdown(method.fileName),
//       escapeMarkdown(method.language),
//       escapeMarkdown(method.className),
//       escapeMarkdown(method.methodName),
//       escapeMarkdown(method.role || "役割記載なし"),
//       escapeMarkdown(normalizeArgs(method.args, method.language)),
//       escapeMarkdown(normalizeReturnType(method.returnType, method.language)),
//       String(method.startLine),
//       String(method.endLine),
//       escapeMarkdown(method.accessModifier),
//       method.isStatic ? "true" : "false",
//       method.isAsync ? "true" : "false",
//       method.isAbstract ? "true" : "false"
//     ];
//     return `| ${columns.join(" | ")} |`;
//   });

//   const content = [header, ...lines].join("\n");
//   await fs.mkdir(outputDir, { recursive: true });
//   await fs.writeFile(path.join(outputDir, MARKDOWN_FILE_NAME), content, ENCODING);
// }