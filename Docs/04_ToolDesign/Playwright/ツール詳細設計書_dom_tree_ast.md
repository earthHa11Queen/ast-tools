# ツール詳細設計書

- システム名：AST-TOOLS
- ツール名：dom_tree_ast
- 作成日：2026-08-14
- 対応言語：TypeScript 6／Node.js
- 配置場所：playwright/dom_tree_ast/
- パッケージ：dom_tree_ast 0.1.0

---

## 1. 概要

### 1.1 目的

`dom_tree_get`等で保存したHTMLを決定的な規則で解析し、画面内のグルーピング要素と操作要素をCSV化する。さらに、DOMの繰返し構造と操作要素数から、OOM（Object Operation Model）で使用する`static_root`、`current_scope`、`leaf_operation`を判定する。

本ツールはPlaywrightコードを直接生成しない。HTMLから構造情報を抽出し、後段のPage Object、テストコードおよびテストデータ生成が利用できる中間成果物を作成する役割を持つ。

### 1.2 現在の処理範囲

| フェーズ | 入力 | 主処理 | 出力 |
|---|---|---|---|
| Phase 1 | HTMLファイル群 | DOM走査、グルーピング要素・操作要素抽出、意味情報抽出 | `dom_tree_raw.csv` |
| Phase 2 | `dom_tree_raw.csv` | スコープ候補抽出、繰返し構造判定、OOMロール付与 | `scope_resolved.csv` |

### 1.3 設計上の位置づけ

- DOMの機械解析を担当し、AIによる推測の前に再現可能な構造データを作る。
- 物理画面に現れるDOM構造を、静的ルート、現在スコープ、末端操作の3層へ整理する。
- 同一画面内で繰り返される同型構造は、個別要素ではなく同一の操作スコープとして表す。
- 画面遷移、Page Object生成、spec生成およびテストデータ生成は現在の処理範囲外である。

---

## 2. ディレクトリ・ファイル構成

```text
playwright/dom_tree_ast/
├── package.json
├── tsconfig.json
├── config.ts
└── src/
    ├── HtmlLoader.ts
    ├── TreeExtractor.ts
    ├── TreeOutputWriter.ts
    ├── TreeRawCsvReader.ts
    ├── ScopeCandidateBuilder.ts
    ├── ScopeResolver.ts
    ├── ScopeOutputWriter.ts
    └── dom_tree_ast_types.ts
```

設定は今後`playwright/config/config.ts`へ集約する。設定項目の内容は本書では確定しない。現在の`dom_tree_ast/config.ts`は現行実装を説明するための参照対象であり、移行完了後の配置ではない。

---

## 3. 実行仕様

### 3.1 npmスクリプト

| コマンド | 内容 |
|---|---|
| `npm run build` | TypeScriptをコンパイルする |
| `npm run start` | コンパイル済みエントリポイントを実行する |
| `npm run dev` | `ts-node`でエントリポイントを実行する |

### 3.2 フェーズ指定

| 指定 | 動作 |
|---|---|
| 指定なし | Phase 1に続けてPhase 2を実行する |
| `--phase=1` | Phase 1のみ実行する |
| `--phase=2` | Phase 2のみ実行する |

現行のPhase 2単独実行では、CSVファイルではなく出力ディレクトリを`TreeRawCsvReader`へ渡すため、ディレクトリ読込エラーとなる。通常の連続実行およびPhase 1単独実行はこの問題の影響を受けない。

### 3.3 現行設定値

| 設定 | 現行値・用途 |
|---|---|
| HTML入力先 | `../results/dom_tree_get` |
| CSV出力先 | `../results/dom_tree_ast` |
| 生DOM CSV名 | `dom_tree_raw.csv` |
| スコープ解決CSV名 | `scope_resolved.csv` |
| 文字コード契約 | UTF-8（BOMなし） |

---

## 4. データモデル

### 4.1 ノード種別

| 値 | 意味 |
|---|---|
| `grouping` | 画面構造を区切り、子要素を保持するノード |
| `operation` | ユーザーが直接操作する末端ノード |

### 4.2 OOMロール

| 値 | 意味 |
|---|---|
| `static_root` | 反復単位ではない静的な操作起点 |
| `current_scope` | 同型の兄弟が反復する、選択可能な操作スコープ |
| `leaf_operation` | ボタン、入力欄、リンク等の末端操作 |

