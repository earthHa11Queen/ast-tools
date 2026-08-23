# 鏡の原理による JUnit テストコード一式 自動生成プロンプト

以下の全内容を読み終えてから処理を開始してください。
途中まで読んだ状態でコード生成を開始しないでください。

このPromptは、同時に添付された入力圧縮ファイルと組み合わせて使用します。
入力圧縮ファイルを展開し、その配下に存在する各入力ファイルを確認してください。
このPrompt本文にデータ本体が埋め込まれていないことを、情報不足として扱わないでください。

あなたの役割は、確定済みのJUnit設計、鏡の原理、Validation済みTest Specification、
SQLiteが生成したTest Data Instruction、ASTが生成したSource File Level・Method Level・Field Levelの3CSV、
および取得できた対象プロジェクト環境情報を用いて、
対象プロジェクトへ配置してコンパイル・実行できるJUnitテストコード一式を生成することです。

最終成果物は必ずArtifact機能を使用して生成してください。
通常のチャット本文へのソースコード出力を最終成果物として使用してはいけません。
生成ファイル数が多い場合も、省略せずArtifact内に必要な全ファイルを含めてください。

生成対象はScenarioだけではありません。
Validated Test Specificationに存在する全CaseNoを実行するために必要となる
Wrapper、Scenario、およびJUnit設計上必要となるテスト側Javaコードを一式として生成してください。

1つのCaseNoは1つのJUnitテストケースです。
CaseNoをそのままJUnitテストタイトルとして使用してください。

具体的なテスト値はJUnitコード側で独自生成せず、
Test Data Instructionに従ってTestDataRuntimeから取得してください。

---

# 0. この処理の位置付け

このJUnitコード生成は、以下の処理を経た後に行われます。

Source
→ AST
→ Cleaner
→ SQLite
→ AIによるTest Specification生成
→ SQLite Validation
→ Validation済みTest Specification
→ SQLiteによるTest Data Instruction生成
→ 今回のJUnitコード生成
→ JUnit実行
→ Evidence
→ Replay

この順序には意味があります。

- Validation済みTest Specificationは「何をテストするか」が確定した結果です。
- Test Data Instructionは「各CaseNoを実行するためにどのデータをTestDataRuntimeへ要求するか」がSQLiteで確定した結果です。
- JUnit設計YAMLは「どのような構造・責務・規則でJUnitコード一式を作るか」を定義します。
- 鏡の原理仕様は、Test SpecificationおよびInstructionに現れるテスト観点の意味を定義します。
- AST Source File Level / Method Level / Field Levelは、対象コードのファイル、クラス、import、method、引数、戻り値、field、annotation等の実構造を示します。
- Project Environmentは、生成コードを実際の対象プロジェクト環境へ適合させるための補助情報です。
- AIは、それらの確定済み情報同士を意味的に接続し、実行可能なJUnitコードへ変換します。

---


# 1. プロジェクト品質要求水準

本作業では、
人が事前に指定したプロジェクト品質要求水準を
必ず判断基準として使用してください。

品質要求水準は、
対象システムまたは機能の正常性が損なわれた場合に生じ得る影響と、
要求される正確性・完全性を基準として分類します。

## 品質要求水準

以下は数値が低いほど、より高い品質および厳格なテストを要求します。  

1. 人や集団の生命・身体安全に直接影響する
   ミッションクリティカルシステム
2. 人や集団の生命・身体安全に関わる業務を支える
   高重要度の業務システム
3. 国家、社会、公共サービスまたは多数の利用者の生活継続に
   直接影響するミッションクリティカルシステム
4. 国家、社会、公共サービスまたは多数の利用者の生活継続を
   支える高重要度の業務システム
5. データ、計算結果、記録、証明その他の処理結果について、
   極めて高い正確性・完全性が要求される
   ミッションクリティカルシステムまたはプロダクト
6. Level 5 に相当する高い正確性・完全性を要求される業務を
   支える業務システム
7. 生命には直結しないが、個人の権利、生活、待遇、社会的地位または機微情報に
   重大な影響を与える業務システムまたはプロダクト
8. 生命には直結せず業務遂行に必要な業務システムまたは個人利用向けプロダクト
9. 一定範囲の不具合や機能不足を許容した上で、
   迅速な提供、仮説検証、初期リリースを優先する
   プロトタイプ、PoC、MVPまたは初期段階のプロダクト

今回求められている品質レベル：
{{PROJECT_QUALITY_LEVEL}}

---

# 2. AIと決定論的プログラムの責務分離

このシステムでは、機械的に確定できる事項はAST、Cleaner、SQLite、TestDataRuntime等によって処理済みです。

AIを利用する主目的は、確定済み情報同士の間に存在する意味的な接続を判断することです。

## 2.1 AIが判断する事項

AIは各CaseNoについて、少なくとも以下を判断してください。

- Test Specificationに記載されたテスト目的が、対象method内の何を確認しようとしているか。
- Mirror X / Y / Zが、そのCaseNoでどのような入力条件を意味しているか。
- AST上のclass、method、argument、field、return type、annotation、import等が、テスト実装上どのように関係するか。
- 対象methodをどのWrapper操作として実行するか。
- どの結果を観測すれば、そのCaseNoの成否を判定できるか。
- return value、exception、状態変化、依存先呼び出し、DTO内容、Collection内容等のうち、何をOracleとして使うべきか。
- Test Specificationに具体的なJUnit assertionが書かれていない場合、それをどのJUnit assertionまたはverificationへ変換するか。
- project固有DTO/Objectを、JUnit設計に従ってどのように組み立てるか。
- 対象プロジェクト環境に適合するpackage、import、annotation、Mockito/JUnit利用方法等。

## 2.2 AIが再決定しない事項

以下は既に決定論的に処理された結果です。
原則としてAI側で再計算・再生成・独自変換しないでください。

- CaseNoの集合
- targetId
- dataId
- Mirror X / Y / Zの選択結果
- validationMin / validationMax / nullable
- convModel
- referenceType
- fixedValue
- referenceValues
- Test Data Instructionの構造
- concrete test value
- Collection / ARRAY / Map等の具体値生成
- TestDataRuntimeが担当する値生成
- ASTが既に抽出したclass、method、field、argument等の構造

例えば、Mirror Yの`length_max_plus_1`を見てJUnitコード側で独自に最大値+1を計算したり、
Collectionの要素数をJUnitコード側で独自生成したり、
Mapのkey/valueをAI独自ルールで作成したりすることは、この責務分離に反します。

「AIが作った方が簡単だから」という理由で、決定論的処理をAI側へ取り戻さないでください。

---

# 3. 入力情報を現在の事実として扱う

入力されるAST、Validation済みTest Specification、Test Data Instructionは、
前工程を通過した現在の正式な入力です。

JUnit生成時に、

- ASTが間違っているかもしれない
- Cleanerが誤っているかもしれない
- SQLiteのdataIdが不自然だから別の値を使おう
- convModelよりJavaの一般的な型知識を優先しよう
- Mirror指定より一般的な境界値テストを追加しよう

等と推測して、入力契約を変更しないでください。

入力間に矛盾があるように見える場合でも、
AIが入力契約そのものを修正することが今回の目的ではありません。

一方で、入力された情報を意味的に接続してJUnitコードへ落とすための技術的判断はAIの責務です。

つまり、

- 入力契約の再設計はしない。
- 入力契約の意味を実行可能コードへ変換するための判断は行う。

という境界を維持してください。

---

# 4. JUnit設計

入力圧縮ファイル内の以下のファイルを、現在のJUnitコード生成仕様として使用してください。

`junit/511.JUnit設計YAML.md`

このJUnit設計は、Wrapper、Scenario、Runtime接続、Evidence、Replay、
Fixture、Utils、Constants、Data Provider等の責務と構造を判断する際の正です。

設計に既存Runtimeの利用契約が定義されている場合、
AI独自のRuntime実装へ置き換えないでください。

例えば、

- TestDataRuntimeと同等の値生成ロジックを新しいJava classとして再実装する
- Runtimeの代わりにMirror値から具体値を生成する
- Runtime契約を避けるために独自Bridgeや独自データ生成機構を作る

といった実装は、設計上必要であることが明確でない限り避けてください。

補助classそのものが禁止されているのではありません。
問題なのは、JUnit設計で既に定義された責務を別実装で置き換えることです。

---

# 5. 鏡の原理

入力圧縮ファイル内の以下のファイルを、
テスト観点の意味および背景として使用してください。

`mirror/mirror_principle_spec.md`

Mirror X / Y / Zは、JUnit側が新しくテストケースを考えるための候補ではありません。

Validation済みTest SpecificationおよびTest Data Instructionに現れているMirror情報を理解し、
そのCaseNoが何を確認するケースなのかを判断するために使用してください。

---

# 6. Validation済みTest Specification

入力圧縮ファイル内の以下のファイルを使用してください。

`test_spec/test_spec_validation.csv`

これはSQLiteによるValidationを通過した正式なTest Specificationです。

重要事項:

- 1 CaseNo = 1 JUnit Test Caseです。
- CaseNoをJUnitテストタイトルとしてそのまま使用してください。
- CaseNoの集合を固定集合として扱ってください。
- CaseNoを追加しないでください。
- CaseNoを削除しないでください。
- 複数CaseNoを統合しないでください。
- 1つのCaseNoを複数JUnit Test Caseへ分割しないでください。
- AI独自判断で派生ケースや補完ケースを追加しないでください。
- AI独自判断で重複とみなしてCaseNoを除外しないでください。
- 重要度、類似性、生成量等を理由としてCaseNoを間引かないでください。
- テストケースの意味、操作、確認、想定結果はこのCSVを正として扱ってください。
- 全CaseNoを対象としてください。
- 代表例だけを生成して終了しないでください。

---

# 7. Test Specificationの自然言語をどう読むか

Test Specificationは人間向け説明であると同時に、後続JUnit生成の正式な契約です。

各CaseNoについて、以下を相互に関連付けて読んでください。

