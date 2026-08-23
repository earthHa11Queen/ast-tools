import { Project, SourceFile, ClassDeclaration, MethodDeclaration, FunctionDeclaration, ConstructorDeclaration, Node, VariableDeclarationKind, Decorator, ParameterDeclaration, PropertyDeclaration } from "ts-morph";
import * as Config from "../config";
import * as MethodInfo from "./method_info";
import { buildStructureRows } from "./structure_extractor";
import { writeSourceFileCsv, writeMethodCsv, writeFieldCsv } from "./csv_output";

// ===================================================
// parser.ts
// JSON出力を全廃し、ソースファイルレベルCSV・メソッドレベルCSV・
// フィールドレベルCSVの3種類を組み立てて出力するエントリーポイント。
//
// 行生成ルールのまとめ（チャット上での合意事項）：
// ・ソースファイルレベルCSV：1ファイルにつき「クラス外(-)行」が必ず1行、
//   加えてクラス数分の行が追加される。
//   - クラス外(-)行：importList・lineCountに実際の値。methodCount等は
//     クラス外スコープ内の集計値。
//   - クラス行：importList="-"、lineCount=-1固定。methodCount等はそのクラス内の集計値。
// ・メソッドレベルCSV：クラス名列は「クラスが無ければ拡張子付きファイル名」
//   （ソースファイルレベルの"-"ルールとは異なる、既存仕様のまま）。
//   1メソッド/関数につき、制御構造の処理単位ごとに1行＋引数専用行が1行。
// ・【新規】フィールドレベルCSV：クラスのプロパティ（fieldKind="field"）と、
//   メソッド/関数/コンストラクタの引数（fieldKind="parameter"）を、同じ構造で記録する。
//   class-validator等の検証デコレータ（@Min/@Max/@Length等）から境界値を抽出する。
//   TSはフレームワーク依存でデコレータ自体が無いことも多いため、
//   「デコレータが取れるなら取る、取れなければセンチネル値（-1）」という運用にする。
// ===================================================

export async function execParse() {

  const sourceFileRows: MethodInfo.SourceFileRow[] = [];
  const methodRows: MethodInfo.MethodRow[] = [];
  const fieldRows: MethodInfo.FieldRow[] = [];

  try {
    const pj = new Project({
      compilerOptions: {
        jsx: 2,
        esModuleInterop: true,
        skipLibCheck: true,
      },
      skipAddingFilesFromTsConfig: true,
    });

    let pjExtension: string[] = [];
    for (let i = 0; i < Config.EXTENSIONS.length; i++) {
      pjExtension.push(`${Config.TARGET_APP_DIR}/**/*${Config.EXTENSIONS[i]}`);
      pjExtension.push(`!${Config.TARGET_APP_DIR}/**/node_modules/*.${Config.EXTENSIONS[i]}`);
    }
    pjExtension.push(`!${Config.TARGET_APP_DIR}/**/*vite*.ts`);
    pjExtension.push(`!${Config.TARGET_APP_DIR}/**/*vite*.d.ts`);
    pjExtension.push(`!${Config.TARGET_APP_DIR}/**/*App.tsx`);
    pjExtension.push(`!${Config.TARGET_APP_DIR}/**/*main.tsx`);

    try {
      pj.addSourceFilesAtPaths(pjExtension);
    } catch (error) {
      console.log("addSourceFilesAtPaths Error!!");
      return false;
    }

    const sourceFiles = pj.getSourceFiles();

    for (const sourceFile of sourceFiles) {
      console.log(sourceFile.getBaseName());
      processSourceFile(sourceFile, sourceFileRows, methodRows, fieldRows);
    }

    writeSourceFileCsv(sourceFileRows);
    writeMethodCsv(methodRows);
    writeFieldCsv(fieldRows);

  } catch (error) {
    console.error("catch Error: ", error);
    return false;
  }
  return true;
}