### 4.3 対象タグ

**グルーピングタグ：** `html`、`body`、`main`、`header`、`footer`、`div`、`section`、`article`、`aside`、`nav`、`ul`、`ol`、`li`、`table`、`tbody`、`tr`、`td`、`th`、`form`、`fieldset`

**操作タグ：** `input`、`button`、`select`、`textarea`、`a`

これら以外のタグはCSVノードとして出力しない。ただし、その子孫は現在のグルーピングノードを親として引き続き走査する。

---

## 5. Phase 1：DOMツリー抽出

### 5.1 `HtmlLoader`

1. 設定されたHTMLディレクトリ直下を列挙する。
2. 拡張子が`.html`のファイルだけを対象とする。
3. 各ファイルをUTF-8文字列として読み込む。
4. 個別ファイルの読込に失敗した場合は警告を出し、そのファイルを除外して処理を継続する。
5. サブディレクトリは再帰探索しない。列挙結果の明示的なソートも行わない。

画面名にはHTMLのファイル名を用いる。

### 5.2 `TreeExtractor`

`node-html-parser`でHTMLを解析し、グルーピングノードと操作ノードを深さ優先で抽出する。

#### グルーピングノード

- 親パス、タグ名、先頭のCSSクラスを連結して`tagPath`を作る。
- 直接のグルーピング子数、直接の操作子数、配下全体の操作数を集計する。
- ID、class、テキスト、ARIA属性等を抽出する。

#### 操作ノード

- 操作タグを検出した時点で1つの末端ノードとして出力し、その配下は操作ノードとして追加走査しない。
- `tagPath`は親パス、タグ名および走査コンテキスト内の連番から作る。
- 連番は各再帰走査コンテキストで初期化される。このため、透明タグを挟んだ別の枝に同種操作タグがある場合、同じ`tagPath`になる可能性がある。

### 5.3 意味情報の抽出

操作を説明する`semanticText`は次の優先順で最初に取得できた値を採用する。

| 優先順 | `semanticSource` | 内容 |
|---:|---|---|
| 1 | `aria-label` | `aria-label`属性 |
| 2 | `label` | 対応する`label`要素の文字列 |
| 3 | `aria-labelledby` | 参照先要素の文字列 |
| 4 | `placeholder` | `placeholder`属性 |
| 5 | `title` | `title`属性 |
| 6 | `descendant-title` | 子孫のSVG等にある`title`要素 |
| 7 | `text` | 要素自身の表示文字列 |
| 8 | `name` | `name`属性 |
| 9 | `data-testid` | `data-testid`属性 |
| 10 | `descendant-data-testid` | 子孫の`data-testid`属性 |

テキストは連続空白を1文字へ正規化し、最大120文字に切り詰める。`contextText`には最も近い`li`または`tr`の文字列を用い、対象操作自身の文字列を除外する。

### 5.4 `dom_tree_raw.csv`

| 区分 | 列 |
|---|---|
| 識別・構造 | `screenName`, `tagPath`, `depth`, `tagName`, `classAttr`, `idAttr` |
| 子要素集計 | `directGroupingChildCount`, `containedOperationTagCount`, `directOperationTagCount` |
| ノード | `nodeType`, `textContent` |
| 属性 | `roleAttr`, `ariaLabel`, `nameAttr`, `typeAttr`, `placeholderAttr`, `titleAttr`, `hrefAttr`, `dataTestIdAttr` |
| 意味情報 | `labelText`, `ariaLabelledByText`, `semanticText`, `semanticSource`, `descendantTitleText`, `descendantDataTestIdAttr`, `contextText` |

`TreeOutputWriter`は全項目をCSVエスケープし、UTF-8（BOMなし）で出力する。出力ディレクトリがなければ作成する。

---

## 6. Phase 2：スコープ解決

### 6.1 `TreeRawCsvReader`

- CSVの引用符、区切り文字および引用符内改行を解釈する。
- 文字列欠損は空文字、数値欠損・不正値は`0`とする。
- 未知の`nodeType`は`grouping`として扱う。
- 未知の`semanticSource`は`null`として扱う。

### 6.2 `ScopeCandidateBuilder`

グルーピングノードが次のいずれかを満たす場合に候補とする。

- `directOperationTagCount >= 2`
- `containedOperationTagCount >= 2`かつ`directGroupingChildCount <= 1`

