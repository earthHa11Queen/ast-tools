# react_transition ツール詳細設計書

## 1. 文書概要

| 項目 | 内容 |
|---|---|
| システム名 | ast-tools（テスト自動化基盤用静的解析ツール群） |
| ツール名 | react_transition |
| 対象 | React / TypeScriptソース |
| 実行環境 | Node.js、TypeScript |
| 主要依存 | ts-morph |
| 配置 | `React/react_transition/` |
| 共通設定 | `React/config.ts` |
| 出力先 | `React/results/` |
| 出力文字コード | UTF-8（BOMなし） |
| 設計書の基準 | 現行実装と、共通config移行後のビルド構成 |

## 2. ツール概要

### 2.1 目的

Reactアプリケーションのルート定義と画面遷移記述をASTで静的解析し、以下を生成する。

- 画面間の隣接関係
- 起点からの順行パスと起点への逆行パス
- パスコストによるテスト工程区分
- 直接URL到達の可否によるTier1/Tier2区分
- Tier2画面の到達経路とパスグループ
- 未解決パスとパス数のサマリー

出力は後続のSQLite取込み、テスト仕様生成、DOM取得、Playwright Page Object生成で使用する画面遷移情報として位置付ける。

### 2.2 実行方式

コマンドライン引数は使用せず、`React/config.ts`の設定を参照する。対象アプリケーションの起動は不要である。

## 3. 対象範囲

### 3.1 入力対象

- `TARGET_APP_DIR`配下の`.ts`および`.tsx`
- JSXによるルート定義
- オブジェクト設定型のルート定義
- `PAGES_ROOT_DIR`と`PAGE_FILE_PATTERNS`によるファイルベースルーティング
- `navigate(...)`
- `window.location.href = ...`
- `<Link to="...">`
- `window.open(...)`
- `navigate(-1)`等の数値引数呼出し

### 3.2 解析方針

解析可能な静的文字列とテンプレートリテラルの静的部分を対象とする。クエリ文字列はパス解決前に除外する。

## 4. ディレクトリ構成

```text
React/
├── config.ts
├── results/
└── react_transition/
    ├── main.ts
    ├── package.json
    ├── tsconfig.json
    └── src/
        ├── types.ts
        ├── RouteDefinitionParser.ts
        ├── JsxRouteParser.ts
        ├── ObjectConfigRouteParser.ts
        ├── FileBasedRouteParser.ts
        ├── TransitionExtractor.ts
        ├── AdjacencyTableBuilder.ts
        ├── PathTableBuilder.ts
        ├── PathCostClassifier.ts
        ├── TierClassifier.ts
        ├── AdjacencyOutputWriter.ts
        └── ReachabilityOutputWriter.ts
```

`react_transition/config.ts`は使用せず、最終構成では削除する。`main.ts`は`../config`、`src`配下は`../../config`を参照する。

## 5. 共通設定仕様

| 設定名 | 用途 |
|---|---|
| `TARGET_APP_DIR` | 解析対象Reactアプリのルートディレクトリ |
| `TARGET_APP_NAME` | JSONサマリーのアプリ名 |
| `DEFAULT_OUTPUT_DIR` | 2ツール共通の`React/results/`。出力ファイル名は競合しない |
| `START_PATH` | 順行パスの起点および逆行パスの到達点 |
| `PAGES_ROOT_DIR` | ファイルベースルーティングのページルート |
| `PAGE_FILE_PATTERNS` | ページファイル名の候補 |
| `MAX_PATH_MULTIPLIER` | パス展開の打ち切り閾値を画面数から算出する乗数 |
| `CSV_ENCODING` | `utf-8`（BOMなし） |
| 出力ファイル名定数 | 出力仕様の5ファイル名 |

`DEFAULT_OUTPUT_DIR`は、ts-node実行時とコンパイル後実行時のどちらでも`React/results/`を指すよう、共通config内で`__dirname`を基準に解決する。

## 6. モジュール設計