- ケース内容
- 操作手順
- 確認内容
- 確認手順
- 想定結果
- 想定結果判断基準・判断手順
- targetId
- Mirror X / Y / Z
- 対応するTest Data Instruction
- 対応するAST情報

一つの列だけを切り出してJUnitを決めないでください。

## 7.1 「仕様上定義された結果と一致すること」という表現

Test Specificationには、上流のTest Specification生成時点で具体的な期待挙動を安全に確定できなかった場合、

「当該入力条件に対する処理結果が仕様上定義された結果と一致すること。」

または同等の統一表現が存在する場合があります。

これは、

- 何が起きても成功でよい
- methodが呼び出せればよい
- exceptionが出てもよい
- return typeだけ合っていればよい
- Oracleを作らなくてよい

という意味ではありません。

この表現は、
上流工程では具体的な実行可能Oracleまで確定していないため、
JUnitコード生成工程で残りの意味判断を行う必要があることを示します。

JUnit生成AIは、この表現を見つけた場合こそ、
そのCaseNoのTest Specification、Mirror条件、AST構造、method context等を総合して、
実際にPASS/FAILを判定できるOracleへ具体化してください。

この判断を「情報不足」として停止する理由にしてはいけません。

---

# 8. Test Data Instruction

入力圧縮ファイル内の以下のファイルを使用してください。

`instruction/test_data_instruction.csv`

これはSQLiteが決定論的に生成したTestDataRuntime向けInstructionです。

重要事項:

- CaseNoごとに対応する全Instructionを確認してください。
- TARGETだけでなく、同一CaseNoの実行に必要なNORMALデータも使用してください。
- dataIdを用いてTestDataRuntimeから値を取得してください。
- mirrorX / mirrorY / mirrorZからJUnitコード側で具体値を再生成しないでください。
- scalar、Collection、ARRAY、Map、およびネスト構造はJUnit設計内の現行Runtime契約に従ってください。
- project固有DTO/Object組み立てはJUnit設計内の責務分離に従って生成コード側で行ってください。

Test Data Instructionは、JUnitコードへそのまま大量転記するためのデータではありません。

例えば、各CaseNoのInstruction全列を`CaseData.java`等へコピーし、
CSVと同じ内容を巨大なJava定数群として再構築する必要はありません。

JUnitコードが必要とするのは、
そのCaseNoで必要なdataIdを正しく特定し、
JUnit設計に従ってTestDataRuntimeから値を取得することです。

ただしJUnit設計上、Instruction情報の一部をテスト側へ保持する必要がある場合は、
その設計を優先してください。

---

# 9. AST

入力圧縮ファイル内の以下の3CSVを使用してください。

- `ast/ast_source_file_level.csv`
- `ast/ast_method_level.csv`
- `ast/ast_field_level.csv`

ASTはJava Source全文の代替として、
JUnit生成に必要な実コード構造を提供する正式な入力です。

「Java Sourceが添付されていない」という理由だけで生成不能と判断しないでください。

## 9.1 Source File Levelの役割

Source File Levelは主に以下の判断に利用してください。

- source file
- directory / package相当の位置
- class
- import
- file単位の構造

特にpackageやimport、classの実在確認に利用してください。

## 9.2 Method Levelの役割

Method Levelは主に以下の判断に利用してください。

- className
- methodName
- methodType
- accessModifier
- argument
- argument順序
- returnType
- processContent等のmethod構造情報

対象methodを特定する際は、method名だけではなく、
ASTに存在するargument情報、型、順序、modifier等を合わせて確認してください。

例えばoverloadされたmethodが存在する場合に、

「同じmethod名のうち引数数が一番少ないもの」
「Reflectionで最初に見つかったもの」
「sortした先頭のmethod」

という理由だけで対象methodを選ばないでください。

CaseNoのtargetIdとAST情報から、そのCaseNoが対象としているmethod signatureを判断してください。

## 9.3 Field Levelの役割

Field Levelは主に以下の判断に利用してください。

- class field
- method parameterに関連するfield情報
- fieldType
- fieldKind
- validationMin
- validationMax
- nullable
- rawAnnotations

依存field、DTO field、validation、annotation等を判断する際に利用してください。

## 9.4 ASTを使った技術的判断

ASTに直接「このconstructorを使え」と書かれていない場合でも、
field、import、annotation、Project Environment、Java/JUnitの通常の言語仕様等から、
実行可能JUnitを作るために必要な技術的判断を行って構いません。

ただし、

- 実在しないbusiness methodを作る
- 実在しないDTO fieldを作る
- ASTと無関係なoverloadを選ぶ
- 存在確認できない業務仕様を新しく作る

こととは区別してください。

---

# 10. Project Environment

入力圧縮ファイル内の `environment/` 配下を確認してください。

そこには、対象アプリケーションのビルド・依存関係・言語環境を確認するためのファイルが入ります。

複数ファイルが存在する場合はすべて確認してください。

環境定義ファイルが存在しない場合でも、
他の確定済み入力だけを使ってJUnitコード生成を続行してください。

Project Environmentは、

- 使用可能なJUnit version
- Mockito等の依存関係
- Lombok等の利用可能性
- build system
- Java version

等を判断するための補助情報です。

---

# 11. 各入力の優先関係

各入力の責務を混同しないでください。

- JUnit設計YAML
  - Wrapper、Scenario、Runtime接続、Evidence、Replay、JUnitコード構造の正。
- 鏡の原理仕様
  - Test SpecificationおよびInstructionに現れるMirror観点の意味を理解するための正。
- Validation済みTest Specification
  - 何をテストし、何を確認し、何を想定結果とするかの正。
- Test Data Instruction
  - どのCaseNoでどのdataIdをTestDataRuntimeへ要求するかの正。
- AST Source File Level / Method Level / Field Level
  - 対象コードの実構造を判断するための正。
- Project Environment
  - 対象プロジェクトで利用可能なビルド・依存関係・言語環境情報。

例えば、

Test SpecificationのCase目的をASTだけから別目的へ変更したり、
ASTのargument構造をTest Specificationの自然言語だけで変更したり、
Test Data InstructionのdataIdをAIが別のdataIdへ差し替えたりしないでください。

複数入力を「どれか一つを正として他を無視する」のではなく、
それぞれの責務を維持したまま接続してください。

---

# 12. 1 CaseNoをJUnitへ変換する判断手順

各CaseNoを単純なテンプレート展開として処理しないでください。

各CaseNoについて、少なくとも以下の順序で考えてください。

## Step 1. CaseNoのテスト目的を読む

Test Specificationから、

- 何を入力するケースなのか
- 何を操作するのか
- 何を確認するのか
- 正しく実装されていれば何が成立するべきか

を把握してください。

## Step 2. Mirror条件を読む

Mirror X / Y / Zから、
そのCaseNoで入力条件の何が変化しているのかを把握してください。

例えば、

- 値の種類
- 長さ
- 境界
- Null
- 意味パターン
- Collection要素数
- Map構造

等です。

Mirror名だけで判断せず、鏡の原理仕様とTest Specificationの文章を合わせてください。

## Step 3. 対象methodとtargetをASTで特定する

targetIdおよびAST 3CSVから、

- 対象class
- 対象method
- argument
- argument順序
- target field
- return type
- dependency field
- annotation
- method modifier

等を確認してください。

## Step 4. Test Data Instructionとargumentを接続する

CaseNoに対応するInstructionから必要なdataIdを取得し、
AST上のargument / fieldと正しく対応付けてください。

単にCSVの出現順やdataIdの文字列順だけを、
method argument順として扱わないでください。

argument名、argIndex相当情報、型、targetId等、
入力から確認できる情報を使って対応させてください。

## Step 5. 観測可能な結果を列挙する

そのmethodを実行した結果として、
JUnitから実際に観測できるものを考えてください。

候補には例えば以下があります。

- return value
- exception
- DTO / Objectの内容
- Collection / Mapの内容
- object state
- field state
- dependency invocation
- dependencyへ渡されたargument
- 永続化等の副作用
- response object
- void method実行後の状態や依存呼び出し

すべてを確認する必要はありません。

そのCaseNoの目的をPASS/FAILへ最も直接的に変換できる観測点を選んでください。

## Step 6. 期待される関係を判断する

観測対象が決まったら、
Test Specificationの想定結果とMirror条件から、
何が成立すれば成功なのかを判断してください。

ここで重要なのは、
現在のSUTが実際に返しそうな結果をそのまま期待値にすることではありません。

JUnitは、

「現在実装がどう動くか」

を再現するためではなく、

「CaseNoの仕様上、正しく実装されていれば何が成立すべきか」

を確認するために生成します。

## Step 7. JUnit assertion / verificationへ変換する

最後に、Step 5とStep 6をJUnit上の具体的な確認へ変換してください。

例えば、

- assertEquals
- assertNull / assertNotNull
- assertTrue / assertFalse
- assertThrows / assertDoesNotThrow
- Collection内容のassertion
- DTO fieldのassertion
- Mockito verify
- ArgumentCaptor
- 状態変化前後の比較

等です。

どのAPIを使うか自体が目的ではありません。
そのCaseNoの正誤を実際に識別できることが目的です。

---

# 13. Oracleの定義

このPromptにおけるOracleとは、

「そのCaseNoについて、SUTが仕様どおりである場合と仕様に反する場合を区別するための判定条件」

です。

単にコードが実行されたことを確認するだけではOracleになりません。

例えば、次のような確認は、
それ自体ではCaseNo固有のOracleとして不十分な場合があります。

```text
methodがReflectionで呼び出せた
return valueのruntime typeがdeclared return typeと一致した
void methodが例外なく終了したのでassertTrue(true)
SUTから何らかのexceptionが出たがHarnessエラーではないので成功
resultがnullならassertNull(result)
resultがnullでなければdeclared typeかだけ確認
```

これらはテストHarnessやJava型整合性の確認にはなり得ますが、
多くの場合、Test Specificationが要求するSUTの振る舞いを検証していません。

## 13.1 Harness確認とCase Oracleを分ける

Reflection、Wrapper、Runtime接続等が正しく動作したかを確認することは必要です。

しかし、

