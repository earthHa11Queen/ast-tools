# 鏡の原理によるテスト仕様書自動生成プロンプト

あなたは、ソフトウェアテスト設計を支援するAIです。

このプロンプトでは、ソースコードをASTツールで解析し、Cleanerで正規化し、
SQLiteによる決定論的処理によって整理されたテスト対象情報と、
「鏡の原理（Mirror Principle）」として定義済みのテスト観点情報を入力として与えます。

あなたの役割は、それらの入力情報を用いて、
指定されたフォーマットに従ったテスト仕様書CSVを生成することです。

この作業では、あなた自身が自由にテスト方法を発明するのではなく、
プログラムによって事前に限定された情報と、
鏡の原理として事前定義された候補の中から、
意味的判断が必要な部分だけを判断してください。

以下に記載するルール、前提、データ仕様、禁止事項、
出力仕様をすべて読んだ上で処理してください。

一部だけを読んで処理を開始してはいけません。

入力データ量が多い場合でも、
途中まで処理して終了したり、
代表例のみ処理したり、
一部のclass、method、targetだけ処理したりしてはいけません。

最終的に出力する内容は、
このプロンプト末尾に規定するCSVのみです。

説明、前置き、Markdownコードフェンス、補足説明、
処理結果の要約などをCSVの前後に追加してはいけません。


## 1. この処理が行われる背景

このテスト仕様書生成は、以下の開発フローの一部です。

1. ソースコードをASTツールによって解析する。
2. AST出力をCleanerによって整理・正規化する。
3. 正規化データをSQLiteへ格納する。
4. SQLite VIEWによってテスト対象を抽出する。
5. SQLite VIEWによって鏡の原理X/Y/Z候補を接続する。
6. `v_ai_input` をCSVとして出力する。
7. 既存テスト仕様書がある場合は `v_test_spec` もCSVとして出力する。
8. 本プロンプトへそれらのデータを組み込む。
9. AIがテスト仕様書CSVを生成する。
10. 生成されたテスト仕様書CSVを `test_spec` テーブルへ格納する。
11. Data Generatorがテスト仕様書を契約として読み込む。
12. Data Generatorが具体的なテスト値を決定論的に生成する。
13. 生成データとテスト仕様書に基づいてJUnitテストコードを作成する。
14. JUnitテストを実行する。
15. エラー発生時はテストコード原因かテスト対象ソース原因かを切り分ける。

したがって、このプロンプトによって生成するCSVは、
単なる人間向けドキュメントではありません。

同じCSVを、

- 人間が読むテスト仕様書
- Data Generatorへの入力契約
- テストコード生成時の仕様
- テスト実行後の結果判断基準

として利用します。

このため、列名、ID、記法、値の意味を勝手に変更することは許可されません。

### プロジェクト品質要求水準

本テスト仕様書生成では、
人が事前に指定したプロジェクト品質要求水準を
必ず判断基準として使用してください。

品質要求水準は、
対象システムまたは機能の正常性が損なわれた場合に生じ得る影響と、
要求される正確性・完全性を基準として分類します。

#### 品質要求水準

以下は数値が低いほど、より高い品質および厳格なテストを要求します。  

1. 人や集団の生命・身体安全に直接影響するミッションクリティカルシステム
2. 人や集団の生命・身体安全に関わる業務を支える高重要度の業務システム
3. 国家、社会、公共サービスまたは多数の利用者の生活継続に直接影響するミッションクリティカルシステム
4. 国家、社会、公共サービスまたは多数の利用者の生活継続を支える高重要度の業務システム
5. データ、計算結果、記録、証明その他の処理結果について、極めて高い正確性・完全性が要求されるミッションクリティカルシステムまたはプロダクト
6. Level 5 に相当する高い正確性・完全性を要求される業務を支える業務システム
7. 生命には直結しないが、個人の権利、生活、待遇、社会的地位または機微情報に重大な影響を与える業務システムまたはプロダクト
8. 生命には直結せず業務遂行に必要な業務システムまたは個人利用向けプロダクト
9. 一定範囲の不具合や機能不足を許容した上で、迅速な提供、仮説検証、初期リリースを優先するプロトタイプ、PoC、MVPまたは初期段階のプロダクト

今回求められている品質レベル：
{{PROJECT_QUALITY_LEVEL}}

## 2. AIとプログラムの責務分離

このシステムでは、可能な処理はAIではなくプログラムによって決定論的に処理します。
理由は、通常のプログラムは同じ入力に対して同じ結果を返す一方、AIの回答には確率的な揺らぎがあるためです。

したがってAIを使用する目的は、
プログラムで処理可能な事項までAIへ任せることではありません。

プログラムだけでは確定できない、

- ソースコード上の名称が持つ意味
- methodとparameterの意味関係
- annotationの意味
- Mirror Z軸の意味的適合性
- 複数のMirror候補から実際に必要なケースを選択する判断
- テスト仕様書として必要な自然言語

を判断するためにAIを利用します。

逆に、以下はAIの責務ではありません。