| モジュール | 責務 |
|---|---|
| `main.ts` | 9工程の呼出しと戻り値判定 |
| `RouteDefinitionParser` | 3種類のルート解析結果の統合と重複除去 |
| `JsxRouteParser` | JSXルート定義の解析 |
| `ObjectConfigRouteParser` | オブジェクト設定型ルートの解析 |
| `FileBasedRouteParser` | ページファイルとパスの対応付け |
| `TransitionExtractor` | ソースから遷移エッジを抽出 |
| `AdjacencyTableBuilder` | ノードとエッジを結合し隣接テーブルを生成 |
| `PathTableBuilder` | 順行・逆行パス展開、閾値判定、葉と固有の最長パスの抽出 |
| `PathCostClassifier` | パスコストによるテスト工程区分の付与 |
| `TierClassifier` | Tier1/Tier2判定、経由パス、パスグループの付与 |
| `AdjacencyOutputWriter` | 隣接CSV、パスCSV、JSONサマリーの出力 |
| `ReachabilityOutputWriter` | 画面到達性CSVの出力 |

## 7. 処理フロー

| 工程 | 処理 | 主な出力 |
|---:|---|---|
| 1 | ルート定義を3ストラテジーで解析 | `NodeInfo[]` |
| 2 | 全対象ソースから遷移記述を抽出 | `EdgeInfo[]` |
| 3 | 遷移元・遷移先をルートと照合 | `AdjacencyRow[]` |
| 4 | `START_PATH`起点の順行パスを1ホップずつ展開 | 順行`PathRow` |
| 5 | 葉に到達する重複のない累積パスを抽出 | 固有の最長パス |
| 6 | 隣接関係を反転し、`START_PATH`起点として逆行パスを展開 | 逆行`PathRow` |
| 7 | 順行・逆行パスに工程区分を付与 | `ClassifiedPathRow[]` |
| 8 | 画面ごとの到達性と経由パスを判定 | `ReachabilityRow[]` |
| 9 | CSVおよびJSONを出力 | 5ファイル |

## 8. 主要データ型

| 型 | 主な値 | 意味 |
|---|---|---|
| `NodeInfo` | `path`, `normalizedPath`, `componentName`, `sourceStrategy`, `hasDynamicSegment` | ルートと画面コンポーネントの対応 |
| `EdgeInfo` | `sourceFile`, `toPath`, `transitionType` | ソース上の遷移事実 |
| `AdjacencyRow` | `fromPath`, `fromComponent`, `toPath`, `toComponent`, `sourceFile`, `transitionType` | 解決後の画面間エッジ |
| `PathRow` | `cost`, `fromPath`, `toPath`, `path` | ホップごとのパス。`path`は全角縦線`｜`区切りの累積パス |
| `ClassifiedPathRow` | `PathRow` + `testPhase` | テスト工程区分付きパス |
| `ReachabilityRow` | 画面、Tier、URL、経由パス、グループID | 画面ごとの到達方法 |
| `ModuleResult<T>` | `errorCode`, `data`, `message` | モジュール間の結果受け渡し |

## 9. 詳細処理仕様

### 9.1 ルート統合

同一`path`が複数の解析方式から得られた場合、`jsx` > `object-config` > `file-based`の順で採用する。一部のストラテジーが解析できなくても、1件以上のノードを得られた場合は処理を継続する。

### 9.2 遷移先抽出

- 文字列リテラルは`「/」`始まりの値のみ抽出する。
- テンプレート式は動的式より前の静的パスを使用する。
- 変数、関数戻り値、その他の式は抽出しない。
- `navigate(-1)`等の数値引数は`toPath="__back__"`、`transitionType="navigate.back"`とする。

### 9.3 隣接テーブル構築

遷移先は完全一致、`normalizedPath`一致、正規化パスの最長前方一致の順で解決する。遷移元ファイルがルート定義ノードに対応しない場合は`fromPath="__common__"`とする。`Header`の共通遷移は起点画面からのエッジとして追加展開する。

同一`fromPath` + `toPath`は1件に重複除去する。そのため、同一画面間に複数の記述方式があっても、隣接関係としては1行となる。