- Harnessが壊れていない
- Reflectionに成功した
- classをloadできた
- methodをinvokeできた

ことと、

- CaseNoの期待結果を満たした

ことは別です。

Harness確認をCase Oracleの代わりにしないでください。

共通helperを作ること自体は問題ありません。
ただし共通helperが、

「どのCaseNoでもほぼ同じ条件でPASSする」

だけなら、Case固有Oracleを失っています。

共通helperを利用する場合でも、
各CaseNoで導出された期待条件が実際の判定へ反映される必要があります。

---

# 14. Oracleを考える際の重要な自己確認

各CaseNoのassertionを確定する前に、内部的に次を確認してください。

> SUTがこのCaseNoの想定結果に反する実装であった場合でも、このassertionはPASSしてしまわないか？

YESであるなら、そのassertionはCase Oracleとして不十分である可能性が高いです。

例えば、

```java
assertTrue(true);
```

は常にPASSするため、Case Oracleになりません。

また、

```java
assertTrue(result == null || returnType.isInstance(result));
```

のような確認も、
SUTが誤った値を返していても型だけ一致すればPASSするなら、
そのCaseNoの仕様を検証できていません。

Oracleは、
「実行できたこと」ではなく、
「正しい振る舞いと誤った振る舞いを識別できること」
を基準として選んでください。

---

# 15. ExceptionをOracleにする場合

Exceptionはすべて成功でも、すべて失敗でもありません。

そのCaseNoでexceptionを期待する合理的根拠がある場合のみ、
exception発生を成功条件として扱ってください。

例えば、

- Test Specificationが異常系を示している
- Mirror条件がvalidation違反を示している
- annotation等から拒否されるべき入力であることが判断できる
- method契約上exceptionが期待される

等です。

一方で、

```text
SUTがNullPointerExceptionを投げた
IllegalStateExceptionを投げた
RuntimeExceptionを投げた
ただしReflectionエラーではない
```

という理由だけで、そのCaseNoをPASSにしてはいけません。

期待するexception classまで入力から合理的に確定できる場合は、
そのclassをassertしてください。

classまでは確定できないが、
「正常終了してはいけない」「入力を拒否すべき」等まで判断できる場合は、
Test SpecificationとASTから判断可能な粒度でOracleを構成してください。

根拠なく具体的なexception classやmessageを発明する必要はありません。

---

# 16. return valueをOracleにする場合

return valueを観測する場合、
単にdeclared return typeとruntime typeが一致することだけをOracleにしないでください。

例えば、

```text
ResponseEntityを返すmethod
```

であれば、

```text
ResponseEntityである
```

だけでは、SUTの業務上の正誤を判定できない場合があります。

Test Specificationが確認しようとしている内容に応じて、

- null / non-null
- 値そのもの
- DTO field
- Collection size
- Collection contents
- response body
- status等、入力から確認可能なもの
- 入力条件に応じて変化すべき性質

を判断してください。

ただし、入力に存在しないHTTP statusや具体的business value等を根拠なく発明しないでください。

---

# 17. void methodをOracleにする場合

void methodは、return valueが存在しないことを理由に無条件PASSにしないでください。

void methodでは特に、

- dependency invocation
- dependencyへ渡されたargument
- state change
- field change
- persistence operation
- exception
- その他methodの副作用

等から、そのCaseNoで観測可能な結果を判断してください。

単なる、

```java
method.invoke(...);
assertTrue(true);
```

はCase Oracleとして成立しません。

---

# 18. dependency / mockをOracleにする場合

ASTやTest Specificationから依存先との関係が確認できる場合、
Mockito等によるdependency invocation verificationをOracleとして利用できます。

その場合、

- 呼び出されたか
- 呼び出されなかったか
- 何回呼ばれたか
- どのargumentが渡されたか

等から、CaseNoの目的に必要なものだけを確認してください。

存在しないdependencyやmethodをOracleのために作らないでください。

また、

「何をassertすればいいか分からないから、とりあえず全dependencyをverifyする」

という使い方もしないでください。

OracleはTest Specificationの意味から導出してください。

---

# 19. TestDataRuntimeの利用

具体値生成はTestDataRuntimeの責務です。

JUnitコードはTest Data Instructionに基づき、
必要なdataIdを指定して値を取得してください。

AIが以下を独自実装することは、
JUnit設計に明確な必要性がない限り避けてください。

- STRING生成
- NUMBER生成
- DATETIME生成
- Mirror Yによる長さ計算
- null / empty / normalの値生成
- Collection要素数生成
- Set uniqueness生成
- Map key/value生成
- nested container展開
- fixedValue解釈による独自値生成

特に、

`length_null`

をempty Collectionへ読み替えたり、

Mapを`"k0" -> "v0"`等の独自値で構成したり、

Setへ同一値を複数回追加してInstruction上の要素数を失わせたりしないでください。

これらはRuntimeが解決する領域です。

---

# 20. project固有DTO/Object

JUnit設計でRuntimeの責務外とされているproject固有DTO/Objectは、
JUnit生成側で組み立ててください。

ただし、DTO/Objectの作り方を単にReflectionで総当たりすることが目的ではありません。

AST、field、constructorに関係する情報、annotation、Project Environment等を利用し、
対象projectで成立する方法を判断してください。

例えば、

- constructor
- setter
- builder
- field設定
- factory
- Mockito等

のうち、実際の対象構造とJUnit設計に合うものを選択してください。

「constructorが分からないから常に最小引数constructor」
「失敗したら何でもMockito mock」
等の一律Fallbackだけで全Objectを処理すると、
CaseNoの意味を失う可能性があります。

技術的Fallbackが必要な場合でも、
対象ASTとCaseNoの意味を壊していないことを確認してください。

---

# 21. Wrapper生成

Validated Test Specificationの全CaseNoが必要とするSUT操作を把握し、
全Scenarioから利用可能なWrapper群を完成させてください。

Wrapperは単なるReflection invocationの入口ではなく、
JUnit設計上の責務に従って、
ScenarioからSUT操作を安定して呼び出すための境界です。

AST上でmethodが確定できる場合は、
そのmethodに対応するWrapper operationを生成してください。

例えばASTに、

```text
create
delete
getAll
getById
```

等が存在する場合、
ScenarioがCaseNoに対応する操作としてそれらを利用できる構造にしてください。

ただし、存在しないWrapper operationやbusiness methodを説明目的で新規発明しないでください。

---

# 22. argumentとdataIdの対応

複数argumentを持つmethodでは、
Test Data Instructionの行順だけでargument対応を決めないでください。

以下の情報を可能な限り組み合わせてください。

- targetId
- dataId
- dataRole
- ASTのargument名
- ASTのargument順
- ASTのargument型
- Test Specificationの対象
- DTO/Object構造

例えば、

CSVが`ORDER BY CaseNo, dataId`で並んでいるからといって、
dataIdの辞書順がmethod parameter順であるとは限りません。

正しい値を誤ったargumentへ渡した場合、
TestDataRuntime自体が正しくてもJUnitの意味は壊れます。

---

# 23. overloadされたmethod

同名methodが複数存在する場合は、
AST上のsignature情報を利用して対象methodを特定してください。

単に、

- parameter countが少ない
- Reflectionで最初に返った
- method名でsortした先頭
- arbitraryな1件

を選択しないでください。

CaseNoのtargetId、argument構造、型、順序等から、
対象となるmethodを判断してください。

---

# 24. 現在実装と期待結果を混同しない

JUnit生成時にSUTの実装構造を参照することは必要です。

しかし、

「現在のSUTがこう書かれているから、その結果を期待値にする」

という自己参照的なOracleを作らないでください。

例えばSUTが計算した値をそのままexpectedへコピーして、

```java
assertEquals(actual, actual);
```

とすることはテストになりません。

期待結果は、
Validation済みTest Specification、Mirror条件、annotation、method contract、AST context等から判断してください。

現在実装は、
何を呼び、何を観測できるかを理解するために利用してください。

---

# 25. 共通化について

大量CaseNoを生成するため、
共通helper、base class、utility、data provider等を利用することは可能です。

ただし共通化によってCaseNo固有の意味を失わないでください。

悪い例:

```text
全CaseNoが同じCaseOracle.verify()を呼び、
CaseOracleは「Reflectionエラーでなければ成功」とだけ判定する。
```

これはコード量は減りますが、
各CaseNoのOracleを消してしまいます。

良い共通化とは、

- 実行手順の共通化
- Runtime接続の共通化
- Evidence処理の共通化
- 同種assertion処理の共通化

等を行いつつ、
各CaseNoで導出された期待条件が最終判定へ反映される構造です。

---

# 26. 生成量が多い場合

CaseNoが数千件、数万件存在しても、
生成量を理由としてテストケースを減らさないでください。

以下は行わないでください。

- 代表ケースのみ生成
- 同種CaseNoの省略
- 「以下同様」で終了
- TODOへの置換
- 疑似コードへの置換
- 一部Scenarioだけ完成
- 一部Wrapperだけ完成
- 後半CaseNoを未生成のまま終了

大量生成への対処は、
CaseNoを捨てることではなく、
適切な共通構造を利用しながら全CaseNoを完全に実装することです。

---

# 27. 正しいJUnitコードの構成例

以下は、このJUnitコード生成で使用する正しい書き方です。
対象classやmethodの構造に応じて必要な具体名や型は変更しますが、
責務の配置と情報の接続方法はこの形を基準としてください。

## 27.1 Scenario

Scenarioは、1 CaseNoの確定情報をJUnitテストとして宣言し、
対応するWrapperおよび共通実行処理へ接続します。

```java
@Test
@DisplayName("UTAPI-000008")
void case_UTAPI_000008() {
    ConnectionControllerWrapper wrapper =
        new ConnectionControllerWrapper();

    CaseExecutor.execute(
        wrapper,
        "com.matsushita.dbeditor.adapter.controller.ConnectionController",
        "create",
        "ResponseEntity<ConnectionSettingResponse>",
        new String[] {"request"},
        new String[] {"ConnectionSettingRequest"},
        new DataRef[] {
            new DataRef(
                "UTAPI-000008",
                "対象dataId",
                "TARGET"
            )
        },
        new CaseMeta(
            "UTAPI-000008",
            "targetId",
            "Mirror X",
            "Mirror Y",
            "Mirror Z",
            "Test Specification上の確認内容",
            "Test Specification上の想定結果"
        )
    );
}
```

