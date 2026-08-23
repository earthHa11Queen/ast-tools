# ツール詳細設計書

- システム名：AST-TOOLS
- ツール名：dom_playwright
- 作成日：2026-08-14
- 対応言語：TypeScript 6／Playwright 1.62
- 配置場所：playwright/dom_playwright/
- パッケージ：result-playwright 0.1.0

---

## 1. 概要

### 1.1 目的

Playwrightを利用して対象アプリケーションの画面を操作し、DOM解析用HTMLを取得する。また、OOM（Object Operation Model）に基づくPage Object、テストコード、テストデータ、fixtureおよびエビデンス処理を格納する実行基盤となる。

現時点ではDOM取得フロー、1画面分のPage Object試作およびPlaywrightの基本設定までを実装している。その他のディレクトリは今後の生成物を受け入れる骨格であり、現在積極開発中の完成済み機能を表すものではない。

### 1.2 運用上の位置づけ

- ASTリポジトリ側でPlaywright成果物を生産する。
- 生産が完了したPage Object、spec、データ等は、JUnit成果物と同様に利用先アプリケーションのリポジトリへコピーして使用する。
- コピー後の修正を抑えるため、共通設定は`playwright/config/config.ts`へ集約する方針とする。
- `playwright/config/config.ts`の設定項目と値は現時点では確定しない。
- `dom_playwright`自身は将来の開発対象だが、本書では現在実装されている範囲と未実装範囲を分けて記載する。

### 1.3 OOMの基本構造

| 層 | 役割 | 現行Page Objectでの対応例 |
|---|---|---|
| Static Root | 画面内で固定された操作起点 | `#root` |
| Current Scope | 一覧行・カード等、選択後に操作対象となる反復領域 | 接続設定カード |
| Operation | rootまたはcurrent scope配下の末端操作 | 新規接続、接続、編集、トップへ戻る |

---

## 2. ディレクトリ構成

```text
playwright/dom_playwright/
├── package.json
├── tsconfig.json
├── playwright.config.ts
├── config.ts                         ← 現行参照先
├── config/                           ← 現行の重複設定・サンプル
├── tools/
│   └── dom-get/
│       ├── main.ts
│       └── src/result_exporter.ts
├── playwright/
│   ├── common/
│   ├── pages/
│   │   └── DBExcelEditorTopPage.ts
│   ├── utils/
│   │   ├── data/
│   │   ├── evidence/
│   │   ├── file/
│   │   ├── logs/
│   │   └── server/
│   └── values/
│       └── commonValues.ts
├── fixtures/
├── test-data/
├── tests/
│   ├── example.spec.ts
│   ├── unit/screen/
│   ├── integration/screen/
│   └── system/screen/
├── evidence/
│   ├── formats/
│   └── results/
├── reports/
└── ai-data/
    ├── claude-code/
    ├── format/
    ├── input/
    ├── output/
    └── plan/
```

`common`、`utils`、`fixtures`、`test-data`、テスト階層、`evidence`および`ai-data`の大半は空ディレクトリ維持用ファイルのみであり、処理本体は実装されていない。

### 2.1 設定配置方針

最終的な共通設定は次の位置に置く。

```text
playwright/config/config.ts
```

ルート直下には置かない。現行のルート`config.ts`、`config/config.ts`および`config/config.sample.ts`は移行対象である。設定項目、型、初期値および利用先別の公開方法は未決定のため、本書では新しい`config.ts`の内容を定義しない。

---

## 3. ビルド・実行仕様

### 3.1 npmスクリプト

| コマンド | 内容 |
|---|---|
| `npm run build` | `tsc -p tsconfig.json`で全TypeScriptをコンパイルする |
| `npm run dom:get` | `ts-node tools/dom-get/main.ts`でHTMLを取得する |
| `npm run test` | Playwright Testを実行する |
| `npm run playwright:install` | Chromiumをインストールする |

### 3.2 TypeScript設定

