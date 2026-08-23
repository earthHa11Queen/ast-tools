# junit-common-library 詳細設計書

## 1. 目的

`test_spec_validation` と Cleaner/SQLite から作られる **JUnit Data Instruction CSV** を実行時に読み込み、Mirror ID から具体的な Java 値を決定論的に生成する。

具体値は事前 CSV へ焼き込まず、JUnit 実行時に確定する。

確定した値は Evidence CSV へ保存し、再試験では Evidence の実測値を直接 Replay できるようにする。

本ライブラリは Java 専用 Runtime である。
`convModel` は Java の型体系そのものではなく、複数言語で共有可能な独自の正規化データモデルとして扱う。
Java Runtime は `convModel` と `referenceType` を用いて Java の具体型へ変換する。

---

## 2. 責務境界

### 本ライブラリが行う

1. Instruction CSV 読込
2. `CaseNo + dataId` によるInstruction解決
3. GENERATE / REPLAY モード切替
4. Mirror X/Y/Z の実値生成
5. NORMAL / FIXED 値生成
6. Java scalar/value 型への変換
7. Java Collection / Array / Map の生成
8. Collection / Array / Map 配下の要素値生成
9. Evidence CSV 出力
10. Replay CSV 読込
11. NULL / EMPTY / VALUE の区別
12. 未知ID・欠落Replayデータ等の fail-fast

### 本ライブラリが行わない

1. Test Specification生成
2. Mirror ID選択
3. Mirror candidate validation
4. targetId validation
5. SUT固有DTO/Object construction
6. SUT固有constructor/setter/builder/factory解析
7. method invocation生成
8. assertion/oracle生成
9. 期待結果推論
10. project-specific class の構造解釈
11. 1つのCollection/Array/Map内で「第1要素は正常、第2要素は異常」のようなシナリオ意味付け
12. ループ継続・中断・途中異常などの制御フローシナリオ生成

Collection/Array/Map のコンテナ生成は汎用Runtime責務である。

一方、SUT固有DTO/Objectの生成はRuntime責務ではない。

また、複数要素のうち特定位置だけ異常値にすることは、単一Instructionから値を生成するRuntimeの責務ではなく、生成JUnit Test Scenario側の責務とする。

---

## 3. Project dependency 境界

```text
汎用
────────────────────────────────
CaseNo
dataId / field path
convModel
Mirror ID
validationMin / validationMax
nullable
referenceType
fixedValue
referenceValues
runtime scalar value generation
runtime Collection / Array / Map generation
Evidence
Replay
────────────────────────────────
ここを越えない
────────────────────────────────
Project dependency
具体DTO class
constructor
setter
builder
factory
nested DTO construction
method invocation
scenario-specific element arrangement
```

`request.address.city` は単なる lookup key として扱うため汎用。

`new Address()` や `request.setAddress(...)` は JUnit Code Generator が生成する。

`items[]`、`mapping{key}`、`mapping{value}` も Runtime にとっては Instruction の dataId であり、Project固有DTO構造とは区別する。

---

## 4. 公開API

外部公開の中心は `TestDataRuntime`。

```java
<T> T getValue(String caseNo, String dataId, Class<T> type)
```

生成JUnitから `MirrorYValueGenerator` 等を直接呼ばない。

Collection / Array / Map 対応でも、生成JUnitは原則として `TestDataRuntime` を入口とする。

Javaの具体的なCollection/Array/Map型への変換は Java Runtime 内部で行う。

---

## 5. Instruction model

```text
CaseNo
dataId
targetId
dataRole
convModel
mirrorX
mirrorY
mirrorZ
validationMin
validationMax
nullable
referenceType
fixedValue
referenceValues
```

キーは `CaseNo + dataId`。

`targetId` はテスト観点の住所、`dataId` は実行データの住所。

### 5.1 構造化dataId

SQLite は Collection / Array / Map を次の dataId 構造で出力する。

Collection / Java配列:

```text
items
items[]
```

Map:

```text
mapping
mapping{key}
mapping{value}
```

ネストした場合も同じ規則を連結する。

例:

```text
rows
rows[]
rows[]{key}
rows[]{value}
```

Runtime はこの構造を利用して、コンテナrootと子Instructionを関連付ける。

---

## 6. convModel

`convModel` は多言語共通化を前提とした独自の正規化フォーマットであり、Java型名と1対1対応することを要求しない。

Java Runtime は `convModel` を処理分類として使用し、必要に応じて `referenceType` を参照してJava具体型を決定する。

例:

```text
convModel = COLLECTION
referenceType = List<String>

convModel = COLLECTION
referenceType = String[]

convModel = ARRAY
referenceType = Set<String>

convModel = MAP
referenceType = Map<String,Integer>
```

Java Runtime 内では `referenceType` に応じた `switch` / `if` 判定を許容する。

これはJava専用Runtimeの責務であり、Runtime自身を言語非依存実装にすることは目的としない。

---

## 7. 値決定優先順位

GENERATE 時:

```text
FIXED
 ↓
Mirror X/Y/Z
 ↓
NORMAL
```

REPLAY 時:

```text
Evidence actual value
```

のみ。

Mirror generator への fallback は行わない。

---

## 8. Mirror Resolver

同一Instructionで複数軸が指定された場合は現仕様では不正として fail-fast。

```text
X != - → X generator
Y != - → Y generator
Z != - → Z generator
all -  → Normal generator
```

Collection / Array / Map でも同一原則を維持する。

コンテナrootがTARGETである場合と、子要素がTARGETである場合を区別する。

例:

```text
items       TARGET
items[]     NORMAL
```

この場合、テスト観点はコンテナ側にある。

```text
items       NORMAL
items[]     TARGET
```

この場合、テスト観点は要素値側にある。

---

## 9. Mirror Y

正式 symbolic ID:

```text
length_null
length_empty
length_min
length_min_minus_1
length_max
length_max_plus_1
length_normal_mid
```

### 9.1 Scalar

STRING/CHAR は長さ、NUMBER/DECIMAL は数値境界として扱う。

制約値が必要なMirrorで validationMin/Max が存在しない場合は推測せず例外とする。

`length_normal_mid` のみ制約なしの場合は NORMAL 値へ委譲可能とする。

### 9.2 Collection / Array / Map

Collection / Array / Map に対する Mirror Y は、**コンテナが保持する要素数・entry数**を意味する。

```text
length_null
    → コンテナそのものが null

length_empty
    → 要素数 0

length_min
    → validationMin 件

length_min_minus_1
    → validationMin - 1 件

length_max
    → validationMax 件

length_max_plus_1
    → validationMax + 1 件

length_normal_mid
    → 原則3件。3件がvalidation範囲外の場合のみ正常範囲へ補正
```

Mirror Y が指定されていない NORMAL コンテナも、原則 **3要素**を生成する。

3要素とする理由は、単一要素をラップしただけの状態ではなく、複数回の反復処理を実際に通過させるためである。

`length_normal_mid` はscalarのように数理的な中央値を作ることを目的とせず、コンテナでは「正常な複数要素」を表現する。
したがって3件を基本値とし、`validationMin > 3` なら `validationMin`、`validationMax < 3` なら `validationMax` を利用する。

---

## 10. Collection / Array / Map の生成原則

### 10.1 Collection / Java配列

Instruction:

```text
items
items[]
```

`items` はコンテナroot、`items[]` は要素生成Instructionとして扱う。

NORMALコンテナでは原則3要素を生成する。

要素がNORMALの場合、3要素すべてについて同じNORMAL生成規則を使用してよい。

各要素を意図的に別のテスト値へ変化させることは、コンテナrootをTARGETとするテストの目的ではない。

### 10.2 Map

Instruction:

```text
mapping
mapping{key}
mapping{value}
```