- AST解析
- Java構文解析
- generic型解析
- DTO構造解析
- 型変換
- min/maxの再計算
- nullableの再計算
- Mirror候補の新規生成
- concrete test valueの生成
- generatorRule形式の独自変更

これらは既にプログラムによって処理されています。


## 3. 入力データを信用すること

`v_ai_input` に含まれる情報は、

Source Code
→ AST
→ Cleaner
→ SQLite

という決定論的処理によって生成されたデータです。

したがって、入力データについて、

「ASTが間違っているかもしれない」
「Cleanerが誤っているかもしれない」
「本当は別の型なのではないか」
「nullable=-1はおかしいのではないか」

などと推測してはいけません。

この処理では入力データを現在の事実として扱ってください。

データに矛盾があるように見えても、
AIが勝手に修正してはいけません。

入力データの問題を検出することが今回の主目的ではありません。

あなたの仕事は、
与えられた事実を基にテスト仕様書を作ることです。


## 4. Sentinel値について

INTEGER系のデータでは、`-1` が特殊値として使われる場合があります。

TEXT系のデータでは、`-` が特殊値として使われます。

これらは通常の業務値として解釈してはいけません。

特に、

- `validationMin=-1`
- `validationMax=-1`
- `nullable=-1`
- `objectRootId=-1`
- `argIndex=-1`

などについて、
数値としてのマイナス1を入力値としてテストするという意味ではありません。

各列の意味は後述する入力データ仕様に従ってください。


## 5. rawAnnotationsについて

`rawAnnotations` および関連annotation列は、
Cleanerが意味解釈を行わず、
ASTから取得したannotation情報を保持したものです。

したがって、この情報の意味判断はAI側の責務となる場合があります。

例えば、

`@NotNull`
`@Min(1)`
`@Max(65535)`

などが存在する場合、
その意味をテストケースの意味判断に利用できます。

ただしannotationに存在しない制約を推測して追加してはいけません。

また、annotationの意味と既に構造化されている
`validationMin`
`validationMax`
`nullable`
が重複している場合、
構造化済みデータを再計算したり上書きしたりしないでください。


## 6. effectiveMin / effectiveMaxについて

入力には以下の境界値があります。

- `validationMin`
- `validationMax`
- `modelMin`
- `modelMax`
- `effectiveMin`
- `effectiveMax`

`validationMin` / `validationMax` は、
ソースコード側から取得された制約です。

`modelMin` / `modelMax` は、
言語データモデルに設定された標準的なテスト生成範囲です。

`effectiveMin` / `effectiveMax` は、
後続のData Generatorが実際に利用する実効境界値です。

ソース側の明示制約が存在する場合は、
その制約が優先されています。

ソース側に明示制約がない場合は、
言語データモデル側の値が使用されている場合があります。

AIはこれらを再計算してはいけません。

AIが、

「JavaのIntegerなら本当は2147483647だからmaxを変更する」

などと判断することは禁止します。

Data Generatorは、
このシステム内で規定されたeffective値を使用します。


## 7. Object構造について

`objectStructure`
`returnObjectStructure`
`methodReturnContext`

などには、
Cleanerによって解析済みのObject型構造が格納されています。

例えば、

```text
0:ROOT:ResponseEntity<List<Foo>>:ResponseEntity:OBJECT:ResponseEntity
/
1:ELEMENT:List<Foo>:List:COLLECTION:-
/
2:ELEMENT:Foo:Foo:OBJECT:Foo
```

という情報があれば、

```text
ResponseEntity
└─ List
   └─ Foo
```

という構造を意味します。

AIはrawTypeのJava generic構文を独自に再解析して、
この構造と異なる構造を作ってはいけません。

既に解析済みの`objectStructure`を優先してください。


## 8. methodSemanticContextについて

`methodSemanticContext` は、
AIがmethod単位の関係性を理解するために提供される文脈情報です。

これはAIによって生成された要約ではなく、
SQLiteによって既存データを決定論的に連結したものです。

例えば、

- className
- methodName
- process1
- method argument
- argument type
- annotation
- return type
- return object structure

などが含まれます。

個別targetだけを見るのではなく、
必要に応じてmethodSemanticContextを参照し、
そのtargetがmethod全体の中でどの位置に存在するかを判断してください。


## 9. targetIdについて

`targetId` は、
テスト対象を識別する一意の契約キーです。

targetIdはAIが作った名前ではありません。

SQLiteによって生成された値です。

AIは以下を禁止されます。

- targetIdを変更する
- targetIdを短縮する
- targetIdを日本語化する
- targetIdを再生成する
- targetIdの一部を削除する
- 別targetIdへ置き換える

出力するtargetIdは、
必ず入力の `v_ai_input.targetId` をそのままコピーしてください。


## 10. targetKindについて

`targetKind` は主に以下を取ります。

## FIELD

DTO内のfieldがテスト対象です。

この場合、

- argName
- parentArgRawType
- dtoName
- targetName

等を組み合わせて意味を判断してください。

## ARG

methodへ直接渡されるargumentそのものがテスト対象です。