| 項目 | 現行値 |
|---|---|
| 出力対象 | ES2022 |
| モジュール | CommonJS |
| 厳格型検査 | 有効 |
| ソースルート | プロジェクトルート |
| 出力先 | `dist/` |
| 対象 | `config`、`playwright`、`fixtures`、`tests`、`tools`、`playwright.config.ts` |
| 除外 | `node_modules`、`dist`、`reports`、`evidence` |

### 3.3 Playwright Test設定

| 項目 | 現行値・動作 |
|---|---|
| テストディレクトリ | `./tests` |
| 完全並列実行 | 無効 |
| `test.only` | CIでは禁止 |
| リトライ | CIは2回、ローカルは0回 |
| worker | CIは1、ローカルはPlaywright既定 |
| レポーター | HTML |
| タイムアウト | 現行設定の`DEFAULT_TIMEOUT` |
| Base URL | 現行設定の`BASE_URL` |
| ヘッドレス | 現行設定の`DEFAULT_HEADLESS` |
| trace | 最初のリトライ時に取得 |
| ブラウザ | Chromium／Desktop Chromeのみ |

---

## 4. DOM取得ツール

### 4.1 対象ファイル

| ファイル | 役割 |
|---|---|
| `tools/dom-get/main.ts` | ブラウザ起動、画面遷移、Page Object操作、HTML取得 |
| `tools/dom-get/src/result_exporter.ts` | 出力先作成、ファイル名正規化、HTML保存 |

### 4.2 `main.ts`処理フロー

1. HTML出力ディレクトリの存在を確認し、必要なら再帰作成する。
2. 現行設定のヘッドレス指定でChromiumを起動する。
3. 新しい`Page`を作り、既定タイムアウトを設定する。
4. `BASE_URL`へ移動し、`networkidle`を待つ。
5. `DBExcelEditorTopPage`を生成する。
6. `setInitialization()`を呼び出す。
7. `clickNewConnectionSetting()`を呼び出す。
8. 遷移後の`networkidle`を待つ。
9. 画面の`page.content()`を1件取得してHTML保存する。
10. `finally`でブラウザを終了する。

現行実装は対象アプリケーション固有の1経路を固定的にたどる試作である。画面遷移を網羅する汎用クローラーではない。

`setInitialization()`と`clickNewConnectionSetting()`のboolean結果は確認していないため、Page Object内で失敗しても後続のHTML取得まで進む可能性がある。

### 4.3 HTML出力仕様

| 項目 | 仕様 |
|---|---|
| 内容 | `page.content()`が返す現在画面のHTML |
| 画面名 | ページタイトルをtrimし、`-p{連番}`を付加 |
| タイトルなし | `screen-p{連番}` |
| ファイル名禁止文字 | `\\ / : * ? \" < > |`を`_`へ置換 |
| 空白 | 連続空白を`_`へ置換 |
| 空の画面名 | `unknown_screen_{JSTタイムスタンプ}` |
| 拡張子 | `.html` |
| 文字コード | UTF-8（BOMなし） |

通常はページタイトルと連番が同じため、同名ファイルが存在すると上書きする。JSTタイムスタンプは正規化後の画面名が空の場合だけ使用する。

### 4.4 エラー処理

| 発生箇所 | 現行動作 |
|---|---|
| 出力先作成失敗 | エラー表示、終了コード1、DOM取得中断 |
| HTML保存失敗 | 失敗結果を返し、終了コード1を設定 |
| `main`内の未処理例外 | エラー表示、終了コード1を設定 |
| Page Object操作失敗 | Page Objectが`false`を返す。呼出元が未確認のため処理継続の場合あり |
| ブラウザ終了 | `finally`で実行 |

---

## 5. Page Object仕様

### 5.1 `DBExcelEditorTopPage`

対象アプリケーションのトップ画面を表す試作Page Objectである。

#### 保持フィールド

