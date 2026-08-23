# react_ui_element ツール詳細設計書

## 1. 文書概要

| 項目 | 内容 |
|---|---|
| システム名 | ast-tools（テスト自動化基盤用静的解析ツール群） |
| ツール名 | react_ui_element |
| 対象 | React / TypeScript / TSXソース |
| 実行環境 | Node.js、TypeScript |
| 主要依存 | ts-morph |
| 配置 | `React/react_ui_element/` |
| 共通設定 | `React/config.ts` |
| 出力先 | `React/results/` |
| 出力文字コード | UTF-8（BOMなし） |
| 設計書の基準 | 現行実装と、共通config移行後のビルド構成 |

## 2. ツール概要

### 2.1 目的

ReactアプリケーションのTSXをASTで静的解析し、画面内の操作対象UI要素とその属性を抽出する。抽出結果にラベル、入力制約、状態、スコープ、鏡軸分類、Playwrightメソッド接頭辞を付与し、次の工程に渡す。

- テスト仕様の入力項目・境界値候補の作成
- DOM取得およびDOMツリー解析の静的入力情報
- Playwright Page Objectのロケーター・操作メソッド設計
- SQLiteまたは他ツールによる統合処理

本ツールの出力はレンダリング後の実DOMではなく、ソースコードから得られる静的事実と推定値である。

### 2.2 実行方式

コマンドライン引数は使用せず、`React/config.ts`の設定を参照する。対象アプリケーションの起動は不要である。

## 3. 対象範囲

### 3.1 入力対象

- `TARGET_APP_DIR`配下の`.ts`および`.tsx`
- `TARGET_DIR_PATTERNS`のいずれかをパスに含むファイル
- `NATIVE_TARGET_TAGS`に定義されたネイティブHTMLタグ
- `CUSTOM_COMPONENT_MAP`に定義されたUIコンポーネント
- return式配下のJSX要素と属性

### 3.2 出力値の性質

リテラルから取得できる値は実値として出力し、実行時にのみ決定するprops、state、変数、条件分岐の全組合せは静的に確定できる範囲のみ扱う。

## 4. ディレクトリ構成

```text
React/
├── config.ts
├── results/
└── react_ui_element/
    ├── main.ts
    ├── package.json
    ├── tsconfig.json
    └── src/
        ├── types.ts
        ├── ComponentParser.ts
        ├── ElementExtractor.ts
        ├── LabelResolver.ts
        ├── ScopeAnalyzer.ts
        ├── MirrorAxisMapper.ts
        └── UiElementOutputWriter.ts
```

`react_ui_element/config.ts`は使用せず、最終構成では削除する。`main.ts`は`../config`、`src`配下は`../../config`を参照する。

## 5. 共通設定仕様

| 設定名 | 用途 |
|---|---|
| `TARGET_APP_DIR` | 解析対象Reactアプリのルートディレクトリ |
| `TARGET_APP_NAME` | JSONおよびMarkdownのアプリ名 |
| `DEFAULT_OUTPUT_DIR` | 2ツール共通の`React/results/`。出力ファイル名は競合しない |
| `TARGET_DIR_PATTERNS` | 解析対象ファイルのパス絞り込み |
| `NATIVE_TARGET_TAGS` | 抽出対象のHTMLタグ |
| `CUSTOM_COMPONENT_MAP` | カスタムUIコンポーネントと鏡軸・Playwright操作の対応 |
| `CustomComponentDef` | `CUSTOM_COMPONENT_MAP`の型 |
| `CSV_ENCODING` | `utf-8`（BOMなし） |
| `UI_ELEMENTS_CSV_FILENAME` | UI要素CSVのファイル名 |
| `UI_ELEMENTS_JSON_FILENAME` | UI要素JSONのファイル名 |
| `UI_ELEMENTS_MD_FILENAME` | UI要素Markdownのファイル名 |

`DEFAULT_OUTPUT_DIR`は、ts-node実行時とコンパイル後実行時のどちらでも`React/results/`を指すよう、共通config内で`__dirname`を基準に解決する。

## 6. モジュール設計

