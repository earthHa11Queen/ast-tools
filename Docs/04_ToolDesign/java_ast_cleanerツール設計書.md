# java_ast_cleaner ツール設計書

- ツール名：java_ast_cleaner
- 作成日：2026-08-10
- 対応言語：Java 17
- 配置場所：java_ast_cleaner/

---

## 1. 概要

### 1.1 目的

Java ASTツールが出力する3種類のCSVを読み込み、後続のSQLiteでJava固有構文を解析しなくて済む形へ決定論的に変換する。

本ツールはソースコードの意味を完全に理解することを目的としない。プログラムで確実に処理できる構造情報を最大限に整理し、一般化が困難または不確実な型は `OBJECT` と生情報へ退避する。アノテーションの意味解釈、業務ドメイン判定、鏡の原理ID選択、期待結果・テスト仕様書の自然言語生成は行わない。

出力CSVはSQLiteへそのままインポート可能なテーブル形式とし、後段でテストデータ定義、コード生成、テスト仕様書生成へ利用する。

### 1.2 設計原則

1. ASTが既に構造化した情報を再解釈しない。
2. Java構文として確定できる情報はCleanerで処理し、SQLiteへ文字列解析を持ち越さない。
3. 型変換値はCleanerへハードコードせず、`lang_data_models.csv` を定義ソースとする。
4. `lang_data_models` に存在しない型は推測せず `OBJECT` とする。元の型名は必ず保持する。
5. generic・配列等の入れ子は親子構造へ分解する。途中まで解決できる場合は解決できた部分まで構造化し、不明なleafのみ `OBJECT` とする。
6. アノテーションは意味解析しない。ASTが取得済みの `rawAnnotations`、`validationMin`、`validationMax`、`nullable` をそのまま引き継ぐ。
7. `process1～process9`、`processContent`、`methodType`、`accessModifier` 等のAST固有構造値は変更しない。必要な行種別判定にのみ利用する。

### 1.3 処理の全体像

```text
① Java ASTの3CSVを読み込む
   - ast_source_file_level.csv
   - ast_method_level.csv
   - ast_field_level.csv
        ↓
② lang_data_models.csv を読み込み、Java型→共通変換値の辞書を構築する
        ↓
③ importList を既存 importlist_data テーブル形式へ展開する
        ↓
④ processContent="enum" の arg1～arg20 を enum値として展開する
        ↓
⑤ processContent="引数" の arg1～arg20 をJava引数構文として解析する
   - 引数順
   - 引数名
   - 生型
   - 共通変換値
   - field_levelに存在する既存validation情報との関連付け
        ↓
⑥ fieldKind="field" の fieldType を共通変換値へ変換する
        ↓
⑦ class→field の構成関係をDTO用CSVへ出力する
        ↓
⑧ args / field / return の型を共通の型解析処理へ通し、
   配列・generic・OBJECT参照を親子構造としてObject用CSVへ出力する
        ↓
⑨ methodのreturnTypeをreturn用CSVへ出力する
        ↓
⑩ 7種類のCSVをBOM付きUTF-8で出力する
```

---

## 2. 入出力

### 2.1 入力ファイル

| ファイル | 用途 |
|---|---|
| ast_source_file_level.csv | importList、class/file情報の取得 |
| ast_method_level.csv | enum、引数、returnTypeの取得 |
| ast_field_level.csv | field、parameterのvalidation情報、rawAnnotationsの取得 |
| lang_data_models.csv | 言語固有型から共通変換値への対応表 |

### 2.2 出力ファイル

| No | ファイル | 用途 |
|---|---|---|
| 1 | importlist_data.csv | importを1件1行へ展開。既存SQLite importlist_dataと同一列構成 |
| 2 | enum_data.csv | enum型と列挙値の関係 |
| 3 | args_data.csv | メソッド引数の順序・型・validation情報 |
| 4 | field_data.csv | クラスfieldの型・validation情報 |
| 5 | dto_data.csv | 名前付きclassとfieldの構成関係 |
| 6 | object_data.csv | 配列・generic・Map・未知Object等の再帰型構造 |
| 7 | return_data.csv | メソッド戻り値の型情報 |

---

## 3. ディレクトリ構成

```text
java_ast_cleaner/
├── pom.xml
├── config.json
├── config.json_template.md
├── exec.md
├── java_ast_cleaner_ツール設計書.md
└── src/
    └── main/
        └── java/
            └── com/
                └── ast_tool/
                    └── cleaner/
                        ├── Main.java
                        ├── CleanerConfig.java
                        ├── CsvUtil.java
                        └── JavaAstCleaner.java
```

