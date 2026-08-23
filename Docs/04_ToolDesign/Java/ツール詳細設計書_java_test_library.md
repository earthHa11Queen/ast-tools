# ツール詳細設計書

- システム名：AST-TOOLS
- ツール名：java_test_library
- 作成日：2026-08-13
- 対応言語：Java 17
- 配置場所：Java/java_test_library/
- Maven座標：com.ast_tool:junit-common-library:0.1.0

---

## 1. 概要

### 1.1 目的

テストデータ指示CSVを読み込み、鏡の原理のX・Y・Z軸またはNORMAL規則に従ってJavaテスト実行値を決定論的に生成する共通ランタイムライブラリである。生成した実測値をEvidence CSVへ記録し、後続実行ではEvidenceから同一値・同一コンテナ構造をREPLAYできるようにする。

本ライブラリはJava標準のscalar/value型、Collection、Java配列、Set、Map、ネストしたコンテナを担当する。対象プロジェクト固有のDTO生成、SUT呼出し、Test Oracleは生成JUnit側の責務とする。

### 1.2 処理の全体像

```text
Instruction CSVを読み込む
    ↓
CaseNo + dataIdでInstructionを索引化
    ↓
Generated JUnitがgetValueを呼び出す
    ↓
convModelでscalar／containerを判定
    ├─ GENERATE
    │    ├─ FIXED値
    │    ├─ Mirror X/Y/Z
    │    └─ NORMAL値
    └─ REPLAY
         └─ CaseNo + dataId + elementIndexでEvidenceを復元
    ↓
Java型へ変換・コンテナ構築
    ↓
実際に使用した値と長さをEvidence CSVへ追記
    ↓
Generated JUnitがSUTへ入力し、Oracleで検証
```

### 1.3 実行タイミング

JUnitテストケースの実行中に、生成JUnitまたは手書きJUnitからライブラリAPIとして利用する。独立したエントリーポイントや実行シェルは持たない。

```text
JUnitテスト開始
    ↓
TestDataRuntime構築
    ↓
テストデータ取得・Evidence記録
    ↓
SUT実行・assertion
    ↓
TestDataRuntime.close
```

### 1.4 ビルド方法

```bash
cd Java/java_test_library
mvn test
mvn package
```

本ライブラリを利用する対象プロジェクトでは、Maven依存関係またはテストクラスパスに`junit-common-library`を追加する。削除対象となった`build_junit_test.sh`による一時コピーは設計対象外とする。

---

## 2. ディレクトリ構成

```text
Java/java_test_library/
├── pom.xml
├── README.md
├── junit_connection_contract.md
└── src/
    ├── main/java/com/ast_tool/junit/common/
    │   ├── TestDataRuntime.java
    │   ├── container/
    │   │   ├── ContainerFactory.java
    │   │   ├── ContainerSizeResolver.java
    │   │   └── JavaReferenceTypeResolver.java
    │   ├── converter/
    │   │   └── RuntimeValueConverter.java
    │   ├── evidence/
    │   │   └── TestDataEvidenceRecorder.java
    │   ├── generator/
    │   │   ├── MirrorId.java
    │   │   ├── MirrorValueResolver.java
    │   │   ├── MirrorXValueGenerator.java
    │   │   ├── MirrorYValueGenerator.java
    │   │   ├── MirrorZValueGenerator.java
    │   │   └── NormalValueGenerator.java
    │   ├── model/
    │   │   ├── DataRole.java
    │   │   ├── GeneratedValue.java
    │   │   ├── TestDataEvidence.java
    │   │   ├── TestDataEvidenceKey.java
    │   │   ├── TestDataInstruction.java
    │   │   ├── TestDataKey.java
    │   │   ├── TestDataMode.java
    │   │   └── ValueState.java
    │   ├── reader/
    │   │   ├── TestDataCsvReader.java
    │   │   └── TestDataReplayReader.java
    │   └── util/
    │       └── CsvUtil.java
    └── test/java/com/ast_tool/junit/common/
        ├── ContainerRuntimeTest.java
        ├── TestDataRuntimeTest.java
        └── generator/
            └── MirrorYValueGeneratorTest.java
```

