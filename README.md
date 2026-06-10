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

## Supported Languages / Parsers

### Source Code Parser (tsjs_ast / java_ast)

| Language | Status |
|---|---|
| TypeScript / JavaScript | ✅ Implemented (ts-morph) |
| Java | ✅ Implemented (JavaParser) |
| Python | 🔲 Planned |
| PHP | 🔲 Planned |
| Go | 🔲 Planned |
| HTML / CSS | 🔲 Planned |

### Screen Transition Parser (transition_react)

| Framework | Status |
|---|---|
| React (React Router v6) | ✅ Implemented (ts-morph) |
| Vue | 🔲 Planned |
| Angular | 🔲 Planned |

---

## Repository Structure

```
ast-tools/
├── commonConfig.json               # Shared configuration
├── tsjs_ast/                       # TypeScript / JavaScript source parser
│   ├── config.ts                   # ⚙️ User configuration — set your paths here
│   ├── main.ts
│   └── src/
│       ├── parser.ts
│       ├── method_info.ts
│       ├── json_output.ts
│       ├── csv_output.ts
│       └── markdown_output.ts
├── java_ast/                       # Java source parser
│   ├── config.json                 # ⚙️ User configuration — set your paths here
│   └── src/main/java/com/ast_tool/
├── transition_react/               # Screen transition parser (React Router v6)
│   ├── config.ts                   # ⚙️ User configuration — set your paths here
│   ├── main.ts
│   └── src/
│       ├── types.ts
│       ├── RouteDefinitionParser.ts
│       ├── TransitionExtractor.ts
│       ├── AdjacencyTableBuilder.ts
│       ├── PathTableBuilder.ts
│       ├── PathCostClassifier.ts
│       └── AdjacencyOutputWriter.ts
├── exec_shells/
│   └── all_exec.sh
└── results/
    ├── tsjs/                       # Sample output — spreadsheet-like-db-editor (source analysis)
    └── transition_react/           # Sample output — spreadsheet-like-db-editor (screen transitions)
```

---

## Getting Started

### TypeScript / JavaScript Source Parser

**Prerequisites:** Node.js 18+

```bash
cd tsjs_ast
npm install
```

Edit `config.ts`:

```typescript
export const TARGET_APP_DIR = "YOUR APP PATH";
export const DEFAULT_OUTPUT_DIR = "../results/tsjs";
export const TARGET_APP_NAME = "your-app-name";
```

Run:

```bash
npx ts-node main.ts
```

---

### Java Source Parser

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

### Screen Transition Parser (React)

**Prerequisites:** Node.js 18+

```bash
cd transition_react
npm install
```

Edit `config.ts`:

```typescript
export const TARGET_APP_DIR = "YOUR APP PATH";        // Path to the React app's src directory
export const DEFAULT_OUTPUT_DIR = "../results/transition_react";
export const TARGET_APP_NAME = "your-app-name";
export const START_PATH = "/";                        // Entry point path
```

Run:

```bash
npx ts-node main.ts
```

#### Output files

| File | Contents |
|---|---|
| `adjacency_table.csv` | All screen transition edges (from/to path, component, transition type) |
| `path_forward.csv` | Forward paths from start — with cost and test phase |
| `path_reverse.csv` | Reverse paths back to start — with cost and test phase |
| `path_summary.json` | maxCost, total paths per phase, unresolved paths |

#### Path cost and test phase

| Cost | Test Phase |
|---|---|
| 1 to (maxCost - 1) | Integration test |
| maxCost | System test |

---

### Run all parsers

```bash
chmod +x exec_shells/all_exec.sh
./exec_shells/all_exec.sh
```

---

## Sample Output