| フィールド | 型 | 内容 |
|---|---|---|
| `page` | `Page` | Playwright Page。コンストラクタで受け取る |
| `staticRoot` | `Locator` | `#root`を指す固定ルート |
| `cardScopes` | `Locator` | `div.MuiContainer-root > div.MuiGrid-root > div.MuiGrid-root`で取得するカード群 |
| `currentScope` | `Locator \| null` | `focusCard`で選択した現在カード |

コンストラクタは`page`の保持に加えてLocatorを初期化する。`setInitialization()`でも同じLocatorを再初期化し、固定ルートの`attached`を待つ。

#### 公開メソッド

| メソッド | 処理 | 戻り値 |
|---|---|---|
| `setInitialization()` | root・カードLocator・current scopeを初期状態へ戻す | 成功`true`、例外`false` |
| `focusCard(index, flag)` | indexのカードをcurrent scopeへ設定する | 範囲内かつattachedなら`true` |
| `clickBackToTop(flag)` | static root内の「トップに戻る」ボタンを押す | 成否boolean |
| `clickNewConnectionSetting(flag)` | static root内の「新規接続設定」ボタンを押す | 成否boolean |
| `clickConnect(index, flag)` | indexカードへfocusし、カード操作領域内の「接続」を押す | 成否boolean |
| `clickEdit(index)` | indexカードへfocusし、カード操作領域内の「編集」を押す | 成否boolean |

`flag=false`の対応メソッドは対象操作を実行せず`true`を返す。各メソッドは例外を外へ投げず、原則booleanで成否を返す。

`clickConnect`と`clickEdit`は内部でカード選択まで行うため、現行実装ではfocus操作と末端操作が完全には分離されていない。

### 5.2 共通センチネル値

| 定数 | 型 | 値 | 用途 |
|---|---|---|---|
| `DONT_INPUT_VALUE` | `any` | `'未指定$$'` | 文字列等の入力処理を行わないことを表す |
| `DONT_INPUT_NUMBER` | `number` | `-1` | 数値入力・選択を行わないことを表す |

入力値を`any`とする設計は、通常値だけでなく型・境界・異常系の値もPlaywrightから渡す用途を含む。

---

## 6. テストコードの現状

`tests/example.spec.ts`にはPlaywright公式サイトを対象とするサンプルが2件ある。

| テスト | 内容 |
|---|---|
| `has title` | `https://playwright.dev/`のタイトルに`Playwright`が含まれることを確認 |
| `get started link` | Get startedリンクから遷移し、Installation見出しを確認 |

これはPlaywright Testの起動確認用サンプルであり、対象アプリケーション、OOM Page Objectおよび生成データを使用する実運用テストではない。2階層`describe`、`test-`接頭辞、Page Object呼出し専用spec等の設計規則もまだ反映していない。

---

## 7. Playwright成果物の責務

以下は設計上の配置責務である。現行実装が空の場合は第9章に未実装として示す。

| 配置 | 責務 |
|---|---|
| `playwright/pages` | 物理画面単位のPage Object。static root、current scope、operationを保持する |
| `playwright/common` | 複数Page Objectを組み合わせた画面横断シナリオ |
| `playwright/utils` | ファイル、ログ、エビデンス等の画面非依存技術処理 |
| `playwright/values` | センチネル値その他の共通定数 |
| `fixtures` | 標準`test`および拡張fixtureを束ねた`testB`等の提供 |
| `test-data` | specから参照する入力値・期待値 |
| `tests` | Page Object等を呼び出して結果を検証するspec |
| `evidence` | スクリーンショット等の形式と取得結果 |
| `ai-data` | AIへの入力、出力、形式、計画等の補助情報 |

AIはDOM解析・生成処理を補助し、生成結果をレビューする位置づけとする。再現可能なDOM抽出・変換処理を無差別な推測へ置き換えるものではない。

---

## 8. 現行の制約

