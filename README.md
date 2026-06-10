# ast-tools

A multi-language static analysis toolkit that parses source code via AST
and outputs structured method/class information as JSON, CSV, and Markdown.

Designed as a preprocessing layer for test design and AI input —
part of a larger architecture concept built toward
[VPSY](https://github.com/earthHa11Queen/vpsy-concept).

---

## Overview

This toolkit walks your application's source code,
extracts method-level structure (method names, arguments, return types, row ranges, access modifiers),
and outputs the results in multiple formats.

The primary use case is feeding structured code information into
[mirror-framework](https://github.com/earthHa11Queen/mirror-framework)
for AI-assisted test scenario generation.

### Output formats

| Format | File | Purpose |
|---|---|---|
| JSON (app-level) | `ast_result.json` | Full structured data including imports and file metadata |
| JSON (method-level) | `ast_MethodLevel_*.json` | Per-directory method detail — primary AI input format |
| CSV | `ast_result.csv` | Flat summary for spreadsheet review |
| Markdown | `ast_result.md` | Human-readable overview |

---

## Supported Languages

| Language | Status |
|---|---|
| TypeScript / JavaScript | ✅ Implemented (ts-morph) |
| Java | ✅ Implemented (JavaParser) |
| Python | 🔲 Planned |
| PHP | 🔲 Planned |
| Go | 🔲 Planned |
| HTML / CSS | 🔲 Planned |

---

## Repository Structure

```
ast-tools/
├── commonConfig.json          # Shared configuration (output dir, encoding, supported languages)
├── tsjs_ast/                  # TypeScript / JavaScript parser
│   ├── config.ts              # ⚙️ User configuration — set your paths here
│   ├── main.ts                # Entry point
│   └── src/
│       ├── parser.ts          # Core AST parsing logic (ts-morph)
│       ├── method_info.ts     # Type definitions
│       ├── json_output.ts     # JSON output
│       ├── csv_output.ts      # CSV output
│       └── markdown_output.ts # Markdown output
├── java_ast/                  # Java parser
│   ├── config.json            # ⚙️ User configuration — set your paths here
│   ├── memo.md                # Build and run instructions
│   └── src/main/java/com/ast_tool/
│       ├── Main.java
│       ├── AppConfig.java
│       ├── parser/JavaAstParser.java
│       ├── model/MethodInfo.java
│       └── output/            # CSV / JSON / Markdown output
├── exec_shells/
│   └── all_exec.sh            # Run both parsers sequentially
└── results/
    └── tsjs/                  # Sample output — spreadsheet-like-db-editor analysis
```

---

## Getting Started

### TypeScript / JavaScript

**Prerequisites:** Node.js 18+

```bash
cd tsjs_ast
npm install
```

Edit `config.ts`:

```typescript
export const TARGET_APP_DIR = "YOUR APP PATH";       // Path to the app you want to analyze
export const DEFAULT_OUTPUT_DIR = "../results/tsjs"; // Output directory
export const TARGET_APP_NAME = "your-app-name";      // Label used in output files
```

Run:

```bash
npx ts-node main.ts
```

---

### Java

**Prerequisites:** Java 17+, Maven 3.8+

```bash
cd java_ast
mvn clean package -f pom.xml
```

Edit `config.json`:

```json
{
  "TargetAppDir": "YOUR APP PATH",
  "DefaultOutputDir": "YOUR RESULT PATH"
}
```

Run:

```bash
java -Dfile.encoding=UTF-8 -jar target/java-ast-1.0.0-with-dependencies.jar ./config.json
```

---

### Run both parsers

```bash
chmod +x exec_shells/all_exec.sh
./exec_shells/all_exec.sh
```

---

## Sample Output

`results/tsjs/` contains analysis output of
[spreadsheet-like-db-editor](https://github.com/earthHa11Queen/spreadsheet-like-db-editor)
(frontend TypeScript).

This demonstrates the toolkit's output against a real application.

---

## Architecture Context

This toolkit sits in the middle of a larger pipeline:

```
Your application source code
    ↓  ast-tools (this repository)
Structured method data (JSON / CSV)
    ↓  mirror-framework
Test scenarios via boolean / domain operations
    ↓  playwright-framework-guide
Playwright E2E test implementation
```

All repositories share a common architecture concept designed
as a foundation for VPSY — a computational model for psychodynamics.
→ [architecture-concept](https://github.com/earthHa11Queen) *(coming soon)*

---

## Dependencies

### TypeScript / JavaScript (tsjs_ast)

| Package | Version | License |
|---|---|---|
| ts-morph | ^18.0.0 | MIT |
| iconv-lite | ^0.7.2 | MIT |
| typescript | ^5.5.0 | Apache-2.0 |
| ts-node | ^10.9.1 | MIT |

### Java (java_ast)

| Package | Version | License |
|---|---|---|
| javaparser-core | latest | Apache-2.0 / LGPL-2.1 |
| javaparser-symbol-solver-core | latest | Apache-2.0 / LGPL-2.1 |
| jackson-databind | latest | Apache-2.0 |
| opencsv | latest | Apache-2.0 |

---

## License

[MIT](./LICENSE)

---

## Related Repositories

| Repository | Description |
|---|---|
| [mirror-framework](https://github.com/earthHa11Queen/mirror-framework) | Test scenario generation using domain definition and boolean operations |
| [playwright-framework-guide](https://github.com/earthHa11Queen/playwright-framework-guide) | Playwright E2E test automation design guide |
| [spreadsheet-like-db-editor](https://github.com/earthHa11Queen/spreadsheet-like-db-editor) | Sample application used to generate the results in this repository |
| [vpsy-concept](https://github.com/earthHa11Queen/vpsy-concept) | The root concept behind this architecture |

---

---

# ast-tools（日本語）

TypeScript/JavaScript・Javaのソースコードをいず解析し、
メソッド・クラス情報をJSON/CSV/Markdown形式で出力する静的解析ツール群です。

テスト設計およびAIへの入力前処理として設計されており、
[VPSY](https://github.com/earthHa11Queen/vpsy-concept)の実現に向けた
アーキテクチャ構想の一部です。

---

## 概要

アプリケーションのソースコードを走査し、メソッドレベルの構造情報
（メソッド名・引数・戻り値型・行番号・アクセス修飾子）を抽出して複数形式で出力します。

主な用途は、[mirror-framework](https://github.com/earthHa11Queen/mirror-framework)と連携した
AIによるテストシナリオ生成の前処理です。

### 出力フォーマット

| フォーマット | ファイル | 用途 |
|---|---|---|
| JSON（アプリレベル） | `ast_result.json` | インポート・ファイルメタデータを含む完全構造 |
| JSON（メソッドレベル） | `ast_MethodLevel_*.json` | ディレクトリ単位のメソッド詳細・AI入力の主要フォーマット |
| CSV | `ast_result.csv` | スプレッドシートでの確認用フラット形式 |
| Markdown | `ast_result.md` | 人が読むための概要 |

---

## 対応言語

| 言語 | 状態 |
|---|---|
| TypeScript / JavaScript | ✅ 実装済み（ts-morph使用） |
| Java | ✅ 実装済み（JavaParser使用） |
| Python | 🔲 実装予定 |
| PHP | 🔲 実装予定 |
| Go | 🔲 実装予定 |
| HTML / CSS | 🔲 実装予定 |

---

## リポジトリ構成

```
ast-tools/
├── commonConfig.json          # 共通設定（出力先・エンコーディング・対応言語）
├── tsjs_ast/                  # TypeScript / JavaScript パーサー
│   ├── config.ts              # ⚙️ ユーザー設定 — パスをここに指定
│   ├── main.ts                # エントリーポイント
│   └── src/
│       ├── parser.ts          # ASTパース処理（ts-morph）
│       ├── method_info.ts     # 型定義
│       ├── json_output.ts     # JSON出力
│       ├── csv_output.ts      # CSV出力
│       └── markdown_output.ts # Markdown出力
├── java_ast/                  # Java パーサー
│   ├── config.json            # ⚙️ ユーザー設定 — パスをここに指定
│   ├── memo.md                # ビルド・実行手順メモ
│   └── src/main/java/com/ast_tool/
│       ├── Main.java
│       ├── AppConfig.java
│       ├── parser/JavaAstParser.java
│       ├── model/MethodInfo.java
│       └── output/            # CSV / JSON / Markdown 出力
├── exec_shells/
│   └── all_exec.sh            # 両パーサーを順番に実行
└── results/
    └── tsjs/                  # サンプル出力（spreadsheet-like-db-editor解析結果）
```

---

## 使い方

### TypeScript / JavaScript

**前提:** Node.js 18+

```bash
cd tsjs_ast
npm install
```

`config.ts`を編集:

```typescript
export const TARGET_APP_DIR = "YOUR APP PATH";       // 解析対象アプリのパス
export const DEFAULT_OUTPUT_DIR = "../results/tsjs"; // 出力先ディレクトリ
export const TARGET_APP_NAME = "your-app-name";      // 出力ファイルのラベル
```

実行:

```bash
npx ts-node main.ts
```

---

### Java

**前提:** Java 17+、Maven 3.8+

```bash
cd java_ast
mvn clean package -f pom.xml
```

`config.json`を編集:

```json
{
  "TargetAppDir": "YOUR APP PATH",
  "DefaultOutputDir": "YOUR RESULT PATH"
}
```

実行:

```bash
java -Dfile.encoding=UTF-8 -jar target/java-ast-1.0.0-with-dependencies.jar ./config.json
```

---

### 両パーサーをまとめて実行

```bash
chmod +x exec_shells/all_exec.sh
./exec_shells/all_exec.sh
```

---

## サンプル出力

`results/tsjs/`には、
[spreadsheet-like-db-editor](https://github.com/earthHa11Queen/spreadsheet-like-db-editor)
（フロントエンドTypeScript）の解析結果が含まれています。

実際のアプリケーションへの適用例として参照できます。

---

## アーキテクチャ上の位置づけ

本ツールはより大きなパイプラインの中間層に位置します。

```
対象アプリケーションのソースコード
    ↓  ast-tools（本リポジトリ）
メソッド構造データ（JSON / CSV）
    ↓  mirror-framework
boolean演算・ドメイン定義によるテストシナリオ算出
    ↓  playwright-framework-guide
Playwright E2Eテストとして実装
```

全リポジトリは感情プロセスの計算モデルであるVPSYの実現に向けた
アーキテクチャ構想を共通の根拠として持っています。
→ [architecture-concept](https://github.com/earthHa11Queen)（公開予定）

---

## 依存ライブラリ

### TypeScript / JavaScript（tsjs_ast）

| パッケージ | バージョン | ライセンス |
|---|---|---|
| ts-morph | ^18.0.0 | MIT |
| iconv-lite | ^0.7.2 | MIT |
| typescript | ^5.5.0 | Apache-2.0 |
| ts-node | ^10.9.1 | MIT |

### Java（java_ast）

| パッケージ | バージョン | ライセンス |
|---|---|---|
| javaparser-core | latest | Apache-2.0 / LGPL-2.1 |
| javaparser-symbol-solver-core | latest | Apache-2.0 / LGPL-2.1 |
| jackson-databind | latest | Apache-2.0 |
| opencsv | latest | Apache-2.0 |

---

## ライセンス

[MIT](./LICENSE)

---

## 関連リポジトリ

| リポジトリ | 概要 |
|---|---|
| [mirror-framework](https://github.com/earthHa11Queen/mirror-framework) | ドメインとboolean演算によるテストシナリオ生成フレームワーク |
| [playwright-framework-guide](https://github.com/earthHa11Queen/playwright-framework-guide) | Playwright E2Eテスト自動化システムの設計ガイド |
| [spreadsheet-like-db-editor](https://github.com/earthHa11Queen/spreadsheet-like-db-editor) | 本リポジトリのサンプル出力の解析対象アプリ |
| [vpsy-concept](https://github.com/earthHa11Queen/vpsy-concept) | このアーキテクチャの根幹となる構想 |