ScenarioではCaseNo、対象SUT、対象method、argument情報、必要なdataId、
Mirror情報、Test Specification上のCase情報を接続してください。

## 27.2 Wrapper

WrapperはSUT classごとに生成し、
Scenarioから対象SUTのoperationを呼び出す境界とします。

```java
public final class ConnectionControllerWrapper {

    private static final String SUT_CLASS =
        "com.matsushita.dbeditor.adapter.controller.ConnectionController";

    private final Object sut;

    public ConnectionControllerWrapper() {
        this.sut = SutSupport.newSut(SUT_CLASS);
    }

    public ExecutionResult create(
        String[] declaredTypes,
        Object[] args
    ) {
        return SutSupport.invoke(
            sut,
            SUT_CLASS,
            "create",
            declaredTypes,
            args
        );
    }
}
```

AST上で対象methodが確定している場合は、
methodに対応したSUT固有Wrapper operationを生成してください。

## 27.3 method signatureの解決

対象methodはASTのmethod名、argument型、argument順序等を使用して特定します。

```java
Method method = resolveMethod(
    sutClass,
    methodName,
    declaredParameterTypes
);
```

overloadが存在する場合も、
AST上のsignatureと一致するmethodを特定してください。

## 27.4 TestDataRuntimeとの接続

具体的なテスト値はdataIdを使用してTestDataRuntimeから取得します。

```java
Object value = TestDataRuntime.getValue(
    caseNo,
    dataId,
    receivingType
);
```

Scenarioまたは共通実行処理は、
Test Data Instructionに存在する必要なdataIdをTestDataRuntimeへ渡してください。

Test Data InstructionそのものをJava定数群として再生成するのではなく、
JUnit実行に必要なdataIdを参照してください。

## 27.5 Case実行処理

共通実行処理は、
CaseNoごとの確定情報を受け取り、
入力値取得、SUT実行、Oracle判定、Evidence処理を接続します。

```java
Object[] args = TestArgumentBuilder.build(
    caseNo,
    parameterDefinitions,
    dataRefs
);

ExecutionResult result =
    wrapper.execute(args);

CaseOracle.verify(
    caseDefinition,
    result
);
```

共通実行処理を利用する場合も、
各CaseNoのCase DefinitionおよびOracle判断結果が最終判定へ反映される構造にしてください。

## 27.6 Oracle

OracleはCaseNoごとに、
観測対象、期待する状態・関係、判定方法を確定したうえでJUnit assertionへ変換します。

```text
CaseNo
  Observation
    何を観測するか
  Expected
    正しく実装されている場合に何が成立するか
  Failure discrimination
    どの誤った振る舞いをFAILとして識別するか
  Assertion / Verification
    JUnit上でどのように判定するか
```

例えばvalidation上限超過のCaseで、
入力から拒否されるべきことまで判断できる場合は、

```java
assertThrows(
    ExpectedInputRejection.class,
    () -> wrapper.execute(args)
);
```

のように、CaseNoの期待結果を識別するOracleへ変換してください。

return valueが観測対象である場合は、

```java
assertEquals(expectedValue, actualValue);
```

DTO fieldが観測対象である場合は、

```java
assertEquals(expectedFieldValue, actual.getTargetField());
```

dependency invocationが観測対象である場合は、

```java
verify(dependency).targetMethod(expectedArgument);
```

のように、CaseNoの意味に対応した判定を実装してください。

## 27.7 Oracle Planの受け渡し

各CaseNoについてTest Oracleを判断した結果は、
JUnitコードを生成する途中で失ってはいけません。

各CaseNoについて、少なくとも以下のOracle Planを確定してください。

```text
Oracle Plan
  Observation
    何を観測するか

  Expected
    正しく実装されている場合に何が成立するか

  Failure discrimination
    SUTがCaseNoの想定結果に反した場合、
    どの違いをFAILとして識別するか

  Assertion / Verification
    Observation、Expected、Failure discriminationを
    JUnit上のどの判定へ変換するか
```

確定したOracle Planは、
最終的に生成されるJUnitコードのCase Definition、
Scenario、Executor、CaseOracle、
またはCase固有assertion / verificationのいずれかへ
情報を失わず反映してください。

正しい情報の流れは以下です。

```text
Validation済みTest Specification
        +
Mirror X / Y / Z
        +
AST
        +
Test Data Instruction
        ↓
CaseNoごとのOracle判断
        ↓
Oracle Plan
        ↓
生成JUnitコード
        ↓
Case固有assertion / verification
```

Oracle Planを確定した後に、

```text
Observation
Expected
Failure discrimination
```

を破棄し、

```java
assertNotNull(result);
```

```java
assertTrue(returnType.isInstance(result));
```

```java
assertNull(error);
```

等の共通条件だけへ置き換えてはいけません。

例えば、

```text
Observation
  return value

Expected
  "copy_" + input

Failure discrimination
  actual valueが "copy_" + input と一致しない

Assertion
  assertEquals
```

と判断したCaseNoでは、
最終JUnitコードにもその判断結果を保持し、

```java
assertEquals("copy_" + input, actual);
```

に相当する判定を実装してください。

また、

```text
Observation
  exception / validation result

Expected
  validation上限超過入力が拒否される

Failure discrimination
  上限超過入力が正常処理される

Assertion
  exceptionまたはvalidation rejectionの確認
```

と判断したCaseNoでは、
nullable、validationMin、validationMax、
annotation、Mirror条件等の判断根拠を
最終Oracleまで保持してください。

複数CaseNoで共通のCaseOracleやExecutorを利用する場合も、
各CaseNoのOracle Planを入力として受け取り、
その内容によって実際のPASS / FAIL判定が変化する構造としてください。

共通CaseOracleが存在していても、
すべてのCaseNoを同じ

```text
例外がない
return valueがnullではない
return typeが一致する
```

等の判定へ変換する構造は、
Oracle Planを保持した実装ではありません。

---

# 28. JUnitコード生成

Validated Test Specificationに存在する全CaseNoを確認してください。

CaseNoおよびTest Specificationの内容は、
AIが最適化、整理、簡略化、補完する対象ではありません。

入力されたCaseNoの集合と各CaseNoの意味を保持して実装してください。

AIが変更してよいのは、
確定済みCaseNoを実行可能なJUnitコードへ変換するための実装方法です。

JUnit設計YAMLに従って必要となるWrapper、Scenario、Fixture、Utils、Constants、Data Provider等の
補助コードを生成することは可能です。

ただし、それを理由としてTest Case自体を増減してはいけません。

各CaseNoについて、

1. Test Specificationを読む。
2. Mirror条件を理解する。
3. ASTから対象構造を確認する。
4. Test Data Instructionから必要なdataIdを特定する。
5. TestDataRuntimeから入力値を取得する。
6. 対象SUTを実行する。
7. Case固有の観測点を選ぶ。
8. Case固有のOracleを構成する。
9. JUnit assertion / verificationとして実装する。
10. Evidence / Replay等をJUnit設計に従って接続する。

という意味的な流れを成立させてください。

---

# 29. 出力前内部検証

最終Artifactを生成する前に、
内部的に以下を検証してください。

この内部検証結果自体を別ファイルや説明文として出力する必要はありません。

## 29.1 CaseNo

- Validation済みTest Specificationの全CaseNoが存在するか。
- CaseNoが追加されていないか。
- CaseNoが削除されていないか。
- CaseNoが統合・分割されていないか。
- 1 CaseNo = 1 JUnit Test Caseになっているか。
- CaseNoがJUnitテストタイトルとして使われているか。

## 29.2 AST接続

- 各Scenarioが正しいclass / methodへ接続されているか。
- overloadを誤選択していないか。
- argument順序が正しいか。
- package / import / class参照が整合しているか。
- Wrapperから呼ばれるmethodが入力AST上の対象と整合しているか。

## 29.3 Test Data

- 必要なdataIdがTest Data Instructionに存在するか。
- TARGETだけでなく必要なNORMALも利用しているか。
- TestDataRuntimeの責務をJUnit側で再実装していないか。
- Mirrorからconcrete valueを独自生成していないか。
- Collection / ARRAY / Mapの値を独自簡略化していないか。
- Instruction全体を不要にJavaへ複製していないか。

## 29.4 Oracle

各CaseNoについて必ず確認してください。

- CaseNo固有のOracleが存在するか。
- Test Specificationの確認内容・想定結果が実際の判定へ反映されているか。
- 「呼び出せた」だけでPASSしていないか。
- return type確認だけでPASSしていないか。
- void methodを無条件PASSにしていないか。
- 任意のSUT exceptionを成功扱いしていないか。
- `assertTrue(true)`等の恒真assertionをOracleにしていないか。
- SUTが仕様に反していてもPASSするOracleになっていないか。
- Harness確認をCase Oracleの代わりにしていないか。
- Test Specificationに存在しない業務仕様を根拠なく発明していないか。
- 現在実装のactual値をそのままexpectedへ流用していないか。

### Oracle Plan反映検証

各CaseNoについて、
生成前に判断したOracle Planと、
最終的に生成されたJUnitコードのOracleを照合してください。

全CaseNoについて、以下を確認してください。

- Observationが確定していること。
- Expectedが確定していること。
- Failure discriminationが確定していること。
- Assertion / Verificationが確定していること。
- 上記Oracle Planの内容が最終JUnitコードへ反映されていること。
- Oracle PlanのObservationと、実際にJUnitが観測している対象が一致していること。
- Oracle PlanのExpectedと、実際のassertionが判定している期待条件が一致していること。
- Oracle PlanのFailure discriminationに該当するSUTの誤った振る舞いが、実際にJUnit上でFAILとなること。
- Oracle Planを判断した後、汎用Oracleへ置き換えていないこと。
- Test Specificationの確認内容、想定結果等を読み取って判断した情報が、Case Definitionまたは最終assertionまで保持されていること。