---

## 3. 利用設定・公開API

### 3.1 Builderによる構築

```java
try (TestDataRuntime testData = TestDataRuntime.builder()
        .instructionCsv(Path.of("test_data_instruction.csv"))
        .evidenceOutputCsv(Path.of("test_data_evidence.csv"))
        .mode(TestDataMode.GENERATE)
        .build()) {

    String value = testData.getValue(
            "UTAPI-000001",
            "request.name",
            String.class
    );
}
```

| Builder項目 | 型 | 必須条件 | 説明 |
|---|---|---|---|
| `instructionCsv` | Path | 常に必須 | Instruction CSV |
| `evidenceOutputCsv` | Path | 任意 | Evidence出力先。未指定なら記録しない |
| `replayInputCsv` | Path | REPLAY時必須 | 復元元Evidence CSV |
| `mode` | TestDataMode | 任意 | 既定値`GENERATE` |

### 3.2 システムプロパティによる構築

`TestDataRuntime.fromSystemProperties()`は次のJavaシステムプロパティを使用する。

| プロパティ | 必須条件 | 説明 |
|---|---|---|
| `testDataFile` | 常に必須 | Instruction CSV |
| `testDataEvidenceFile` | 任意 | Evidence出力先 |
| `testDataReplayFile` | REPLAY時必須 | Replay入力CSV |
| `testDataMode` | 任意 | `generate`または`replay`。未指定はGENERATE |

```bash
mvn test \
  -DtestDataMode=generate \
  -DtestDataFile=/path/to/test_data_instruction.csv \
  -DtestDataEvidenceFile=/path/to/test_data_evidence.csv
```

### 3.3 公開メソッド

| メソッド | 戻り値 | 説明 |
|---|---|---|
| `builder()` | Builder | Runtime構築用Builderを返す |
| `fromSystemProperties()` | TestDataRuntime | Javaシステムプロパティから構築する |
| `getValue(caseNo, dataId, type)` | T | Instructionを解決し、指定Java型で値を返す |
| `getInstruction(caseNo, dataId)` | TestDataInstruction | 読み込まれたInstructionを返す |
| `mode()` | TestDataMode | 現在の実行モードを返す |
| `close()` | void | 現実装ではリソースを保持しないためno-op |

---

## 4. モデル・Enum定義

### 4.1 `TestDataInstruction`

| フィールド | 型 | 説明 |
|---|---|---|
| `caseNo` | String | テストケース番号 |
| `dataId` | String | テストデータ識別子 |
| `targetId` | String | 対象識別子 |
| `dataRole` | DataRole | TARGET、NORMAL、FIXED |
| `convModel` | String | 言語共通型モデル |
| `mirrorX` | String | X軸Mirror ID |
| `mirrorY` | String | Y軸Mirror ID |
| `mirrorZ` | String | Z軸Mirror ID |
| `validationMin` | String | 最小値・最小長。未定義は`-`または`-1` |
| `validationMax` | String | 最大値・最大長。未定義は`-`または`-1` |
| `nullable` | boolean | null許容 |
| `referenceType` | String | Java具体型・コンテナ型 |
| `fixedValue` | String | FIXED時の固定値 |
| `referenceValues` | List<String> | enum候補等。CSVでは` / `区切り |

一意キーは`caseNo + dataId`とする。

### 4.2 `TestDataEvidence`

Instructionの項目に加え、次の実測項目を持つ。

| フィールド | 型 | 説明 |
|---|---|---|
| `elementIndex` | int | 直接値・ルートは`-1`、子要素は0以上 |
| `valueState` | ValueState | NULL、EMPTY、VALUE、NO_VALUE |
| `actualValue` | String | 実際に使用したシリアライズ値 |
| `actualLength` | int | 文字数・コンテナ要素数。非該当は`-1` |
| `runMode` | TestDataMode | GENERATEまたはREPLAY |