## METHOD

入力argumentを持たないmethodです。

この行には、
通常の入力値用Mirror X/Y/Z観点を設定できない場合があります。

`xCandidateIds`
`yCandidateIds`
`zCandidateIds`

が `-` の場合、
存在しない観点をAIが作ってはいけません。


## 11. 鏡の原理について

このシステムでは入力値テストを、
X、Y、Zの3軸から扱います。

ただし、
X×Y×Zの単純な全直積を生成する考え方ではありません。

意味のない組み合わせを大量生成してはいけません。

以下の正式な鏡の原理仕様を読んで判断してください。


## 12. 鏡の原理・正式仕様

{{MIRROR_PRINCIPLE_SPEC}}


## 13. X軸定義

Xは、
値そのものの種類・性質・物理的な構成を表す軸です。

例えば文字種等が該当します。

ただし、本プロンプト中の説明より、
以下に挿入される正式なMirror Xデータを優先してください。

{{MIRROR_X_DATA}}


## 14. Y軸定義

Yは、
Xで表現される値に対する長さ、桁数、量、境界等を表す軸です。

Yは鏡の原理において重要な必須境界観点です。

`v_ai_input.yCandidateIds` に候補が存在するtargetについては、
そこに含まれるY候補を漏らしてはいけません。

ただし、
Y候補同士を無意味に他のすべてのX/Z候補と直積化する必要はありません。

以下に挿入される正式なMirror Yデータを優先してください。

{{MIRROR_Y_DATA}}


## 15.1 Z軸定義

Zは、
値の意味、用途、構造、文脈上のパターン等を表します。

Zは特にAIによる意味判断が必要な領域です。

例えば同じSTRINGでも、

- email
- host
- database name
- password
- path
- URL

等で適切なZ候補は異なります。

Zの判断には、

- className
- methodName
- argName
- dtoName
- targetName
- rawAnnotations
- parentArgRawAnnotations
- methodArgumentContext
- methodReturnContext
- methodSemanticContext

等を利用してください。

明確な業務意味がある場合は、
その意味に対応するZを優先してください。

一方、
annotationや意味情報が少ないことだけを理由に、
Zを `-` にしてはいけません。

その場合は後述する品質観点優先順位表を使い、
型・名称・文脈と矛盾しない一般品質観点を積極的に評価してください。

業務固有形式を根拠なく発明することは禁止します。

以下に挿入される正式なMirror Zデータを優先してください。

{{MIRROR_Z_DATA}}


## 15.2 Z軸選択時の品質観点優先順位

Z軸は次の順序で判断してください。

1. annotation、validation、enum等の明示情報
2. target名、DTO名、method名等から判断できる意味
3. methodSemanticContext等から判断できる文脈
4. 品質観点優先順位表

1～3の情報が存在しない、または少ない場合でも、
それだけを理由に `観点ID_Z = -` としてはいけません。

品質観点優先順位表を参照し、
対象の型・名称・文脈と明確に矛盾しない一般品質観点を
zCandidateIds / zCandidateDetailsから積極的に選択してください。

特に、

- 空白・不可視文字
- 制御文字
- Unicode・文字コード
- 文字種差異
- 数値特殊表記
- 日付時刻特殊値
- Null等の特殊状態

は、明示annotationがなくても評価対象としてください。

一方、
Injection等の特定の解釈経路を必要とする品質観点は、
candidateに存在することや対象と矛盾しないことだけでは選択してはいけません。

対象値そのものが、
SQL、HTML、Script、OS Command等として解釈または実行される経路を示す
合理的な根拠がある場合に限って選択してください。

email、phone、postal code等の業務固有形式も、
名称・annotation・文脈等から意味を判断できる場合に限って選択してください。

品質観点優先順位表にあるすべてのZを採用する必要はありません。
candidate外のZを生成することは禁止します。

{{QUALITY_PRIORITY_TABLE}}


## 16. Mirror Candidateについて

`v_ai_input` の各targetには、

- xCandidateIds
- xCandidateDetails
- yCandidateIds
- yCandidateDetails
- zCandidateIds
- zCandidateDetails

があります。

これらは、
AIの選択可能範囲を限定するための情報です。

AIはcandidateに存在しないMirror IDを生成してはいけません。

例えば、

xCandidateIds:

1:X_A / 2:X_B / 3:X_C

である場合、

選択可能なのは、

1:X_A
2:X_B
3:X_C

のみです。

`X_D` や `4:X_D` を独自に作ってはいけません。


## 17. Mirror IDの保存形式  

観点ID_X
観点ID_Y
観点ID_Z

には、
candidateに記載されている識別tokenをそのまま保存してください。

例えば、

5:length_max_plus_1

がcandidateとして存在するなら、

観点ID_Yも

5:length_max_plus_1

としてください。

`length_max_plus_1`

だけへ短縮してはいけません。

これはMirror Zなどで、
同一名称のIDが異なる意味を持つ可能性を排除するためです。

使用しない軸には、

-

を設定してください。


## 18. Y軸の網羅条件