| モジュール | 責務 |
|---|---|
| `main.ts` | 6工程の呼出しと戻り値判定 |
| `ComponentParser` | 対象ディレクトリパターンに合致するコンポーネントの収集 |
| `ElementExtractor` | JSXから対象UI要素と生属性を抽出 |
| `LabelResolver` | 複数のラベル候補から`labelText`を決定 |
| `ScopeAnalyzer` | 要素の親スコープ単位のグループと件数を付与 |
| `MirrorAxisMapper` | 要素種類から鏡軸分類とPlaywrightメソッド接頭辞を付与 |
| `UiElementOutputWriter` | JSON、CSV、Markdownの出力 |

## 7. 処理フロー

| 工程 | 処理 | 主な出力 |
|---:|---|---|
| 1 | 対象ファイルを再帰収集し、パターで絞り込む | `ComponentInfo[]` |
| 2 | return式内のJSXから要素と属性を抽出 | `Map<string, RawElement[]>` |
| 3 | 優先順位に従って`labelText`を解決 | `Map<string, ResolvedElement[]>` |
| 4 | formまたは直近の親スコープでグループ化 | `Map<string, ScopedElement[]>` |
| 5 | 鏡軸分類とPlaywright操作情報を付与 | `Map<string, UiElement[]>` |
| 6 | 3形式で出力 | JSON、CSV、Markdown |

## 8. 主要データ型

| 型 | 追加される情報 | 作成モジュール |
|---|---|---|
| `ComponentInfo` | `filePath`, `componentName` | `ComponentParser` |
| `RawElement` | 識別、ラベル候補、制約、状態、ARIA、動的生成、親スコープ、行番号 | `ElementExtractor` |
| `ResolvedElement` | `labelText`, `labelUnresolved` | `LabelResolver` |
| `ScopedElement` | `siblingCount`, `scopeGroupId` | `ScopeAnalyzer` |
| `UiElement` | `interactionType`, `mirrorAxisX`, `playwrightMethodPrefix` | `MirrorAxisMapper` |
| `ModuleResult<T>` | `errorCode`, `data`, `message` | 全モジュール |

`InteractionType`は`text_input`、`binary_input`、`selection_input`、`file_input`、`navigation_trigger`、`pseudo_trigger`、`unknown`の7種類である。

## 9. 詳細処理仕様

### 9.1 コンポーネント収集

`TARGET_APP_DIR`配下を再帰的に走査し、`node_modules`を除外する。`.ts`または`.tsx`のうち、ファイルパスが`TARGET_DIR_PATTERNS`のいずれかを含むものを採用する。ファイル名の拡張子を除いた値を`componentName`とする。

### 9.2 UI要素抽出

ts-morphで各コンポーネントの`ReturnStatement`を取得し、JSXを再帰走査する。`JsxOpeningElement`または`JsxSelfClosingElement`のタグ名が対象タグもしくはカスタム定義に合致した場合に抽出する。同一ASTノードの二重抽出はノード位置による識別で防止する。

`.map()`、`.filter()`、`.forEach()`のコールバック内の要素は`isDynamic=true`とする。子要素テキスト、リテラル属性、条件式のテキスト、MUI系の`inputProps`内にある`min`、`max`、`minLength`、`maxLength`を抽出する。

`isHidden`は`type="hidden"`、`hidden`、`aria-hidden="true"`のいずれかで真とする。親スコープは祖先をたどり、対象スコープタグのうち最初に見つかる要素を使用する。見つからない場合は`parentScopeTag="root"`とする。

### 9.3 ラベル解決

`labelText`は次の順序で最初に得られた値を使用する。

1. `aria-label`
2. `labelProp`（MUI等の`label`属性、抽出段階で子要素文字列を候補として使用する場合を含む）
3. `placeholder`
4. `title`
5. `null`

`labelText`が解決できず、`ariaLabelledBy`または`htmlFor`が存在する場合は`labelUnresolved=true`とする。

### 9.4 スコープ解析

`formId`を持つ要素は`formId`でグループ化する。それ以外は直近の`parentScopeTag` + `parentScopeClass`でグループ化する。同一グループの要素数を`siblingCount`とする。2要素以上のグループにはコンポーネント名とグループキーから生成した8文字の`scopeGroupId`を付与し、1要素の場合は`null`とする。

### 9.5 鏡軸・Playwright操作マッピング

