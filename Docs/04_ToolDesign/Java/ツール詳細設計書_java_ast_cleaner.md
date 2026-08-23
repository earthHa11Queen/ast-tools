# ツール詳細設計書

- システム名：AST-TOOLS
- ツール名：java_ast_cleaner
- 作成日：2026-08-13
- 対応言語：Java 17
- 配置場所：Java/java_ast_cleaner/
- Maven座標：com.ast_tool:java-ast-cleaner:1.0.0

---

## 1. 概要

### 1.1 目的

`java_ast`が出力した3種類のAST CSVを読み込み、SQLiteおよび後続のテスト仕様・テストデータ生成で扱いやすい正規化CSVへ変換する。Javaの型を言語共通の`convModel`へ変換し、配列・ジェネリクス・DTO等の型階層を`object_data.csv`として表現する。

### 1.2 処理の全体像

```text
トップConfigを読み込む
    ↓
共通outputDirからAST CSV 3種類を読み込む
    ├─ ast_source_file_level.csv
    ├─ ast_method_level.csv
    └─ ast_field_level.csv
    ↓
言語データモデルCSVからJava型→convModel対応を読み込む
    ↓
ASTデータを用途別に分解・正規化
    ├─ import
    ├─ enum
    ├─ args
    ├─ field
    ├─ dto
    ├─ return
    └─ object型階層
    ↓
同一outputDirへBOM無しUTF-8 CSV 7種類を出力
```

### 1.3 実行タイミング

`java_ast`が正常にCSVを生成した後、SQLiteへのデータ取込前に実行する。

```text
java_ast
    ↓ AST CSV 3種類
java_ast_cleaner
    ↓ 正規化CSV 7種類
SQLite取込
```

### 1.4 ビルド・実行方法

```bash
cd Java/java_ast_cleaner
mvn clean package
java -jar target/java-ast-cleaner-1.0.0-with-dependencies.jar ../config.json
```

`Main`は第1引数をConfigパスとして使用し、引数省略時は`./config.json`を参照する。トップConfig一本化後の通常運用では、トップConfigのパスを明示する。

---

## 2. ディレクトリ構成

```text
Java/
├── config.json                           ← Java配下3ツールの共通設定
├── results/                              ← AST入力・Cleaner出力の共通領域
└── java_ast_cleaner/
    ├── pom.xml
    └── src/main/java/com/ast_tool/cleaner/
        ├── Main.java                     ← エントリポイント
        ├── CleanerConfig.java            ← Config読込・パス解決
        ├── CsvUtil.java                  ← CSV読込・書込
        └── JavaAstCleaner.java           ← 正規化・型階層生成
```

`target/`および`dependency-reduced-pom.xml`はMaven生成物であり、設計対象のソース構成には含めない。

---

## 3. 設定仕様

### 3.1 使用設定

| 設定名 | 型 | 必須 | 説明 |
|---|---|---:|---|
| `outputDir` | string | ○ | AST入力とCleaner出力が共用するディレクトリ |
| `sourceFileCsv` | string | ○ | `outputDir`を基準とするソースファイルレベルCSV |
| `methodCsv` | string | ○ | `outputDir`を基準とするメソッドレベルCSV |
| `fieldCsv` | string | ○ | `outputDir`を基準とするフィールドレベルCSV |
| `langDataModelsCsv` | string | ○ | Java型と`convModel`の対応を持つCSV |
| `language` | string | － | 対応表から抽出する言語。既定値`java` |

### 3.2 パス解決

```text
Config配置ディレクトリ
    ├─ outputDir
    │   ├─ sourceFileCsv
    │   ├─ methodCsv
    │   └─ fieldCsv
    └─ langDataModelsCsv
```

- `outputDir`と`langDataModelsCsv`はConfig配置ディレクトリを基準に解決する。
- 3つのAST入力CSVは、解決済み`outputDir`を基準に解決する。
- 絶対パスが指定された項目は正規化のみを行う。
- Cleanerが使用しない共通Config項目は無視する。

### 3.3 共通Config例