大量のloader/model/outputクラスへ分割せず、役割が実際に分離できる単位だけをファイル化する。

---

## 4. 共通型変換仕様

### 4.1 変換元

型変換対象は次の3種類で共通とする。

- argsの引数型
- fieldのfieldType
- methodのreturnType

同一の型解析ロジックを利用し、対象ごとに別ロジックを持たない。

### 4.2 lang_data_models参照

`lang_data_models.csv` のうち、`language=java` の `data_model` と `conv_model` を辞書として利用する。

例として共通変換値は `STRING`、`CHAR`、`NUMBER`、`DECIMAL`、`COLLECTION`、`ARRAY`、`MAP`、`ENUM`、`OBJECT` 等を想定するが、実際の変換内容はCSV側を正とする。

```text
rawType
  ↓ base typeを取得
lang_data_models.data_model と完全一致
  ↓
一致あり → conv_model
一致なし → OBJECT
```

Cleanerは `String→STRING`、`Map→MAP` 等をソースコードへ固定しない。

### 4.3 配列

Javaの `T[]` は型名ではなく配列構文として認識し、`lang_data_models.data_model="[]"` を参照する。

配列要素 `T` は `object_data.csv` の子要素として `position=ELEMENT` で記録する。

### 4.4 未知型

`lang_data_models` に定義されていない型は `OBJECT` とする。

```text
SomeCompanyType
→ rawType=SomeCompanyType
→ convModel=OBJECT
→ referenceType=SomeCompanyType
```

未知型を名前やpackageから推測して別の共通型へ変換しない。

---

## 5. 出力テーブル仕様

### 5.1 importlist_data.csv

既存SQLiteの `importlist_data` と同じ形式とする。

| 列 | 説明 |
|---|---|
| n | 連番 |
| appName | アプリ名 |
| fileName | Javaファイル名 |
| directoryPath | ディレクトリパス |
| importList | import文から `import` と末尾`;`を除いた1件のimport |

`ast_source_file_level.importList` の ` / ` 区切りを1件1行へ展開する。ファイル順と各ファイル内のimport記載順は既存処理と同じ順序を維持する。

### 5.2 enum_data.csv

対象：`ast_method_level.processContent="enum"`

| 列 | 説明 |
|---|---|
| n | 連番 |
| filePath | 元Javaファイル |
| enumName | enum名 |
| enumIndex | enum内の列挙順。20件超のページ分割を復元して1始まりで採番 |
| enumValue | 列挙値 |
| convModel | 固定 `ENUM` |

`process3` をページ番号、`arg1～arg20` をページ内の列挙値として使用する。

### 5.3 args_data.csv

対象：`ast_method_level.processContent="引数"`

| 列 | 説明 |
|---|---|
| n | 連番 |
| filePath | 元Javaファイル |
| className | クラス名 |
| methodName | メソッド名 |
| process1 | AST上のメソッド/コンストラクタ識別座標 |
| argIndex | arg1～arg20に対応する1始まりの引数順 |
| argName | Java引数名 |
| argRaw | ASTが出力した引数宣言の生文字列 |
| rawType | Java引数型 |
| convModel | lang_data_modelsによる共通変換値。未定義はOBJECT |
| validationMin | field_level.parameterから取得。値は変更しない |
| validationMax | field_level.parameterから取得。値は変更しない |
| nullable | field_level.parameterから取得。値は変更しない |
| rawAnnotations | field_level.parameterの生アノテーション。意味解析しない |
| objectRootId | 複合型/OBJECTの場合のobject_dataルートID。単純型は`-` |

引数構文の解析は引数名と型を確定するために行うが、アノテーションの意味解釈は行わない。

### 5.4 field_data.csv

対象：`ast_field_level.fieldKind="field"`

| 列 | 説明 |
|---|---|
| n | 連番 |
| filePath | 元Javaファイル |
| className | 所属クラス |
| fieldName | field名 |
| rawType | ASTのfieldType |
| convModel | 共通変換値。未定義はOBJECT |
| isFinal | AST値をそのまま保持 |
| validationMin | AST値をそのまま保持 |
| validationMax | AST値をそのまま保持 |
| nullable | AST値をそのまま保持 |
| rawAnnotations | AST値をそのまま保持。意味解析しない |
| objectRootId | 複合型/OBJECTの場合のobject_dataルートID |