### 9.4 センチネル値

| 値 | 使用箇所 | 意味 |
|---|---|---|
| `__common__` | `fromPath` | ルート画面に直接対応しない共通コンポーネントからの遷移 |
| `__unresolved__` | `toComponent` | 遷移先パスとルート定義を照合できなかった状態。警告対象 |
| `__back__` | `toPath`, `toComponent` | ブラウザ履歴に依存する遷移。解決失敗ではなく意図的な未解決 |
| `-1` | 内部`PathRow.cost` | 展開閾値を超えた枝の打ち切り |
| `MAX-OVER` | パスCSVの`cost` | 内部値`-1`の表示用文字列 |

### 9.5 パス展開と葉抽出

順行パスは`START_PATH`を起点に1ホップずつ展開する。直前ホップの起点へ戻るエッジは除外するが、単純パス制約は設けず、それ以外の再訪は許容する。同一遷移パターンが3回以上現れた場合は警告する。

閾値は、`__common__`と`__back__`を除く画面数 × `MAX_PATH_MULTIPLIER`である。閾値を超えて展開が続く枝のみ`cost=-1`として打ち切る。

葉は、遷移先パス集合から、起点への回帰を除いた遷移元パス集合を差し引いて求める。葉に到達する`cost!=-1`の累積パスを`path`文字列で重複除去したものを「独立した固有の最長パス」とする。ここでいう最長は全体最大コストではなく、それ以上展開できない葉までの経路を意味する。

### 9.6 テスト工程区分

| 条件 | `testPhase` |
|---|---|
| `cost == 0` | `単体テスト` |
| `cost == maxCost` | `総合テスト` |
| その他 | `結合テスト` |

`cost=-1`は`maxCost`の算出対象外だが、現行の分類式では「その他」として結合テストが付与される。CSVではコストのみ`MAX-OVER`に変換される。

### 9.7 Tier判定

ルート定義に画面コンポーネントが存在する場合はTier1、存在しない場合はTier2とする。Tier2の`viaPath`は、まず固有の最長パスから割り当て、該当しない画面のみBFSで最短経路を求める。最長パス由来の場合は共通`pathGroupId`を付与し、BFS由来の場合は`null`とする。

## 10. 出力仕様

### 10.1 出力ファイル

| ファイル | 形式 | 内容 |
|---|---|---|
| `adjacency_table.csv` | CSV | 画面間の直接遷移 |
| `path_forward.csv` | CSV | 起点からのコスト別順行パス |
| `path_reverse.csv` | CSV | 起点へのコスト別逆行パス |
| `path_summary.json` | JSON | 最大コスト、工程別件数、未解決パス |
| `screen_reachability.csv` | CSV | 画面ごとのTierと到達方法 |

すべて`React/results/`へUTF-8（BOMなし）で出力する。CSVはカンマ、改行またはダブルクォートを含む文字列をダブルクォートで囲み、内部のダブルクォートを2重化する。

### 10.2 CSV列

| ファイル | 列順 |
|---|---|
| `adjacency_table.csv` | `fromPath, fromComponent, toPath, toComponent, sourceFile, transitionType` |
| `path_forward.csv` | `cost, fromPath, toPath, testPhase` |
| `path_reverse.csv` | `cost, fromPath, toPath, testPhase` |
| `screen_reachability.csv` | `screenComponent, tier, url, hasDynamicSegment, viaPath, viaPathCost, sourceStrategy, pathGroupId` |

`viaPath`はコンポーネント名列を半角縦線`|`で連結する。内部`PathRow.path`の区切りは全角縦線`｜`であり、両者は別の値である。

### 10.3 JSON構造

`path_summary.json`は`appName`、`startPath`、`maxCost`、`forward`、`reverse`、`unresolvedPaths`を持つ。`forward`と`reverse`は`total`、`単体テスト`、`結合テスト`、`総合テスト`の件数を持つ。

## 11. ログ・エラー処理