Replayの一意キーは`caseNo + dataId + elementIndex`とする。

### 4.3 Enum

| Enum | 値 | 動作 |
|---|---|---|
| `DataRole` | TARGET | MirrorまたはNORMAL規則で生成 |
|  | NORMAL | MirrorまたはNORMAL規則で生成 |
|  | FIXED | `fixedValue`をそのまま使用 |
| `TestDataMode` | GENERATE | Mirror・NORMAL規則で新規生成 |
|  | REPLAY | Evidence値のみから復元 |
| `ValueState` | NULL | Javaのnull |
|  | EMPTY | 空文字または空コンテナ |
|  | VALUE | 値あり |
|  | NO_VALUE | 値を生成しない。Java変換時はnull |

`DataRole`が空、`-`の場合はNORMAL、`TestDataMode`が空の場合はGENERATEとする。その他の未知値は`valueOf`による例外とする。

### 4.4 `GeneratedValue`

`ValueState`とシリアライズ値を保持する。`actualLength()`はNULL・NO_VALUEなら`-1`、それ以外はUnicodeコードポイント数を返す。

---

## 5. 各ファイルの処理仕様

### 5.1 `TestDataRuntime.java`

**目的：** Instruction、生成器、型変換、コンテナ構築、Evidenceを統合するFacade。

**初期化フロー：**

1. `instructionCsv`を必須確認する。
2. Instruction CSVを`Map<TestDataKey, TestDataInstruction>`へ読み込む。
3. REPLAYの場合は`replayInputCsv`を必須確認してEvidenceを読み込む。
4. Evidence出力先が指定されていればRecorderを初期化する。
5. Mirror resolver、converter、container resolver/factoryを初期化する。

**`getValue`フロー：**

1. `caseNo + dataId`でInstructionを取得する。
2. `convModel`が`COLLECTION`、`ARRAY`、`MAP`ならコンテナ処理へ進む。
3. その他はscalar処理へ進む。
4. GENERATEではMirror/FIXED/NORMALから値を生成する。
5. REPLAYではEvidenceの完全一致キーから値を復元する。
6. Evidence出力が有効なら実際に使用した値を記録する。
7. 指定されたJava型へ変換して返す。

### 5.2 `TestDataCsvReader.java`

**目的：** Instruction CSVを読んで一意キーMapへ変換する。

**必須列：**

```text
CaseNo,dataId,targetId,dataRole,convModel,mirrorX,mirrorY,mirrorZ,validationMin,validationMax,nullable,referenceType,fixedValue,referenceValues
```

**処理仕様：**

- CSVが空なら失敗する。
- 必須列が1つでもなければ失敗する。
- 全セルが空の行は読み飛ばす。
- `nullable`は`1`、`true`、`yes`をtrueとし、それ以外をfalseとする。
- `referenceValues`は前後に空白を持つ` / `で分割する。
- 同じ`CaseNo + dataId`が複数存在する場合は失敗する。

### 5.3 `TestDataReplayReader.java`

**目的：** Evidence CSVをReplay Mapへ変換する。

**必須列：**

```text
CaseNo,dataId,targetId,dataRole,convModel,mirrorX,mirrorY,mirrorZ,validationMin,validationMax,nullable,referenceType,elementIndex,valueState,actualValue,actualLength,runMode
```

数値項目、Enum項目が不正な場合は例外とする。同じ`CaseNo + dataId + elementIndex`が複数存在する場合は失敗する。

### 5.4 `MirrorValueResolver.java`

**解決順：**

1. `dataRole=FIXED`なら`fixedValue`。
2. X/Y/Zの指定数を数える。
3. 複数軸が同時指定されていれば失敗する。
4. 指定された1軸の生成器を呼び出す。
5. 軸指定がなければNORMAL生成器を呼び出す。