特に以下を確認してください。

正常系Caseについて、

```text
assertNotNull(result)
assertNull(error)
return type一致
methodが実行できた
```

だけで終了している場合は、
それ自体がTest Specification上の期待結果であるかを再確認してください。

それ自体がCaseNoの期待結果ではない場合、
Oracle Planが最終コードへ反映されていないため不適合です。

異常系Caseについて、

```text
何らかのRuntimeExceptionが発生した
Harness errorではなかった
```

だけで成功としている場合は、
そのexceptionがCaseNoの期待する拒否・異常結果と対応しているかを確認してください。

対応していない場合は不適合です。

void methodについて、

```text
methodが呼ばれた
receiverが存在する
dependency invocationが1件以上存在する
```

だけで成功としている場合は、
それがCaseNoのTest Specification上の確認対象であるかを確認してください。

CaseNo固有のstate change、
dependency invocation、
dependency argument、
永続化作用等を確認すべきCaseである場合、
それらを確認していなければ不適合です。

Mirror X / Y / Zを持つCaseについて、
Caseを成立させているMirror条件が
入力生成だけでなくOracle判断にも必要である場合、
その情報が最終Oracleまで到達していることを確認してください。

特にvalidationMin、validationMax、nullable、
rawAnnotations等をOracle判断に使用した場合は、
その情報がCase Definition等の途中構造で失われていないことを確認してください。

同一の共通CaseOracleを多数のCaseNoが利用する場合、
各CaseNoから渡されるOracle Planによって
実際の判定内容が変化することを確認してください。

CaseNoが異なっても、

```text
non-nullならPASS
型が一致すればPASS
例外がなければPASS
```

という同一条件しか使用されていない場合は、
各CaseNoのOracle Planを再確認してください。

最後に各CaseNoについて、改めて以下を確認してください。

> SUTを、そのCaseNoのTest Specificationに反する実装へ変更した場合、
> 現在生成されているJUnit TestはFAILするか。

FAILしない場合、
そのCaseNoのOracleは不適合です。

Observation、
Expected、
Failure discrimination、
Assertion / Verificationを再判断し、
CaseNoの正誤を識別できるOracleへ修正してください。

## 29.5 JUnit設計

- JUnit設計YAMLの責務分離に一致するか。
- Runtime接続方法がJUnit設計に一致するか。
- Evidence / Replayの責務が必要に応じて反映されているか。
- 全Scenarioから必要なWrapper operationを呼べるか。
- 必要なFixture / Utils / Constants / Data Provider等が欠落していないか。

## 29.6 完成性

- TODOが残っていないか。
- 疑似コードが残っていないか。
- `...`でコードが省略されていないか。
- 一部CaseNoだけを代表例として生成していないか。
- 必要なJavaファイルがすべてArtifact内に存在するか。
- 対象Project Environmentと明確に矛盾する依存関係を使っていないか。

問題が見つかった場合は、
最終Artifactを確定する前に生成物を修正してください。

---

# 30. Test Oracle専用検証

このセクションでは、
生成済みJUnitコードについてTest Oracleだけを独立して検証します。

構文、package、import、CaseNo件数、Wrapper存在、
TestDataRuntime接続等の検査とは別に実施してください。

Test Oracleの検証では、
単にassertionが存在するか、
OraclePlanが存在するか、
JUnitコードがコンパイル可能かを見るだけでは不十分です。

Validation済みTest Specificationに存在する全CaseNoについて、
そのCaseNo固有のテスト目的が、
最終的なPASS / FAIL判定まで失われず反映されていることを検証してください。

以下の手順を全CaseNoに対して実施してください。


## 30.1 Test OracleにおけるCase固有性の定義

このPromptにおけるCase固有性とは、
CaseNoごとに異なるJavaコードや異なる文字列が存在することではありません。

以下のような形式的一意性はCase固有性とはみなしません。

- CaseNo文字列だけが異なる。
- targetIdだけが異なる。
- method名だけが異なる。
- dataIdだけが異なる。
- Mirror IDだけが異なる。
- OraclePlan recordがCaseNoごとに生成されている。
- 同じOracle kindへ異なるCaseNoが設定されている。
- 同じassertionへ異なる変数が渡されている。

Test OracleにおけるCase固有性とは、

「そのCaseNoがTest Specification上で確認しようとしている振る舞いと、
別のCaseNoが確認しようとしている振る舞いを区別できる意味情報が、
最終的なOracleへ反映されていること」

を意味します。

したがって複数CaseNoが同一Oracle実装を共有すること自体は禁止しません。

同一Oracleを共有できるのは、
それらのCaseNoについて、

- Observation
- Expected
- Failure discrimination
- Assertion / Verification

の意味が実質的に同一である場合です。

共通Oracleを使用する場合でも、
CaseNo固有の入力条件や期待関係がparameterとして渡され、
最終的なPASS / FAIL判定へ反映されていなければなりません。


## 30.2 CaseNoごとのOracle元情報を再取得する

各CaseNoについて、
生成済みOracleを見る前に、
以下の元情報を改めて確認してください。

1. Validation済みTest Specification
   - ケース内容
   - 操作手順
   - 確認内容
   - 確認手順
   - 想定結果
   - 想定結果判断基準・判断手順
   - targetId
   - Mirror X
   - Mirror Y
   - Mirror Z

2. Test Data Instruction
   - TARGET dataId
   - NORMAL dataId
   - dataRole
   - convModel
   - referenceType
   - nullable
   - validationMin
   - validationMax
   - fixedValue
   - referenceValues

3. AST Method Level
   - 対象method
   - argument
   - argument順序
   - argument型
   - return type
   - process情報
   - methodType
   - accessModifier

4. AST Field Level
   - field
   - fieldType
   - fieldKind
   - validation
   - nullable
   - rawAnnotations

5. AST Source File Level
   - class
   - package相当位置
   - import
   - source context

これらをCaseNo単位で再度照合してから、
生成されたOraclePlanおよびJUnit assertionを検査してください。


## 30.3 CaseNoごとのOracle Plan再構築

生成済みOraclePlanをそのまま正しいものとして扱わないでください。

各CaseNoについて、
元入力だけを使用してOracle Planを改めて内部的に再構築してください。

以下の4項目をCaseNoごとに確定してください。

### Observation

そのCaseNoの成否を判断するために、
JUnitから何を観測するべきかを確定します。

例:

- return value
- return DTOの特定field
- Collection size
- Collection element
- Map key / value
- exception
- validation rejection
- object state
- field state
- dependency invocation
- dependency invocation count
- dependency argument
- ArgumentCaptorで取得する値
- persistence operation
- response body
- その他ASTおよびTest Specificationから確認可能な副作用

### Expected

正しく実装されたSUTについて、
Observationで何が成立するべきかを確定します。

Expectedは、
単なるJava型整合性ではなく、
可能な限りCaseNoのTest Specificationが表す振る舞いを記述してください。

### Failure discrimination

SUTがそのCaseNoの想定結果へ違反した場合、
どの差異をJUnitがFAILとして識別するべきかを確定します。

### Assertion / Verification

Observation、Expected、Failure discriminationを、
実際のJUnit assertionまたはMockito verification等へ変換します。


## 30.4 生成済みOracle Planとの意味比較

30.3で再構築したOracle Planと、
生成済みコードに保持されているOracle Planを比較してください。

文字列一致を確認するのではありません。

意味として、

- Observationが一致しているか。
- Expectedが一致しているか。
- Failure discriminationが一致しているか。
- Assertion / Verificationの種類がその意味を実現できるか。

を確認してください。

生成済みOracle Planが、

```text
operation succeeds
target remains observable
valid input is not rejected
```

等の汎用表現になっている場合は、
元のTest Specificationが本当にその程度の意味しか持たないCaseなのかを再確認してください。

Test Specificationから、

- 具体的な値変換
- prefix / suffix
- DTO fieldの関係
- Collection内容
- validation rejection
- dependency invocation
- identifier変換
- returnとargumentの関係
- state change

等を判断できるにもかかわらず、
汎用Oracle Planへ縮退している場合は不適合です。

## 30.5 Case固有性検査

全CaseNoについて、
そのOracleがCase固有性を持つかを確認してください。

CaseNoごとに以下を問います。

### 検査1

このCaseNoのOracleからCaseNo文字列、
targetId、method名、dataId等の識別情報だけを取り除いた場合、
多数の別CaseNoへそのまま適用できる完全に同一の意味になっていないか。

同一になる場合は、
Test Specification上も本当に同一OracleでよいCase群なのかを確認してください。

### 検査2

同じmethodに属する別Mirror Caseと比較してください。

例えば、

```text
length_min
length_min_minus_1
length_max
length_max_plus_1
normal_mid
```

が存在する場合、
それぞれのCaseで期待される振る舞いの違いがOracleへ反映されているか確認してください。

Mirrorだけ違うのにすべて、

```text
assertNull(error)
assertNotNull(result)
```

で終わっている場合、
そのMirror差異がOracleへ不要である合理的理由がTest Specification上に存在するか確認してください。

存在しなければ不適合です。

### 検査3

同じOracle kindが大量Caseへ使用されている場合、
そのOracle kindに属するCaseをmethod、target、Mirror X/Y/Z、
確認内容、想定結果ごとに比較してください。

意味の異なるCaseが同一Oracle kindへまとめられていないか確認してください。

特に、
同一Oracle kindについて、Observation / Expected / Failure discriminationからCaseNo、targetId、dataId、class名、method名等の識別子を除いた意味テンプレートの種類数とCase数を集計してください。
1つの意味テンプレートが異なるmethod semanticsへ大量適用されている場合、各method単位でTest Specificationを再照合してください。

もし、全Caseの大部分が一つのOracle kindへ分類されている場合は、
共通化が適切であると仮定せず、
その分類がTest Specification上の意味差を失っていないかを確認してください。

### 検査4

同じOracle helperを利用する場合でも、
CaseNoごとに渡される情報によって実際の判定条件が変化しているか確認してください。

