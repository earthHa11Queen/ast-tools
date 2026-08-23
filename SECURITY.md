# Security Policy

## Supported Versions

| Version | Supported |
| --- | --- |
| 0.2.x | ✅ |

---

## Scope

ast-tools is a **local static analysis tool** intended for use in development environments.

- It does **not** run a server, expose any network interface, or handle user authentication.
- It reads source code from a local directory path specified in `config.ts` / `config.json`.
- Output files (JSON, CSV, Markdown) are written to a local directory only.

There is no remote execution, no web-facing endpoint, and no data transmission of any kind.

Note: `Playwright/dom_playwright` uses Playwright to control a browser and therefore
sends HTTP requests to the configured target URL. This communication is limited
to the local or development-environment URL explicitly set by the user.

---

## Dependency License Summary

Versions differ between modules, so dependencies are listed per module.

### Java/java_ast, Java/java_ast_cleaner

| Package | Version | License | Note |
| --- | --- | --- | --- |
| javaparser-core | 3.26.1 | Apache-2.0 OR LGPL-3.0 | **Used under Apache-2.0** |
| jackson-databind | 2.17.1 | Apache-2.0 | Used only for reading config.json (not for output) |

`javaparser-symbol-solver-core` has been removed from the dependency tree,
as fully-qualified return-type resolution is no longer required in the current implementation.

JavaParser is dual-licensed under Apache License 2.0 and LGPL-3.0.
This project explicitly adopts the **Apache License 2.0** for JavaParser.

### Java/java_test_library

| Package | Version | License | Note |
| --- | --- | --- | --- |
| junit-jupiter | 5.10.2 | EPL-2.0 | Test scope only. Not included in any distributed artifact |

### Typescript/typescript_ast

| Package | Version | License |
| --- | --- | --- |
| ts-morph | ^18.0.0 | MIT |
| iconv-lite | ^0.7.2 | MIT |
| typescript | ^5.5.0 | Apache-2.0 |
| ts-node | ^10.9.1 | MIT |

### React/react_transition, React/react_ui_element

| Package | Version | License |
| --- | --- | --- |
| ts-morph | ^18.0.0 | MIT |
| typescript | ^5.5.0 | Apache-2.0 |
| ts-node | ^10.9.1 | MIT |

### Playwright/dom_tree_ast

| Package | Version | License |
| --- | --- | --- |
| ts-morph | ^27.0.0 | MIT |
| iconv-lite | ^0.7.2 | MIT |
| node-html-parser | ^9.0.1 | MIT |
| typescript | ^6.0.0 | Apache-2.0 |
| ts-node | ^10.9.2 | MIT |

### Playwright/dom_playwright

| Package | Version | License |
| --- | --- | --- |
| playwright | ^1.62.1 | Apache-2.0 |
| @playwright/test | ^1.62.1 | Apache-2.0 |
| typescript | ^6.0.0 | Apache-2.0 |
| ts-node | ^10.9.2 | MIT |

### OldVersion/

Dependencies for past versions are frozen as of the time they were archived
and are no longer updated or monitored for vulnerabilities. The source code
is retained solely as a record of past design decisions. Running these
versions is not recommended.

---

## Known Issues

There are currently no known vulnerabilities requiring action.

### Past Resolution (for reference)

An earlier version transitively pulled in `commons-beanutils` / `commons-collections`
via `opencsv`, which carried a known deserialization vulnerability
(CVE-2015-6420 and related) in versions prior to 1.9.4.

This was initially mitigated by pinning the dependency version. A subsequent
implementation change removed the dependency on `opencsv` entirely, so this
dependency path no longer exists in the current codebase.

---

## Reporting a Vulnerability

If you discover a vulnerability, please **do not open a public Issue**.