`results/tsjs/` contains method-level analysis of
[spreadsheet-like-db-editor](https://github.com/earthHa11Queen/spreadsheet-like-db-editor)
(frontend TypeScript).

`results/transition_react/` contains screen transition analysis of the same application.

```
path_summary.json (spreadsheet-like-db-editor):
  maxCost: 3
  forward: 9 paths (8 integration, 1 system)
  reverse: 1 path
  unresolvedPaths: []
```

---

## Architecture Context

This toolkit sits in the middle of a larger pipeline:

```
Your application source code
    ↓  ast-tools — tsjs_ast / java_ast
Structured method data (JSON / CSV)
    ↓  mirror-framework
Test scenarios via boolean / domain operations
    ↓  playwright-framework-guide
Playwright E2E test implementation

Your application source code
    ↓  ast-tools — transition_react
Adjacency table + path table (CSV)
    ↓  mirror-framework
Screen transition test scenarios
    ↓  playwright-framework-guide
Playwright E2E test implementation
```

All repositories share a common architecture concept designed
as a foundation for VPSY — a computational model for psychodynamics.
→ [architecture-concept](https://github.com/earthHa11Queen) *(coming soon)*

---

## Dependencies

### tsjs_ast

| Package | Version | License |
|---|---|---|
| ts-morph | ^18.0.0 | MIT |
| iconv-lite | ^0.7.2 | MIT |
| typescript | ^5.5.0 | Apache-2.0 |
| ts-node | ^10.9.1 | MIT |

### java_ast

| Package | Version | License |
|---|---|---|
| javaparser-core | latest | Apache-2.0 / LGPL-2.1 |
| javaparser-symbol-solver-core | latest | Apache-2.0 / LGPL-2.1 |
| jackson-databind | latest | Apache-2.0 |
| opencsv | latest | Apache-2.0 |

### transition_react

| Package | Version | License |
|---|---|---|
| ts-morph | ^18.0.0 | MIT |
| typescript | ^5.5.0 | Apache-2.0 |
| ts-node | ^10.9.1 | MIT |

---

## License

[MIT](./LICENSE)

---

## Security

For dependency license details and known issues,
see [SECURITY.md](./SECURITY.md).

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

TypeScript/JavaScript・Javaのソースコードと、ReactアプリケーションのUI画面遷移を解析し、
テスト設計・AI入力前処理のためのデータを出力する静的解析ツール群です。

[VPSY](https://github.com/earthHa11Queen/vpsy-concept)の実現に向けたアーキテクチャ構想の一部です。

---

## 概要

2種類のパーサーを提供します。

**ソースコードパーサー（tsjs_ast / java_ast）**
アプリケーションのソースコードを走査し、メソッドレベルの構造情報を抽出して
JSON / CSV / Markdown形式で出力します。

**画面遷移パーサー（transition_react）**
Reactアプリケーションの画面遷移を静的解析し、隣接テーブル・パステーブルを
CSV形式で出力します。[mirror-framework](https://github.com/earthHa11Queen/mirror-framework)の
テスト設計に使用する入力データを生成します。

---

## 対応言語・フレームワーク

### ソースコードパーサー

| 言語 | 状態 |
|---|---|
| TypeScript / JavaScript | ✅ 実装済み（ts-morph使用） |
| Java | ✅ 実装済み（JavaParser使用） |
| Python | 🔲 実装予定 |
| PHP | 🔲 実装予定 |
| Go | 🔲 実装予定 |
| HTML / CSS | 🔲 実装予定 |

### 画面遷移パーサー

| フレームワーク | 状態 |
|---|---|
| React（React Router v6） | ✅ 実装済み（ts-morph使用） |
| Vue | 🔲 実装予定 |
| Angular | 🔲 実装予定 |

---

## リポジトリ構成

```
ast-tools/
├── commonConfig.json               # 共通設定
├── tsjs_ast/                       # TypeScript / JavaScript ソースコードパーサー
│   ├── config.ts                   # ⚙️ ユーザー設定 — パスをここに指定
│   ├── main.ts
│   └── src/
│       ├── parser.ts
│       ├── method_info.ts
│       ├── json_output.ts
│       ├── csv_output.ts
│       └── markdown_output.ts
├── java_ast/                       # Java ソースコードパーサー
│   ├── config.json                 # ⚙️ ユーザー設定 — パスをここに指定
│   └── src/main/java/com/ast_tool/
├── transition_react/               # 画面遷移パーサー（React Router v6専用）
│   ├── config.ts                   # ⚙️ ユーザー設定 — パスをここに指定
│   ├── main.ts
│   └── src/
│       ├── types.ts
│       ├── RouteDefinitionParser.ts
│       ├── TransitionExtractor.ts
│       ├── AdjacencyTableBuilder.ts
│       ├── PathTableBuilder.ts
│       ├── PathCostClassifier.ts
│       └── AdjacencyOutputWriter.ts
├── exec_shells/
│   └── all_exec.sh
└── results/
    ├── tsjs/                       # サンプル出力（ソースコード解析）
    └── transition_react/           # サンプル出力（画面遷移解析）
```

---

## 使い方

### TypeScript / JavaScript ソースコードパーサー

**前提:** Node.js 18+

```bash
cd tsjs_ast
npm install
```

`config.ts`を編集:

```typescript
export const TARGET_APP_DIR = "YOUR APP PATH";
export const DEFAULT_OUTPUT_DIR = "../results/tsjs";
export const TARGET_APP_NAME = "your-app-name";
```

実行:

```bash
npx ts-node main.ts
```

---

### Java ソースコードパーサー

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

### 画面遷移パーサー（React）

**前提:** Node.js 18+

```bash
cd transition_react
npm install
```

`config.ts`を編集:

```typescript
export const TARGET_APP_DIR = "YOUR APP PATH";        // Reactアプリのsrcディレクトリ直上を指定
export const DEFAULT_OUTPUT_DIR = "../results/transition_react";
export const TARGET_APP_NAME = "your-app-name";
export const START_PATH = "/";                        // 起点パス（通常はトップページ）
```

実行:

```bash
npx ts-node main.ts
```

#### 出力ファイル

| ファイル | 内容 |
|---|---|
| `adjacency_table.csv` | 全画面遷移エッジ（遷移元・遷移先パス、コンポーネント名、遷移種別） |
| `path_forward.csv` | 起点からの全順行パス（コスト・テスト工程区分付き） |
| `path_reverse.csv` | 起点への全逆行パス（コスト・テスト工程区分付き） |
| `path_summary.json` | maxCost・工程区分ごとのパス数・未解決パスのサマリー |

#### パスコストとテスト工程区分

| コスト | テスト工程区分 |
|---|---|
| 1〜（maxCost - 1） | 結合テスト |
| maxCost | 総合テスト |

---

### 全パーサーをまとめて実行

```bash
chmod +x exec_shells/all_exec.sh
./exec_shells/all_exec.sh
```

---

## サンプル出力

`results/tsjs/`には[spreadsheet-like-db-editor](https://github.com/earthHa11Queen/spreadsheet-like-db-editor)
のフロントエンドTypeScriptのソースコード解析結果が含まれています。

`results/transition_react/`には同アプリケーションの画面遷移解析結果が含まれています。

```
path_summary.json（spreadsheet-like-db-editor）:
  maxCost: 3
  順行: 9パス（結合テスト8件・総合テスト1件）
  逆行: 1パス
  未解決パス: 0件
```

---

## アーキテクチャ上の位置づけ

```
対象アプリケーションのソースコード
    ↓  ast-tools（tsjs_ast / java_ast）
メソッド構造データ（JSON / CSV）
    ↓  mirror-framework
boolean演算・ドメイン定義によるテストシナリオ算出
    ↓  playwright-framework-guide
Playwright E2Eテストとして実装

対象アプリケーションのソースコード
    ↓  ast-tools（transition_react）
隣接テーブル・パステーブル（CSV）
    ↓  mirror-framework
画面遷移テストシナリオの算出
    ↓  playwright-framework-guide
Playwright E2Eテストとして実装
```

全リポジトリは感情プロセスの計算モデルであるVPSYの実現に向けた
アーキテクチャ構想を共通の根拠として持っています。
→ [architecture-concept](https://github.com/earthHa11Queen)（公開予定）

---

## 依存ライブラリ

### tsjs_ast

| パッケージ | バージョン | ライセンス |
|---|---|---|
| ts-morph | ^18.0.0 | MIT |
| iconv-lite | ^0.7.2 | MIT |
| typescript | ^5.5.0 | Apache-2.0 |
| ts-node | ^10.9.1 | MIT |

### java_ast

| パッケージ | バージョン | ライセンス |
|---|---|---|
| javaparser-core | latest | Apache-2.0 / LGPL-2.1 |
| javaparser-symbol-solver-core | latest | Apache-2.0 / LGPL-2.1 |
| jackson-databind | latest | Apache-2.0 |
| opencsv | latest | Apache-2.0 |

### transition_react

| パッケージ | バージョン | ライセンス |
|---|---|---|
| ts-morph | ^18.0.0 | MIT |
| typescript | ^5.5.0 | Apache-2.0 |
| ts-node | ^10.9.1 | MIT |

---

## ライセンス

[MIT](./LICENSE)

---

## セキュリティ

依存ライブラリのライセンス詳細・既知の問題については
[SECURITY.md](./SECURITY.md) を参照してください。

---

## 関連リポジトリ

| リポジトリ | 概要 |
|---|---|
| [mirror-framework](https://github.com/earthHa11Queen/mirror-framework) | ドメインとboolean演算によるテストシナリオ生成フレームワーク |
| [playwright-framework-guide](https://github.com/earthHa11Queen/playwright-framework-guide) | Playwright E2Eテスト自動化システムの設計ガイド |
| [spreadsheet-like-db-editor](https://github.com/earthHa11Queen/spreadsheet-like-db-editor) | 本リポジトリのサンプル出力の解析対象アプリ |
| [vpsy-concept](https://github.com/earthHa11Queen/vpsy-concept) | このアーキテクチャの根幹となる構想 |
