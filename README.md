# ast-tools

A multi-language static analysis toolkit that parses source code via AST
and outputs structured method/class information as JSON, CSV, and Markdown.

Designed as a preprocessing layer for test design and AI input —
part of a larger architecture concept built toward
[VPSY](https://github.com/earthHa23Queen/vpsy-concept).

---

## Overview

This toolkit provides three types of parsers,
each targeting a different dimension of application structure:

| Parser | What it extracts | Primary use |
|---|---|---|
| `tsjs_ast` / `java_ast` | Method / class structure | AI input for unit test design |
| `transition_react` | Screen transition paths | E2E test scenario generation |
| `ui_element_react` | UI elements per screen | Page Object generation, test spec authoring |

Together, these three outputs form the complete input layer for
[mirror-framework](https://github.com/earthHa23Queen/mirror-framework)
and AI-assisted test specification generation.

---

## Actual Measurements

- Generation of test specifications: 13,583 cases
  (Two independent artifacts with different architectures matched perfectly at the CaseNo level)
- External validation using mutation testing (PIT):
  - Pure function classes: Test Strength 100%
  - Thin delegation layer classes: Test Strength 89%
  - Classes with actual business logic: Test Strength 49%
- Initial application to Apache Commons Lang3 (Defects4J target project):
  Generated 68,607 cases
- Compilation errors upon initial injection of generated test code into the actual project:
  3 errors for approximately 630,000 lines (the cause converged to a single type)

---

## Verification Status (As of August 2026)

**Verified**  
- Target Language: Java (Gradle / Maven, Spring Boot)
- Execution Record: Approximately 1,200 cases executed on an actual project within a personal project
- External Metrics: Measured by applying PIT (Mutation Testing) to 3 classes

**Unverified**  
- Large-scale demonstration on general OSS (For Apache Commons Lang3, only generation has been confirmed; execution is incomplete)
- End-to-end execution for target languages other than Java

**Known Limitations**  
- Weak validation for structured data (contents of Collections / Maps / DTOs)
- Lacks an axis to exhaustively cover the response patterns of dependencies (collaborators)
- Can detect discrepancies between documentation and implementation, but determining whether that discrepancy is an "intentional design decision" or an "oversight" is beyond the scope of problems this tool handles

This project is published not as a completed tool, but as an ongoing implementation record of personal research.

---

## Overall Architecture

```text
Source Code
    │
    ▼
AST Parsing (java_ast / typescript_ast ...)
    │  Extract syntactic information as CSV
    ▼
Cleaner (java_ast_cleaner ...)
    │  Decompose complex types / DTOs into flat observational units
    ▼
SQLite (Cartesian product with test perspective catalog & pruning)
    │  Deterministically finalize the set of cases
    ▼
Code Generation by LLM
    │  Convert finalized cases into Java test code
    ▼
Runtime (java_test_library)
    │  Generate and inject test data at runtime
    ▼
Evidence
    Record used values and execution results in a reproducible form
```

## Quick Start

This is the minimal set of steps to run part of the pipeline end-to-end,
using the simplest possible target: a method with no arguments.
Running the full pipeline (case finalization via SQLite, prompt generation
for the LLM, and injecting generated code into an actual project) requires
additional setup and is not covered here.

### 1. Run Java AST parsing

```bash
cd Java/java_ast
# Set the path to the project you want to analyze in config.json
mvn compile exec:java
```

CSV files (method-level, field-level, and source-file-level) are output
under `Java/results/`.

### 2. Inspect the output

```bash
head -5 Java/results/ast_method_level.csv
```

You should see one row per method in the target class, along with its
signature, return type, and parameter information.

### 3. Verify the test runtime in isolation

```bash
cd Java/java_test_library
mvn clean install
```

Edit `config.ts`:

```typescript
export const TARGET_APP_DIR = "YOUR APP PATH";  // Path to the React app's src directory
export const DEFAULT_OUTPUT_DIR = "../results/ui_element_react";
export const TARGET_APP_NAME = "your-app-name";
export const TARGET_DIR_PATTERNS = ["presentation/pages"];  // Directories to scan
```

For MUI or other component libraries, add mappings in `CUSTOM_COMPONENT_MAP`:

```typescript
export const CUSTOM_COMPONENT_MAP = [
  { componentName: "TextField", interactionType: "text_input", mirrorAxisX: "text_input", playwrightMethodPrefix: "input" },
  { componentName: "Button",    interactionType: "navigation_trigger", mirrorAxisX: "button_normal", playwrightMethodPrefix: "click" },
  // add more as needed
]
```

Run:

```bash
npx ts-node main.ts
```

#### Output files

| File | Contents |
|---|---|
| `ui_elements.json` | Full structured data per screen (AI input format) |
| `ui_elements.csv` | Flat format — all elements with 50+ attributes |
| `ui_elements.md` | Human-readable overview grouped by scope |

#### Key attributes extracted

| Group | Attributes | Use |
|---|---|---|
| Identifier | id, name, className, data-testid, type, role | Locator targeting |
| Label | labelText, placeholder, aria-label | Test spec item names |
| Constraints | maxLength, minLength, max, min, step, pattern | Boundary value test design |
| Transition | href, target, formAction | Link to transition_react output |
| State | isRequired, isDisabled, isReadonly, isHidden | Operation scope filtering |
| Accessibility | aria-expanded, aria-controls, aria-haspopup | Dynamic UI (accordion, modal) |
| Scope | parentScopeTag, siblingCount, scopeGroupId | Page Object Static Root / Scope |
| Playwright | interactionType, mirrorAxisX, playwrightMethodPrefix | Method name derivation |

---

### Run all parsers

```bash
chmod +x exec_shells/all_exec.sh
./exec_shells/all_exec.sh
```

---

## Sample Output

`results/tsjs/` — method-level analysis of
[spreadsheet-like-db-editor](https://github.com/earthHa23Queen/spreadsheet-like-db-editor)
(frontend TypeScript).

`results/transition_react/` — screen transition analysis of the same application.

```
path_summary.json:
  maxCost: 3
  forward: 9 paths (8 integration, 1 system)
  reverse: 1 path
  unresolvedPaths: []
```

`results/ui_element_react/` — UI element analysis of the same application.

```
ui_elements.csv:
  39 elements across 8 screens
  labelText resolved for all Button / TextField elements
  inputProps (min/max) extracted from MUI TextField
```

---

## Architecture Context

```
Your application source code
    ↓
    ├── tsjs_ast / java_ast      → Method structure (JSON / CSV)
    ├── transition_react         → Screen transition paths (CSV)
    └── ui_element_react         → UI elements per screen (JSON / CSV)
    ↓
mirror-framework
    → Test scenarios via boolean / domain operations
    ↓
playwright-framework-guide
    → Playwright E2E test implementation
```

All repositories share a common architecture concept designed
as a foundation for VPSY — a computational model for psychodynamics.
→ [architecture-concept](https://github.com/earthHa23Queen) *(coming soon)*

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

### transition_react / ui_element_react

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
| [mirror-framework](https://github.com/earthHa23Queen/mirror-framework) | Test scenario generation using domain definition and boolean operations |
| [playwright-framework-guide](https://github.com/earthHa23Queen/playwright-framework-guide) | Playwright E2E test automation design guide |
| [spreadsheet-like-db-editor](https://github.com/earthHa23Queen/spreadsheet-like-db-editor) | Sample application used to generate the results in this repository |
| [vpsy-concept](https://github.com/earthHa23Queen/vpsy-concept) | The root concept behind this architecture |

---

---

# ast-tools（日本語）

TypeScript/JavaScript・Javaのソースコード、ReactアプリケーションのUI画面遷移・UI要素を解析し、
テスト設計・AI入力前処理のためのデータを出力する静的解析ツール群です。

[VPSY](https://github.com/earthHa23Queen/vpsy-concept)の実現に向けたアーキテクチャ構想の一部です。

---

## 概要

3種類のパーサーを提供します。

| パーサー | 抽出内容 | 主な用途 |
|---|---|---|
| `tsjs_ast` / `java_ast` | メソッド・クラス構造 | 単体テスト設計のAI入力 |
| `transition_react` | 画面遷移パス | E2Eテストシナリオ生成 |
| `ui_element_react` | 画面単位のUI要素 | Page Object生成・テスト仕様書作成 |

この3種の出力データが揃うことで、[mirror-framework](https://github.com/earthHa23Queen/mirror-framework)とAIによるテスト仕様書自動生成への完全な入力層が構成されます。

---

## 全体アーキテクチャ

```text
ソースコード
    │
    ▼
AST解析（java_ast / typescript_ast ...）
    │  構文情報を CSV として抽出
    ▼
Cleaner（java_ast_cleaner ...）
    │  複合型・DTOをフラットな観測単位へ分解
    ▼
SQLite（テスト観点カタログとの直積・剪定）
    │  ケース集合を決定論的に確定
    ▼
LLMによるコード生成
    │  確定済みケースをJavaのテストコードへ変換
    ▼
Runtime（java_test_library）
    │  実行時にテストデータを生成・注入
    ▼
Evidence
    使用された値と実行結果を記録し、再現可能な形で保持
```

各層は独立しており、上流の出力形式が変わらない限り、下流を差し替えても動作します。

---

## ディレクトリ構成

```bash
ast-tools/
├── Java/                     # Java向けパイプライン
│   ├── java_ast/             # AST解析（JavaParser）
│   ├── java_ast_cleaner/     # 型の正規化・複合型の分解
│   ├── java_test_library/    # 実行時ランタイム（テストデータ生成・Evidence記録）
│   └── results/              # 解析結果の出力先
│
├── Typescript/                # TypeScript / JavaScript向けパイプライン
│   ├── typescript_ast/
│   ├── typescript_ast_cleaner/
│   └── typescript_test_library/
│
├── React/                     # React向け画面解析
│   ├── react_transition/      # 画面遷移パス抽出
│   └── react_ui_element/      # UI要素抽出
│
├── Playwright/                 # E2Eテスト設計支援
│   ├── dom_tree_ast/          # DOM構造の静的解析
│   └── dom_playwright/        # Playwright実行連携
│
├── SQLite/                     # 分析基盤（テーブル定義・ビュー・SQL群）
│   ├── create/
│   ├── select/
│   ├── view/
│   ├── dml_insert/
│   ├── dml_update/
│   ├── dml_delete/
│   └── drop/
│
├── BackendTest/                # 言語別のテストコード生成プロンプト
│   └── config/                 # 言語ごとのプロンプトテンプレート
│
├── Shells/                      # 実行用シェルスクリプト（Linux / Windows）
│
├── Docs/                        # 設計文書・仕様書
│
└── OldVersion/                  # 過去バージョン（設計判断の記録として保持）
```

---

## クイックスタート

最も依存の少ないケース（引数を持たない単純なメソッド）を対象に、パイプラインの一部を実際に動かす手順です。
全工程の実行には別途SQLiteのセットアップが必要ですが、ここでは「AST解析からCSV出力まで」を最短で確認します。

### 1. Java AST解析を実行する

```bash
cd Java/java_ast
# config.json に解析対象のプロジェクトパスを設定する
mvn compile exec:java
```

`Java/results/` 配下に、メソッド・フィールド・ソースファイル単位のCSVが出力されます。

### 2. 出力を確認する

```bash
head -5 Java/results/ast_method_level.csv
```

対象クラスのメソッド一覧が、シグネチャ・戻り値型・引数情報とともに1行1件で確認できます。

### 3. テストランタイムの単体動作を確認する

```bash
chmod +x exec_shells/all_exec.sh
./exec_shells/all_exec.sh
```

---

## サンプル出力

`results/tsjs/`・`results/transition_react/`・`results/ui_element_react/`には
[spreadsheet-like-db-editor](https://github.com/earthHa23Queen/spreadsheet-like-db-editor)
の解析結果が含まれています。

```
ui_elements.csv（spreadsheet-like-db-editor）:
  8画面・39要素
  Button/TextFieldのlabelText全件取得済み
  MUI TextFieldのinputProps（min/max）展開済み
```

---

## アーキテクチャ上の位置づけ

```
対象アプリケーションのソースコード
    ↓
    ├── tsjs_ast / java_ast      → メソッド構造データ（JSON / CSV）
    ├── transition_react         → 画面遷移パステーブル（CSV）
    └── ui_element_react         → 画面UI要素データ（JSON / CSV）
    ↓
mirror-framework
    → boolean演算・ドメイン定義によるテストシナリオ算出
    ↓
playwright-framework-guide
    → Playwright E2Eテストとして実装
```

全リポジトリは感情プロセスの計算モデルであるVPSYの実現に向けたアーキテクチャ構想を共通の根拠として持っています。
→ [architecture-concept](https://github.com/earthHa23Queen)（公開予定）

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

### transition_react / ui_element_react

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

依存ライブラリのライセンス詳細・既知の問題については [SECURITY.md](./SECURITY.md) を参照してください。

---

## 関連リポジトリ

| リポジトリ | 概要 |
|---|---|
| [mirror-framework](https://github.com/earthHa23Queen/mirror-framework) | ドメインとboolean演算によるテストシナリオ生成フレームワーク |
| [playwright-framework-guide](https://github.com/earthHa23Queen/playwright-framework-guide) | Playwright E2Eテスト自動化システムの設計ガイド |
| [spreadsheet-like-db-editor](https://github.com/earthHa23Queen/spreadsheet-like-db-editor) | 本リポジトリのサンプル出力の解析対象アプリ |
| [vpsy-concept](https://github.com/earthHa23Queen/vpsy-concept) | このアーキテクチャの根幹となる構想 |