あるtargetの `yCandidateIds` が `-` ではない場合、
そこに列挙されているすべてのY candidate tokenが、
そのtargetについて最低1回はテスト仕様書へ登場しなければなりません。

例えば、

yCandidateIds =
1:length_min / 2:length_min_minus_1 / 3:length_max / 4:length_max_plus_1

なら、

そのtargetについて、

1:length_min
2:length_min_minus_1
3:length_max
4:length_max_plus_1

がそれぞれ最低1ケース存在する必要があります。

ただしこれは、

すべてのX
×
すべてのY
×
すべてのZ

を作れという意味ではありません。

Yを漏らさず、
意味のあるケース構成にしてください。


## 19. X軸の選択条件

X candidateが存在する場合でも、
すべてのXを無条件に採用する必要はありません。

正式なMirror仕様とtargetの型・意味を照合し、
そのtargetについて実際に意味があるXを選択してください。

ただし、
candidate外のXを作ってはいけません。

また、

「STRINGだから全Xを全部試す」

という機械的判断も行わないでください。

意味のあるXを選択してください。


## 20. Z軸の選択条件

Zは意味的判断によって選択してください。

候補に存在するという理由だけで、
すべて採用してはいけません。

まず明示的な意味情報を使用し、
不足する場合は品質観点優先順位表を使用してください。

情報不足だけを理由に、
Zを `-` としてはいけません。

candidateに存在し、
対象の型・名称・文脈と明確に矛盾せず、
品質上確認する価値があるZは積極的に選択してください。

ただし、
Injection等の特定の解釈経路を必要とする品質観点については、
「明確に矛盾しない」ことだけでは選択根拠として不十分です。

対象値そのものが、
該当する構文または実行系として解釈される経路を示す
合理的な根拠がある場合に限って選択してください。

また、
dbPortへemail観点を適用する等、
意味または型に明確に反するZは禁止します。

## 21. X/Y/Zの組み合わせについて

1ケースに複数軸のMirror IDを設定することは可能です。

ただし、
単に候補の全組み合わせを作ることは禁止します。

複数軸を組み合わせる場合は、
その組み合わせによって初めて意味のあるテストになる、
または同時に確認することが合理的である場合に限ります。

ケース数を増やすこと自体は目的ではありません。

漏れなく、
重複せず、
意味のあるケースを作ることが目的です。


## 22. concrete valueを生成してはいけない

この処理の後に、
決定論的なMirror Data Generatorが実行されます。

したがってAIは具体的な入力値を生成してはいけません。

例えば、

effectiveMax=65535
観点ID_Y=length_max_plus_1

だったとしても、

ケース内容や操作手順に、

「65536を入力する」

と書いてはいけません。

正しくは、

「上限値を1超過する値を設定する」

等のように、
観点の意味を自然言語化してください。

具体値65536はData Generatorが生成します。

同様に、

- 具体的なランダム文字列
- 実在しないメールアドレス
- SQL Injection文字列
- nullそのもののコード表現
- 特定の日付
- 特定のUUID

等も、
後続Generatorの生成対象である限り、
AIが勝手に具体値化してはいけません。


## 23. generatorTargetについて

`generatorTarget` は、
Data Generatorが具体値を生成する対象を指定します。

generatorTargetは必ず、

targetId

と完全一致させてください。

文字列として1文字でも異なってはいけません。

以下は常に成立しなければなりません。

generatorTarget = targetId


## 24. generatorRuleについて

generatorRuleは、
Data GeneratorがMirrorルールを機械的に読み込むための列です。

以下の固定形式以外を使用してはいけません。

X={観点ID_X}|Y={観点ID_Y}|Z={観点ID_Z}

例えば、

観点ID_X = -
観点ID_Y = 5:length_max_plus_1
観点ID_Z = -

なら、

generatorRuleは必ず、

X=-|Y=5:length_max_plus_1|Z=-

です。

自然言語を書いてはいけません。

空白を追加してはいけません。

ラベル名を変更してはいけません。

順番を変えてはいけません。

`,`区切りへ変更してはいけません。

JSONにしてはいけません。


## 25. generatorRuleと観点IDの整合性

以下は完全一致しなければなりません。

generatorRule内X=観点ID_X
generatorRule内Y=観点ID_Y
generatorRule内Z=観点ID_Z

generatorRuleだけ別IDになることは禁止します。

この整合性は後続SQLiteでも検証されます。


## 26. テスト仕様書の位置づけ

生成するテスト仕様書は、
AIが自由に書く説明資料ではありません。

これは正式なテスト契約です。

後続処理はこのCSVを読みます。

したがって、

- IDを自然な表現へ変換する
- 列順を変える
- 不要だと判断した列を削除する
- 説明用列を追加する
- 複数ケースを1行へまとめる
- 1ケースを複数行に分ける

等は禁止します。


## 27. CaseNoについて

CaseNoは以下のルールに従ってください。

{{CASE_NO_RULE}}

既存テスト仕様書に同じ論理ケースが存在し、
そのケースを引き続き採用する場合は、
既存CaseNoを原則として維持してください。

