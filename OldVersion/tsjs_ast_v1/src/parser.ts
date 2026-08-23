import { Project, ParameterDeclaration, MethodDeclaration, FunctionDeclaration, VariableDeclaration, SyntaxKind, SourceFile } from "ts-morph";
import * as Config from "../config";
import * as MethodInfo from "./method_info";
import { writeJsonFile } from "./json_output";
import { writeCsvFile } from "./csv_output";

// --- 修正履歴（2026-07） ---
// 【バグ修正A】ディレクトリ単位のJSON出力（ast_MethodLevel_*.json）のファイル名が、
//   出力対象であるディレクトリ（directoryPathTmp）ではなく、次に検出された別ディレクトリの
//   「最初のファイル名」から生成されていた。index.ts等の頻出ファイル名を持つ
//   バレルファイル構成のプロジェクトでは、異なるディレクトリ同士が同じ出力ファイル名を
//   取り合い、先に出力された分が上書きされて消失していた。
// 【バグ修正B】ループ内で「ディレクトリが変わったタイミング」でのみ直前分を出力する設計だったため、
//   走査順で最後になるディレクトリの分が一度も出力されないまま処理が終了していた。
//   A・Bはいずれも、逐次的な「直前との比較」に頼った出力タイミング判定が原因だったため、
//   ファイル一覧を先にディレクトリ単位へ明示的にグルーピングしてから処理する方式に変更した。
// 【バグ修正C】クラスの accessModifier / staticFlag に、クラス自身の修飾子ではなく、
//   そのクラスが持つ各プロパティ（フィールド）のスコープの配列が誤って格納されていた。
//   className.getModifiers() を使い、クラス自身の修飾子キーワード
//   （export, abstract, declare 等）を取得するよう修正した。
// 【バグ修正E】jsonAppLevelClassesTypeLists が、元はexecParse全体で1回だけ宣言されており、
//   ファイルをまたいでも一度もクリアされていなかった。そのため各ファイルの
//   jsonAppLevelFileType.classes には、そのファイル自身のクラスだけでなく、
//   それまで処理した全ファイルのクラスが累積的に含まれてしまっていた
//   （後半に処理されるファイルほど、無関係な他ファイルのクラス情報が大量に混入する）。
//   ファイル単位の処理ループ内で毎回新規に宣言し直すよう修正した。
// --- 修正履歴（2026-07 その3） ---
// 【バグ修正F】getClassMethods内、methodName.getText()がメソッドのソースコード全文
//   （シグネチャ＋処理内容まるごと）を返してしまい、メソッド名列にそれが格納されていた。
//   methodName.getName()に修正した。
// 【バグ修正G】出力ファイル名が常にTARGET_APP_DIRからの相対パス全体になっており、
//   ディレクトリが深いプロジェクトでは意味の読み取れない長大なファイル名になっていた。
//   「基本は末尾フォルダ名のみ、同名衝突がある場合だけ親フォルダ名を付与する」という
//   段階的な方式（buildOutputFileName）に変更した。sanitizeDirNameは、
//   親フォルダ名を付けてもなお衝突する稀なケースのフォールバック専用とした。
export async function execParse() {

  let jsonAppLevelFileTypeLists: MethodInfo.JsonAppLevelFilesType[] = [];
  let classCount: number = 0;
  let methodCount: number = 0;
  let funcCount: number = 0;

  let csvDataLists: MethodInfo.CsvHeaderType[] = [];
  try {
    const pj = new Project({
      compilerOptions: {
        jsx: 2,
        esModuleInterop: true,
        skipLibCheck: true,
      },
      skipAddingFilesFromTsConfig: true,
    });
    let pjExtension: string[] = []
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
      console.log("addSourece Error!!");
      return false;
    }

    const sourceFiles = pj.getSourceFiles();

    // 【バグ修正A・B】ファイル一覧の走査順（保証されない・辞書順とも限らない）に依存した
    // 逐次比較をやめ、先にディレクトリごとへ明示的にグルーピングする
    const filesByDirectory = new Map<string, SourceFile[]>();
    for (const sourceFile of sourceFiles) {
      const dir = sourceFile.getDirectoryPath();
      if (!filesByDirectory.has(dir)) {
        filesByDirectory.set(dir, []);
      }
      filesByDirectory.get(dir)!.push(sourceFile);
    }

    // ディレクトリの処理順序を決定的にする（辞書順）
    const sortedDirPaths = Array.from(filesByDirectory.keys()).sort();
    for (const dirPath of sortedDirPaths) {
      const filesInDir = filesByDirectory.get(dirPath)!;
      let jsonMethodLevelFilesType: MethodInfo.JsonMethodLevelFilesType[] = [];

      for (const sourceFile of filesInDir) {
        console.log(sourceFile.getBaseName());

        const classes = sourceFile.getClasses();
        classCount += classes.length;

        let classesLists: MethodInfo.JsonClassesType[] = [];
        // 【バグ修正E】ファイルごとに新規に宣言し直す（以前は execParse 全体で1つのみ宣言され、
        // ファイルをまたいでクリアされずに累積していた）
        let jsonAppLevelClassesTypeLists: MethodInfo.JsonAppLevelClassesType[] = [];

        // Class & Method & Params
        for (const className of classes) {
          const methods = className.getMethods();
          methodCount += methods.length;
          let jsonMethodsLists: MethodInfo.JsonMethodsType[] = [];
          for (const methodName of methods) {
            const jsonArgs = await getMethodsParam(methodName.getParameters());
            const jsonMethods = await getClassMethods(methodName, jsonArgs);
            jsonMethodsLists.push(jsonMethods);
            csvDataLists.push(await convertCsvData(jsonMethods, className.getName() ?? MethodInfo.errorValue.className, sourceFile));
          }
          const classesEntry: MethodInfo.JsonClassesType = {
            classes: {
              className: className.getName() ?? MethodInfo.errorValue.className,
              method: jsonMethodsLists
            }
          }
          classesLists.push(classesEntry);

          // 【バグ修正C】クラス自身の修飾子（export, abstract, declare 等）を取得する。
          // 従来は className.getProperties() を走査して各プロパティのscopeを
          // 誤って格納していた（クラス自身の修飾子は一度も取得されていなかった）。
          let classModifiers: string[] = [];
          for (const m of className.getModifiers()) {
            classModifiers.push(m.getText());
          }
          // TypeScriptのクラス宣言自体に static 修飾子は存在しないため、
          // 通常は空配列になる（modifiers内に static 相当の記述があれば拾う形にしておく）
          let classStatics: string[] = classModifiers.filter((m) => m === "static");

          let classImplements: string[] = [];
          for (const im of className.getImplements()) {
            classImplements.push(im.getText() ?? "");
          }
          let classDecorators: string[] = [];
          for (const deco of className.getDecorators()) {
            classDecorators.push(deco.getText() ?? "");
          }
          const jsonAppLevelClassesType: MethodInfo.JsonAppLevelClassesType = {
            className: className.getName() ?? MethodInfo.errorValue.className,
            accessModifier: classModifiers,
            staticFlag: classStatics,
            implements: classImplements,
            decorators: classDecorators,
            methodCount: className.getMethods().length,
            classStartRow: className.getStartLineNumber(),
            classEndRow: className.getEndLineNumber()
          }
          jsonAppLevelClassesTypeLists.push(jsonAppLevelClassesType);
        }
        let classImports: string[] = [];
        for (const im of sourceFile.getImportDeclarations()) {
          classImports.push(im.getText());
        }

        // Nothing Class & Function & Params
        const funcs = sourceFile.getFunctions();
        const classNameDummyText: string = "is Function";
        funcCount += funcs.length;
        let fJsonMethodsLists: MethodInfo.JsonMethodsType[] = []
        for (const f of funcs) {
          const fParams = f.getParameters();
          const fJsonArgs = await getMethodsParam(fParams);
          const fJsonMethods = await getFunctionsData(f, fJsonArgs);
          fJsonMethodsLists.push(fJsonMethods);
          csvDataLists.push(await convertCsvData(fJsonMethods, classNameDummyText, sourceFile));
        }
        const fClasses: MethodInfo.JsonClassesType = {
          classes: {
            className: classNameDummyText,
            method: fJsonMethodsLists
          }
        }
        classesLists.push(fClasses);
        const jsonMethodLevelFileType: MethodInfo.JsonMethodLevelFilesType = {
          filePath: sourceFile.getFilePath().replace(Config.TARGET_APP_DIR, "."),
          classes: classesLists,
        };
        jsonMethodLevelFilesType.push(jsonMethodLevelFileType);

        const jsonAppLevelFileType: MethodInfo.JsonAppLevelFilesType = {
          filePath: sourceFile.getFilePath().replace(Config.TARGET_APP_DIR, "."),
          classes: jsonAppLevelClassesTypeLists,
          imports: classImports,
          fileRowsCount: sourceFile.getEndLineNumber()
        }
        jsonAppLevelFileTypeLists.push(jsonAppLevelFileType);
        console.log(sourceFile.getBaseName());
      }

      // 【バグ修正A・B】このディレクトリの全ファイルを処理し終えた時点で、1回だけ出力する。
      // ファイル名は「出力対象のディレクトリ自身」から生成する（従来は次ディレクトリの
      // 最初のファイル名を誤って使っていた）
      const jsonMethodLevelType: MethodInfo.JsonMethodLevelType = {
        directoryPath: dirPath.replace(Config.TARGET_APP_DIR, "."),
        files: jsonMethodLevelFilesType
      };
      await writeJsonFile(jsonMethodLevelType, `ast_MethodLevel_${buildOutputFileName(dirPath, sortedDirPaths)}.json`);
    }

    const jsonAppLevelType: MethodInfo.JsonAppLevelType = {
      appName: Config.TARGET_APP_NAME,
      directory: Config.TARGET_APP_DIR,
      language: "Typescript/Javascript",
      summary: {
        totalFiles: sourceFiles.length,
        totalClasses: classCount,
        totalMethods: methodCount,
        totalFuncs: funcCount
      },
      files: jsonAppLevelFileTypeLists
    };
    await writeJsonFile(jsonAppLevelType);
    await writeCsvFile(csvDataLists);

  } catch (error) {
    console.error("catch Error: ", error)
    return false;
  }
  return true;
}