// -----------------------------------------------------------------------
// 1ファイル分を処理し、sourceFileRows・methodRows・fieldRowsへ行を追加する
// -----------------------------------------------------------------------
function processSourceFile(
  sourceFile: SourceFile,
  sourceFileRows: MethodInfo.SourceFileRow[],
  methodRows: MethodInfo.MethodRow[],
  fieldRows: MethodInfo.FieldRow[]
) {
  const fileName = sourceFile.getBaseName();
  const directoryPath = sourceFile.getDirectoryPath().replace(Config.TARGET_APP_DIR, ".");
  const filePathForMethod = sourceFile.getFilePath().replace(Config.TARGET_APP_DIR, ".");

  const classes = sourceFile.getClasses();

  // --- クラス外要素の集計（ハイフン行用） ---
  const topLevelFunctions = sourceFile.getFunctions();

  let topLevelVariableCount = 0;
  let topLevelConstantCount = 0;
  for (const vs of sourceFile.getVariableStatements()) {
    const isConst = vs.getDeclarationKind() === VariableDeclarationKind.Const;
    for (const _decl of vs.getDeclarations()) {
      if (isConst) {
        topLevelConstantCount++;
      } else {
        topLevelVariableCount++;
      }
    }
  }

  const importTexts = sourceFile.getImportDeclarations().map((im) => im.getText().trim());
  const importList = importTexts.length > 0 ? importTexts.join(" / ") : MethodInfo.HYPHEN;

  // --- ハイフン行（クラス外） ---
  sourceFileRows.push({
    appName: Config.TARGET_APP_NAME,
    fileName,
    directoryPath,
    className: MethodInfo.HYPHEN,
    importList,
    lineCount: sourceFile.getEndLineNumber(),
    methodCount: topLevelFunctions.length,
    variableCount: topLevelVariableCount,
    constantCount: topLevelConstantCount,
  });

  // --- クラス外関数のメソッドレベル行（このグループ内でprocess1を1から採番） ---
  if (topLevelFunctions.length === 0) {
    // 【解釈上の補足】ファイルにクラスもクラス外関数も1つも無い場合、
    // 「ファイル全体で処理内容が書かれていない」ケースの代表として、
    // process1=0の行を1行だけ記録する。methodName等の具体的な値は
    // 仕様書に明記が無いため、便宜上ハイフン・記載なしとしている。
    if (classes.length === 0) {
      methodRows.push(buildEmptyFileRow(filePathForMethod, fileName));
    }
  } else {
    let extFuncIndex = 0;
    for (const func of topLevelFunctions) {
      extFuncIndex++;
      addMethodRows(methodRows, fieldRows, filePathForMethod, fileName, func, extFuncIndex, "function");
    }
  }

  // --- クラスごとの行 ---
  for (const cls of classes) {
    addClassRow(sourceFileRows, cls, fileName, directoryPath);

    const clsName = cls.getName() ?? fileName;

    // 【新規】クラスのプロパティをフィールドレベルCSVへ記録する
    addFieldRows(fieldRows, filePathForMethod, clsName, cls.getProperties());

    const constructors = cls.getConstructors();
    const methods = cls.getMethods();

    // 【新規対応】コンストラクタは常にそのクラスの先頭（process1の若い番号）に来るようにし、
    // その後に通常のメソッドを連番で続ける（別枠でリセットはしない、1本の通し番号とする）
    let process1 = 0;

    for (const ctor of constructors) {
      process1++;
      addMethodRows(methodRows, fieldRows, filePathForMethod, clsName, ctor, process1, "constructor");
    }

    for (const method of methods) {
      process1++;
      addMethodRows(methodRows, fieldRows, filePathForMethod, clsName, method, process1, "method");
    }
    // メソッド・コンストラクタが1つも無いクラス（プロパティのみ等）については、
    // メソッドレベルCSV側に代表行を作る仕様は無いため、行を生成しない（前回確認済みの通り）。
  }
}

function addClassRow(
  sourceFileRows: MethodInfo.SourceFileRow[],
  cls: ClassDeclaration,
  fileName: string,
  directoryPath: string
) {
  // 【修正】methodCountにコンストラクタを含める。
  // メソッドレベルCSV側にコンストラクタの行が登場するようになったため、
  // ここで含めないとソースファイルレベルCSVのmethodCountと矛盾してしまう。
  const methodCount = cls.getMethods().length + cls.getConstructors().length;
  const properties = cls.getProperties();

  let variableCount = 0;
  let constantCount = 0;
  for (const prop of properties) {
    if (prop.isReadonly()) {
      constantCount++;
    } else {
      variableCount++;
    }
  }

  sourceFileRows.push({
    appName: Config.TARGET_APP_NAME,
    fileName,
    directoryPath,
    className: cls.getName() ?? MethodInfo.HYPHEN,
    importList: MethodInfo.HYPHEN,
    lineCount: -1,
    methodCount,
    variableCount,
    constantCount,
  });
}