Mirror IDは`数値接頭辞:シンボルID`またはシンボルID単体を許可し、最初の`:`より後を実行IDとして使用する。

### 5.5 `MirrorXValueGenerator.java`

| Mirror ID | 生成値 |
|---|---|
| `fw_alphanum` | `ＡＢＣ１２３` |
| `fw_kanji_common` | `日本語` |
| `hw_alphanum` | `AbC123` |
| `hw_symbol` | `!@#$%` |
| `hw_integer` | `123` |
| `hw_datetime` | `2000-01-01T00:00:00` |
| `full_width` | `Ａ` |
| `half_width` | `A` |

表にないIDは例外とする。

### 5.6 `MirrorYValueGenerator.java`

| Mirror ID | scalarでの動作 |
|---|---|
| `length_null` | NULL |
| `length_empty` | EMPTY |
| `length_min` | 最小長・最小値 |
| `length_min_minus_1` | 最小長・最小値－1 |
| `length_max` | 最大長・最大値 |
| `length_max_plus_1` | 最大長・最大値＋1 |
| `length_normal_mid` | 最小・最大の中間値 |

- STRING/CHARは`A`の繰返し数として長さ境界を表現する。
- NUMBER/DECIMALは`BigDecimal`で境界を計算し、末尾0を除去する。
- 必要な制約が未定義の場合は失敗する。
- 算出文字列長が負になる場合は失敗する。
- 中間値で制約がなければNORMALへフォールバックする。

### 5.7 `MirrorZValueGenerator.java`

Z軸は、次の決定論的な代表値を生成する。

| Mirror ID | 生成値・動作 |
|---|---|
| `half-width_only` | `ABC123` |
| `full-width_only` | `ＡＢＣ１２３` |
| `letters_only` | `AbCd` |
| `numbers_only` | `1234` |
| `symbols_only` | `!@#$` |
| `mixed_half-width_and_full-width` | `AＢ1２` |
| `alphanumeric_mix` | `Ab12` |
| `chaotic_mix` | `AＢ1２!＠漢` |
| `integer_positive` | `1` |
| `integer_negative` | `-1` |
| `integer_zero` | `0` |
| `decimal_positive` | `1.5` |
| `decimal_negative` | `-1.5` |
| `decimal_repeating` | `0.3333333333333333` |
| `zero-padding_enabled` / `zero_padded` | `0001` |
| `zero-padding_disabled` / `not_zero_padded` | `1` |
| `sign_indication_plus_sign_included` | `+1` |
| `sign_indication_minus_sign_included` | `-1` |
| `exponential_notation` | `1E3` |
| `comma-separated` | `1,000` |
| `valid_value` / `within_valid_range` | NORMAL生成 |
| `invalid_value` | `__INVALID__` |
| `out_of_range` | 最大値＋1、または最小値－1 |
| `leap_year` | `2000-02-29` |
| `with_time_zone` | `2000-01-01T00:00:00+09:00` |
| `without_time_zone` | `2000-01-01T00:00:00` |
| `unix_timestamp__seconds` | `946684800` |
| `unix_timestamp__milliseconds` | `946684800000` |
| `unix_timestamp__negative` | `-1` |
| `unix_timestamp__32_bit_boundary` | `2147483647` |
| `excel_serial__integer` | `36526` |
| `excel_serial__decimal` | `36526.5` |
| `excel_serial__negative` | `-1` |
| `excel_serial__feb_29_1900_bug` | `60` |
| `half-width@` | `@` |
| `full-width@` | `＠` |
| `invalid_domain` | `invalid_domain` |
| `with_hyphen` | `123-4567` |
| `without_hyphen` | `1234567` |
| `insufficient_length` | `1` |
| `within_definition` | `referenceValues`先頭 |
| `outside_the_definition` | `__OUTSIDE_DEFINITION__` |
| `space` | 半角空白 |
| `line_break_code_crlf` | CRLF |
| `line_break_code_lf` | LF |
| `tab` | タブ |
| `control_character_null` | NULL文字（U+0000） |
| `surrogate_pair` | `😀` |
| `environment-dependent_character` | `①` |
| `character_with_mapping_differences` | `髙` |
| `sql` | `' OR '1'='1` |
| `os_command` | `echo mirror_test` |
| `html/script` | `<script>alert(1)</script>` |
| `mathematical_formula` | `1+1` |
| `db_null` / `null` | NULL |
| `empty` | EMPTY |
| `undefined` | `__UNDEFINED__` |

