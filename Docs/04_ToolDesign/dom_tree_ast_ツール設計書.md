# dom_tree_ast ツール設計書

- システム名：ast-tools（テスト自動化基盤用 静的解析ツール群）
- ツール名：dom_tree_ast
- 作成日：2026-07-08
- 版数：v1（新規）
- 対応言語：TypeScript（Node.js 18+）
- 配置場所：ast-tools/dom_tree_ast/

---

## 1. 概要

### 1.1 目的

モジュールB（dom_capture_gen）の出力を人間がAIに渡して生成したPlaywrightコードを実行し、取得した実HTML（レンダリング後のDOM）を解析して、510で定義されたPlaywright OOMアーキテクチャの中核概念である**Static Root（不変の親コンテナ）**と**Current Scope（動的カーソル）**を機械的に同定するツール。

ソースコードの静的解析（ui_element_react）だけでは、MUI等のコンポーネントライブラリによる実DOM展開の差異や、条件付きレンダリング・動的リスト生成の影響を正確に捉えられないという課題があった。本ツールは「実際にレンダリングされたDOMこそが正である」という方針のもと、その実DOMに対して直接、510末尾で言語化されていたスコープ判定ロジック（上位スコープが内包する同階層スコープ数の比較による優先順位決定）を適用する。

処理は機械的抽出（Phase1）と同定ロジック（Phase2）の2工程に明確に分離する。これは既存のtransition_react（AdjacencyTableBuilder→PathTableBuilder→PathCostClassifierという抽出・構築・判定の分離）と同じ設計パターンを踏襲したものであり、判定ロジックのみを独立して改良・差し替え可能にするための構成である。

### 1.2 処理の全体像

```
[Phase1: 機械的抽出]
① 取得済み実HTML（画面ごとのファイル）を読み込む
        ↓
② html タグを起点に、意味的グルーピングタグ（body/main/header/footer/div/section/article/
   nav/ul/ol/table/tbody/tr/form/fieldset 等）のみを対象として再帰的に走査する
        ↓
③ input/button/select/textarea/a 等の操作対象末端タグに到達したら、そこで探索を打ち切る
   （それより深い階層は走査しない）
        ↓
④ 各グルーピングタグについて、階層深度・直下の子グルーピングタグ数・
   配下に含まれる操作対象末端タグ数を記録する
        ↓
⑤ dom_tree_raw.csv として画面ごとに出力する（この時点ではStatic Root/Current Scopeの判定はしない）

[Phase2: 同定ロジック]
⑥ dom_tree_raw.csv を読み込む
        ↓
⑦ 操作対象末端タグを2件以上内包する最小のグルーピングタグをスコープ候補とする
        ↓
⑧ スコープ候補が内包する操作対象末端タグ数で優先順位を決定する
   （同数の場合は、親スコープが内包する同階層スコープ数の比較で優先順位を補正する）
        ↓
⑨ 階層の上位側をStatic Root候補、繰り返し構造（同一タグ・同一クラスの兄弟スコープが複数存在する）
   を持つ下位側をCurrent Scope候補として分類する
        ↓
⑩ scope_resolved.csv として出力する
```

### 1.3 実行タイミング

**前提：** モジュールB経由でAIが生成し人間が実行したPlaywrightキャプチャコードにより、実HTMLファイルが`captured/`配下等に画面ごとに保存済みであること。

**Phase1とPhase2は別々に実行可能な構成とする**（Phase1の出力CSVを人間が目視確認してからPhase2を実行できるようにするため）。

```bash
cd dom_tree_ast
npm install
# config.ts を編集してキャプチャ済みHTMLの格納ディレクトリ・出力先を設定
npx ts-node main.ts --phase=1   # 機械的抽出のみ実行
npx ts-node main.ts --phase=2   # Phase1の出力を読み込み同定ロジックのみ実行
npx ts-node main.ts             # 引数なしの場合はPhase1→Phase2を連続実行する
```

---

## 2. ディレクトリ構成