// -----------------------------------------------------------------------
// 1メソッド/関数/コンストラクタ分の「構造行」＋「引数専用行」をmethodRowsへ追加する
//
// kind:
//   "method"      クラスのメソッド（static/abstract/asyncを判定する）
//   "function"    クラス外関数（asyncのみ判定する）
//   "constructor" コンストラクタ（メソッド名を持たないため process1 から
//                 "Constructor1"のように機械的に生成する。static/abstract/asyncは
//                 TypeScript上そもそも存在しないため判定しない。戻り値型も
//                 意味を持たないためハイフン固定とする）
// -----------------------------------------------------------------------
function addMethodRows(
  methodRows: MethodInfo.MethodRow[],
  fieldRows: MethodInfo.FieldRow[],
  filePath: string,
  className: string,
  method: MethodDeclaration | FunctionDeclaration | ConstructorDeclaration,
  process1: number,
  kind: "method" | "function" | "constructor"
) {
  const methodName =
    kind === "constructor"
      ? `Constructor${process1}`
      : (method as MethodDeclaration | FunctionDeclaration).getName() ?? MethodInfo.HYPHEN;

  const jsDocs = method.getJsDocs();
  const roleText = jsDocs.map((jd) => jd.getText()).join(" ").trim();
  const role = roleText === "" ? MethodInfo.NO_ROLE_TEXT : roleText;

  const returnType =
    kind === "constructor"
      ? MethodInfo.HYPHEN
      : (method as MethodDeclaration | FunctionDeclaration).getReturnType().getText();

  const flags: string[] = [];
  if (kind !== "constructor" && (method as MethodDeclaration | FunctionDeclaration).isAsync()) {
    flags.push("非同期");
  }
  if (kind === "method") {
    if ((method as MethodDeclaration).isStatic()) flags.push("静的");
    if ((method as MethodDeclaration).isAbstract()) flags.push("抽象");
  }
  const methodType = flags.length > 0 ? flags.join("+") : MethodInfo.HYPHEN;

  let accessModifier = MethodInfo.HYPHEN;
  if (kind === "method" || kind === "constructor") {
    const modText = (method as MethodDeclaration | ConstructorDeclaration)
      .getModifiers()
      .map((m) => m.getText())
      .join(" ")
      .trim();
    if (modText !== "") accessModifier = modText;
  }

  // --- 構造行（処理2〜9） ---
  const body = method.getBody();
  const bodyStatements = body && Node.isBlock(body) ? body.getStatements() : [];
  const structureRows = buildStructureRows(bodyStatements, process1);

  for (const sr of structureRows) {
    methodRows.push({
      filePath,
      className,
      methodName,
      processCoords: sr.coords,
      processContent: sr.content,
      role,
      returnType,
      methodType,
      accessModifier,
      args: buildEmptyArgs(),
    });
  }

  // --- 引数専用行（処理2〜9はすべて0、処理内容="引数"） ---
  // コンストラクタのパラメータプロパティ（constructor(private repo: Repo)のような書き方）も、
  // getText()がそのまま "private repo: Repo" のように修飾子込みで返すため、忠実に記録される
  const params = method.getParameters();
  const argTexts = params.map((p) => p.getText());

  const argCoords = new Array(MethodInfo.MAX_NEST_DEPTH).fill(0);
  argCoords[0] = process1;

  methodRows.push({
    filePath,
    className,
    methodName,
    processCoords: argCoords,
    processContent: MethodInfo.ARGUMENT_ROW_CONTENT,
    role,
    returnType,
    methodType,
    accessModifier,
    args: buildArgsColumns(argTexts),
  });

  // 【新規】各引数について、検証デコレータ等をフィールドレベルCSVへ個別に記録する
  addParameterFieldRows(fieldRows, filePath, className, methodName, params);
}

// -----------------------------------------------------------------------
// 【新規】クラスのプロパティをフィールドレベルCSVへ記録する
// -----------------------------------------------------------------------
function addFieldRows(
  fieldRows: MethodInfo.FieldRow[],
  filePath: string,
  className: string,
  properties: PropertyDeclaration[]
) {
  for (const prop of properties) {
    fieldRows.push(
      buildFieldRow(
        filePath,
        className,
        null,
        "field",
        prop.getName(),
        prop.getType().getText(),
        prop.isReadonly(),
        prop.getDecorators()
      )
    );
  }
}