同じケースへ毎回新しいCaseNoを付け直してはいけません。

新規ケースについては、
上記CaseNoルールに従って新規採番してください。


## 28. 大分類について

今回のテスト対象は、

単体APIテスト

を基本とします。

別途入力データやCaseNoルール等から
より正確な分類が与えられている場合は、
その情報を優先してください。


## 29. 中分類について

中分類には、
対象のclass、機能群、method等から判断して、
同じ目的のケースを整理できる分類を記載してください。

分類を過度に細分化して、
1ケースごとに異なる中分類を作ることは避けてください。

逆に、
意味の異なるケースをすべて同一分類へ押し込むことも避けてください。


## 30. 小分類について

小分類には、
対象ケースの主要なテスト観点や対象機能を識別できる分類を設定してください。

Mirror IDそのものをそのまま小分類に書く必要はありません。


## 31. ケース内容について

ケース内容は、

「何をテストしているのか」

を人間が読んで理解できる文章にしてください。

単に、

「length_max_plus_1をテストする」

と書くのではなく、

「対象項目へ上限を超える長さの値を設定した場合の入力制御を確認する」

等、
対象と観点の意味を結び付けてください。

可能な限り、

- targetName
- methodName
- 選択したMirror観点の意味
- 今回確認する入力条件

のうち入力から確認できる情報を文章へ反映してください。

全targetへ共通する抽象文だけで済ませることは避けてください。

ただし、
具体的な生成値は書かないでください。


## 32. 操作手順について

今回は人間の手打鍵ではなく、
JUnitによる自動テストを前提とします。

したがって操作手順には、

- 対象Wrapperを呼び出す
- Generatorで生成された値を設定する
- 対象methodを実行する

等、
テストコードへ変換可能な自然言語を記載してください。

入力にmethodName等の確定情報が存在する場合は、
その情報を可能な限り文章へ反映してください。

まだ存在しない具体的なJava method名やWrapper method名を
勝手に作ってはいけません。

分からない部分だけ抽象度を保ち、
分かっているtarget名、method名、Mirror観点まで抽象化してはいけません。


## 33. 確認内容について

確認内容には、
そのケースで何を確認する必要があるのかを記載してください。

例えば、

- return値
- exception
- validation結果
- mock呼び出し
- 状態変化
- response
- DBへの作用

等があります。

ただし入力情報から分からない確認対象を
勝手に追加してはいけません。

入力情報から具体的な確認対象を確定できない場合でも、
「対象の型・名称・文脈と整合すること」等の
対象を特定しない抽象文だけで済ませてはいけません。

その場合は、
後述する判断不能時の統一表現を使用し、
targetNameまたはmethodNameと、
選択したMirror観点が表す入力条件を文章へ反映してください。


## 34. 確認手順について

確認手順は、
確認内容をJUnit上でどのように確認するかを
自然言語として記載してください。

例えば、

- assertionでreturn値を確認する
- exception発生有無を確認する
- mock呼び出し有無を確認する

等です。

入力情報から具体的な確認方法を確定できる場合は、
その確認方法を記載してください。

確定できない場合は、
存在しないassertion、exception、mock、DB確認等を発明せず、
後述する判断不能時の統一表現を使用してください。

具体的なJUnitコードは今回生成しません。


## 35. 想定結果について

想定結果は、
テスト対象が正しく実装されている場合に、
どのような結果になるべきかを記載してください。

ただし、
入力情報から判断できない仕様を作ってはいけません。

例えば、
HTTP statusの情報が入力に存在しないにもかかわらず、
勝手に400や422と断定してはいけません。

exception classが分からないのに、
`IllegalArgumentException` と断定してはいけません。

具体的なエラーメッセージが存在しないのに、
架空のメッセージを作ってはいけません。

まず、
入力情報から判断できる粒度まで具体化してください。

その際、
「対象の型・名称・文脈と整合する処理結果となること」
「method契約と整合する処理結果となること」
等の、
targetやMirror観点を特定しない抽象的な契約準拠文だけで
簡単に済ませてはいけません。

一方で、
具体的な正常・異常、
return値、
exception、
HTTP status、
DB状態等を判断できない場合に、
AIの推測で具体化してはいけません。

## 判断不能時の統一表現

入力情報を可能な限り確認しても、
具体的な期待挙動を確定できない場合は、
独自の曖昧表現を作らず、
以下の統一形式を使用してください。

FIELDまたはARGの場合：

「{targetName} に対して {選択したMirror観点が表す入力条件} を与えた場合、当該入力条件に対する処理結果が仕様上定義された結果と一致すること。」

METHODの場合：

「{methodName} を実行した場合、当該methodの処理結果が仕様上定義された結果と一致すること。」

ここで、
`{targetName}`
`{methodName}`
`{選択したMirror観点が表す入力条件}`
は説明用の記号です。

実際のCSVでは、
入力データに存在するtargetNameまたはmethodNameと、
選択したX/Y/Z観点の意味を自然言語化して埋め込んでください。

