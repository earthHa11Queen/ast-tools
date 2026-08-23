# ast-tools

## What is this

This is an implementation record of a test design pipeline that places a deterministic input domain model (AST parsing + SQLite) in the front stage, and limits the role of the LLM strictly to the "semantic connection of finalized information". 

Initially, only AST parsing was implemented as a tool to facilitate the implementation of test data and test code. 
As development progressed, I realized that by applying SQL and programmatic processing to the output of AST parsing, AI could generate test cases and test code more efficiently and accurately. Based on this realization, the design was completely revamped from the previous version. 

It deterministically finalizes a set of test cases by combining syntactic information extracted from the source code and a test perspective catalog in SQLite, and then the LLM converts those cases into Java test code. 
The LLM does not decide "what to test", but is limited to the role of translating already finalized specifications into executable code. 

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
- Compilation errors upon initial injection of generated test code into the actual project:
  3 errors for approximately 630,000 lines (the cause converged to a single type)

Raw artifacts backing these numbers — including two independently generated
JUnit test suites (ChatGPT and Claude, same input, same prompt), the
generation input bundle (AST output, test specifications, instruction data),
and the PIT mutation testing reports — are available under
[`Docs/98_results_sample/`](./Docs/98_results_sample/).

---
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

This runs the runtime's own unit tests, confirming the basic behavior
of test data generation and Evidence recording.

---

Steps beyond this point — case finalization via SQLite, prompt generation
for the LLM, and injecting generated code into an actual project — are
documented under `Docs/`.

---

## License

[MIT](./LICENSE)

---

## Security

Please refer to [SECURITY.md](./SECURITY.md) for details regarding the licenses of dependency libraries and known issues.

---

# ast-tools(日本語)

## これは何か

決定論的な入力領域モデル（AST解析 + SQLite）を前段に置き、LLMの役割を「確定済み情報の意味的接続」だけに限定した、テスト設計パイプラインの実装記録です。  

当初は、テストデータやテストコードの実装を楽にするためのツールとして、AST解析のみを実装していました。  
開発を進める中で、AST解析の出力にSQLやプログラムによる加工を加えることで、AIがテストケースやテストコードをより効率的かつ精度高く生成できることに気づき、その気づきをもとに前バージョンから設計を刷新しています。  

ソースコードから抽出した構文情報とテスト観点カタログをSQLiteで組み合わせ、テストケースの集合を決定論的に確定させたうえで、そのケースをLLMがJavaのテストコードへ変換します。  
LLMは「何をテストすべきか」を決めず、すでに確定した仕様を実行可能なコードへ翻訳する役割に限定されます。  

---

## 実測値

- テスト仕様書の生成: 13,583件
  （アーキテクチャの異なる2本の独立した生成物で、CaseNo単位で完全一致）
- ミューテーションテスト（PIT）による外部検証:
  - 純粋関数クラス: Test Strength 100%
  - 薄い委譲層クラス: Test Strength 89%
  - 実ロジックを持つクラス: Test Strength 49%
- Apache Commons Lang3（Defects4J対象プロジェクト）への初適用:
  68,607ケースを生成
- 生成テストコードの実プロジェクトへの初回投入時のコンパイルエラー:
  約63万行に対して3件（原因は1種類に収束）
- 生成テストコードの実プロジェクトへの初回投入時のコンパイルエラー:
  約63万行に対して3件（原因は1種類に収束）

これらの数値の元データ——ChatGPTとClaude、同一インプット・同一プロンプトで
独立生成した2種類のJUnitテストスイート、生成インプット一式
（AST出力・テスト仕様書・テストデータ）、PITによるミューテーションテストの
レポート——は [`Docs/98_results_sample/`](./Docs/98_results_sample/) 配下に
実物として置いてあります。

---

---

## 検証状況（2026年8月時点）

**検証済み**  
- 対象言語: Java（Gradle / Maven, Spring Boot）
- 実行実績: 自作プロジェクトで約1,200ケースを実プロジェクト上で実行
- 外部指標: PIT（ミューテーションテスト）を3クラスに適用し測定

**未検証**  
- OSS一般での大規模な実証（Apache Commons Lang3は生成のみ確認、実行は未了）
- Java以外の対象言語でのend-to-end実行

**既知の限界**  
- 構造化データ（Collection / Map / DTOの中身）に対する検証の弱さ
- 依存先（コラボレータ）の応答パターンを網羅する軸を持たない
- ドキュメントと実装の乖離は検出できるが、
  その乖離が「意図的な設計判断」か「見落とし」かの最終判定は、
  本ツールの扱う問題の範囲外

このプロジェクトは完成したツールではなく、進行中の個人研究の実装記録として公開しています。

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
cd Java/java_test_library
mvn clean install
```

ランタイム自身の単体テストが実行され、テストデータ生成とEvidence記録の基本動作が確認できます。

---

これより先（SQLiteによるケース確定、LLMへのプロンプト生成、生成コードの実プロジェクトへの投入）は `Docs/` 配下の設計文書を参照してください。

## ライセンス

[MIT](./LICENSE)

---

## セキュリティ

依存ライブラリのライセンス詳細・既知の問題については [SECURITY.md](./SECURITY.md) を参照してください。