```
dom_tree_ast/
├── main.ts                    ← エントリポイント・全体制御（--phaseオプションで実行範囲を切替）
├── config.ts                  ← ユーザー設定（HTML格納パス・対象タグ定義・出力先）
├── package.json
├── tsconfig.json
└── src/
    ├── types.ts                ← 全モジュール共通の型定義
    ├── HtmlLoader.ts            ← 画面ごとの実HTMLファイルを読み込む
    ├── TreeExtractor.ts         ← [Phase1] 意味的グルーピングタグを再帰走査する
    ├── TreeOutputWriter.ts      ← [Phase1] dom_tree_raw.csvを出力する
    ├── ScopeCandidateBuilder.ts ← [Phase2] スコープ候補を抽出し優先順位を計算する
    ├── ScopeResolver.ts         ← [Phase2] Static Root/Current Scopeを確定する
    └── ScopeOutputWriter.ts     ← [Phase2] scope_resolved.csvを出力する
```

---

## 3. 型定義（src/types.ts）

### 3.1 GroupingTagNode（Phase1の中間表現・再帰構造）

| フィールド名 | 型 | 説明 |
|---|---|---|
| screenName | string | 画面名（HTMLファイル名から取得） |
| tagPath | string | ルートからのタグパス（例：`html>body>main>div.user-list`） |
| depth | number | html起点からの階層深度 |
| tagName | string | タグ名 |
| classAttr | string \| null | class属性値 |
| idAttr | string \| null | id属性値 |
| directGroupingChildCount | number | 直下に存在する意味的グルーピングタグの数 |
| containedOperationTagCount | number | 配下（末端まで）に含まれる操作対象タグ（input/button/select/textarea/a）の総数 |
| directOperationTagCount | number | 直下（孫階層を含まない）に存在する操作対象タグの数 |

### 3.2 ScopeCandidate（Phase2の中間表現）

| フィールド名 | 型 | 説明 |
|---|---|---|
| screenName | string | 画面名 |
| tagPath | string | GroupingTagNodeのtagPathを引き継ぐ |
| operationTagCount | number | このスコープが内包する操作対象タグ数 |
| siblingScopeCount | number | 親スコープが内包する同階層スコープ候補の数 |
| priorityScore | number | operationTagCountを主指標、siblingScopeCountを補助指標として算出する優先度スコア |

### 3.3 ResolvedScope（Phase2の最終出力）

| フィールド名 | 型 | 説明 |
|---|---|---|
| screenName | string | 画面名 |
| scopeId | string | tagPathから生成する一意識別子（ハッシュ） |
| tagPath | string | タグパス |
| role | "static_root" \| "current_scope" \| "leaf_operation" | 分類結果 |
| parentScopeId | string \| null | 親スコープのscopeId |
| repeatGroupSize | number \| null | current_scopeの場合、同一構造の兄弟スコープ数（繰り返し行数の推定） |

---

## 4. 各ファイルの処理仕様

### 4.1 HtmlLoader.ts

**目的：** キャプチャ済みの実HTMLファイル一式を読み込み、パース可能な形に変換する。

**入力：** HTML_CAPTURED_DIR（config.tsで指定。dom_capture_genの生成コードが出力したHTML格納先）

**出力：** `{ screenName: string, htmlContent: string }[]`

**処理フロー：**

1. HTML_CAPTURED_DIR配下の`.html`ファイルを列挙する
2. ファイル名（拡張子除く）をscreenNameとして採用する
3. 各ファイルの内容を読み込む

**使用ライブラリ：** 212の要件定義で選定済みの`node-html-parser`を採用する（HTML/CSS解析用として既に選定されていたものを流用し、新規の依存関係追加を避ける）。

**エッジケース：**

| ケース | 対処 |
|---|---|
| HTML_CAPTURED_DIRが存在しない、またはファイルが0件 | errorCode=1で処理中断（モジュールBの手順未実施を示唆するメッセージを出す） |
| 不正なHTML（パース失敗） | 該当ファイルをスキップし警告ログを出して続行する |

---

### 4.2 TreeExtractor.ts【Phase1】

**目的：** htmlタグを起点に、意味的グルーピングタグのみを対象として再帰的にツリーを走査し、各タグの階層情報・子タグ数を機械的に記録する。

