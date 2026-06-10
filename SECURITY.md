# Security Policy

## Supported Versions

| Version | Supported |
|---|---|
| 0.1.x | ✅ |

---

## Scope

ast-tools is a **local static analysis tool** intended for use in development environments.

- It does **not** run a server, expose any network interface, or handle user authentication.
- It reads source code from a local directory path specified in `config.ts` / `config.json`.
- Output files (JSON, CSV, Markdown) are written to a local directory only.

There is no remote execution, no web-facing endpoint, and no data transmission of any kind.

---

## Dependency License Summary

| Package | Version | License | Note |
|---|---|---|---|
| ts-morph | ^18.0.0 | MIT | |
| iconv-lite | ^0.7.2 | MIT | |
| typescript | ^5.5.0 | Apache-2.0 | |
| ts-node | ^10.9.1 | MIT | |
| javaparser-core | 3.26.1 | Apache-2.0 OR LGPL-3.0 | **Used under Apache-2.0** |
| javaparser-symbol-solver-core | 3.26.1 | Apache-2.0 OR LGPL-3.0 | **Used under Apache-2.0** |
| jackson-databind | 2.17.1 | Apache-2.0 | |
| opencsv | 5.9 | Apache-2.0 | See known issues below |
| commons-beanutils | 1.9.4 | Apache-2.0 | Pinned explicitly (see below) |

JavaParser is dual-licensed under Apache License 2.0 and LGPL-3.0.
This project explicitly adopts the **Apache License 2.0** for JavaParser.

---

## Known Issues

### opencsv 5.9 — Transitive dependency via commons-beanutils

**Status: Mitigated**

opencsv 5.9 carries a transitive dependency chain:
`opencsv → commons-beanutils → commons-collections`

Older versions of `commons-beanutils` (before 1.9.4) pull in `commons-collections` versions
with known deserialization vulnerabilities (CVE-2015-6420 and related).

**Mitigation applied:**
`commons-beanutils` is explicitly pinned to `1.9.4` in `pom.xml`,
which overrides any transitive resolution to older versions.

**Risk assessment for this tool:**
The attack surface for these CVEs requires network-accessible Java deserialization endpoints.
ast-tools is a local CLI tool with no network exposure, so the practical risk is effectively zero.
The pin is applied as a hygiene measure and for transparency.

---

## Reporting a Vulnerability

If you discover a vulnerability, please **do not open a public Issue**.

Contact via GitHub DM:
→ [https://github.com/earthHa11Queen](https://github.com/earthHa11Queen)

We will respond as promptly as possible and coordinate disclosure timing.

---

---

# セキュリティポリシー（日本語）

## サポートバージョン

| バージョン | サポート状況 |
|---|---|
| 0.1.x | ✅ |

---

## スコープ

ast-toolsは**開発環境でのローカル静的解析ツール**です。

- サーバーの起動、ネットワークインターフェースの公開、認証処理は**一切行いません**。
- `config.ts` / `config.json` に指定されたローカルパスからソースコードを読み込みます。
- 出力ファイル（JSON・CSV・Markdown）はローカルディレクトリにのみ書き込まれます。

リモート実行・Web公開エンドポイント・データ送信は存在しません。

---

## 依存ライブラリのライセンス一覧

| パッケージ | バージョン | ライセンス | 備考 |
|---|---|---|---|
| ts-morph | ^18.0.0 | MIT | |
| iconv-lite | ^0.7.2 | MIT | |
| typescript | ^5.5.0 | Apache-2.0 | |
| ts-node | ^10.9.1 | MIT | |
| javaparser-core | 3.26.1 | Apache-2.0 OR LGPL-3.0 | **Apache-2.0を選択して使用** |
| javaparser-symbol-solver-core | 3.26.1 | Apache-2.0 OR LGPL-3.0 | **Apache-2.0を選択して使用** |
| jackson-databind | 2.17.1 | Apache-2.0 | |
| opencsv | 5.9 | Apache-2.0 | 後述の既知の問題を参照 |
| commons-beanutils | 1.9.4 | Apache-2.0 | 明示的バージョン固定（後述） |

JavaParserはApache License 2.0とLGPL-3.0のデュアルライセンスです。
本プロジェクトでは**Apache License 2.0**を選択して使用しています。

---

## 既知の問題

### opencsv 5.9 — commons-beanutils経由の推移的依存

**ステータス: 対処済み**

opencsv 5.9は以下の推移的依存チェーンを持ちます：
`opencsv → commons-beanutils → commons-collections`

`commons-beanutils` の古いバージョン（1.9.4未満）は、既知のデシリアライゼーション脆弱性
（CVE-2015-6420等）を持つ `commons-collections` バージョンを引き込む可能性があります。

**対処内容：**
`pom.xml` にて `commons-beanutils` を `1.9.4` に明示的に固定し、
古いバージョンへの推移的解決を防いでいます。

**本ツールにおけるリスク評価：**
上記CVEの攻撃には、ネットワーク経由でアクセス可能なJavaデシリアライゼーションエンドポイントが必要です。
ast-toolsはネットワーク非公開のローカルCLIツールであるため、実質的なリスクはほぼゼロです。
バージョン固定はセキュリティ衛生上の措置として、また透明性のために適用しています。

---

## 脆弱性の報告

脆弱性を発見した場合は、**Issueでの公開報告はお控えください**。

GitHubのDMにてご連絡ください：
→ [https://github.com/earthHa11Queen](https://github.com/earthHa11Queen)

速やかに対応し、開示のタイミングを調整します。