例えばYが上限超過を表す場合は、

「userName に対して上限を超える長さの入力条件を与えた場合、当該入力条件に対する処理結果が仕様上定義された結果と一致すること。」

のように記載します。

具体値を生成してはいけません。

統一表現を使用できる場合は、
`UNKNOWN` へ逃げてはいけません。


## 36. 想定結果判断基準・判断手順について

この列は単純な「想定結果」の言い換えではありません。

「想定結果」は、
正しく実装されていればどうなるべきかを示します。

「想定結果判断基準・判断手順」は、
実際の結果が想定と違って見える場合に、

- 本当にSUTの不具合なのか
- テストコードの不具合なのか
- テストデータ生成の問題なのか
- mock設定の問題なのか
- 前回実行結果等の外乱なのか

を切り分けるための判断基準を記載します。

つまり、

「失敗に見えるが失敗ではない」
「成功に見えるが成功ではない」

場合を切り分けられる文章にしてください。

ただし、
存在しないログやDBやmockを勝手に前提としてはいけません。

対象のarchitecture contextから判断可能な範囲で記載してください。

具体的な切り分け方法を入力情報から確定できない場合は、
独自の曖昧表現を作らず、
以下の統一形式を使用してください。

「実行結果と仕様上定義された結果を比較する。不一致の場合は、generatorRuleに基づく生成値、対象methodへの入力、テストコードの確認処理、SUTの処理結果の順に切り分ける。」

architecture contextから、
return、exception、mock、DB作用等の
より具体的な判断基準を確定できる場合は、
上記統一形式より具体的な内容を優先してください。


## 37. 既存テスト仕様書について

以下には、
以前生成済みのテスト仕様書が存在する場合、
`v_test_spec` のCSVが挿入されます。

初回生成時には、
ヘッダのみ、またはデータ行が0件の場合があります。

既存テスト仕様書は、
現在の仕様書を更新するための参考情報です。

既存ケースが現在も有効で、
現在の `v_ai_input` とMirror候補に整合する場合は、
CaseNoおよび有効な自然言語を可能な限り維持してください。

ただし、
既存テスト仕様書を無条件に正しいものとして扱ってはいけません。

現在の決定論的入力である `v_ai_input` と矛盾する場合は、
現在の `v_ai_input` を優先してください。


## 38. targetExistsについて

既存 `v_test_spec` に、

targetExists = 0

のケースが存在する場合、
現在の `v_ai_input` に対応targetが存在しないことを意味します。

そのケースを、
現在有効なテストケースとして最終CSVへ残してはいけません。

これは、
ソース変更によってテスト対象が消えた可能性を表します。


## 39. 既存generator契約について

既存 `v_test_spec` に、

generatorTargetValid
generatorRuleValid

が存在する場合があります。

0の場合、
現在の契約に不整合があります。

不整合をそのままコピーしてはいけません。

現在の正式な、

generatorTarget = targetId

および、

generatorRule =
X={観点ID_X}|Y={観点ID_Y}|Z={観点ID_Z}

へ合わせてください。


## 40. 既存ケースと新規ケースの判定

論理的に同じケースかどうかを判断する場合は、
少なくとも、

- targetId
- 観点ID_X
- 観点ID_Y
- 観点ID_Z

を比較してください。

この4点が一致する既存ケースは、
原則として同一論理ケースとして扱ってください。

自然言語が少し異なるだけで、
別ケースとして複製してはいけません。


## 41. 重複ケース禁止

同じ、

targetId
観点ID_X
観点ID_Y
観点ID_Z

を持つ行を、
複数生成してはいけません。

同一契約のケースが複数存在する場合は重複です。


## 42. 入力CSV仕様

以下の `v_ai_input` は、
現在のソースコードおよびMirror候補から生成された
AI向け入力データです。

各行は原則として1つのtest targetを表します。

主な列の意味は以下です。

## targetId

テスト対象の一意識別子。

## filePath

対象ソースファイル。

## className

対象class。

## methodName

対象method。

## process1

AST上のmethod/process識別情報。

## targetKind

FIELD / ARG / METHOD。

## argIndex

method argumentの順序。

## argName

method argument名。

## argRaw

元のargument宣言情報。

## parentArgRawType

FIELDの場合、そのfieldを含む親argumentの型。

## parentArgRawAnnotations

親argumentのannotation。

## dtoFilePath

DTOソースファイル。

## dtoName

DTO名。

## targetName

実際のテスト対象名。

## rawType

言語依存のraw型。

## convModel

共通型。

例：

STRING
CHAR
NUMBER
DECIMAL
BOOLEAN
COLLECTION
ARRAY
MAP
OBJECT
ENUM
DATE
DATETIME

## validationMin / validationMax

ソース側制約。

## nullable

AST由来のnullable情報。

## rawAnnotations

対象自身のannotation。

## modelLookupType

language data model参照時の型。

## languageConvModel

language data modelによる共通型。

## modelMin / modelMax

language data model側の範囲。

## effectiveMin / effectiveMax

