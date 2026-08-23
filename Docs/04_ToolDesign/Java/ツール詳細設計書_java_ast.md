# ツール詳細設計書

- システム名：AST-TOOLS
- ツール名：java_ast
- 作成日：2026-08-13
- 対応言語：実行環境 Java 17／解析対象 Java 21構文
- 配置場所：Java/java_ast/
- Maven座標：com.ast_tool:java-ast-v2:2.0.0

---

## 1. 概要

### 1.1 目的

指定されたJavaソースディレクトリを再帰的に解析し、ソースファイル、メソッド・制御構造、フィールド・引数の情報を3種類のCSVへ出力する。後続の`java_ast_cleaner`およびSQLite処理が、Javaソースを直接再解析せずに構造化データとして利用できる状態を作る。

### 1.2 処理の全体像

```text
トップConfigを読み込む
    ↓
解析対象ディレクトリから.javaファイルを再帰検索
    ├─ testディレクトリ配下を除外
    └─ パス順にソート
    ↓
JavaParserでCompilationUnitへ変換
    ├─ ファイル・import・クラス・enum集計
    ├─ メソッド・コンストラクタ・制御構造抽出
    └─ フィールド・引数・検証アノテーション抽出
    ↓
共通outputDirへBOM無しUTF-8 CSVを出力
    ├─ ast_source_file_level.csv
    ├─ ast_method_level.csv
    └─ ast_field_level.csv
```

### 1.3 実行タイミング

対象アプリケーションのソース状態をテスト仕様生成用データへ反映するときに実行する。`java_ast_cleaner`より先に実行する。

```text
Javaソース更新
    ↓
java_ast実行
    ↓
java_ast_cleaner実行
    ↓
SQLite取込・テスト仕様生成
```

### 1.4 ビルド・実行方法

```bash
cd Java/java_ast
mvn clean package
```

トップConfigを明示して実行する。

```bash
java -jar target/java-ast-v2-2.0.0-with-dependencies.jar ../config.json
```

`Main`は第1引数をConfigパスとして使用し、引数省略時は`./config.json`を参照する。トップConfig一本化後の通常運用では、トップConfigのパスを明示する。

---

## 2. ディレクトリ構成

```text
Java/
├── config.json                         ← Java配下3ツールの共通設定
├── results/                            ← AST・Cleaner共通出力先
└── java_ast/
    ├── pom.xml
    └── src/main/java/com/ast_tool/
        ├── Main.java                   ← エントリポイント
        ├── AppConfig.java              ← Config読込・パス解決
        ├── model/
        │   └── MethodInfo.java         ← 3種類のCSV行モデル
        ├── output/
        │   └── CsvOutput.java          ← CSV組立・出力
        └── parser/
            ├── JavaAstParser.java      ← Javaソース解析・行モデル生成
            └── StructureExtractor.java ← 制御構造の階層抽出
```

`target/`および`dependency-reduced-pom.xml`はMaven生成物であり、設計対象のソース構成には含めない。

---

## 3. 設定仕様

### 3.1 使用設定

| 設定名 | 型 | 必須 | 説明 |
|---|---|---:|---|
| `targetAppDir` | string | ○ | 解析対象Javaソースのルートディレクトリ |
| `targetAppName` | string | ○ | CSVの`appName`へ設定するアプリケーション名 |
| `outputDir` | string | ○ | ASTとCleanerが共用するCSV出力ディレクトリ |
| `sourceFileCsvFilename` | string | － | ソースファイルレベルCSV名。未指定時`ast_source_file_level.csv` |
| `methodCsvFilename` | string | － | メソッドレベルCSV名。未指定時`ast_method_level.csv` |
| `fieldCsvFilename` | string | － | フィールドレベルCSV名。未指定時`ast_field_level.csv` |

### 3.2 共通Config例

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

`AppConfig`で使用しないCleaner用項目は無視する。`targetAppDir`と`outputDir`の相対パスは、Configファイルが存在するディレクトリを基準に絶対パスへ解決する。

---

## 4. クラス・データモデル定義

### 4.1 `AppConfig`

| フィールド | 型 | 説明 |
|---|---|---|
| `targetAppDir` | String | 解析対象ディレクトリ |
| `targetAppName` | String | 対象アプリケーション名 |
| `outputDir` | String | 共通出力ディレクトリ |
| `sourceFileCsvFilename` | String | ソースファイルCSV名 |
| `methodCsvFilename` | String | メソッドCSV名 |
| `fieldCsvFilename` | String | フィールドCSV名 |

### 4.2 `MethodInfo.SourceFileRow`

| フィールド | 型 | 説明 |
|---|---|---|
| `appName` | String | Configの対象アプリケーション名 |
| `fileName` | String | 拡張子を含むJavaファイル名 |
| `directoryPath` | String | `targetAppDir`からの相対ディレクトリ |
| `className` | String | クラス・interface・enum名。クラス外行は`-` |
| `importList` | String | import文を` / `で連結。クラス行は`-` |
| `lineCount` | int | ファイル行数。クラス行は`-1` |
| `methodCount` | int | 対象スコープ内のメソッド＋コンストラクタ数 |
| `variableCount` | int | 非finalフィールドの変数数 |
| `constantCount` | int | finalフィールドとenum列挙子の定数数 |