**入力：** `{ screenName, htmlContent }[]`

**出力：** GroupingTagNode[]

**処理フロー：**

1. GROUPING_TAGS定数（デフォルト：`html, body, main, header, footer, div, section, article, nav, ul, ol, table, tbody, tr, form, fieldset`。ui_element_reactのSCOPE_TAGSと重複する部分は表記を揃え、上位互換のスーパーセットとする）に一致するタグのみを対象とする
2. OPERATION_TAGS定数（デフォルト：`input, button, select, textarea, a`）に一致するタグに到達した時点で、そのタグより深い階層への走査を打ち切る（末端タグ自体は「直下の操作対象タグ数」としてカウントするが、その内部構造は展開しない）
3. GROUPING_TAGSにもOPERATION_TAGSにも一致しないタグ（span等）は、走査自体はスキップしつつ、その配下にOPERATION_TAGSが存在すれば通過して数えるものとする（間に無関係なタグが挟まっていてもカウントが途切れないようにする）
4. 各グルーピングタグについて、tagPath（祖先タグの連結。class属性がある場合は`div.user-list`のように付記し、一意性を高める）・depth・直下グルーピング子タグ数・配下操作対象タグ総数・直下操作対象タグ数を記録する

**エッジケース：**

| ケース | 対処 |
|---|---|
| 同一クラス名・同一タグ名の要素が並列に複数存在する（繰り返し行等） | 各要素を個別のGroupingTagNodeとして記録する（Phase2で兄弟スコープとして集約する） |
| iframe内のDOM | v1では対象外（走査しない） |
| Shadow DOM | v1では対象外（node-html-parserの解析範囲外のため） |

---

### 4.3 TreeOutputWriter.ts【Phase1】

**目的：** GroupingTagNode[]をCSVに出力する。

**入力：** outputDir、GroupingTagNode[]

**出力：** `dom_tree_raw.csv`（screenName, tagPath, depth, tagName, classAttr, idAttr, directGroupingChildCount, containedOperationTagCount, directOperationTagCount）

**処理フロー：** 既存ツール群と同様、BOM付きUTF-8・カンマ等のエスケープ処理を行うCSV出力とする。

---

### 4.4 ScopeCandidateBuilder.ts【Phase2】

**目的：** dom_tree_raw.csvから、Static Root/Current Scopeの候補となりうるスコープを抽出し、優先順位スコアを算出する。510の判定ロジックの実装本体。

**入力：** dom_tree_raw.csv（TreeOutputWriterの出力）

**出力：** ScopeCandidate[]

**処理フロー：**

1. `directOperationTagCount >= 2`のグルーピングタグ、または`containedOperationTagCount >= 2`かつそれを内包する子グルーピングタグが単一（＝これ以上絞り込めない最小のまとまり）であるタグを、スコープ候補として抽出する（510の「スコープとしてまとめる場合は、操作対象が2以上かつ最小限となるタグで区切る」の実装）
2. 各スコープ候補について、同じ親（tagPathの親階層が一致する）を持つスコープ候補の数を`siblingScopeCount`として算出する
3. `priorityScore`を、`operationTagCount`を主指標、`siblingScopeCount`（多いほど「繰り返し構造」である可能性が高くCurrent Scope向き）を補助指標とした計算式で算出する

**エッジケース：**

| ケース | 対処 |
|---|---|
| operationTagCountが1件のみのタグ | スコープ候補とはせず、単独のleaf_operationとして後段で扱う |
| 同一階層に候補が1つしかない（siblingScopeCount=0） | 繰り返し構造ではなく単発のStatic Root候補として扱う |

---

### 4.5 ScopeResolver.ts【Phase2】

**目的：** ScopeCandidateの優先順位スコアと階層構造から、最終的にStatic Root・Current Scope・leaf_operationのいずれかに分類する。

**入力：** ScopeCandidate[]

**出力：** ResolvedScope[]

**処理フロー：**