```json
{
  "language": "java",
  "outputDir": "./results",
  "targetAppDir": "YOUR-APP-PATH",
  "targetAppName": "YOUR-APP-NAME",
  "sourceFileCsvFilename": "ast_source_file_level.csv",
  "methodCsvFilename": "ast_method_level.csv",
  "fieldCsvFilename": "ast_field_level.csv",
  "sourceFileCsv": "ast_source_file_level.csv",
  "methodCsv": "ast_method_level.csv",
  "fieldCsv": "ast_field_level.csv",
  "langDataModelsCsv": "../SQLite/data/lang_data_models.csv"
}
```

---

## 4. クラス・データ定義

### 4.1 `CleanerConfig`

| フィールド | 型 | 説明 |
|---|---|---|
| `sourceFileCsv` | String | 解決済みソースファイルレベルCSVパス |
| `methodCsv` | String | 解決済みメソッドレベルCSVパス |
| `fieldCsv` | String | 解決済みフィールドレベルCSVパス |
| `langDataModelsCsv` | String | 解決済み言語データモデルCSVパス |
| `language` | String | 型対応表の言語絞込み値 |
| `outputDir` | String | 解決済み共通出力ディレクトリ |

### 4.2 型モデルマップ

`lang_data_models.csv`のうち、`language`列がConfigの`language`と大文字小文字を無視して一致する行を読み込む。

| CSV列 | 用途 |
|---|---|
| `language` | 対応言語の絞込み |
| `data_model` | Javaの基底型名。`typeModel`のキー |
| `conv_model` | 言語共通型。`typeModel`の値 |

空の`data_model`または`conv_model`を持つ行は登録しない。未登録型は`OBJECT`へフォールバックする。配列は基底型名`[]`で検索する。

### 4.3 オブジェクト型階層

配列、型引数を持つクラス型、または`convModel=OBJECT`の型を木構造へ展開する。

| 項目 | 値・説明 |
|---|---|
| `objectId` | 実行単位で1から連番 |
| `parentObjectId` | ルートは`-1`、子要素は親`objectId` |
| `ownerKind` | `ARG`、`FIELD`、`RETURN` |
| `position` | `ROOT`、`ELEMENT`、`KEY`、`VALUE` |
| `ownerIndex` | 引数番号。非引数は`-1` |
| `referenceType` | `convModel=OBJECT`の場合の基底型名。それ以外は`-` |

ワイルドカード型は、上限境界、下限境界、`Object`の順で正規化する。Mapの第1型引数は`KEY`、第2型引数は`VALUE`、その他は`ELEMENT`とする。

---

## 5. 各ファイルの処理仕様

### 5.1 `Main.java`

**目的：** Configを読み込み、Cleaner処理を起動する。

**処理フロー：**

1. 第1引数、または既定値`./config.json`をConfigパスとする。
2. `CleanerConfig.load`を実行する。
3. `JavaAstCleaner.execute`を実行する。
4. boolean結果に応じて`Success!!!!`または`Error......`を表示する。
5. 例外時はスタックトレースを標準エラーへ出力する。

### 5.2 `CleanerConfig.java`

**目的：** トップConfigからCleaner用設定を取得し、入力・出力パスを確定する。

**処理フロー：**

1. Configパスを絶対パス化・正規化する。
2. JacksonでJSONをデシリアライズする。
3. Cleanerが使用しない共通Config項目を無視する。
4. `outputDir`をConfig配置ディレクトリ基準で解決する。
5. 3つの入力CSVを`outputDir`基準で解決する。
6. `langDataModelsCsv`をConfig配置ディレクトリ基準で解決する。

### 5.3 `CsvUtil.java`

**目的：** BOM無しUTF-8を含むCSVを読み書きする。

**読込仕様：**

- UTF-8で全体を読み込む。
- カンマ、CRLF/LF、引用符、引用セル内改行、二重化引用符を解析する。
- 先頭行をヘッダーとして、各データ行を`LinkedHashMap<String,String>`へ変換する。
- 列不足は空文字として補う。
- 1セルだけの空行は読み飛ばす。