### 4.3 `MethodInfo.MethodRow`

| フィールド | 型 | 説明 |
|---|---|---|
| `filePath` | String | `targetAppDir`からの相対ファイルパス |
| `className` | String | 所属クラスまたはenum名 |
| `methodName` | String | メソッド名。コンストラクタは`Constructor{process1}` |
| `processCoords` | int[9] | `process1`～`process9`の階層座標 |
| `processContent` | String | 制御構造、`引数`、または`enum` |
| `role` | String | Javadoc全文。未記載時`記載なし` |
| `returnType` | String | JavaParserが返す生の戻り値型。コンストラクタは`-` |
| `methodType` | String | `静的`、`抽象`、`synchronized`、`final`の組合せ |
| `accessModifier` | String | 修飾子を空白区切りで連結。該当なしは`-` |
| `args` | String[20] | 引数またはenum列挙子。未使用列は`-` |

### 4.4 `MethodInfo.FieldRow`

| フィールド | 型 | 説明 |
|---|---|---|
| `filePath` | String | 相対ファイルパス |
| `className` | String | 所属クラスまたはenum名 |
| `methodName` | String | 引数の所属メソッド。クラスフィールドは空欄 |
| `fieldKind` | String | `field`または`parameter` |
| `fieldName` | String | フィールド・引数名 |
| `fieldType` | String | JavaParserが返す生の型 |
| `isFinal` | boolean | final指定有無 |
| `validationMin` | int | `@Min`または`@Size(min=...)`。未取得は`-1` |
| `validationMax` | int | `@Max`または`@Size(max=...)`。未取得は`-1` |
| `nullable` | int | `0`:非null、`1`:nullable、`-1`:判定不能 |
| `rawAnnotations` | String | アノテーション全文。未指定は`-` |

### 4.5 `StructureExtractor.StructureRow`

| フィールド | 型 | 説明 |
|---|---|---|
| `coords` | int[9] | 処理階層座標 |
| `content` | String | 制御構造を表すJavaテキスト |

---

## 5. 各ファイルの処理仕様

### 5.1 `Main.java`

**目的：** Configを読み込み、AST解析全体を起動する。

**入力：** 第1コマンドライン引数のConfigパス。

**出力：** 標準出力の`Success!!!!`または`Error......`。

**処理フロー：**

1. 第1引数、または既定値`./config.json`をConfigパスとする。
2. `AppConfig.load`で設定を読み込む。
3. `JavaAstParser.execParse`を実行する。
4. boolean結果に応じて完了メッセージを出力する。

### 5.2 `AppConfig.java`

**目的：** トップConfigからAST用設定を取得する。

**入力：** JSONファイルパス。

**出力：** パス解決済み`AppConfig`。

**処理仕様：**

1. Configパスを絶対パス化・正規化する。
2. JacksonでJSONをデシリアライズする。
3. ASTが使用しない共通Config項目は無視する。
4. `targetAppDir`と`outputDir`の相対パスをConfig配置ディレクトリ基準で解決する。
5. CSV名が未指定の場合はgetterで既定名を返す。

### 5.3 `JavaAstParser.java`

**目的：** Javaソースを解析し、3種類の行モデルを生成する。

**入力：** `AppConfig`、解析対象`.java`ファイル群。

**出力：** `SourceFileRow`、`MethodRow`、`FieldRow`のリスト。

**処理フロー：**

1. JavaParserの言語レベルを`JAVA_21`に設定する。
2. `targetAppDir`を再帰走査する。
3. 通常ファイルかつ`.java`で終わるファイルだけを選択する。
4. パス中に`/test/`を含むファイルを除外し、パス順にソートする。
5. ファイルごとに`CompilationUnit`へパースする。
6. ファイル単位のクラス外行を必ず1行生成する。
7. ネストを含む全クラス・interface・enumを抽出する。
8. クラス・enum単位の集計行を生成する。
9. コンストラクタを先、メソッドを後として`process1`を1から採番する。
10. 制御構造行と引数専用行を生成する。
11. フィールドと引数をフィールド行へ変換する。
12. 全ファイル処理後に3種類のCSVを出力する。

**個別ファイルのパース失敗：** エラーを標準エラーへ出力し、当該ファイルをスキップして後続ファイルを続行する。

### 5.4 `StructureExtractor.java`

**目的：** メソッド・コンストラクタ本体から制御構造を最大9階層で抽出する。

| 対応構造 | `processContent`形式 |
|---|---|
| if | `if (条件)` |
| else if | `else if (条件)` |
| else | `else` |
| for | `for (初期化; 条件; 更新)` |
| 拡張for | `for (変数 : iterable)` |
| while | `while (条件)` |
| do-while | `do {} while (条件)` |
| switch | `case 値:`または`default:` |
| try | `try` |
| catch | `catch (例外引数)` |
| finally | `finally` |

裸のブロックとラベル付き文は処理単位にせず、その内部を同じ階層として展開する。三項演算子および`&&`・`||`の短絡評価は式レベルであるため抽出対象外とする。10階層目以降は出力しない。