CaseNoごとにOraclePlan objectだけは異なるが、
CaseOracle側がそのfieldを読んでいない場合は不適合です。

## 30.6 反事実によるOracle検査

各CaseNoについて、
SUTがTest Specificationへ違反する代表的な誤実装を内部的に想定してください。

実際のSourceを書き換える必要はありません。

例えば、

- 正しいreturnの代わりに別の値を返す。
- prefixを付加しない。
- suffixを誤る。
- DTOの別fieldへ値を設定する。
- Collectionから対象値を欠落させる。
- Collection sizeを誤る。
- dependencyへ誤ったargumentを渡す。
- dependencyを呼ばない。
- dependencyを余分に呼ぶ。
- validation違反入力を受理する。
- validation違反とは無関係な理由でexceptionを発生させる。
- void methodで必要な副作用を行わない。
- target inputを無視して固定値を返す。
- 正常入力を異常として拒否する。

その誤実装を行った場合、
現在生成されているJUnitがFAILするかを判断してください。

FAILしない場合は、
そのCaseNoのOracleは不適合です。

不適合の場合は、

Observation
→ Expected
→ Failure discrimination
→ Assertion / Verification

の順で再判断してください。

## 30.7 恒真または準恒真Oracle検査

以下のようなOracleが存在する場合、
CaseNo固有の期待結果を判定できているか必ず再確認してください。

```java
assertTrue(true);
```

```java
assertNotNull(result);
```

```java
assertNull(error);
```

```java
assertTrue(returnType.isInstance(result));
```

```java
assertNotNull(receiver);
```

```java
assertTrue(invocationCount > 0);
```

```java
assertNull(result);
```

これらのassertion自体を一律禁止するわけではありません。

ただし、
これらだけでCaseNoが完結している場合は、
Test Specification上の期待結果そのものが
その条件で十分に判定できるCaseであることを確認してください。

例えば、

「非nullであること自体」が仕様上の確認事項であるCaseなら
`assertNotNull`は成立します。

一方、

「入力値にprefixを付与した結果を返すこと」
を確認するCaseで`assertNotNull`だけなら不適合です。

## 30.8 Validation Rejection専用検査

Validation rejectionは既知の誤りが発生しやすい領域として、
REJECTION系Caseすべてについて個別に確認してください。

まず、
そのCaseが本当に拒否されるべきCaseかを、
以下から確認してください。

- validationMin
- validationMax
- nullable
- rawAnnotations
- Mirror Y
- Mirror Z
- Test Specification
- AST Field Level
- AST Method Level

例えば、

```text
nullable = 0
+
length_null
```

ならNull拒否との関係を確認します。

```text
validationMinが存在
+
length_min_minus_1
```

なら下限違反との関係を確認します。

```text
validationMaxが存在
+
length_max_plus_1
```

なら上限違反との関係を確認します。

ただし、
「何らかのexceptionが発生した」
ことだけを拒否成功として扱わないでください。

以下を区別してください。

```text
期待された入力拒否
```

と、

```text
SUT内部のNullPointerException
依存関係の初期化失敗
DB接続エラー
Reflection失敗
Mockito設定不備
TestDataRuntime失敗
DTO構築失敗
その他テストHarness由来の例外
```

Validation rejection Oracleでは、

「違反入力が正常に処理されないこと」

だけでなく、

「観測された異常が、そのCaseで期待される入力拒否経路と合理的に対応していること」

まで確認してください。

具体的なexception classを入力から判断できる場合は、
そのexception classを確認してください。

Bean Validation、
method parameter validation、
DTO validation等の観測方法が異なる場合は、
対象annotationおよびmethod構造に適した観測方法を使用してください。

## 30.9 正常系専用検査

正常系Caseについて、
単にexceptionが発生しないことだけをOracleとしないでください。

各Caseについて、

- 何が返るか。
- 何が変化するか。
- 何がdependencyへ伝わるか。
- DTO/Objectの何が保持されるか。
- Collection / Mapの何が成立するか。
- どの副作用が発生するか。

をTest SpecificationおよびASTから確認してください。

正常終了だけで仕様を判定できるCaseでない限り、
`assertNull(error)`だけでは不適合です。

## 30.10 SUCCESS_AND_PROPAGATION等の汎用Oracle専用検査

入力値の伝播を確認するOracleを使用するCaseについて、
そのCaseで「入力値がreturnまたはdependency argumentへ残ること」が
本当に仕様上期待されるかを確認してください。

以下のようなmethodでは、
入力値そのものが結果へ現れない場合があります。

- validation
- calculation
- aggregation
- conversion
- deletion
- state transition
- authentication / authorization
- flag更新
- void処理

したがって、

```text
target inputがreturnまたはdependency argumentから見つからない
```

ことだけを誤実装とみなさないでください。

逆に、
入力値の伝播そのものが仕様上重要なCaseでは、
returnまたはdependency argument等の具体的な観測対象を確定し、
その関係をassertしてください。

汎用的なSUCCESS_AND_PROPAGATION等のOracle kindへ
多数Caseを分類する場合は、
各Caseについてこの確認を実施してください。

## 30.11 Mirror X専用検査

Mirror Xを持つCaseについて、
Xが表す値の種類・構成差が、
そのCaseでどのような仕様差を生むかを確認してください。

Xによって変わる入力値を生成しただけで検査完了としないでください。

そのX条件を、

- 受理するべきか
- 拒否するべきか
- そのまま保持するべきか
- 正規化・変換するべきか
- returnへ反映するべきか
- dependencyへ渡すべきか

等、
Test SpecificationとASTから判断できる観測結果へ接続してください。

## 30.12 Mirror Y専用検査

Mirror Yを持つCaseについて、
境界の違いがOracleへ反映されているか確認してください。

特に、

- length_null
- length_empty
- length_min
- length_min_minus_1
- length_max
- length_max_plus_1
- normal_mid

等を同一Oracleへ機械的にまとめていないか確認してください。

各Y Caseについて、
validationMin、validationMax、nullable、
Test Specificationと照合し、
受理・拒否・保持・処理結果のどの違いを確認するCaseなのかを判断してください。

## 30.13 Mirror Z専用検査

Mirror Zを持つCaseについて、
Zの意味がOracleへ反映されているか確認してください。

Z値をTestDataRuntimeが生成したことだけでは、
Z Caseの検証完了ではありません。

例えば、

- invalid_value
- out_of_range
- identifier
- quoting
- Unicode
- control character
- whitespace
- domain-specific pattern

等について、
その値がmethodのどこで解釈され、
どのような結果を生むべきかをTest Specification、AST、
method contextから判断してください。

Zの意味がreturn、validation、dependency、state等のどこにも
Oracleとして反映されていない場合は再確認してください。

## 30.14 void method専用検査

void methodでは、
return valueが存在しないことを理由として
成功終了だけをOracleにしないでください。

以下からCaseNo固有の観測対象を確認してください。

- dependency invocation
- dependency argument
- invocation count
- state change
- field change
- persistence
- exception
- validation result
- その他副作用

単なる、

```text
receiverが存在する
何かdependencyが1回以上呼ばれた
```

だけの場合は、
その条件自体がTest Specification上の期待結果か確認してください。

## 30.15 dependency invocation専用検査

dependency invocationをOracleとする場合、

```text
何かdependencyが呼ばれた
```

ではなく、
可能な範囲で、

- どのdependency
- どのmethod
- 呼ばれるべきか / 呼ばれないべきか
- invocation count
- argument
- argument field

をTest SpecificationとASTから判断してください。

CaseNoが対象とする処理と無関係なdependency invocationが存在するだけで
PASSしてはいけません。

## 30.16 return value専用検査

return valueをOracleとする場合、
型だけを検査して終了しないでください。

Test Specificationから判断可能な場合は、

- 値
- prefix / suffix
- 入力との関係
- DTO field
- Collection内容
- Collection size
- Map内容
- null / non-null
- transformation result

等を検査してください。

現在SUTが返した値をexpectedとして再利用してはいけません。

## 30.17 Object / DTO専用検査

DTO/Objectを返すCaseについて、
Objectがnon-nullであるだけで十分か確認してください。

Test Specification上で意味を持つfieldが存在する場合は、
そのfieldをOracleへ反映してください。

入力DTOと出力DTOの関係、
target fieldの保持・変換等が確認対象である場合は、
対象fieldまで比較してください。

## 30.18 Collection / ARRAY / Map専用検査

Collection / ARRAY / Mapについては、
container自体のnon-nullだけでなく、
CaseNoの意味に応じて以下を確認してください。

- size
- empty / non-empty
- element
- element順序
- Set uniqueness
- Map key
- Map value
- target elementの存在
- DTO elementのfield
- nested container

ただしTest Specificationに存在しない順序性やunique制約等を
独自に追加してはいけません。

## 30.19 constructor / METHOD Case専用検査

引数なしMETHODやconstructor Caseについて、
Test Data Instructionが存在しないことを理由にOracleを簡略化しないでください。

入力値を持たなくても、

- instance生成結果
- 初期状態
- return value
- dependency effect
- exception
- method固有結果

等からTest Specification上のOracleを判断してください。

## 30.20 abstract class / interface対象専用検査

interfaceまたはabstract targetについて、
mockを呼び出してそのmock自身のinvocationを確認するだけで
SUT仕様を検証したことにしないでください。

そのCaseNoで実際に検証対象となる契約が、

- method invocation contract
- argument contract
- return contract
- validation contract
- implementationを経由するdependency contract

のどれであるかを確認してください。

mockへ自分でmethodを呼び、
その呼び出しが記録されたことだけを確認する自己確認Oracleは不適合です。

## 30.21 共通Oracleの大量適用検査

Oracle kindごとのCase数を確認してください。

特定のOracle kindが多数Caseを占める場合、
それ自体を問題とはしません。

ただし、
そのOracle kindに属するCaseを、

- class
- method
- target
- Mirror X
- Mirror Y
- Mirror Z
- 確認内容
- 想定結果

ごとに比較し、
意味の異なるCaseが同じ汎用Oracleへまとめられていないか検査してください。

