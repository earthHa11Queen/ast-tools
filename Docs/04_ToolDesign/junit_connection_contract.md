JUnit接続契約

基本方針

SQLiteとJava/JUnitの責務を分離する。

SQLite
  ↓
output配下へ生成
  ↓
build_junit_test.sh
  ↓
対象Java projectへ一時配置
  ↓
mvn test
  ↓
Evidenceをoutputへ戻す

SQLite側

SQLiteは対象Java projectを直接変更しない。

担当は OUTPUT_DIR 直下へ、JUnit実行に必要なデータを生成するところまで。

最低限:

test-data-instruction.csv

将来JUnit Code Generator接続後:

generated-test/
└─ package/path/...Test.java

junit-common-library

Java classは対象projectのcompile/test classpath上に存在する必要がある。

初版では依存管理へ強く結合させず、build時に

junit-common-library/src/main/java/com/ast_tool/junit/common

を対象projectの

src/test/java/com/ast_tool/junit/common

へ一時コピーする。

build終了時には削除する。

この方式なら対象projectの pom.xml にjunit-common-library dependencyを恒久追加しなくてよい。

Instruction CSV

CSVはJava sourceと異なり、project内部へコピーする必要はない。

TestDataRuntime はfilesystem上のPathから読めるため、

-DtestDataFile=<OUTPUT_DIR>/test-data-instruction.csv

としてoutput上のファイルを直接読む。

Evidenceも、

-DtestDataEvidenceFile=<OUTPUT_DIR>/test-data-evidence.csv

としてoutputへ直接書く。

生成JUnit

JUnit Code Generator導入後は、

OUTPUT_DIR/generated-test/

配下にJava package directoryを保った状態で生成する。

build shellがこれを対象projectの

src/test/java/

へ一時配置する。

Project dependency boundary

junit-common-library はProject固有DTO/Objectを知らない。

Project固有の、

DTO constructor

setter

builder

factory

SUT method invocation

は generated-test 側にのみ存在する。

安全策

build shellは、コピー先に既存ファイル/ディレクトリが存在する場合、上書きせずfail-fastする。

build成功/失敗にかかわらず trap で一時配置したast-tools sourceを削除する。