### 5.5 dto_data.csv

DTOという名称は後段用途上の名前であり、Cleanerが `Request` / `Response` 等の命名から業務的なDTO判定を行うものではない。

ASTで確定できる「名前付きclassとfieldの構成関係」を出力する。

| 列 | 説明 |
|---|---|
| n | 連番 |
| filePath | classを定義するJavaファイル |
| dtoName | class名 |
| fieldName | 構成field名 |
| rawType | fieldのJava型 |

後段SQLiteは `args.convModel=OBJECT` 等の `rawType` / `referenceType` と `dtoName` をJOINし、必要な入力/出力Objectをfieldへ展開する。

### 5.6 object_data.csv

args / field / return の型内部構造を、深さ固定の横持ちではなく親子構造で記録する。

| 列 | 説明 |
|---|---|
| objectId | 型ノードID |
| parentObjectId | 親ノードID。ルートは`-` |
| ownerKind | `ARG` / `FIELD` / `RETURN` |
| filePath | 元Javaファイル |
| className | 所属クラス |
| methodName | 所属メソッド。fieldは空文字の場合あり |
| ownerName | 引数名 / field名 / `return` |
| ownerIndex | 引数順。field/returnは0 |
| position | `ROOT` / `ELEMENT` / `KEY` / `VALUE` |
| rawType | このノードのJava型表現 |
| baseType | lang_data_models照合に使う基本型。配列は`[]` |
| convModel | 共通変換値 |
| referenceType | `convModel=OBJECT` の場合の参照型名。その他は`-` |

例：`List<Map<String, BigDecimal>>`

```text
ROOT    COLLECTION(List<Map<String,BigDecimal>>)
  └─ ELEMENT MAP(Map<String,BigDecimal>)
       ├─ KEY   STRING(String)
       └─ VALUE DECIMAL(BigDecimal)
```

実際の `COLLECTION / MAP / DECIMAL` 等の値は `lang_data_models` の定義に従う。

### 5.7 return_data.csv

対象：各メソッド/コンストラクタの `processContent="引数"` 行をメソッド定義の代表行として使用する。

| 列 | 説明 |
|---|---|
| n | 連番 |
| filePath | 元Javaファイル |
| className | クラス名 |
| methodName | メソッド名 |
| process1 | AST上のメソッド/コンストラクタ識別座標 |
| rawType | returnTypeの生値 |
| convModel | 共通変換値。`-`の場合は`-` |
| objectRootId | 複合型/OBJECTの場合のobject_dataルートID |

---

## 6. JavaAstCleaner.java 処理仕様

### 6.1 execute

**目的：** 全入力を読み込み、7CSVを生成する。

**処理フロー：**

1. source/method/field CSVを読み込む。
2. lang_data_modelsを読み込む。
3. importlist_data.csvを生成する。
4. enum_data.csvを生成する。
5. args_data.csvを生成する。
6. field_data.csvを生成する。
7. dto_data.csvを生成する。
8. return_data.csvを生成する。この処理までに型構造をobjectRowsへ蓄積する。
9. object_data.csvを生成する。

### 6.2 import展開

1. source CSVを `appName → fileName → directoryPath` の順に並べる。
2. `importList="-"` は処理しない。
3. ` / ` 区切りでimportを分離する。
4. 先頭 `import ` と末尾 `;` を除去する。
5. 元ファイル内のimport順を維持して連番を振る。

### 6.3 enum展開

1. `processContent="enum"` の行のみ対象とする。
2. `process3` を0始まりページ番号として取得する。
3. arg1～arg20を順に読む。
4. `-` は出力しない。
5. `enumIndex = process3 * 20 + arg列番号` とする。

### 6.4 引数展開

1. `processContent="引数"` の行のみ対象とする。
2. arg1～arg20を順に読み、`-` は出力しない。
3. JavaParserで引数宣言を解析し、引数名と型を取得する。
4. 同一 `filePath + className + methodName + fieldName` のfield_level.parameterを検索する。
5. validationMin/Max、nullable、rawAnnotationsをそのまま引き継ぐ。
6. 型をlang_data_modelsで変換する。
7. 複合型またはOBJECTはobject_data用の親子構造へ登録する。
8. 引数解析自体に失敗した場合はrawを保持し、convModel=OBJECTとして出力する。推測による補正はしない。