**書込仕様：**

- 親ディレクトリを作成する。
- BOM無しUTF-8で常に上書きする。
- カンマ、引用符、CR/LFを含むセルを引用し、引用符を二重化する。

### 5.4 `JavaAstCleaner.execute`

**目的：** 全入力を読み込み、7種類の正規化CSVを生成する。

**処理フロー：**

1. AST CSV 3種類を読み込む。
2. Java用の型モデル対応を読み込む。
3. import情報を分解する。
4. enum列挙子を行へ展開する。
5. メソッド引数を型解析し、フィールドCSVの制約情報と結合する。
6. クラスフィールドを正規化する。
7. 既知クラスのフィールドからDTO構造を生成する。
8. メソッド・コンストラクタごとに戻り値を生成する。
9. 処理中に蓄積した型階層を出力する。
10. 全処理成功時`true`、例外時`false`を返す。

### 5.5 import正規化

1. ソース行を`appName`、`fileName`、`directoryPath`順にソートする。
2. `importList`が空または`-`の行を除外する。
3. ` / `区切りでimport文を分割する。
4. 先頭`import `と末尾`;`を除去する。
5. 1から`n`を採番する。

### 5.6 enum正規化

1. `processContent=enum`のメソッド行だけを選択する。
2. `process3`を0始まりのページ番号として読む。数値変換失敗時は0とする。
3. `arg1`～`arg20`の非空・非`-`値を列挙子として展開する。
4. `enumIndex = process3 × 20 + 引数列番号`とする。
5. `convModel`を`ENUM`固定とする。

### 5.7 引数正規化

1. フィールドCSVの`fieldKind=parameter`行を、ファイル・クラス・メソッド・引数名の複合キーで索引化する。
2. メソッドCSVの`processContent=引数`行を選択する。
3. `arg1`～`arg20`をJavaParserで`Parameter`へ変換する。
4. 生型、引数名、`convModel`、オブジェクト型階層を取得する。
5. 複合キーで検証境界・nullable・生アノテーションを結合する。
6. 引数パース失敗時は`convModel=OBJECT`、取得不能列をセンチネル値として行を残す。

### 5.8 フィールド・DTO・戻り値正規化

- フィールドは`fieldKind=field`だけを対象とする。
- 生型をJavaParserで解析し、`convModel`と型階層を生成する。型解析失敗時は`OBJECT`として行を残す。
- DTOはソースファイルCSVに存在する非`-`クラス名を既知クラスとし、そのクラスのフィールドを出力する。
- 戻り値は引数専用行を代表行として、`filePath + className + methodName + process1`で重複排除する。
- 戻り値が空または`-`の場合、`convModel`と`objectRootId`も`-`とする。

### 5.9 値正規化

| 列種別 | 空値の変換 |
|---|---|
| 文字列列 | `-` |
| 整数列 | `-1` |
| `isFinal=true` | `1` |
| `isFinal=false` | `0` |

整数列に上記以外の非数値がある場合、`IllegalArgumentException`とする。

---

## 6. 入出力CSV仕様

### 6.1 入力

| ファイル | 主要用途 |
|---|---|
| `ast_source_file_level.csv` | import、既知クラス、DTO判定 |
| `ast_method_level.csv` | enum、引数、戻り値 |
| `ast_field_level.csv` | 引数制約、クラスフィールド |
| `lang_data_models.csv` | Java型から`convModel`への変換 |

### 6.2 `importlist_data.csv`

```text
n,appName,fileName,directoryPath,importList
```

### 6.3 `enum_data.csv`

```text
n,filePath,enumName,enumIndex,enumValue,convModel
```

### 6.4 `args_data.csv`

```text
n,filePath,className,methodName,process1,argIndex,argName,argRaw,rawType,convModel,validationMin,validationMax,nullable,rawAnnotations,objectRootId
```

### 6.5 `field_data.csv`

```text
n,filePath,className,fieldName,rawType,convModel,isFinal,validationMin,validationMax,nullable,rawAnnotations,objectRootId
```