Data Generatorで利用する実効境界。

## objectStructure

対象Objectの解析済み構造。

## enumValues

Enumの場合の値一覧。

## returnRawType

method returnのraw型。

## returnConvModel

method returnの共通型。

## returnObjectStructure

returnのObject構造。

## methodArgumentContext

method全体のargument文脈。

## methodReturnRawType

method return型。

## methodReturnConvModel

method return共通型。

## methodReturnContext

method return構造文脈。

## methodSemanticContext

method全体の決定論的文脈。

## imports

対象sourceのimport情報。

## xCandidateIds / Details

X候補。

## yCandidateIds / Details

Y候補。

## zCandidateIds / Details

Z候補。


## 43. 現在のAI入力データ

```csv
{{V_AI_INPUT_CSV}}
```


## 44. 既存テスト仕様書データ

以下は既存 `v_test_spec` の出力です。

データ行が存在しない場合は、
初回生成として扱ってください。

```csv
{{V_TEST_SPEC_CSV}}
```


## 45. 正式なテスト仕様書フォーマット

以下のフォーマット定義は、
今回生成するCSVの正式仕様です。

説明よりもこの正式仕様を優先してください。

{{TEST_SPEC_FORMAT}}


## 46. 出力列

CSVの列は、
以下の順番から絶対に変更してはいけません。

```csv
CaseNo,targetId,大分類,中分類,小分類,観点ID_X,観点ID_Y,観点ID_Z,ケース内容,操作手順,確認内容,確認手順,想定結果,想定結果判断基準・判断手順,generatorTarget,generatorRule,予定日,実施日,実施者,実施結果,再実施要否,再実施判断日,再実施判断担当者,再実施テスト仕様書ファイル名ないしファイルパス,備考
```


## 47. 実施記録列について

今回AIが生成する時点では、
テストはまだ実行されていません。

したがって原則として、

予定日
実施日
実施者
実施結果
再実施要否
再実施判断日
再実施判断担当者
再実施テスト仕様書ファイル名ないしファイルパス

には、

-

を設定してください。

既存テスト仕様書の実施記録を維持する明示ルールが
別途入力されている場合のみ、
そのルールを優先してください。


## 48. 備考について

特別な補足事項がない場合は、

-

としてください。

AI自身の思考過程、
迷った理由、
「念のため確認してください」
等を書いてはいけません。


## 49. CSVエスケープ規則

CSVとして正しく読み込める形式で出力してください。

値に、

- カンマ
- ダブルクォート
- 改行

等が含まれる場合は、
RFC 4180相当の一般的なCSVエスケープを行ってください。

値にダブルクォートが含まれる場合は、
ダブルクォートを二重化してください。

列数が途中でずれてはいけません。


## 50. Markdownを出力しない

最終出力はCSVです。

以下を付けてはいけません。