### 5.5 `CsvOutput.java`

**目的：** 行モデルをCSVへシリアライズする。

**処理仕様：**

1. `outputDir`がなければ作成する。
2. 文字コードはBOM無しUTF-8固定とする。
3. 値にカンマ、ダブルクォート、改行が含まれる場合はRFC 4180形式で引用する。
4. ダブルクォートは二重化する。
5. 出力後、ファイル名と行数を標準出力へ表示する。

---

## 6. CSV入出力仕様

### 6.1 `ast_source_file_level.csv`

```text
appName,fileName,directoryPath,className,importList,lineCount,methodCount,variableCount,constantCount
```

1ファイルにつきクラス外行を必ず1行生成し、クラス・interface・enumごとに追加行を生成する。

### 6.2 `ast_method_level.csv`

```text
filePath,className,methodName,process1,...,process9,processContent,role,returnType,methodType,accessModifier,arg1,...,arg20
```

- 各メソッド・コンストラクタに引数専用行を必ず1行生成する。
- 引数専用行は`process2`～`process9`を`0`、`processContent`を`引数`とする。
- enum列挙子行は`process2=-1`、`process3=0`始まりのページ番号、`processContent=enum`とする。
- enum列挙子は20件単位で`arg1`～`arg20`へ格納する。

### 6.3 `ast_field_level.csv`

```text
filePath,className,methodName,fieldKind,fieldName,fieldType,isFinal,validationMin,validationMax,nullable,rawAnnotations
```

`@Min`、`@Max`、`@Size(min=..., max=...)`を整数境界として抽出する。`@NotNull`、`@NotBlank`、`@NotEmpty`を非null、`@Nullable`をnullableとして判定する。式や定数参照を整数へ変換できない場合は`-1`とする。

---

## 7. エラーハンドリング方針

| エラー種別 | 実装上の処理 | プロセス終了コード |
|---|---|---|
| Config読込失敗 | エラー内容と`Error......`を出力してreturn | 明示指定なし |
| 対象ディレクトリ走査失敗 | `catch Error`を出力し`false`を返す | 明示指定なし |
| 個別Javaファイルのパース失敗 | `Parse Error`を出力し、そのファイルをスキップ | 正常処理を継続 |
| CSVディレクトリ作成・書込失敗 | `catch Error`を出力し`false`を返す | 明示指定なし |
| 相対パス算出失敗 | 警告を出し、絶対パスをCSVへ格納 | 正常処理を継続 |
| 全体成功 | 3CSV出力後`Success!!!!`を表示 | 明示指定なし |

現行`Main`は`System.exit`を使用しないため、成否に応じた終了コード制御は行わない。

---

## 8. ビルド・依存関係

| 種別 | 名称 | バージョン | 用途 |
|---|---|---:|---|
| JDK | Java | 17 | コンパイル・実行 |
| ライブラリ | JavaParser Core | 3.26.1 | Java AST解析 |
| ライブラリ | Jackson Databind | 2.17.1 | Config読込 |
| Maven Plugin | maven-compiler-plugin | 3.13.0 | Java 17コンパイル |
| Maven Plugin | maven-shade-plugin | 3.5.3 | 依存込み実行可能JAR生成 |

メインクラスは`com.ast_tool.Main`。成果物は通常JARに加え、classifier `with-dependencies`のfat JARを生成する。

---

## 9. 実行ログ例

```text
Foo.java
Bar.java
ast_source_file_level.csv: 5行
ast_method_level.csv: 18行
ast_field_level.csv: 12行
Success!!!!
```

個別ファイル失敗時は次の形式とする。

```text
Parse Error: /path/to/Broken.java -> <JavaParserのエラー内容>
```

---

## 10. 制約・対象外

| 項目 | 内容 |
|---|---|
| 対象ファイル | `.java`のみ |
| テストソース | パスに`test`ディレクトリを含むファイルは除外 |
| 最大制御階層 | `process1`～`process9` |
| 最大引数列 | 20列。21件目以降のメソッド引数は出力しない |
| 式レベル分岐 | 三項演算子、`&&`、`||`は対象外 |
| 型解決 | シンボルソルバーを使用せず、生の型テキストを記録 |
| JSON出力 | 対象外。CSV 3種類のみ |
| レコード宣言 | 専用処理を持たない |
| Docker・DB接続 | 本ツールの責務外 |

---

## 11. テスト・確認観点

本モジュールには添付時点で自動テストコードが含まれていない。実装確認では最低限、次を検証対象とする。

1. クラス、interface、ネストクラス、enumの集計行。
2. コンストラクタ先行の`process1`採番。
3. 9階層までの制御構造座標。
4. enum列挙子20件境界と複数ページ。
5. 複数変数フィールド宣言の個別行化。
6. `@Min`、`@Max`、`@Size`、nullabilityアノテーション。
7. カンマ、引用符、改行を含むCSV値。
8. 一部ファイルのパース失敗後も残りを出力すること。
9. 実行ディレクトリに依存せず、トップConfig基準でパス解決されること。