特に全Caseの大部分を一つのOracle kindが占める場合は、
そのOracle kindの代表数件だけを確認して終了せず、
そのOracle kindに属する全CaseについてCase固有性検査を行ってください。

## 30.22 Oracle Planの未使用field検査

OraclePlanに保持している情報が、
最終的なCaseOracleで実際に利用されているか確認してください。

例えばOraclePlanに、

- observation
- expected
- failureDiscrimination
- mirrorX
- mirrorY
- mirrorZ
- verificationText
- expectedText

を保持していても、
CaseOracleが`kind`しか参照していない場合、
Oracle Planの意味情報が最終判定へ反映されていません。

OraclePlanの各情報について、
必要な情報が実際のassertion / verificationへ接続されていることを確認してください。

## 30.23 Test Specification自然言語の消失検査

生成前にTest Specificationから読み取った、

- 確認内容
- 確認手順
- 想定結果
- 想定結果判断基準・判断手順

の意味が、
Oracle Plan生成後に失われていないか確認してください。

CaseDefinitionへ元文章そのものを保持する必要はありません。

しかし、
その文章から判断したObservation、Expected、
Failure discriminationが最終Oracleへ残っていなければなりません。

## 30.24 Case間差分による横断検査

同一methodまたは同一targetに属する複数Caseを並べて比較してください。

Case間で異なるものが、

```text
Mirror ID
CaseNo
dataId
```

だけで、
Oracleの意味がすべて完全に同じ場合は再確認してください。

Mirror Case間で仕様上期待される差異が存在する場合は、
Oracleにもその差異が存在しなければなりません。

## 30.25 Oracle不適合の判定

以下のいずれかに該当するCaseNoは、
Oracle不適合として扱ってください。

- Oracle Planが存在しない。
- ObservationがCaseNoの意味と一致しない。
- ExpectedがCaseNoの意味と一致しない。
- Failure discriminationが実際のassertionへ反映されていない。
- CaseNoの誤実装を想定してもJUnitがPASSする。
- Test Specificationの意味が汎用Oracleへ縮退している。
- Mirror条件が入力生成にしか使われず、必要なOracle判断へ反映されていない。
- Validation rejectionと無関係なexceptionを成功扱いする。
- 正常系を単なる正常終了のみで判定している。
- void methodを副作用確認なしに成功扱いする。
- return type確認だけで終了する。
- dependencyが何か呼ばれただけで成功扱いする。
- mockへの自己呼び出しをSUT Oracleとしている。
- OraclePlanに情報を保持しているがCaseOracleが利用していない。
- 多数の意味の異なるCaseを一つの汎用Oracleへまとめている。

## 30.26 Oracle不適合の全件洗い出し

Oracle不適合を1件発見した時点で検査を終了しないでください。

全13,583 CaseNoについて30.1～30.25を実施し、
Oracle不適合CaseNoをすべて洗い出してください。

同一原因と思われるCaseが多数存在しても、
代表Caseだけを記録して残りを未確認にしてはいけません。

## 30.27 Oracle不適合の修正

全件洗い出し完了後、
不適合CaseNoについてOracleを修正してください。

修正は、

1. 元のTest Specificationを再確認する。
2. Mirror X / Y / Zを再確認する。
3. ASTを再確認する。
4. Test Data Instructionを再確認する。
5. Observationを再決定する。
6. Expectedを再決定する。
7. Failure discriminationを再決定する。
8. Assertion / Verificationを再決定する。
9. Oracle Planへ反映する。
10. 最終JUnitコードへ反映する。

の順で行ってください。

共通Oracle自体が原因の場合は、
そのOracleを使用する全CaseNoへの影響を確認してください。

## 30.28 Oracle修正後の再検証

Oracle修正後、
修正したCaseNoだけを確認して終了しないでください。

全CaseNoについて、
改めて30.1～30.25のOracle検証を実施してください。

Oracle不適合が1件でも残っている場合は、
再度30.26～30.28を実施してください。

全CaseNoについてOracle不適合がなくなるまで、
Oracle専用検証を完了したものとして扱わないでください。

## 30.29 Oracle専用検証の完了条件

Oracle専用検証は、
以下をすべて満たした場合のみ完了とします。

- 全CaseNoについてOracle Planが存在する。
- 全CaseNoについてObservationがCase固有の意味と整合する。
- 全CaseNoについてExpectedがCase固有の意味と整合する。
- 全CaseNoについてFailure discriminationが定義されている。
- 全CaseNoについてFailure discriminationが実際のJUnit判定へ反映されている。
- 全CaseNoについてTest Specificationの意味が最終Oracleまで保持されている。
- 全CaseNoについて反事実上の誤実装を少なくとも1つ想定し、その誤実装を現在のJUnitがFAILとして識別できる。
- validation rejection等の異常系で、無関係なexceptionを成功扱いしていない。
- 正常系で単なる正常終了だけをOracleとしていない。
- void、dependency、return、DTO、Collection、Map、Mirror X/Y/Z等について必要な専用検査を通過している。
- Oracle Planの情報を保持するだけでなく、最終assertion / verificationが実際にその情報を利用している。
- 意味の異なる大量Caseを汎用Oracleへ縮退させていない。
- Oracle不適合CaseNoが0件である。


# 31. 完成条件

生成物は説明用サンプルではなく、
対象プロジェクトへ配置するJUnitコード一式です。

以下を満たしてください。

- Validation済みTest Specificationの全CaseNoが実装されていること。
- Validation済みTest Specificationに存在しない追加Test Caseが生成されていないこと。
- 1 CaseNoが1 JUnit Test Caseとして保持されていること。
- CaseNoの削除、追加、統合、分割が行われていないこと。
- 「重複」「類似」「低優先度」「代表ケースで十分」等のAI判断による間引きが行われていないこと。
- CaseNoがそのままJUnitテストタイトルになっていること。
- 全Scenarioから呼ばれるWrapper methodが実在し、ASTと整合すること。
- TestDataRuntimeの利用方法がJUnit設計と一致すること。
- Test Data Instructionに存在するdataIdを使用すること。
- Project Environmentが存在する場合、その内容と矛盾しないこと。
- package、import、class、methodの参照関係が生成コード一式の中で整合すること。
- 各CaseNoに、そのCaseNoの正誤を識別できるOracleが実装されていること。
- Harness健全性確認だけをCase Oracleとしていないこと。
- TODOを残さないこと。
- 疑似コードを残さないこと。
- 「...」等でコードを省略しないこと。
- 存在しないmethodやclassを説明目的で仮定しないこと。
- 全CaseNoのうち一部だけを代表例として出力しないこと。
- 出力前内部検証を全ての生成物において通過し、不適合件数が0件であること。
- Test Oracle専用検証を全ての生成物において通過、不適合件数が0件であること。
- 出力前内部検証およびTest Oracle専用検証で不適合件数が1件以上あった場合、不適合対象を全件修正した上で、出力前内部検証とTest Oracle検証行い、各検証共不適合件数が0件であること。

---

# 32. 出力形式

最終成果物は必ずArtifactとして生成してください。

Artifactとして生成するZIPのトップディレクトリは、必ず `test` としてください。

ZIP内の構成は以下を起点としてください。

```text
test/
```

`test`より上位に別のトップディレクトリを作成しないでください。
ZIP直下へJUnit関連ファイルを直接配置しないでください。
生成するすべてのJUnit関連ファイルは`test/`配下へ配置してください。

Validation済みTest Specificationの全CaseNoを実行するために必要なファイルだけを生成してください。

以下のような、JUnitテスト実行に不要な補助成果物を独自追加しないでください。

- Shell Script
- PowerShell Script
- README
- docs / document
- Markdown説明ファイル
- 設計書
- 生成手順書
- 実行手順書
- Prompt
- Prompt生成用ファイル
- サンプルコード
- Example
- テストコード生成結果を説明するためだけのファイル

入力情報に存在しない補助ツール、補助スクリプト、ドキュメントをAI独自判断で新規生成しないでください。

ただし、Validated Test Specificationの全CaseNoを実行可能にするために、
JUnit設計YAML上必要とされるテストコード上のWrapper、Scenario、Fixture、Utils、
Constants、Data Provider等は生成対象に含みます。

「便利だから」「保守しやすいから」「一般的な構成だから」等の理由で、
テスト実行に不要なファイルを追加しないでください。

通常のチャット本文へJUnitソースコードを直接並べる形式を最終成果物にしないでください。

チャット本文には、Artifact生成が完了したことを示す最小限の説明だけを残してください。

Artifactには、対象プロジェクトへ配置するために必要なJUnit関連ファイルを完全な形で含めてください。

出力量が多いことを理由として、以下を行わないでください。

- CaseNoの省略
- Scenarioの省略
- Wrapper methodの省略
- 必要な補助ファイルの省略
- ソースコード途中の省略
- 「以下同様」の記述への置換
- 「残りも同じ形式で生成可能」等の未生成状態での終了
- TODOへの置換
- 疑似コードへの置換
- 一部CaseNoのみを代表例として生成すること

CaseNoやTest Specification自体を削除、追加、統合、分割しないでください。

生成量が多い場合も、
作業量や出力量を理由として勝手に生成対象を減らさないでください。

---

# 33. 最終実行指示

以下の手順に完全に沿って作業を行ってください。

0. 最初に `prompt/prompt_junit_code_generation.md` を全文読み、このPrompt全体の役割、入力責務、JUnit設計、Oracle、完成条件、出力形式を把握してください。
1. 次に `quality/quality_priority_table.md` を全文読み、このプロジェクトにおける品質レベルを正確に把握してください。
2. 次に `junit/511.JUnit設計YAML.md` を全文読み、Scenario、Wrapper、TestDataRuntime、Evidence、Replay、Fixture、Utils、Constants、Data Provider等の責務と生成構造を把握してください。
3. 次に `mirror/mirror_principle_spec.md` を全文読み、Mirror X / Y / Zが表すテスト観点を把握してください。
4. 次に `test_spec/test_spec_validation.csv` を全文読み、全CaseNo、targetId、Mirror X / Y / Z、ケース内容、操作手順、確認内容、確認手順、想定結果、想定結果判断基準・判断手順を把握してください。
   - 全CaseNoを生成対象として保持してください。
   - CaseNo単位で、後続ファイルと照合するためのTest Specification上の意味を把握してください。
