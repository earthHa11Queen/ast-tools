export const errorValue = {
  methodName: "get method name missed.",
  className: "get Class name missed."
}

export type CsvHeaderType = {
  filePath: string,
  fileName: string,
  className: string,
  methodName: string,
  role: string,
  argumentsCount: number|string,
  returnType: string,
  startRow: number|string,
  endRow: number|string,
  accessModifier: string,
  staticFlag: boolean|string,
  abstractFlag: boolean|string,
  asyncFlag: boolean|string

}

export const CsvHeader: CsvHeaderType = {
filePath: "ファイルパス",
fileName: "ファイル名",
className: "クラス名",
methodName: "メソッド名",
role: "役割",         //-コメントから引用、無ければ「役割記載なし」とファイルには出力
argumentsCount: "引数個数",
returnType: "戻り値の型",   //-return無しなら「戻り値なし」と記載する
startRow: "開始行番号",
endRow: "終了行番号",
accessModifier: "アクセス修飾子",
staticFlag: "静的メソッドフラグ",
abstractFlag: "抽象メソッドフラグ",
asyncFlag: "非同期フラグ",
};

export type JsonAppLevelType = {
  appName: string,
  language: string,
  directory: string,
  summary: {
    totalFiles: number,
    totalClasses: number,
    totalMethods: number,
    totalFuncs: number
  },
  files: JsonAppLevelFilesType[],
};

export type JsonAppLevelFilesType = {
  filePath: string,
  classes: JsonAppLevelClassesType[],
  imports: string[],
  fileRowsCount: number|string
}

export type JsonAppLevelClassesType = {
  className: string,
  accessModifier: string[],
  staticFlag: string[],
  implements: string[],
  decorators: string[],
  methodCount: number,
  classStartRow: number,
  classEndRow: number,
}

export type JsonMethodLevelType = {
  directoryPath: string,
  files: JsonMethodLevelFilesType[]
};

export type JsonMethodLevelFilesType = {
  filePath: string,
  classes: JsonClassesType[]
};

export type JsonClassesType = {
  classes: {
    className: string,
    method: JsonMethodsType[]
  }
};

export type JsonMethodsType = {
    methodName: string,
    role: string,
    accessModifier: string,
    staticFlag: boolean
    abstractFlag: boolean,
    asyncFlag: boolean,
    decorators: string[],
    args: JsonArgsType[],
    returnType: string,
    methodStartRow: number,
    methodEndRow: number
};

export type JsonArgsType = {
  argName: string,
  argType: string,
  argDefaultValue: string,
  argOptional: boolean
};