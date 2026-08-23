# junit-common-library

`ast-tools-dev` の JUnit 実行時共通ライブラリ。

## 役割

このライブラリは **SUT固有 DTO/Object を組み立てません**。SUT 固有クラス、constructor、setter、builder 等を知りません。

一方、Java標準の scalar/value 型と、Instructionで構造化された Collection / Array / Map は Runtime が生成します。

```text
JUnit Data Instruction CSV
        ↓
TestDataRuntime
        ├─ GENERATE: Mirror ID → Java実測値
        └─ REPLAY: Evidence実測値 → Java値復元
        ↓
Generated JUnit
        ↓
SUT

TestDataRuntime
        ↓
Evidence CSV
```

DTO/Object の構築は JUnit Code Generator の責務です。

```java
String dbName = testData.getValue(caseNo, "request.dbName", String.class);
Integer dbPort = testData.getValue(caseNo, "request.dbPort", Integer.class);

ConnectionSettingRequest request = new ConnectionSettingRequest();
request.setDbName(dbName);
request.setDbPort(dbPort);
```

Collection / Array / Map は同じ `getValue` 入口から取得します。

```java
List<?> items = testData.getValue(caseNo, "items", List.class);
Map<?, ?> mapping = testData.getValue(caseNo, "mapping", Map.class);
String[] args = testData.getValue(caseNo, "args", String[].class);
```

## Instruction CSV

```text
CaseNo,dataId,targetId,dataRole,convModel,mirrorX,mirrorY,mirrorZ,validationMin,validationMax,nullable,referenceType,fixedValue,referenceValues
```

- `CaseNo + dataId` が Instruction の一意キー。
- `convModel` は多言語共通化を前提とした独自正規化モデル。
- Java Runtime は `convModel + referenceType` から具体的Java型を決める。
- Collection / Java配列の子は `dataId[]`。
- Mapの子は `dataId{key}` / `dataId{value}`。
- NORMAL container は原則3要素。
- ContainerのMirror Yは要素数 / entry数を表す。

## Evidence CSV

```text
CaseNo,dataId,targetId,dataRole,convModel,mirrorX,mirrorY,mirrorZ,validationMin,validationMax,nullable,referenceType,elementIndex,valueState,actualValue,actualLength,runMode
```

- `elementIndex=-1`: scalar直接値 / container root / 要素番号非適用。
- `elementIndex>=0`: Collection / Array element、Map key/value、nested container instance。
- Evidence / Replay の実質キーは `CaseNo + dataId + elementIndex`。
- container行の `actualLength` は実際の要素数 / entry数。
- container自体の `toString()` は保存せず、子Evidenceから構造を復元する。
- EvidenceはReplay用だけでなく、実際に投入した値の実行証跡。

## 実行モード

### GENERATE

Instruction CSV の Mirror ID とNORMAL規則から実測値を決定論的に生成し、Evidence CSV に記録します。

### REPLAY

Evidence CSV に保存した `valueState / actualValue / actualLength / elementIndex` から実行値を復元します。
Mirror generator への fallback は行いません。

Replay データが欠落している場合は fail-fast します。

## Java container変換

`convModel` はJava型体系へ変更せず、Java Runtime側で `referenceType` を判定します。

```text
COLLECTION + List...  → List系
COLLECTION + Queue... → Queue系
COLLECTION + Deque... → Deque系
COLLECTION + T[]      → Java配列
ARRAY      + Set...   → Set系
MAP        + Map...   → Map系
```

Map key、およびSet要素はコンテナ構造を成立させるためにのみ決定論的な重複回避を行います。

## Project dependency boundary

Runtimeが扱う:

```text
scalar/value
Collection
Java array
Set等のARRAY正規化モデル
Map
nested Collection / Array / Map
Evidence / Replay
```

Runtimeが扱わない:

```text
Project DTO constructor/setter/builder/factory
Project DTO graph construction
SUT method invocation
assertion/oracle
「要素1正常、要素2異常」のようなscenario-specific element arrangement
```

## 利用例

```java
try (TestDataRuntime testData = TestDataRuntime.builder()
        .instructionCsv(Path.of("test-data.csv"))
        .evidenceOutputCsv(Path.of("test-data-evidence.csv"))
        .mode(TestDataMode.GENERATE)
        .build()) {

    String name = testData.getValue("UTAPI-000001", "request.dbName", String.class);
    Integer port = testData.getValue("UTAPI-000001", "request.dbPort", Integer.class);
}
```

Replay:

```java
try (TestDataRuntime testData = TestDataRuntime.builder()
        .instructionCsv(Path.of("test-data.csv"))
        .replayInputCsv(Path.of("previous-evidence.csv"))
        .evidenceOutputCsv(Path.of("replay-evidence.csv"))
        .mode(TestDataMode.REPLAY)
        .build()) {
    ...
}
```

System property:

```text
-DtestDataMode=generate
-DtestDataFile=...
-DtestDataEvidenceFile=...
-DtestDataReplayFile=...
```

## Mirror ID

数値 prefix は実行ロジックから分離します。

```text
6:length_max_plus_1
        ↓
length_max_plus_1
```

未知 Mirror ID は推測せず例外終了します。

## ビルド

```bash
mvn test
mvn package
```