| 項目 | 現在の状態 |
|---|---|
| 対象画面 | 固定URLから「新規接続設定」へ進んだ1画面のみ取得 |
| URL・出力先 | 現行設定ファイルに固定値として定義 |
| 設定配置 | 同内容の設定ファイルが複数存在 |
| Page Object | 1画面分の試作のみ |
| Locator初期化 | コンストラクタと`setInitialization`の双方で実施 |
| scope分離 | `clickConnect`、`clickEdit`がindexを受けて内部focusする |
| 操作結果 | DOM取得側がboolean結果を確認しない |
| 出力履歴 | 同じタイトル・連番では既存HTMLを上書き |
| テスト | 対象アプリケーションとは無関係のサンプル2件のみ |
| 実行環境 | Chromium 1プロジェクトのみ |

---

## 9. 未実装項目

本ツールは現時点でDOM取得とPage Object構造の試作段階にある。次表はPlaywright設計に準じた今後の実装対象であり、現在積極開発していない機能を含む。

| No. | 未実装項目 | Playwright設計上の仕様 | 現在の状態 |
|---:|---|---|---|
| 1 | 共通設定の再配置 | `playwright/config/config.ts`から各機能が設定を参照する | 配置方針のみ決定。内容は未決定 |
| 2 | 設定の単一化 | ルートやツール内の重複定義をなくす | 同内容の設定が複数存在 |
| 3 | 複数画面DOM取得 | 生成済みPage Objectを使い、必要な物理画面を順次取得する | 1つの固定遷移だけを実装 |
| 4 | DOM取得結果判定 | 各Page Object呼出しのbooleanを集約し、失敗時に誤取得を防ぐ | 戻り値を確認せず後続処理へ進む |
| 5 | DOM取得履歴管理 | 同一画面の取得結果を必要な単位で保持する | 同名ファイルを上書き |
| 6 | 物理画面単位Page Object生成 | DOM解析結果から画面別pagesクラスを生成する | 手書き試作1クラスのみ |
| 7 | Locatorの遅延初期化 | コンストラクタはPage保持に限定し、`setInitialization`でLocatorを設定する | コンストラクタでもLocatorを設定 |
| 8 | focusとoperationの分離 | focusだけがindexを知り、operationは`currentScope`だけを使う | 接続・編集メソッドがindexを受け取る |
| 9 | Static Root操作生成 | 固定領域の操作メソッドをDOM解析結果から生成する | 一部のみ手書き |
| 10 | Current Scope操作生成 | 反復領域のfocusと配下操作を生成する | カード操作の試作のみ |
| 11 | 入力操作生成 | `DONT_INPUT_VALUE`等を使い任意入力値と制御引数を処理する | 入力系メソッドなし |
| 12 | commonシナリオ | 複数ページを横断する共通業務操作を実装する | ディレクトリのみ |
| 13 | utils | data、evidence、file、logs、serverの画面非依存処理を実装する | ディレクトリのみ |
| 14 | fixture | 標準testと拡張fixtureを提供し、Page Object等を注入する | ディレクトリのみ |
| 15 | テストデータ生成 | Page Object引数に対応する正常・境界・異常データを生成する | ディレクトリのみ |
| 16 | OOM準拠spec生成 | 呼出し中心、2階層`describe`、`test-`接頭辞のspecを生成する | 公式サイト用サンプルのみ |
| 17 | boolean集約 | 複数操作の結果を配列へ蓄積し、全件成功を判定する | 共通ラッパーなし |
| 18 | エビデンス取得 | 設計された時点でスクリーンショット等を保存する | ディレクトリのみ |
| 19 | 画面遷移・隣接表との連携 | DOM解析側の画面関係情報からシナリオを組み立てる | 連携データなし |
| 20 | コード生成後検証 | TypeScriptビルド、Locator参照、Page/spec/data整合性を検証する | 手動ビルドのみ |
| 21 | 対象アプリ向け自動テスト | DOM取得、Page Object、fixture、specを回帰検証する | 対象アプリのテストなし |
| 22 | 利用先リポジトリへの移送単位確立 | 必要ファイルをコピーし、最小限の設定変更で実行可能にする | 配置骨格と方針のみ |