候補の操作数は`directOperationTagCount`と`containedOperationTagCount`の大きい方とする。構造シグネチャはタグ名、class、直接グルーピング子数、直接操作数および配下操作数で構成する。

### 6.3 `ScopeResolver`

1. 画面名と`tagPath`でノードを代表化する。同一キーが複数ある場合は先頭ノードを使う。
2. 画面名、親パスおよび構造シグネチャが同じ候補を反復グループとする。
3. 同型兄弟数が2以上なら`current_scope`、1なら`static_root`を付与する。
4. すべての操作ノードへ`leaf_operation`を付与する。
5. 解決済みの最寄り祖先を`parentScopeId`とする。

`scopeId`は`tagPath`のハッシュであり、画面名を含まない。したがって識別には`screenName`と`scopeId`を併用する。同一画面の同型反復構造は同じ`tagPath`と`scopeId`を共有する。

候補には`operationTagCount * 100 + siblingCount`で優先度が計算されるが、現行実装では選別およびCSV出力に使用していない。

### 6.4 `scope_resolved.csv`

| 区分 | 列 |
|---|---|
| スコープ | `screenName`, `scopeId`, `tagPath`, `role`, `parentScopeId`, `repeatGroupSize` |
| DOM・属性 | `tagName`, `textContent`, `roleAttr`, `ariaLabel`, `nameAttr`, `typeAttr`, `placeholderAttr`, `titleAttr`, `hrefAttr`, `dataTestIdAttr` |
| 意味情報 | `labelText`, `ariaLabelledByText`, `semanticText`, `semanticSource`, `descendantTitleText`, `descendantDataTestIdAttr`, `contextText` |

このCSVには生DOM CSVの`idAttr`と`classAttr`を引き継がない。

---

## 7. エラー・制約

| 項目 | 現行仕様 |
|---|---|
| HTML個別読込失敗 | 警告を出し、残りのファイルを処理する |
| 入力ディレクトリ障害 | 呼出元へ例外が伝播し、処理を終了する |
| CSV形式不正 | 欠損値を既定値へ寄せて読み進める場合がある |
| 操作パス連番 | 透明タグをまたぐ枝で衝突する可能性がある |
| 重複ノード代表化 | 同一画面・同一パスの先頭行だけで候補構造を判定する |
| 最小スコープ | 条件を満たす祖先候補をすべて残し、最小候補への絞込みは行わない |
| テスト | 自動テストは未整備 |

---

## 8. 未実装項目

本節はPlaywright設計に対する未実装範囲を示す。現行処理の欠陥一覧ではなく、後続工程を含む完成形との差分である。

| No. | 未実装項目 | Playwright設計上の目的 | 現在の状態 |
|---:|---|---|---|
| 1 | 共通設定の集約 | DOM取得、DOM解析、コード生成で同一設定を参照する | `playwright/config/config.ts`への配置方針のみ決定。項目内容は未決定 |
| 2 | Phase 2単独実行の入力解決 | 保存済み生DOM CSVからスコープ解決だけを再実行する | ディレクトリをCSVとして開くため実行不可 |
| 3 | 操作ノードパスの一意化 | 異なるDOM枝の操作を安定して識別する | 再帰コンテキストごとの連番で衝突し得る |
| 4 | 最小操作スコープの確定 | 操作に必要な最小の`static_root`または`current_scope`だけを採用する | 条件一致した祖先候補を保持する段階 |
| 5 | 候補優先度の適用 | 複数候補から適切なスコープを決定する | スコアは計算するが未使用 |
| 6 | 画面単位で一意なスコープ識別 | 異なる画面間のID衝突を避けて結合する | `scopeId`は`tagPath`だけから生成 |
| 7 | 画面隣接・遷移情報の生成 | 操作前後の物理画面を関連付ける | HTML単体解析のみ |
| 8 | Page Object生成用中間モデル | scope・operationをTypeScriptコードへ変換可能にする | CSV出力まで実装 |
| 9 | Page Objectコード生成 | OOMの3層構造に沿うpagesコードを生成する | 未着手 |
| 10 | spec・データ・fixture生成 | 呼出し中心のspecと入力データを生成する | 未着手 |
| 11 | 生成結果の機械検証 | 型検査、locator妥当性、参照整合性を確認する | ビルド以外の検証処理なし |
| 12 | 自動テスト | 抽出規則、CSV、反復判定を回帰検証する | テストコードなし |