`within_definition`に参照値がない場合、または`out_of_range`に有効な最小・最大境界がない場合は失敗する。未知IDは推測せず例外とする。

### 5.8 `NormalValueGenerator.java`

| convModel | NORMAL値 |
|---|---|
| STRING | `test` |
| CHAR | `A` |
| NUMBER | `1` |
| DECIMAL | `1.0` |
| BOOLEAN | `true` |
| DATE | `2000-01-01` |
| DATETIME | `2000-01-01T00:00:00` |
| ENUM | `referenceValues`先頭。なければ`fixedValue` |
| `-`、空 | NO_VALUE |

その他の型は、プロジェクト固有Object生成を共通Runtimeへ持ち込まないため失敗する。

### 5.9 `RuntimeValueConverter.java`

GeneratedValueを次のJava型へ変換する。

```text
String / Object
char / Character
byte / Byte
short / Short
int / Integer
long / Long
float / Float
double / Double
BigInteger / BigDecimal
boolean / Boolean
LocalDate / LocalDateTime / OffsetDateTime / ZonedDateTime
UUID
Enum
```

NULLまたはNO_VALUEはnullを返す。charはUnicodeコードポイント数が1でなければ失敗する。プロジェクト固有Objectへの変換は拒否する。

### 5.10 コンテナ処理

#### サイズ決定

Mirror Yがなければ標準サイズ3を使用し、`validationMin`・`validationMax`内へ補正する。

| Mirror Y | コンテナ状態・サイズ |
|---|---|
| `length_null` | NULL、サイズ`-1` |
| `length_empty` | EMPTY、サイズ`0` |
| `length_min` | `validationMin` |
| `length_min_minus_1` | `validationMin - 1` |
| `length_max` | `validationMax` |
| `length_max_plus_1` | `validationMax + 1` |
| `length_normal_mid` | 標準サイズ3を制約内に補正 |

負のサイズは失敗とする。

#### 子Instruction命名規則

```text
Collection / Array / Set root: dataId
要素:                          dataId[]

Map root:                      dataId
キー:                          dataId{key}
値:                            dataId{value}
```

#### Javaコンテナへの変換

| convModel・referenceType | 実装 |
|---|---|
| ARRAY | LinkedHashSet |
| COLLECTION + `T[]` | Java配列 |
| COLLECTION + Set系 | LinkedHashSet |
| COLLECTION + Queue/Deque系 | ArrayDeque |
| COLLECTION + List等 | ArrayList |
| MAP | LinkedHashMap |

Set要素およびMapキーは構造成立のため決定論的に一意化する。STRINGは`_{index}`、数値はindex加算、DATEは日加算、DATETIMEは秒加算、ENUMは`referenceValues[index]`を使用する。一意値を生成できない型、enum候補不足、Mapキー衝突は失敗する。

ネストしたコンテナは通常の子として再帰構築できる。ただし一意性が必要なSet要素またはMapキーにコンテナ・Objectを置く構成は対象外とする。

### 5.11 `TestDataEvidenceRecorder.java`

**目的：** 実際に使用したscalar値・コンテナ状態をCSVへ同期追記する。

1. 出力先の親ディレクトリを作成する。
2. ファイルが存在しない、または空の場合のみヘッダーを作成する。
3. scalarは値・状態・実測長を記録する。
4. containerは実測要素数を`actualLength`へ記録し、VALUE時の`actualValue`は空とする。
5. 全追記メソッドを`synchronized`として同一JVM内の競合を防ぐ。