`mapping` はMap root、`mapping{key}` と `mapping{value}` はentry生成用Instructionとして扱う。

NORMAL Mapでは原則3 entryを生成する。

valueは同じNORMAL生成規則を使用してよい。

keyはMapとして3 entryを成立させるため、決定論的に重複しない値を生成する。

key差分はテスト観点の多様化ではなく、Map構造を成立させるための技術的要件である。

### 10.3 ネスト

例:

```text
rows
rows[]
rows[]{key}
rows[]{value}
```

Runtime は外側から順に構造を生成する。

```text
COLLECTION
  ↓
MAP
  ├ KEY
  └ VALUE
```

子が scalar の場合は既存scalar generatorを利用する。

子がさらに Collection / Array / Map の場合は同じ構造生成規則を適用する。

---

## 11. 要素値とテストシナリオの責務

Collection / Array / Map のコンテナ観点と、要素内部の値観点は分離する。

### Runtime責務

例:

```text
items       TARGET
items[]     NORMAL
```

この場合、RuntimeはTARGETとなったコンテナ条件を満たす構造を生成し、要素にはNORMAL値を入れる。

### Test Scenario責務

次のようなテストはRuntime単独のデータ生成責務としない。

```text
要素1 = 正常値
要素2 = 異常値
要素2で処理中断
要素3は未処理
```

これは「Collectionに値を入れる」ことの検証ではなく、

```text
ループ途中で異常が発生した場合の制御
途中まで行われた処理
後続要素が処理されないこと
```

等を確認するテストシナリオである。

したがって、JUnit Test Scenario Generator が、必要な複数のRuntime値を取得して配置する。

要素内部の文字種・境界・意味については、要素自身がTARGETとなる別Caseで Mirror X/Y/Z により検証する。

---

## 12. Java具体型変換

Java Runtime は `convModel` と `referenceType` を利用して具体型へ変換する。

概念例:

```text
COLLECTION
  referenceType = List...
      → List系

  referenceType = Queue...
      → Queue系

  referenceType = Deque...
      → Deque系

  referenceType = T[]
      → Java配列

ARRAY
  referenceType = Set...
      → Set系

MAP
  referenceType = Map...
      → Map系
```

Java Runtime 内での具体型判定は `switch` / `if` 等で実装してよい。

`convModel` の意味をJava標準型体系へ変更してはならない。
Java Runtime側が独自正規化フォーマットへ合わせる。

---

## 13. Evidence

Evidence は単なるReplay用キャッシュではなく、**実行時に実際に投入したテストデータの証跡**である。

したがって、生成したデータはコンテナrootだけでなく、その構成要素も含めて保持対象とする。

Evidence列:

```text
CaseNo
dataId
targetId
dataRole
convModel
mirrorX
mirrorY
mirrorZ
validationMin
validationMax
nullable
referenceType
elementIndex
valueState
actualValue
actualLength
runMode
```

`elementIndex` は、同一 `CaseNo + dataId` から複数の実体が生成される場合の発生順番号である。

```text
elementIndex = -1
    → scalar直接値 / container root / 要素番号という概念が適用されない行

elementIndex = 0..N
    → Collection / Array element
    → Map key / value
    → nested container自身が親containerのelementとして生成された場合
```

番号は0始まりとし、決定論的な深さ優先の生成順で付与する。

Evidence / Replay の実質キーは次とする。

```text
CaseNo + dataId + elementIndex
```

Mapでは `{key}` と `{value}` は別dataIdだが、同一entryには同じelementIndexを付与する。

```text
mapping{key}    elementIndex=0
mapping{value}  elementIndex=0

mapping{key}    elementIndex=1
mapping{value}  elementIndex=1
```

nested containerでは、container自身のEvidence行にも親側から見た `elementIndex` を付与し、その行の `actualLength` に当該containerの実要素数を保存する。
そのため、さらに深い子要素は各親containerの `actualLength` と決定論的生成順からReplay時に対応づけられる。