1. 各画面について、階層が最も浅い（depthが小さい）スコープ候補から順に評価する
2. `siblingScopeCount >= 2`（同一構造の兄弟が複数存在する＝繰り返し行等）を持つスコープ候補は`role = "current_scope"`とし、`repeatGroupSize`に兄弟数を設定する
3. `siblingScopeCount`が0または1で、かつ子孫に別のスコープ候補を内包する（あるいは配下の操作対象タグが安定的に固定数存在する）スコープ候補は`role = "static_root"`とする
4. スコープ候補に属さない個々の操作対象タグは`role = "leaf_operation"`とし、直近の親スコープのscopeIdを`parentScopeId`として設定する
5. 各スコープにscopeId（tagPathのハッシュ、先頭8文字）を採番する

**エッジケース：**

| ケース | 対処 |
|---|---|
| Static Root候補とCurrent Scope候補の階層関係が入れ子で複数段になる | 親子関係をparentScopeIdの連結で表現し、複数段のネストをそのまま許容する |
| 該当なしの画面（全要素が単発） | 全要素をleaf_operationとして扱い、Static Root/Current Scopeは生成しない（画面自体が単純なフォームであると推定できる） |

---

### 4.6 ScopeOutputWriter.ts【Phase2】

**目的：** ResolvedScope[]をCSVに出力する。

**入力：** outputDir、ResolvedScope[]

**出力：** `scope_resolved.csv`（screenName, scopeId, tagPath, role, parentScopeId, repeatGroupSize）

**処理フロー：** 既存ツール群と同様の出力方式（BOM付きUTF-8）。

---

## 5. エラーハンドリング方針

| エラー種別 | 処理 | 終了コード |
|---|---|---|
| HTML_CAPTURED_DIRが存在しない／HTMLファイル0件 | エラーログを出して即時終了 | 1 |
| 個別HTMLファイルのパース失敗 | 警告ログを出してそのファイルをスキップ・続行 | - |
| Phase2実行時にdom_tree_raw.csvが存在しない | エラーログを出して即時終了（Phase1未実行を示唆） | 1 |
| 出力ディレクトリ作成・ファイル書き込み失敗 | エラーログを出して即時終了 | 1 |
| 全件成功 | サマリーログを出して終了 | 0 |

---

## 6. 実行方法

```bash
cd dom_tree_ast
npm install
# config.ts を編集
#   export const HTML_CAPTURED_DIR = "../../playwright/captured/"
#   export const DEFAULT_OUTPUT_DIR = "../results/dom_tree_ast"
#   export const GROUPING_TAGS = [...]   // 必要に応じてプロジェクト固有タグを追加
#   export const OPERATION_TAGS = [...]  // 必要に応じてプロジェクト固有タグを追加
npx ts-node main.ts
```

---

## 7. 実行ログのサンプル

```
=== dom_tree_ast ===

[Phase1] TreeExtractor
  対象HTML: 8画面
  TopPage: グルーピングタグ12件・操作対象タグ5件
  TableEditPage: グルーピングタグ28件・操作対象タグ14件
  ...
dom_tree_raw.csv: 156行

[Phase2] ScopeCandidateBuilder
  スコープ候補抽出: 22件（8画面合計）

[Phase2] ScopeResolver
  static_root: 9件
  current_scope: 6件（うち繰り返し検出: TableEditPageの行スコープ×1、repeatGroupSize=14）
  leaf_operation: 41件
scope_resolved.csv: 56行

=== 処理完了 ===
```

---

## 8. 今後の拡張予定

| 項目 | 概要 |
|---|---|
| ui_elements.csvとの突合 | scope_resolved.csvの各leaf_operationと、ui_element_reactが静的解析で出したlabelText・interactionType等を紐付ける機能。実DOM要素と静的解析結果を一意に対応付けるための共通キー（data-testid付与の徹底等）が前提条件となるため、v1では対応を見送り将来課題とする |
| Shadow DOM / iframe対応 | 対象アプリで使用されている場合に検討 |
| Static Root/Current Scope同定結果からのPage Objectひな形直接生成 | 現状はCSV出力までがスコープだが、511のOOMコード雛形（setInitialization/focusXxx等のメソッド定義）まで機械的に生成する拡張 |