既存の非空Evidenceへは追記する。実行ごとに新規Evidenceが必要な場合、呼出側が開始前に出力ファイルを切り替えるか初期化する。

### 5.12 `CsvUtil.java`

- UTF-8で読み書きする。
- CRLF、LF、引用セル、引用セル内改行、二重化引用符を処理する。
- 引用セルの途中でEOFになった場合は失敗する。
- Evidence追記時はカンマ、引用符、改行を含む値を引用する。

---

## 6. CSV契約

### 6.1 Instruction CSV

```text
CaseNo,dataId,targetId,dataRole,convModel,mirrorX,mirrorY,mirrorZ,validationMin,validationMax,nullable,referenceType,fixedValue,referenceValues
```

| 契約 | 内容 |
|---|---|
| 一意キー | `CaseNo + dataId` |
| 空行 | 読み飛ばす |
| Mirror軸 | X/Y/Zの同時指定は最大1軸 |
| 参照値 | ` / `区切り |
| コンテナ子 | `[]`、`{key}`、`{value}`の命名規則を使用 |

### 6.2 Evidence CSV

```text
CaseNo,dataId,targetId,dataRole,convModel,mirrorX,mirrorY,mirrorZ,validationMin,validationMax,nullable,referenceType,elementIndex,valueState,actualValue,actualLength,runMode
```

| 契約 | 内容 |
|---|---|
| 一意キー | `CaseNo + dataId + elementIndex` |
| 直接値・root | `elementIndex=-1` |
| 繰返し子 | `elementIndex=0..N` |
| scalar長 | Unicodeコードポイント数 |
| container長 | 実際の要素数・entry数 |
| NULL・NO_VALUE長 | `-1` |
| Replay | 一致Evidence必須。生成へのfallback禁止 |

---

## 7. GENERATE・REPLAY仕様

### 7.1 GENERATE

1. Instructionから値またはコンテナサイズを決定する。
2. 必要に応じてSet要素・Mapキーを一意化する。
3. Java型へ変換する。
4. Evidence出力が指定されていれば実測値を記録する。

### 7.2 REPLAY

1. Runtime構築時にEvidence CSV全体を読み込む。
2. scalar・container root・各子要素について完全一致キーを検索する。
3. `valueState`、`actualValue`、`actualLength`を復元する。
4. Mirror生成器は呼び出さない。
5. 該当Evidenceがなければ即時失敗する。
6. Replay時もEvidence出力先が指定されていれば、実際にReplayした値を新たに記録する。

ContainerのVALUE行は`actualLength >= 0`を必須とし、NO_VALUEによるcontainer復元は禁止する。

---

## 8. エラーハンドリング方針

本ライブラリは独立プロセスではないため、終了コードを制御しない。契約違反は主に`IllegalStateException`または`IllegalArgumentException`として呼出元JUnitへ伝播させ、テストを失敗させる。

| エラー種別 | 処理 |
|---|---|
| Instruction/Replay CSV読込失敗 | 原因例外を保持した`IllegalStateException` |
| CSV空・必須列不足 | 即時例外 |
| Instruction・Replayキー重複 | 即時例外 |
| 必須システムプロパティ不足 | 即時例外 |
| REPLAY入力未指定 | Runtime構築時に失敗 |
| Replay値欠落 | fallbackせず即時例外 |
| 複数Mirror軸指定 | 即時例外 |
| 未知Mirror ID | 推測せず即時例外 |
| 必須境界・enum候補不足 | 即時例外 |
| Java型変換失敗 | 変換例外または`IllegalStateException` |
| プロジェクト固有Object変換 | 明示的に拒否 |
| コンテナサイズ負数 | 即時例外 |
| Set要素・Mapキー衝突 | 即時例外 |
| Evidence初期化・追記失敗 | `IllegalStateException` |