`valueState`:

```text
NULL
EMPTY
VALUE
NO_VALUE
```

NULL と empty string を必ず区別する。

Collection / Array / Map については次を保存する。

```text
container root / nested container の状態
containerごとの実際の要素数 / entry数
各elementの実値
Mapの各key実値
Mapの各value実値
```

container行では `actualValue` にObjectの `toString()` を保存しない。
構造は `valueState + actualLength + 子Evidence` から再構築する。

Evidenceに残らない実行時生成値を作ってはならない。

---

## 14. Replay

ReplayはEvidenceに記録された**実際の実行値をそのまま再構築する機能**である。

scalarだけでなく Collection / Array / Map についても、GENERATE時に実際に生成された構造を再現する。

Replay対象:

```text
コンテナのNULL / EMPTY / VALUE状態
実際の要素数
要素値
Map key
Map value
具体Java型へ復元するために必要な値
```

Replay対象が存在しない場合はテスト基盤エラーとして終了し、GENERATEへ切り替えない。

Replay時にMirror generatorを再実行して値を再生成してはならない。

---

## 15. 再現性

GENERATE は同じInstruction・同じライブラリversionなら同じ値を返す。

原則:

- Random不使用
- current date/time不使用
- default Locale非依存
- default TimeZone非依存
- fixed deterministic sourceを利用
- Collection / Array / Map の要素数決定も決定論的
- Map keyの重複回避も決定論的
- 要素生成順序も決定論的

---

## 16. DTO/Object

Data Instruction Generator / SQLite は leaf および一般型構造を展開する。

DTO例:

```text
request.dbName
request.dbHost
request.dbPort
request.databaseName
request.dbUsername
request.dbPassword
```

一般型例:

```text
request.rows
request.rows[]
request.rows[]{key}
request.rows[]{value}
```

Runtime は汎用scalar値、および汎用Collection / Array / Mapを生成する。

JUnit Code Generator が既存 Cleaner/AST relation を使い、

```java
ConnectionSettingRequest request = new ConnectionSettingRequest();
request.setDbName(...);
request.setDbPort(...);
```

等のSUT固有DTO/Object構築を生成する。

任意Project DTO/ObjectのRuntime constructionは対象外とする。

---

## 17. 現在の実装状態

### 完成済み

- Instruction CSV読込
- `CaseNo + dataId` lookup
- GENERATE / REPLAY
- FIXED
- Mirror Resolver
- scalar向け Mirror X/Y/Z
- NORMAL scalar生成
- Java scalar/value conversion
- Evidence CSV
- Replay CSV
- NULL / EMPTY / VALUE区別
- fail-fast
- DTO/Object responsibility boundary
- SQLite側 DTO / Collection / Array / Map 構造展開

### 今回の実装対象

- Collection生成
- Java配列生成
- ARRAY正規化モデルに対応するJava型生成
- Map生成
- `[] / {key} / {value}` 子Instruction解決
- NORMAL時3要素生成
- Container向け Mirror Y
- referenceTypeによるJava具体型判定
- Map key決定論的重複回避
- Nested Collection / Array / Map生成
- Collection / Array / Map のEvidence
- Collection / Array / Map のReplay

### 設計確定済みでRuntimeへ入れないもの

- Project DTO constructor/setter/builder/factory
- Project DTO graph construction
- SUT method invocation
- assertion/oracle
- 「要素1正常、要素2異常」のようなシナリオ構成
- ループ途中異常・途中終了等の制御フローシナリオ

---

## 18. 将来拡張

- Mirror catalog 外部定義化
- evidence metadata拡張
- Pytest共通ライブラリへの同一Instruction思想の移植
- Go / C# / TypeScript 等への言語別Runtime実装

各言語Runtimeは共通 `convModel` 契約へ合わせる。

Java Runtimeの具体型判定ロジックを他言語へそのまま共通化することは目的としない。
