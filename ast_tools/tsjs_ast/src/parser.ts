import { Project, ParameterDeclaration, MethodDeclaration, FunctionDeclaration, VariableDeclaration, SyntaxKind, SourceFile } from "ts-morph";
import * as Config from "../config";
import * as MethodInfo from "./method_info";
import { writeJsonFile } from "./json_output";
import { writeCsvFile } from "./csv_output";

export async function execParse() {
  
  let jsonMethodLevelFilesType: MethodInfo.JsonMethodLevelFilesType[] = [];
  let directoryPathTmp = "";
  let jsonAppLevelClassesTypeLists: MethodInfo.JsonAppLevelClassesType[] = [];
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

    for (const sourceFile of sourceFiles) {
      console.log(sourceFile.getBaseName());
      if (sourceFile.getDirectoryPath() == directoryPathTmp) {
        // nothing

      } else if (directoryPathTmp == "") {
        directoryPathTmp = sourceFile.getDirectoryPath();
      } else {
        const jsonMethodLevelType: MethodInfo.JsonMethodLevelType = {
          directoryPath: directoryPathTmp.replace(Config.TARGET_APP_DIR,"."),
          files: jsonMethodLevelFilesType
        };
        await writeJsonFile(jsonMethodLevelType, `ast_MethodLevel_${sourceFile.getBaseNameWithoutExtension()}.json`);

        directoryPathTmp = sourceFile.getDirectoryPath();
        jsonMethodLevelFilesType = [];
      }
      const classes = sourceFile.getClasses();
      classCount += classes.length;

      let classesLists: MethodInfo.JsonClassesType[] = [];
      
      
      // Class & Method & Params
      for(const className of classes) {
        const methods = className.getMethods();
        methodCount += methods.length;
        let jsonMethodsLists: MethodInfo.JsonMethodsType[] = [];
        for(const methodName of methods) {
          const jsonArgs = await getMethodsParam(methodName.getParameters());
          const jsonMethods = await getClassMethods(methodName, jsonArgs);
          jsonMethodsLists.push(jsonMethods);
          csvDataLists.push(await convertCsvData(jsonMethods, className.getName()?? MethodInfo.errorValue.className, sourceFile));
        }
        const classes: MethodInfo.JsonClassesType = {
          classes: {
            className: className.getName()?? MethodInfo.errorValue.className,
            method: jsonMethodsLists
          }
        }
        classesLists.push(classes);
        const classProps = className.getProperties();
        let classScopes: string[] = [];
        let classStatics: string[] = [];
        for( const prop of classProps) {
          classScopes.push(prop.getScope());
          classStatics.push(prop.getStaticKeyword()?.getText() ?? "");
          
        }
        let classImplements: string[] = [];
        for ( const im of className.getImplements()) {
          classImplements.push(im.getText() ?? "");
        }
        let classDecorators: string[] = [];
        for ( const deco of className.getDecorators()){
          classDecorators.push(deco.getText() ?? "");
        }
        const jsonAppLevelClassesType: MethodInfo.JsonAppLevelClassesType = {
          className: className.getName()?? MethodInfo.errorValue.className,
          accessModifier: classScopes,
          staticFlag: classStatics,
          implements: classImplements,
          decorators: classDecorators,
          methodCount: className.getMethods().length,
          classStartRow: className.getStartLineNumber(),
          classEndRow: className.getEndLineNumber()
        }
        jsonAppLevelClassesTypeLists.push(jsonAppLevelClassesType);
      }
      let classImports:string[] = [];
      for(const im of sourceFile.getImportDeclarations()) {
        classImports.push(im.getText());
      }
      
      // Nothing Class & Function & Params
      const funcs = sourceFile.getFunctions();
      const classNameDummyText: string = "is Function";
      funcCount += funcs.length;
      let fJsonMethodsLists: MethodInfo.JsonMethodsType[] = []
      for(const f of funcs) {
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
        filePath: sourceFile.getFilePath().replace(Config.TARGET_APP_DIR,"."),
        classes: classesLists,
      };
      jsonMethodLevelFilesType.push(jsonMethodLevelFileType);

      const jsonAppLevelFileType: MethodInfo.JsonAppLevelFilesType = {
        filePath: sourceFile.getFilePath().replace(Config.TARGET_APP_DIR,"."),
        classes: jsonAppLevelClassesTypeLists,
        imports: classImports,
        fileRowsCount: sourceFile.getEndLineNumber()
      }
      jsonAppLevelFileTypeLists.push(jsonAppLevelFileType);
      console.log(sourceFile.getBaseName());
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
    methodName: methodName.getText(),
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