---

## 9. ビルド・依存関係

| 種別 | 名称 | バージョン | 用途 |
|---|---|---:|---|
| JDK | Java | 17 | コンパイル・実行 |
| テスト依存 | JUnit Jupiter | 5.10.2 | 本ライブラリの単体テスト |
| Maven Plugin | maven-surefire-plugin | 3.3.1 | JUnit 5実行 |

本体実装はJava標準ライブラリだけを使用する。JUnit Jupiterは`test`スコープであり、ランタイム本体の依存には含めない。

---

## 10. 自動テスト仕様

### 10.1 `TestDataRuntimeTest`

| テスト | 確認内容 |
|---|---|
| `generateYMaxPlusOneAndWriteEvidence` | Y軸最大＋1生成とEvidence記録 |
| `distinguishNullAndEmpty` | NULLとEMPTYの状態・Java値の区別 |
| `generateStringBoundary` | 文字列境界長生成 |
| `replayUsesRecordedActualValueWithoutRegeneration` | 生成器を使わないReplay |
| `replayMissingValueFailsFast` | Replay欠落時のfail-fast |
| `currentV4XIdsAreDeterministic` | V4 X軸IDの決定性 |
| `arbitraryProjectObjectConversionIsRejected` | プロジェクト固有Object変換拒否 |

### 10.2 `ContainerRuntimeTest`

| テスト | 確認内容 |
|---|---|
| `normalListGeneratesThreeElementsAndEvidenceRows` | NORMAL List 3要素とEvidence |
| `emptyListMeansZeroElements` | 空List |
| `javaArrayUsesElementInstruction` | Java配列と子Instruction |
| `mapCreatesThreeEntriesWithUniqueKeys` | Map 3要素と一意キー |
| `setCreatesThreeDistinctElementsForStructuralValidity` | Set要素の決定論的一意化 |
| `replayRestoresContainerAndChildrenWithoutGenerators` | container root・子のReplay |

### 10.3 `MirrorYValueGeneratorTest`

| テスト | 確認内容 |
|---|---|
| `allSevenYIds` | Y軸7 IDの全動作 |
| `numericBoundaries` | NUMBERの最小－1、最大＋1 |

---

## 11. 制約・責務境界

| 項目 | 内容 |
|---|---|
| DTO/Object構築 | 対象外。Generated JUnit側でconstructor/setter/builder/factoryを使用 |
| SUT呼出し | 対象外 |
| Test Oracle・assertion | 対象外 |
| scenario固有の要素配置 | 対象外 |
| Mirror複数軸合成 | 対象外。1 Instructionにつき最大1軸 |
| Replay fallback | 禁止 |
| Evidenceの実行単位初期化 | 呼出側責務。ライブラリは既存非空ファイルへ追記 |
| 外部ビルドシェル | 対象外。`build_junit_test.sh`は削除 |
| Docker | 対象外 |
| Config JSON | 本ライブラリは直接参照しない。BuilderまたはJavaシステムプロパティを使用 |

---

## 12. 利用例

### 12.1 scalar

```java
String name = testData.getValue(caseNo, "request.name", String.class);
Integer port = testData.getValue(caseNo, "request.port", Integer.class);
```

### 12.2 container

```java
List<?> items = testData.getValue(caseNo, "items", List.class);
Map<?, ?> mapping = testData.getValue(caseNo, "mapping", Map.class);
String[] args = testData.getValue(caseNo, "args", String[].class);
```

### 12.3 DTO責務分離

```java
String dbName = testData.getValue(caseNo, "request.dbName", String.class);
Integer dbPort = testData.getValue(caseNo, "request.dbPort", Integer.class);

ConnectionSettingRequest request = new ConnectionSettingRequest();
request.setDbName(dbName);
request.setDbPort(dbPort);
```

`ConnectionSettingRequest`の生成・設定は本ライブラリではなく、対象プロジェクトを知るGenerated JUnitが担当する。