// -----------------------------------------------------------------------
// 【新規】メソッド/関数/コンストラクタの引数をフィールドレベルCSVへ記録する
// -----------------------------------------------------------------------
function addParameterFieldRows(
  fieldRows: MethodInfo.FieldRow[],
  filePath: string,
  className: string,
  methodName: string,
  params: ParameterDeclaration[]
) {
  for (const param of params) {
    fieldRows.push(
      buildFieldRow(
        filePath,
        className,
        methodName,
        "parameter",
        param.getName(),
        param.getType().getText(),
        param.isReadonly(),
        param.getDecorators()
      )
    );
  }
}

function buildFieldRow(
  filePath: string,
  className: string,
  methodName: string | null,
  fieldKind: "field" | "parameter",
  name: string,
  type: string,
  isFinal: boolean,
  decorators: Decorator[]
): MethodInfo.FieldRow {
  return {
    filePath,
    className,
    methodName,
    fieldKind,
    fieldName: name,
    fieldType: type,
    isFinal,
    validationMin: extractDecoratorBound(decorators, "min"),
    validationMax: extractDecoratorBound(decorators, "max"),
    nullable: extractNullableFromDecorators(decorators),
    rawAnnotations: decorators.length > 0 ? decorators.map((d) => d.getText()).join(" ") : MethodInfo.HYPHEN,
  };
}

// 【取れれば実値、取れなければ-1】class-validator等の検証デコレータから境界値を抽出する。
// @Min(1) / @Max(65535) のような単一の位置引数、@Length(min, max) のような
// 2つの位置引数の両方に対応する。デコレータが無い・該当するデコレータが無い場合は-1のまま。
function extractDecoratorBound(decorators: Decorator[], bound: "min" | "max"): number {
  for (const dec of decorators) {
    if (!dec.isDecoratorFactory()) continue;
    const name = dec.getName();
    const args = dec.getArguments();

    if (bound === "min" && name === "Min" && args.length >= 1) {
      return parseIntSafely(args[0].getText());
    }
    if (bound === "max" && name === "Max" && args.length >= 1) {
      return parseIntSafely(args[0].getText());
    }
    if (name === "Length" && args.length >= 2) {
      // class-validatorの@Length(min, max)は位置引数
      return bound === "min" ? parseIntSafely(args[0].getText()) : parseIntSafely(args[1].getText());
    }
  }
  return -1;
}

// 【取れれば実値、取れなければ-1】NotEmpty系・Optional系デコレータの有無から判定する
function extractNullableFromDecorators(decorators: Decorator[]): number {
  for (const dec of decorators) {
    const name = dec.getName();
    if (name === "IsNotEmpty" || name === "IsDefined") return 0; // 明示的にnullable不可
    if (name === "IsOptional") return 1; // 明示的にnullable可
  }
  return -1; // 判定不能
}

function parseIntSafely(text: string): number {
  const n = parseInt(text.trim(), 10);
  return isNaN(n) ? -1 : n;
}

function buildEmptyArgs(): string[] {
  return new Array(MethodInfo.MAX_ARG_COLUMNS).fill(MethodInfo.HYPHEN);
}

function buildArgsColumns(argTexts: string[]): string[] {
  const cols = buildEmptyArgs();
  for (let i = 0; i < argTexts.length && i < MethodInfo.MAX_ARG_COLUMNS; i++) {
    cols[i] = argTexts[i];
  }
  return cols;
}

// process1=0：ファイル全体に処理内容が無い場合の代表行
function buildEmptyFileRow(filePath: string, fileName: string): MethodInfo.MethodRow {
  const coords = new Array(MethodInfo.MAX_NEST_DEPTH).fill(0); // process1も0のまま
  return {
    filePath,
    className: fileName,
    methodName: MethodInfo.HYPHEN,
    processCoords: coords,
    processContent: "",
    role: MethodInfo.NO_ROLE_TEXT,
    returnType: MethodInfo.HYPHEN,
    methodType: MethodInfo.HYPHEN,
    accessModifier: MethodInfo.HYPHEN,
    args: buildEmptyArgs(),
  };
}