Contact via GitHub DM:
→ [https://github.com/earthHa23Queen](https://github.com/earthHa23Queen)

We will respond as promptly as possible and coordinate disclosure timing.

---

# セキュリティポリシー（日本語）

## サポートバージョン

| バージョン | サポート状況 |
| --- | --- |
| 0.2.x | ✅ |

---

## スコープ

ast-toolsは**開発環境でのローカル静的解析ツール**です。

- サーバーの起動、ネットワークインターフェースの公開、認証処理は**一切行いません**。
- `config.ts` / `config.json` に指定されたローカルパスからソースコードを読み込みます。
- 出力ファイル（JSON・CSV・Markdown）はローカルディレクトリにのみ書き込まれます。

リモート実行・Web公開エンドポイント・データ送信は存在しません。

なお、`Playwright/dom_playwright` は Playwright を用いてブラウザを操作するため、
指定された対象URLへHTTPリクエストを送信します。この通信は、対象として
明示的に設定したローカルまたは開発環境のURLに限定されます。

---

## 依存ライブラリのライセンス一覧

モジュールによって使用しているバージョンが異なるため、モジュール単位で記載します。

### Java/java_ast, Java/java_ast_cleaner

| パッケージ | バージョン | ライセンス | 備考 |
| --- | --- | --- | --- |
| javaparser-core | 3.26.1 | Apache-2.0 OR LGPL-3.0 | **Apache-2.0を選択して使用** |
| jackson-databind | 2.17.1 | Apache-2.0 | config.json読み込み専用（出力には未使用） |

`javaparser-symbol-solver-core` は、戻り値型の完全修飾名解決等が
不要になったため、現バージョンでは依存から除外しています。

JavaParserはApache License 2.0とLGPL-3.0のデュアルライセンスです。
本プロジェクトでは**Apache License 2.0**を選択して使用しています。

### Java/java_test_library

| パッケージ | バージョン | ライセンス | 備考 |
| --- | --- | --- | --- |
| junit-jupiter | 5.10.2 | EPL-2.0 | testスコープのみ。配布物には含まれない |

### Typescript/typescript_ast

| パッケージ | バージョン | ライセンス |
| --- | --- | --- |
| ts-morph | ^18.0.0 | MIT |
| iconv-lite | ^0.7.2 | MIT |
| typescript | ^5.5.0 | Apache-2.0 |
| ts-node | ^10.9.1 | MIT |

### React/react_transition, React/react_ui_element

| パッケージ | バージョン | ライセンス |
| --- | --- | --- |
| ts-morph | ^18.0.0 | MIT |
| typescript | ^5.5.0 | Apache-2.0 |
| ts-node | ^10.9.1 | MIT |

### Playwright/dom_tree_ast

| パッケージ | バージョン | ライセンス |
| --- | --- | --- |
| ts-morph | ^27.0.0 | MIT |
| iconv-lite | ^0.7.2 | MIT |
| node-html-parser | ^9.0.1 | MIT |
| typescript | ^6.0.0 | Apache-2.0 |
| ts-node | ^10.9.2 | MIT |

### Playwright/dom_playwright

| パッケージ | バージョン | ライセンス |
| --- | --- | --- |
| playwright | ^1.62.1 | Apache-2.0 |
| @playwright/test | ^1.62.1 | Apache-2.0 |
| typescript | ^6.0.0 | Apache-2.0 |
| ts-node | ^10.9.2 | MIT |

### OldVersion/

過去バージョンの依存関係はアーカイブ当時のまま固定しており、
現在は更新・脆弱性監視の対象外です。設計判断の記録として
ソースコードのみ保持しています。実行を推奨しません。

---

## 既知の問題

現時点で、既知の対応が必要な脆弱性はありません。

### 過去の対応履歴（参考）

以前のバージョンでは `opencsv` を経由して `commons-beanutils` /
`commons-collections` に既知のデシリアライゼーション脆弱性
（CVE-2015-6420等）を持つ古いバージョンが混入する可能性がありました。

対処として一時的にバージョン固定を行っていましたが、その後の実装見直しにより
`opencsv` 自体への依存を撤廃したため、現在この依存経路は存在しません。

---

## 脆弱性の報告

脆弱性を発見した場合は、**Issueでの公開報告はお控えください**。

GitHubのDMにてご連絡ください：
→ [https://github.com/earthHa23Queen](https://github.com/earthHa23Queen)

速やかに対応し、開示のタイミングを調整します。