`CUSTOM_COMPONENT_MAP`に一致する場合は設定値を最優先する。一致しない場合は、タグ、`typeAttr`、`roleAttr`、`isMultiple`から次の種別を決定する。

| 対象 | `interactionType` | `mirrorAxisX` | `playwrightMethodPrefix` |
|---|---|---|---|
| checkbox | `binary_input` | `input_checkbox` | `check` |
| radio | `binary_input` | `input_radio` | `check` |
| file（single / multiple） | `file_input` | `input_file_single` / `input_file_multiple` | `input` |
| submit / image input | `navigation_trigger` | `button_submit` | `submit` |
| その他のinput | `text_input` | `text_input` | `input` |
| textarea | `text_input` | `textarea_multiline` | `input` |
| select（single / multiple） | `selection_input` | `select_single` / `select_multiple` | `input` |
| button（submit） | `navigation_trigger` | `button_submit` | `submit` |
| button（reset / 通常） | `navigation_trigger` | `button_normal` | `click` |
| a（hrefあり） | `navigation_trigger` | `anchor_link` | `click` |
| a（hrefなし） | `pseudo_trigger` | `pseudo_trigger` | `click` |
| role=button | `pseudo_trigger` | `div_button` | `click` |
| 上記以外 | `unknown` | `unknown` | `click` |

## 10. 出力仕様

### 10.1 出力ファイル

| ファイル | 形式 | 内容 |
|---|---|---|
| `ui_elements.json` | JSON | アプリ名とコンポーネント別UI要素。`filePath`はファイル名のみに正規化 |
| `ui_elements.csv` | CSV | 全UI要素を52列にフラット化 |
| `ui_elements.md` | Markdown | コンポーネント別・スコープ別の一覧 |

すべて`React/results/`へUTF-8（BOMなし）で出力する。CSVはカンマ、改行またはダブルクォートを含む値をダブルクォートで囲み、内部のダブルクォートを2重化する。

### 10.2 CSV列定義

| グループ | 列数 | 列順 |
|---|---:|---|
| A. 識別・位置 | 9 | `screenName`, `lineNumber`, `tag`, `idAttr`, `nameAttr`, `classNameAttr`, `dataTestId`, `typeAttr`, `roleAttr` |
| B. ラベル | 8 | `labelText`, `labelUnresolved`, `placeholder`, `title`, `ariaLabel`, `ariaLabelledBy`, `htmlFor`, `labelProp` |
| C. 入力制約 | 9 | `maxLength`, `minLength`, `maxValue`, `minValue`, `step`, `pattern`, `inputMode`, `accept`, `autocomplete` |
| D. 遷移・送信 | 4 | `href`, `target`, `formAction`, `formId` |
| E. 状態・可視性 | 8 | `isRequired`, `isDisabled`, `isReadonly`, `isHidden`, `isMultiple`, `isChecked`, `defaultValue`, `tabIndex` |
| F. アクセシビリティ | 5 | `ariaExpanded`, `ariaControls`, `ariaHaspopup`, `ariaSelected`, `ariaChecked` |
| G. 動的生成・スコープ | 6 | `isDynamic`, `parentScopeTag`, `parentScopeClass`, `parentScopeId`, `siblingCount`, `scopeGroupId` |
| H. Playwright連携 | 3 | `interactionType`, `mirrorAxisX`, `playwrightMethodPrefix` |
| 合計 | 52 | 上記の順序で固定 |

`screenName`には`UiElement.componentName`を出力する。`null`および`undefined`は空セルとする。booleanは`true`または`false`、numberは10進数文字列として出力する。

### 10.3 JSON構造

```json
{
  "appName": "対象アプリ名",
  "screens": {
    "コンポーネント名": [
      {
        "componentName": "コンポーネント名",
        "filePath": "ファイル名.tsx"
      }
    ]
  }
}
```

各要素には`UiElement`の全プロパティを保持し、`filePath`のみベースネームに変換する。

### 10.4 Markdown構造

アプリ名をH1、コンポーネン名をH2、スコープをH3で出力する。`scopeGroupId`がない要素は`lineNumber`単位の単独グループとする。表には`tag`、`typeAttr`、`labelText`、`playwrightMethodPrefix`、`interactionType`、`isRequired`、`isReadonly`、`isHidden`、`isDynamic`、`maxLength`、`pattern`を出力する。