### 6.6 `dto_data.csv`

```text
n,filePath,dtoName,fieldName,rawType
```

### 6.7 `return_data.csv`

```text
n,filePath,className,methodName,process1,rawType,convModel,objectRootId
```

### 6.8 `object_data.csv`

```text
objectId,parentObjectId,ownerKind,filePath,className,methodName,ownerName,ownerIndex,position,rawType,baseType,convModel,referenceType
```

すべての出力CSVは同じ`outputDir`に置く。AST出力3ファイルとCleaner出力7ファイルは名称が異なるため、同一ディレクトリ内で競合しない。

---

## 7. エラーハンドリング方針

| エラー種別 | 実装上の処理 | プロセス終了コード |
|---|---|---|
| Config読込・パス解決失敗 | メッセージとスタックトレースを出力 | 明示指定なし |
| AST入力CSV読込失敗 | Cleaner全体を失敗とし`false`を返す | 明示指定なし |
| 型モデルCSV読込失敗 | Cleaner全体を失敗とし`false`を返す | 明示指定なし |
| 引数のJava構文解析失敗 | センチネル値を持つ代替行を出力して継続 | 正常処理を継続 |
| フィールド型解析失敗 | `convModel=OBJECT`として継続 | 正常処理を継続 |
| 戻り値型解析失敗 | `convModel=OBJECT`として継続 | 正常処理を継続 |
| 整数列に非数値 | 例外としてCleaner全体を失敗 | 明示指定なし |
| CSV書込失敗 | Cleaner全体を失敗とし`false`を返す | 明示指定なし |
| 全体成功 | 7CSV出力後`Success!!!!`を表示 | 明示指定なし |

現行`Main`は`System.exit`を使用しないため、成否に応じた終了コード制御は行わない。

---

## 8. ビルド・依存関係

| 種別 | 名称 | バージョン | 用途 |
|---|---|---:|---|
| JDK | Java | 17 | コンパイル・実行 |
| ライブラリ | JavaParser Core | 3.26.1 | 引数・型の再解析 |
| ライブラリ | Jackson Databind | 2.17.1 | Config読込 |
| Maven Plugin | maven-compiler-plugin | 3.13.0 | Java 17コンパイル |
| Maven Plugin | maven-shade-plugin | 3.5.3 | 依存込み実行可能JAR生成 |

メインクラスは`com.ast_tool.cleaner.Main`。classifier `with-dependencies`のfat JARを生成する。

---

## 9. 実行ログ例

成功時：

```text
Success!!!!
```

失敗時：

```text
Cleaner処理失敗: <エラー内容>
<スタックトレース>
Error......
```

---

## 10. 制約・対象外

| 項目 | 内容 |
|---|---|
| 入力形式 | `java_ast`の3CSV契約を前提とする |
| 引数上限 | `arg1`～`arg20` |
| 型の完全修飾名 | JavaParserの生型を使用し、シンボル解決は行わない |
| 未登録型 | `OBJECT`へ変換 |
| DTO判定 | ソースCSVに現れるクラス名との名前一致 |
| オーバーロード識別 | `process1`を含むメソッドキーで区別 |
| DB書込 | 対象外。CSV生成まで |
| Docker | 対象外 |

---

## 11. テスト・確認観点

本モジュールには添付時点で自動テストコードが含まれていない。実装確認では最低限、次を検証対象とする。

1. 引用セル、セル内改行を含むAST CSVの読込。
2. import文の複数件分割とソート順。
3. enum列挙子20件・21件境界の`enumIndex`。
4. 引数とフィールド制約の複合キー結合。
5. primitive、配列、List、Map、ワイルドカード、DTOの型階層。
6. Map型引数の`KEY`・`VALUE`位置。
7. 未登録型の`OBJECT`フォールバック。
8. 空文字・`-`・boolean値の出力正規化。
9. AST入力とCleaner出力が同一`outputDir`で共存すること。
10. 実行ディレクトリに依存せず、トップConfig基準でパス解決されること。
