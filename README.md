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

### UI Element Parser (ui_element_react)

| Framework | Status |
|---|---|
| React (MUI compatible) | ✅ Implemented (ts-morph) |
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
├── java_ast/                       # Java source parser
│   ├── config.json                 # ⚙️ User configuration — set your paths here
│   └── src/main/java/com/ast_tool/
├── transition_react/               # Screen transition parser (React Router v6)
│   ├── config.ts                   # ⚙️ User configuration — set your paths here
│   ├── main.ts
│   └── src/
│       ├── RouteDefinitionParser.ts
│       ├── TransitionExtractor.ts
│       ├── AdjacencyTableBuilder.ts
│       ├── PathTableBuilder.ts
│       ├── PathCostClassifier.ts
│       └── AdjacencyOutputWriter.ts
├── ui_element_react/               # UI element parser (React + MUI)
│   ├── config.ts                   # ⚙️ User configuration — set your paths here
│   ├── main.ts
│   └── src/
│       ├── types.ts
│       ├── ComponentParser.ts
│       ├── ElementExtractor.ts
│       ├── LabelResolver.ts
│       ├── ScopeAnalyzer.ts
│       ├── MirrorAxisMapper.ts
│       └── UiElementOutputWriter.ts
├── exec_shells/
│   └── all_exec.sh
└── results/
    ├── tsjs/                       # Sample — spreadsheet-like-db-editor (source analysis)
    ├── transition_react/           # Sample — spreadsheet-like-db-editor (screen transitions)
    └── ui_element_react/           # Sample — spreadsheet-like-db-editor (UI elements)
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
export const TARGET_APP_DIR = "YOUR APP PATH";
export const DEFAULT_OUTPUT_DIR = "../results/transition_react";
export const TARGET_APP_NAME = "your-app-name";
export const START_PATH = "/";
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

### UI Element Parser (React)

**Prerequisites:** Node.js 18+

```bash
cd ui_element_react
npm install
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

### UI要素パーサー

| フレームワーク | 状態 |
|---|---|
| React（MUI対応） | ✅ 実装済み（ts-morph使用） |
| Vue | 🔲 実装予定 |
| Angular | 🔲 実装予定 |

---

## 使い方

### TypeScript / JavaScript ソースコードパーサー

```bash
cd tsjs_ast && npm install
# config.tsを編集してTARGET_APP_DIRを設定
npx ts-node main.ts
```

### Java ソースコードパーサー

```bash
cd java_ast && mvn clean package -f pom.xml
# config.jsonを編集してTargetAppDirを設定
java -Dfile.encoding=UTF-8 -jar target/java-ast-1.0.0-with-dependencies.jar ./config.json
```

### 画面遷移パーサー（React）

```bash
cd transition_react && npm install
# config.tsを編集してTARGET_APP_DIRを設定
npx ts-node main.ts
```

#### 出力ファイル

| ファイル | 内容 |
|---|---|
| `adjacency_table.csv` | 全画面遷移エッジ（遷移元・遷移先パス、コンポーネント名、遷移種別） |
| `path_forward.csv` | 起点からの全順行パス（コスト・テスト工程区分付き） |
| `path_reverse.csv` | 起点への全逆行パス（コスト・テスト工程区分付き） |
| `path_summary.json` | maxCost・工程区分ごとのパス数・未解決パスのサマリー |

### UI要素パーサー（React）

```bash
cd ui_element_react && npm install
# config.tsを編集してTARGET_APP_DIRを設定
npx ts-node main.ts
```

#### 出力ファイル

| ファイル | 内容 |
|---|---|
| `ui_elements.json` | 全画面のUI要素構造データ（AI入力形式） |
| `ui_elements.csv` | 全要素のフラット形式（50以上の属性列） |
| `ui_elements.md` | スコープグループ単位で整形したMarkdown概要 |

#### 主な抽出属性

| グループ | 属性 | 用途 |
|---|---|---|
| 識別 | id・name・className・data-testid・type・role | ロケーター特定 |
| ラベル | labelText・placeholder・aria-label | テスト仕様書の項目名 |
| 入力制約 | maxLength・minLength・max・min・step・pattern | 境界値テスト設計 |
| 遷移 | href・target・formAction | transition_reactとの照合 |
| 状態 | isRequired・isDisabled・isReadonly・isHidden | 操作対象外の識別 |
| アクセシビリティ | aria-expanded・aria-controls・aria-haspopup | アコーディオン・モーダル識別 |
| スコープ | parentScopeTag・siblingCount・scopeGroupId | Page ObjectのStatic Root特定 |
| Playwright連携 | interactionType・mirrorAxisX・playwrightMethodPrefix | メソッド名の導出 |

### 全パーサーをまとめて実行

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