// -----------------------------------------------------------------------
// 【バグ修正G】出力ファイル名の生成方式を修正した。
// 従来は「TARGET_APP_DIRからの相対パス全体」を常にファイル名に使っていたため、
// ディレクトリが深いプロジェクトでは、意味の読み取れない長大なファイル名になっていた。
//
// 修正後は次の段階的な方式にする：
//   1. 基本は末尾フォルダ名のみ（例: ast_MethodLevel_FileOperation.json）
//   2. 同じ末尾フォルダ名を持つ別ディレクトリが他にも存在する場合のみ、
//      直上の親フォルダ名を付与して曖昧さを解消する（例: ast_MethodLevel_service_FileOperation.json）
//   3. 親フォルダ名を付けてもなお衝突する場合（非常に稀なケース）のみ、
//      安全のため従来通りTARGET_APP_DIRからの相対パス全体にフォールバックする
//      （データが上書きで消えることだけは、どんな場合でも起きないようにする）
// -----------------------------------------------------------------------
function pathSegments(p: string): string[] {
  return p.split(/[\\/]+/).filter((s) => s.length > 0);
}

function baseNameOf(p: string): string {
  const segs = pathSegments(p);
  return segs.length > 0 ? segs[segs.length - 1] : "root";
}

function buildOutputFileName(dirPath: string, allDirPaths: string[]): string {
  const segs = pathSegments(dirPath);
  const base = segs.length > 0 ? segs[segs.length - 1] : "root";

  const sameBaseCount = allDirPaths.filter((d) => baseNameOf(d) === base).length;

  let candidate = base;

  if (sameBaseCount > 1) {
    // 衝突あり：直上の親フォルダ名を付与する
    const parent = segs.length >= 2 ? segs[segs.length - 2] : "";
    candidate = parent ? `${parent}_${base}` : base;

    const stillColliding = allDirPaths.filter((d) => {
      const s = pathSegments(d);
      const b = s.length > 0 ? s[s.length - 1] : "root";
      if (b !== base) return false;
      const p = s.length >= 2 ? s[s.length - 2] : "";
      const c = p ? `${p}_${b}` : b;
      return c === candidate;
    }).length;

    if (stillColliding > 1) {
      // 親フォルダ名を付けてもなお衝突する稀なケース：相対パス全体にフォールバックする
      candidate = sanitizeDirName(dirPath);
    }
  }

  return candidate.replace(/[:*?"<>|]/g, "");
}

// TARGET_APP_DIRからの相対パス全体を使った、衝突が起こり得ない安全なファイル名（フォールバック用）
function sanitizeDirName(absoluteDirPath: string): string {
  const relative = absoluteDirPath.replace(Config.TARGET_APP_DIR, "");
  const sanitized = relative
    .replace(/[\\/]+/g, "_")
    .replace(/^_+/, "")
    .replace(/[:*?"<>|]/g, "");
  return sanitized === "" ? "root" : sanitized;
}

export async function convertCsvData(JsonData: MethodInfo.JsonMethodsType, classNameText: string, sourceFileData: SourceFile) {
  const rtCsvData: MethodInfo.CsvHeaderType = {
    filePath: sourceFileData.getFilePath().replace(Config.TARGET_APP_DIR,"."),
    fileName: sourceFileData.getBaseName(),
    className: classNameText,
    methodName: JsonData.methodName,
    role: JsonData.role,
    argumentsCount: JsonData.args.length,
    returnType: JsonData.returnType,
    startRow: JsonData.methodStartRow,
    endRow: JsonData.methodEndRow,
    accessModifier: JsonData.accessModifier,
    staticFlag: JsonData.staticFlag,
    abstractFlag: JsonData.abstractFlag,
    asyncFlag: JsonData.asyncFlag
  };
  return rtCsvData;
}

export async function getFunctionsData(methodName: FunctionDeclaration, jsonArgs: MethodInfo.JsonArgsType[]): Promise<MethodInfo.JsonMethodsType> {
  const jsDocs = methodName.getJsDocs();
  let jsDoc: string = "";
  for(const jd of jsDocs) {
    jsDoc += jd.getText();
  }

  const accessModifiers = methodName.getModifiers();
  let accessModifier: string = "";
  for(const am of accessModifiers) {
    accessModifier += am.getText();
  }
  
  const jsonMethods: MethodInfo.JsonMethodsType = {
    methodName: methodName.getName() ?? MethodInfo.errorValue.methodName,
    role: jsDoc,
    accessModifier: accessModifier,
    staticFlag: false,
    abstractFlag: false,
    asyncFlag: methodName.isAsync(),
    decorators: ["is Function"],
    args: jsonArgs,
    returnType: methodName.getReturnType().getText(),
    methodStartRow: methodName.getStartLineNumber(),
    methodEndRow: methodName.getEndLineNumber()
  }
  return jsonMethods;
}

// 【バグ修正F】methodName.getText() は、そのメソッドのソースコード全文
//   （シグネチャ＋処理内容まるごと）を返してしまう。メソッド名を取得するには
//   methodName.getName() を使う必要がある（getFunctionsDataでは元々正しく使われていた）。
export async function getClassMethods(methodName: MethodDeclaration, jsonArgs: MethodInfo.JsonArgsType[]): Promise<MethodInfo.JsonMethodsType> {
  const jsDocs = methodName.getJsDocs();
  let jsDoc: string = "";
  for(const jd of jsDocs) {
    jsDoc += jd.getText();
  }

  const accessModifiers = methodName.getModifiers();
  let accessModifier: string = "";
  for(const am of accessModifiers) {
    accessModifier += am.getText();
  }
  let decorators: string[] = []
  for(const decorate of methodName.getDecorators()) {
    decorators.push(decorate.getText());
  }
  const jsonMethods: MethodInfo.JsonMethodsType = {
    methodName: methodName.getName() ?? MethodInfo.errorValue.methodName,
    role: jsDoc,
    accessModifier: accessModifier,
    staticFlag: methodName.isStatic(),
    abstractFlag: methodName.isAbstract(),
    asyncFlag: methodName.isAsync(),
    decorators: decorators,
    args: jsonArgs,
    returnType: methodName.getReturnType().getText(),
    methodStartRow: methodName.getStartLineNumber(),
    methodEndRow: methodName.getEndLineNumber()
  }
  return jsonMethods;
}

export async function getMethodsParam(params: ParameterDeclaration[]) {
  let jsonArgs: MethodInfo.JsonArgsType[] = [];
  for(const param of params) {
    const jsonArg: MethodInfo.JsonArgsType = {
      argName: param.getName(),
      argType: param.getTypeNode()?.getText() || "any",
      argDefaultValue: param.getInitializer()?.getText() || "",
      argOptional: param.isOptional()
    }
    jsonArgs.push(jsonArg);
  }
  return jsonArgs;
}