| 状況 | 処理 |
|---|---|
| `TARGET_APP_DIR`が存在しない | エラーを返し、`main.ts`が終了コード1で終了 |
| 3ルート解析方式の結果がすべて0件 | エラー終了 |
| 一部のルート解析方式のみ失敗 | 他方式の結果があれば継続 |
| 個別ソースの遷移解析に失敗 | 警告して対象ファイルをスキップ |
| 遷移先ルートを解決できない | `__unresolved__`として出力し、警告 |
| `navigate.back` | 正常データとして`__back__`を出力。警告しない |
| `START_PATH`からの初期エッジがない | パス構築エラー |
| パス展開が閾値を超える | 対象枝を打ち切り、警告して処理継続 |
| Tier2の経路が最長パスとBFSの両方で見つからない | `viaPath=null`として警告 |
| 出力ディレクトリ作成または出力失敗 | エラー終了 |
| 予期しない例外 | エラーログと終了コード1 |

## 12. ビルド・実行仕様

### 12.1 package.json

| スクリプト | 内容 |
|---|---|
| `npm run build` | `tsc -p tsconfig.json` |
| `npm start` | `node dist/react_transition/main.js` |
| `npm run dev` | `ts-node main.ts` |

`main`は`dist/react_transition/main.js`を指す。

### 12.2 tsconfig.json

`rootDir` は`..`、`outDir`は`./dist`とし、`../config.ts`、`main.ts`、`src/**/*.ts`をコンパイル対象に含める。これにより共通configとツール本体を同じビルドで生成し、実行ファイルを`dist/react_transition/main.js`に配置する。

## 13. 現状の制約

| 制約 | 現行の扱い |
|---|---|
| 静的に確定できないURL | 変数、関数呼出し、複合式は抽出しない |
| テンプレートリテラル | 最初の動的式より前の静的部分をパスとして扱う |
| ルート方式 | 実装済みのJSX、オブジェクト設定、ファイルベースに限定 |
| 遷移記述 | 実装済みの5種類に限定 |
| ブラウザバック | 履歴依存のため固定の戻り先は解決しない。これは意図的な仕様 |
| 動的セグメント値 | ルートが動的である事実までを出力し、実際のテスト値は決定しない |
| 循環パス | 再訪を全面禁止せず、画面数×乗数で打ち切る |
| 逆行パス | 反転後の隣接表で`START_PATH`から開始できるエッジが必要 |
| 解析エラー | 個別ファイルは警告後にスキップされ、出力が部分的になる可能性がある |

## 14. 今後の課題

| 項目 | 概要 | 必要となる理由 |
|---|---|---|
| React出力の後続接続方式 | CSVをSQLiteへ取り込むか、後続ツールが直接読むかを定義する | 現状は出力生成までで、テスト仕様・DOM・Playwright生成との実行パイプラインが未接続のため |
| 画面識別子の結合規則 | `fromComponent` / `toComponent` / `screenComponent`と、UI要素の`screenName`、DOMスコープ、Playwright Page Object名を結合する基準を定義する | ASTツール群全体で同一画面を一意に接続するために必要なため |
| 動的セグメントの値受け渡し | `hasDynamicSegment=true`のルートに対し、テストデータまたはPlaywright側が値を供給する契約を定義する | 動的ルートを実行可能なURLにする責務は本ツールではないが、後続生成には実値が必要なため |
| SQLite接続を採用する場合の格納設計 | tmpテーブル、本テーブル、`data_tmp_to_*`、importシェル、統合view、空値とセンチネルの変換規則を定義する | React CSVの意味を崩さず、既存のCSV依存パイプラインに接続する場合に必要なため |

## 15. 対象外とする事項

以下は現時点の定義範囲を実現するための必須項目ではないため、今後の課題に含めない。

- 未定義のルーターへの網羅的対応
- 任意のJavaScript式を実行・評価する動的URL解決
- ブラウザ履歴からの`navigate.back`戻り先推定
- 多フレームワーク展開
- 「将来使うかもしれない」ことだけを理由とする抽出列の追加