5. 次に `instruction/test_data_instruction.csv` を全文読み、CaseNoごとに必要なTARGETおよびNORMALのdataId、dataRole、convModel、referenceType等を把握してください。
   - Test SpecificationのCaseNoとTest Data InstructionのCaseNoを照合してください。
   - 各CaseNoでJUnit実行時にTestDataRuntimeへ要求するdataIdを把握してください。
6. 次にASTを以下の順番でそれぞれ全文読みます。
   1. `ast/ast_source_file_level.csv`
      - targetIdに含まれるsource fileと照合し、対象class、package相当位置、import等を把握してください。
   2. `ast/ast_method_level.csv`
      - Test SpecificationのtargetId、method名と照合し、対象method、argument名、argument型、argument順序、return type、methodType、accessModifier、process情報を把握してください。
   3. `ast/ast_field_level.csv`
      - 対象class、method、argument、DTO/Object等と照合し、field、fieldType、fieldKind、annotation、validation情報を把握してください。
7. 次に `environment/` 配下の全ファイルを読み、JUnitコードを対象プロジェクトへ適合させるためのJava version、JUnit、Mockito、build system、その他利用可能な依存関係を把握してください。
8. ここまで読んだ情報をCaseNo単位で照らし合わせます。
   - Test Specificationから、そのCaseNoが何をテストするCaseなのかを把握します。
   - Mirror Principleから、そのCaseNoのMirror X / Y / Zが意味する入力条件を把握します。
   - Test Data Instructionから、そのCaseNoの入力を構成するdataIdを把握します。
   - AST Source File Levelから対象classとimportを対応付けます。
   - AST Method Levelから対象method、argument、argument順序、argument型、return typeを対応付けます。
   - AST Field Levelから必要なDTO/Object field、dependency field、annotation等を対応付けます。
   - Project Environmentから利用するJUnit/Mockito/Java APIを対応付けます。
9. CaseNoごとにJUnitコードへ変換する内容を確定します。
   - Scenario
     - CaseNoをJUnitテストタイトルとして設定します。
     - 対象Wrapperを選択します。
     - ASTで確定した対象methodを選択します。
     - Test Data InstructionのdataIdをargument / DTO fieldへ対応付けます。
   - Wrapper
     - 対象SUT classに対応するWrapperを使用または生成します。
     - AST上のmethod signatureに対応するWrapper operationを使用または生成します。
   - Test Data
     - CaseNoに必要なdataIdをTestDataRuntimeへ渡します。
     - project固有DTO/Objectが必要な場合は、取得した値をAST構造に従って組み立てます。
   - Test Oracle
     - Test Specificationの確認内容、確認手順、想定結果、想定結果判断基準・判断手順を読みます。
       - Mirror X / Y / Zによって、そのCaseNoで変化している入力条件を確認します。
       - ASTから、対象method実行後にJUnitから観測できる対象を確認します。
         - return value
         - exception
         - DTO/Object内容
         - Collection / Map内容
         - state change
         - dependency invocation
         - dependency argument
         - persistence等の副作用
       - そのCaseNoで観測する対象を一つまたは必要な組み合わせとして確定します。
       - 正しく実装されている場合に、その観測対象について何が成立するかを確定します。
       - SUTがそのCaseNoの想定結果に反した場合に、どの違いをFAILとして識別するかを確定します。
       - Observation / Expected / Failure discriminationをJUnit assertionまたはverificationへ変換します。
         - 正常系の場合
           - 単に実行できたことではなく、CaseNoの意味に対応するreturn、DTO内容、Collection内容、state、dependency invocation等を判定します。
         - 異常系の場合
           - Mirror条件、validation、annotation、Test Specificationから入力拒否やexceptionが期待されるかを判断します。
           - exceptionをOracleにする場合は、そのCaseNoの期待する拒否と実際のexceptionを対応付けます。
         - void methodの場合
           - return value以外のstate、dependency invocation、argument、副作用、exception等から観測対象を確定します。
         - Mirror X / ZのCaseの場合
           - XまたはZが表す入力の性質が、対象methodのreturn、validation、状態、依存呼び出し等のどこへ現れるかをASTおよびTest Specificationから判断します。
           - その変化を識別できるOracleへ変換します。
       - Observation / Expected / Failure discrimination / Assertion / Verificationを確定した結果を、そのCaseNoのOracle Planとして保持します。
       - Oracle Planを、生成するCase Definition、Scenario、Executor、CaseOracleまたはCase固有assertion / verificationへ情報を失わず受け渡します。
       - 最終JUnitコード上で、Oracle PlanのObservation、Expected、Failure discriminationが実際のPASS / FAIL判定へ反映されていることを確認します。
       - Test Oracleを確定したら、SUTがCaseNoの想定結果に反していてもそのassertionがPASSしないかを確認します。
       - 問題がある場合はObservation、Expected、Failure discriminationを再確認し、CaseNoの正誤を識別できるOracleへ修正します。
   - Evidence / Replay
     - JUnit設計YAMLに従い、CaseNo、dataId、elementIndex、actualValue、actualLength、runMode等の必要なEvidence処理を接続します。
10. 同じSUT classに属するCaseNoをまとめ、正しいJUnitコード構成に従ってScenario、Wrapper、共通実行処理、必要なFixture / Utils / Constants / Data Provider等を生成してください。
11. 全CaseNoの生成後、本Promptの「出力前内部検証」に従って生成物全ソースファイルを1つ1つ確認してください。
12. 本Promptの「出力前内部検証」に従い確認した結果、不適合な生成物をすべて洗い出してください。
  1. 洗い出しは途中で決して止めず、生成物全体をまずは洗い出してください。
  2. 洗い出した結果、1件でも不適合な生成物があった場合は、まずは不適合な生成物のみを修正してください。
  3. 不適合な生成物の修正が完了した場合、次に影響する生成物をすべて修正してください。
  4. 不適合な生成物の修正および影響する生成物の修正が完了した場合、改めて本Promptの「出力前内部検証」い従い生成物全体を確認してください。
  5. 再度生成物全体を確認した結果、不適合な生成物な生成物が1件でも見つかった場合、改めて不適合な生成物の洗い出しを行い、以後不適合な生成物が見つからず、全ての生成物が本Promptの「出力前内部検証」に通過した場合にのみ、次の手順へ移行してください。
13. 「出力前内部検証」の不適合が0件となった後、本Promptの「Test Oracle専用検証」を開始してください。
  1. Validation済みTest Specificationの全CaseNoについて、「Test Oracle専用検証」の全手順を1つ1つ実施してください。
  2. 特に全手順を一気に行うのではなく、項番20.1.を全てのCaseNoについて吟味し、吟味が終わったら、項番20.2.を全てののCaseNoについて吟味する、、、といったように項番20.n毎に毎回すべてのCaseNoについて吟味してください。
  3. Test Oracle不適合を吟味や検査の途中で発見しても吟味・検査を停止せず、まずは全CaseNoについてTest Oracle不適合をすべて洗い出してください。
  4. 全CaseNoの洗い出し完了後、次にTest Oracle不適合CaseNoの内容をすべて修正してください。
  5. 共通Oracle、OraclePlan、CaseExecutor、Wrapper、Scenario等の修正が他のCaseNoへ影響する場合は、影響する全CaseNoおよび関連生成物をすべて修正してください。
  6. Test Oracle修正完了後、全CaseNoについて改めて「Test Oracle専用検証」を最初からすべてに対して項番20.n.を１つずつ実施してください。
  7. Test Oracle不適合が1件でも見つかった場合は、再度全件を洗い出し、修正、全ソースファイルを1つ1つ再検証を行ってください。
  8. 全CaseNoについてTest Oracle不適合が0件となり、「Test Oracle専用検証」の完了条件をすべて満たした場合のみ次へ進んでください。
14. Test Oracle専用検証完了後、改めて「出力前内部検証」を実施し、Oracle修正によって構文、CaseNo集合、Wrapper、dataId、Runtime接続、ファイル構造等へ新たな不適合が発生していないことを確認してください。
  1. もし新たな不適合が発生した場合、まずは対象を全ソースファイル検証し不適合ファイルを洗い出してください。
  2. 次に洗い出した内容に対して1つずつ、必要最低限の余計な改善や改良は無しに修正を行ってください。
  3. 修正が全件完了したら、改めて「出力前内部検証」を実施し、不適合の修正漏れが無いこと確認してください。
  4. 不適合の修正漏れがあった場合、洗い出しを再度行い、必要最低限の余計な改善や改良は無しに修正を行い、0件となるまで洗い出しと修正、「出力前内部検証」を繰り返して、不適合が0件となるまで繰り返してください。
15. 再総合検証として、「出力前内部検証」および「Test Oracle専用検証」をもう一度全ソースファイルに対して行い、確実に不適合件数が0件であることを確認してください。
  1. 不適合件数が1件以上いずれかに見つかった場合は、再度本手順の項番 12. から実施してください。
  2. なお、検証が冗長であるからや、非効率という勝手な判断による省略や短縮は決して許されません。
16. 再総合検証としての「出力前内部検証」および「Test Oracle専用検証」の双方が不適合0件となった場合は、もう一度もれなく検査するために、改めて、本手順の項番0.～7.を実行し、漏れている観点や検証内容、怠っているルールの把握や違反が無いか、確認してください。
17. 漏れている観点や検証内容、怠っているルールの把握や違反の確認が完了した場合、有無に限らず、本手順の項番11.～15.を行ってください。項番15.まで完了した場合、項番16.,17.はスキップし、項番18.を実施してください。
18. 対象プロジェクトへ配置してコンパイル・実行できるJUnitテストコード一式をArtifactとして生成してください。
19. Artifactは本Promptの「出力形式」に従い、`test/`をトップディレクトリとし、全CaseNoを含む完全な生成物として完成させてください。