## 11. ログ・エラー処理

| 状況 | 処理 |
|---|---|
| `TARGET_APP_DIR`が存在しない | エラーを返し、`main.ts`が終了コード1で終了 |
| 対象パターに合致するファイルが0件 | エラー終了 |
| 個別コンポーネンの解析失敗 | 警告して対象コンポーネンをスキップ |
| 出力ディレクトリ作成失敗 | エラー終了 |
| JSON、CSV、Markdownの書き込み失敗 | 該当出力のエラーを返し、後続出力を行わない |
| 予期しない例外 | エラーログと終了コード1 |

## 12. ビルド・実行仕様

### 12.1 package.json

| スクリプト | 内容 |
|---|---|
| `npm run build` | `tsc -p tsconfig.json` |
| `npm start` | `node dist/react_ui_element/main.js` |
| `npm run dev` | `ts-node main.ts` |

`main`は`dist/react_ui_element/main.js`を指す。

### 12.2 tsconfig.json

`rootDir`は`..`、`outDir`は`./dist`とし、`../config.ts`、`main.ts`、`src/**/*.ts`をコンパイル対象に含める。これにより共通configとツール本体を同じビルドで生成し、実行ファイルを`dist/react_ui_element/main.js`に配置する。

## 13. 現状の制約

| 制約 | 現行の扱い |
|---|---|
| 解析対象ファル | `.ts`と`.tsx`のうち、設定パターに一致するものに限定 |
| 対象UI要素 | 設定されたネイティブタグとカスタムコンポーネントに限定 |
| 静的値 | 実行時props、state、変数、関数の結果は、静的に評価できなければ空値または既定値となる |
| 条件表示 | 実行時の全表示パターンを保証しない |
| ラベル参照 | `aria-labelledby`と`htmlFor`のID照合は未解決で、`labelUnresolved`により明示 |
| ネストラベル | FormControl / FormLabel等の構造的な紐付けは解決しない |
| スコープ | ソース上の直近親に基づく単層ヒューリスティック |
| 実DOM | MUI等がレンダリング後に生成するDOM階層と状態は本ツールでは確定しない |
| 解析エラー | 個別コンポーネンは警告後にスキップされ、出力が部分的になる可能性がある |

## 14. 今後の課題

| 項目 | 概要 | 必要となる理由 |
|---|---|---|
| React出力の後続接続方式 | CSV / JSONをSQLiteへ取り込むか、後続ツールが直接読むかを定義する | 現状は静的抽出ファイルの生成までで、テスト仕様・DOM・Playwright生成との実行パイプラインが未接続のため |
| 画面識別子の結合規則 | `screenName`と、react_transitionの`fromComponent` / `toComponent` / `screenComponent`、DOMスコープ、Playwright Page Object名を結合する基準を定義する | 各ツールの出力を画面単位で統合するために必要なため |
| ID参照ラベルの解決 | `aria-labelledby`および`htmlFor`の参照先要素を同一コンポーネント内で照合し、`labelText`へ反映する | 列と`labelUnresolved`がすでに定義されており、対象システムで該当記述を使う場合は、テスト項目名を確定するために必要なため |
| SQLite接続を採用する場合の格納設計 | tmpテーブル、本テーブル、`data_tmp_to_*`、importシェル、統合view、空値・boolean・number・センチネルの変換規則を定義する | 52列の意味を崩さず、既存のCSV依存パイプラインに接続する場合に必要なため |

ID参照ラベル解決は、対象システムが`aria-labelledby`または`htmlFor`を使用しない場合、直ちに必須とはならない。一方、対応範囲としてそれらの列を定義し続ける場合は、未解決状態の扱いを後続工程と合わせて決定する必要がある。

## 15. 対象外とする事項

以下は現時点の定義範囲を実現するための必須項目ではないため、今後の課題に含めない。

- 未定義のUIライブラリの自動検出
- 任意のpropsとJavaScript式の完全評価
- レンダリング後DOMの再現（DOM系ツールの責務）
- 多階層DOMスコープの確定（dom_tree_astの責務）
- 多フレームワーク展開