### 6.5 field展開

1. `fieldKind="field"` の行のみ対象とする。
2. fieldTypeを型解析する。
3. lang_data_modelsで変換する。
4. validation/nullable/rawAnnotationsは変更せず出力する。
5. 複合型またはOBJECTはobject_dataへ登録する。

### 6.6 DTO構成出力

1. source CSVのclassNameからAST内で定義されているclass一覧を作る。
2. field_levelのclass fieldを1件1行で出力する。
3. 名前からDTOかどうかを推測しない。
4. DTOの利用対象判定は後段SQLiteの参照関係で行う。

### 6.7 return展開

1. `processContent="引数"` 行を各methodの代表行として利用する。
2. 同一 `filePath + className + methodName + process1` は1件だけ出力する。
3. returnType=`-` はそのまま出力する。
4. それ以外はargs/fieldと同じ型解析を行う。
5. 複合型またはOBJECTはobject_dataへ登録する。

### 6.8 Object型構造登録

次の場合にobject_dataへノードを登録する。

- 配列
- generic型
- convModel=OBJECT

配列は子を `ELEMENT` とする。

Map相当かどうかは型名を直接判定せず、lang_data_models変換後の `convModel=MAP` で判定する。generic第1要素を `KEY`、第2要素を `VALUE` とし、それ以外は `ELEMENT` とする。

Map以外のgenericはすべて子を `ELEMENT` とする。

---

## 7. CsvUtil.java 処理仕様

### 7.1 CSV読込

AST method CSVの `role` 等には改行やカンマが含まれ得るため、単純な `split(",")` は使用しない。

以下を考慮するCSV parserを実装する。

- ダブルクォート囲み
- セル内カンマ
- セル内改行
- `""` によるダブルクォートエスケープ
- UTF-8 BOM

### 7.2 CSV出力

全CSVはBOM付きUTF-8とする。

以下を含む値はダブルクォートで囲む。

- `"`
- `,`
- 改行
- CR

---

## 8. Cleanerで処理しないもの

| 対象 | 方針 |
|---|---|
| rawAnnotationsの意味 | AIへ渡すため生情報を保持。Cleanerでは解釈しない |
| validationMin/Max/nullableの既定値補完 | 行わない。AST値をそのまま保持する |
| 業務ドメイン | 判定しない |
| Mirror X/Y/Z ID | 選択しない |
| テスト正常/異常 | 判定しない |
| 期待結果 | 生成しない |
| テスト仕様書自然言語 | 生成しない |
| 実テスト値 | 生成しない |
| 未知型の意味推測 | 行わずOBJECTへ退避する |

---

## 9. エラーハンドリング方針

| エラー種別 | 処理 |
|---|---|
| config読込失敗 | エラーとして終了 |
| 入力CSV読込失敗 | エラーとして終了 |
| lang_data_models読込失敗 | エラーとして終了 |
| 個別引数のJava構文解析失敗 | raw値を保持しOBJECTとして出力し、他行を続行 |
| 個別field/return型解析失敗 | raw値を保持しOBJECTとして出力し、他行を続行 |
| 型がlang_data_modelsにない | 正常系としてOBJECTへ変換 |
| CSV出力失敗 | エラーとして終了 |

未知型はエラーではない。一般化の限界としてOBJECTへ退避することを正常動作とする。

---

## 10. 実行方法

```bash
cd java_ast_cleaner
mvn clean package
java -jar target/java-ast-cleaner-1.0.0-with-dependencies.jar ./config.json
```

config.jsonでは入力3CSV、lang_data_models、出力先を指定する。

---

## 11. 後続処理との責務境界

```text
Java Source
  ↓
Java AST
  ↓
3 raw CSV
  ↓
java_ast_cleaner
  ↓
7 normalized CSV
  ↓
SQLite
  ├─ import / enum / args / field / DTO / Object / return をJOIN
  ├─ lang_data_models等の決定論的データを利用
  └─ AIへ渡すMirror ID候補を可能な限り限定
  ↓
AI
  ├─ 許可されたMirror IDから必要なIDを選択
  └─ テスト仕様書フォーマットの自然言語が必要な箇所だけ生成
  ↓
Mirror Data Generator
  └─ Mirror IDから実際のテスト値を決定論的に生成
```

CleanerはAIの代替ではなく、AIへ到達する前に確率的判断の母数を可能な限り削減するためのプログラム処理層とする。