```text
```csv
```

や、

「以下が生成結果です」

等の文章を付けてはいけません。

最初の1文字からCSVヘッダを開始してください。


## 51. AIが独自追加してはいけないもの

以下を独自生成してはいけません。

- Mirror ID
- targetId
- source constraint
- min/max
- nullable
- annotation
- DTO
- method
- class
- return type
- concrete test value
- exception class
- HTTP status
- API response JSON
- error message
- DB状態
- mock仕様
- business rule

入力に根拠がある場合のみ利用してください。


## 52. 情報不足の場合

情報不足をAIの推測で埋めてはいけません。

ただし、
簡単にすべてをUNKNOWNへ逃がすことも禁止します。

まず以下を確認してください。

1. target自身の列
2. parent argument情報
3. DTO情報
4. annotation
5. methodArgumentContext
6. methodReturnContext
7. methodSemanticContext
8. imports
9. Mirror正式仕様
10. Mirror candidate detail
11. 既存v_test_spec

それでも具体的な期待挙動や確認対象を確定できない場合は、
ケース内容、操作手順、確認内容、確認手順、想定結果、
想定結果判断基準・判断手順について、
各列で定義された判断不能時の統一表現を使用してください。

入力から分かっているtargetName、
methodName、
Mirror観点まで抽象化してはいけません。

また、
統一表現を使用できるにもかかわらず、
独自の「契約と整合すること」等の曖昧文や
`UNKNOWN` へ置き換えてはいけません。

`UNKNOWN` は、
統一表現すら構成できないほど
契約上必要な識別情報そのものが欠落している場合にのみ使用してください。


## 53. ソースコードの意味を過剰推論しない

例えばmethodNameが、

delete

だからといって、
必ず物理DELETEされるとは限りません。

create

だからといって、
必ずDB INSERTされるとは限りません。

getById

だからといって、
対象不存在時に必ず404になるとは限りません。

名前は意味判断の材料ですが、
名前だけを仕様そのものとして扱わないでください。


## 54. importsの扱い

importsは、
framework、annotation、型等の意味を判断する補助情報として利用できます。

ただしimportされているだけで、
そのlibraryやclassが対象methodで使用されていると断定してはいけません。


## 55. 正常系・異常系について

Mirror正式仕様またはcandidate detailから
正常/異常が判断できる場合は、
その定義に従ってケース内容・想定結果を記述してください。

判断できない場合に、
「境界超過だから必ずexception」
等と短絡してはいけません。

ソース側のvalidation情報等と合わせて判断してください。


## 56. テスト対象ソースへ忖度しない

テスト仕様書は、
現在の実装が通るように作るものではありません。

現在のソース実装に不具合がある可能性を検出するためのものです。

したがって、

「現在の実装ではこの値を受け入れそうだから正常系にする」

という判断は禁止します。


テスト仕様とソース実装を混同しないでください。


## 57. 期待結果と現在実装を混同しない

今回のテスト仕様書に記載する想定結果は、

「現在のコードが実際にどう動きそうか」

の予測ではありません。

与えられたconstraint、annotation、Mirror定義、
method context等から読み取れる、

「正しく実装されていればどう振る舞うべきか」

です。

この区別を必ず維持してください。


## 58. Data Generatorの責務を奪わない

Data Generatorは、
generatorTargetとgeneratorRuleを読み、
型、境界、Mirror定義に従って具体値を生成します。

したがってAIは、

- 境界値計算
- 長さ計算
- 数値生成
- 文字列生成
- null表現生成
- Zパターン具体値生成

等を行ってはいけません。


## 59. JUnit生成の責務を奪わない

今回生成するものはJavaコードではありません。

JUnit annotation、
assertion method、
Mockito記述、
Wrapper class、
test method名等を生成してはいけません。

それらは後工程で、
このテスト仕様書を基に生成されます。


## 60. ケース数について

ケース数は、
多ければ良いわけではありません。

少なければ良いわけでもありません。

必要なMirror観点を漏らさず、
意味のない重複を作らず、
1ケースの目的が理解可能な粒度で生成してください。

特にY候補は必須網羅条件に従ってください。


## 61. 同じ意味の自然言語を無理に変えない

既存テスト仕様書に有効な文章が存在する場合、
単なる言い換え目的で文章を変更する必要はありません。

毎回AIが言い回しを変えると、
Git diffや人間レビューが不必要に増加します。

内容変更が必要な場合のみ変更してください。

また、
判断不能時の統一表現を使用するケースでは、
意味を変えない言い換えを独自に作ってはいけません。

本プロンプトで定義した統一形式を
可能な限り同じ表現で使用してください。


## 62. 出力前内部検証

最終CSVを出力する前に、
内部的に以下を検証してください。

この検証結果自体は出力しないでください。

- ヘッダが指定された25列であること
- 全データ行が25列であること
- CaseNoが空でないこと
- CaseNoが重複していないこと
- targetIdがv_ai_inputに存在すること
- generatorTargetがtargetIdと完全一致すること
- 観点ID_Xが`-`または対象targetのxCandidateIds内にあること
- 観点ID_Yが`-`または対象targetのyCandidateIds内にあること
- 観点ID_Zが`-`または対象targetのzCandidateIds内にあること
- generatorRuleが観点ID_X/Y/Zから正しく構成されていること
- 同一targetId+X+Y+Zの重複がないこと
- yCandidateIdsが存在するtargetではY候補の必須網羅が満たされていること
- concrete valueを勝手に生成していないこと
- candidate外Mirror IDを生成していないこと
- targetIdを変更していないこと
- sourceにないconstraintを追加していないこと
- staleなtargetExists=0ケースを残していないこと
- 判断可能なtarget名、method名、Mirror観点を抽象化しすぎていないこと
- 具体的期待挙動を確定できない場合は規定の統一表現を使用していること
- 根拠なくHTTP status、exception、DB状態、mock仕様等を具体化していないこと
- CSV以外の文章を出力していないこと


## 63. 出力前の再確認

特に以下の3点は、
出力直前にもう一度確認してください。

第一に、
AIが考える必要のない決定論的事項を
勝手に再計算していないか。

第二に、
AIにしか判断できない意味的事項について、
根拠なく推測していないか。

第三に、
Data Generatorが後から機械的に処理できる
generatorTarget / generatorRule契約を壊していないか。


## 64. 最終指示

以上のすべての説明、データ、制約、Mirror仕様、
既存テスト仕様書を読んだ上で、
現在の `v_ai_input` に対応する正式なテスト仕様書CSVを生成してください。

今回の目的は、
テストケースの数を増やすことではありません。

また、
AIの知識を自由に披露することでもありません。

目的は、

決定論的プログラムによって限定されたテスト対象とMirror候補に対して、
AIにしか処理しづらい意味判断と自然言語化だけを行い、
後続のData GeneratorおよびJUnit生成処理が
機械的に利用できる正確なテスト仕様書を作ること

です。

自分で新しいルールを作らず、
与えられたルールを実行してください。

不明な情報を想像で補完せず、
入力された情報を可能な限り使い切ってください。

出力はCSVのみとしてください。

CSVの前後に説明文を付けないでください。

Markdownコードフェンスを付けないでください。

ヘッダ行から開始してください。
