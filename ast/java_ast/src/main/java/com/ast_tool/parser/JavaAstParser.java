package com.ast_tool.parser;

import com.ast_tool.AppConfig;
import com.ast_tool.model.MethodInfo;
import com.ast_tool.output.CsvOutput;
import com.ast_tool.output.JsonOutput;
import com.github.javaparser.ParserConfiguration;
import com.github.javaparser.StaticJavaParser;
import com.github.javaparser.ast.CompilationUnit;
import com.github.javaparser.ast.body.ClassOrInterfaceDeclaration;
import com.github.javaparser.ast.body.MethodDeclaration;
import com.github.javaparser.ast.body.Parameter;
import com.github.javaparser.ast.expr.AnnotationExpr;
import com.github.javaparser.ast.type.ClassOrInterfaceType;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;
import java.util.stream.Stream;

/**
 * parser.ts の execParse() を Java へ変換したもの。
 *
 * TS版との対応：
 *   Project#getSourceFiles()  → Files.walk() + StaticJavaParser.parse()
 *   sourceFile.getClasses()   → cu.findAll(ClassOrInterfaceDeclaration.class)
 *   sourceFile.getFunctions() → Java にクラス外関数は存在しない
 *                               → TS版の "is Function" ダミー行に相当する処理は省略
 *   async/await               → 同期処理に変換（JavaParser は同期 API）
 */
public class JavaAstParser {

    private final AppConfig config;

    public JavaAstParser(AppConfig config) {
        this.config = config;
    }

    // -----------------------------------------------------------------------
    // execParse() 相当
    // -----------------------------------------------------------------------
    public boolean execParse() {

        // --- TS版のローカル変数群と対応 ---
        List<MethodInfo.JsonMethodLevelFiles> jsonMethodLevelFilesType = new ArrayList<>();
        String directoryPathTmp = "";
        List<MethodInfo.JsonAppLevelClasses> jsonAppLevelClassesTypeLists = new ArrayList<>();
        List<MethodInfo.JsonAppLevelFiles> jsonAppLevelFileTypeLists = new ArrayList<>();
        int classCount  = 0;
        int methodCount = 0;
        // Java にクラス外関数は存在しないため funcCount は常に 0
        int funcCount   = 0;

        List<MethodInfo.CsvRow> csvDataLists = new ArrayList<>();

        // Java 22 の文字コードを config から取得
        // String encoding = config.getEncoding() != null ? config.getEncoding() : "UTF-8";
        StaticJavaParser.getParserConfiguration()
                .setLanguageLevel(ParserConfiguration.LanguageLevel.JAVA_21);

        try {
            // --- Project#addSourceFilesAtPaths 相当 ---
            // Javaソースファイル（.java）を再帰的に収集
            List<Path> sourceFiles;
            try (Stream<Path> walk = Files.walk(Paths.get(config.getTargetDir()))) {
                sourceFiles = walk
                        .filter(Files::isRegularFile)
                        .filter(p -> p.toString().endsWith(".java"))
                        // node_modules 相当の除外はないが、testディレクトリは除外
                        .filter(p -> !p.toString().contains(java.io.File.separator + "test" + java.io.File.separator))
                        .sorted()
                        .collect(Collectors.toList());
            }

            for (Path filePath : sourceFiles) {

                System.out.println(filePath.getFileName());

                // --- ディレクトリ変わり目の判定（TS版の if/else if/else と対応）---
                String currentDirPath = filePath.getParent().toString();

                if (!currentDirPath.equals(directoryPathTmp)) {

                    if (!directoryPathTmp.isEmpty()) {
                        // ディレクトリが変わったタイミングで前のディレクトリ分を出力
                        // TS版: await writeJsonFile(jsonMethodLevelType, `ast_MethodLevel_...`)
                        MethodInfo.JsonMethodLevel jsonMethodLevelType = new MethodInfo.JsonMethodLevel();
                        jsonMethodLevelType.directoryPath = directoryPathTmp.replace(config.getTargetDir(), ".");
                        jsonMethodLevelType.files = new ArrayList<>(jsonMethodLevelFilesType);

                        String outFileName = "ast_MethodLevel_" + Paths.get(directoryPathTmp).getFileName() + ".json";
                        JsonOutput.writeJsonFile(jsonMethodLevelType, outFileName, config);

                        jsonMethodLevelFilesType.clear();
                    }
                    directoryPathTmp = currentDirPath;
                }

                // --- ファイルパース ---
                CompilationUnit cu;
                try {
                    cu = StaticJavaParser.parse(filePath);
                } catch (Exception parseEx) {
                    System.err.println("Parse Error: " + filePath + " -> " + parseEx.getMessage());
                    continue;
                }

                // --- sourceFile.getClasses() 相当 ---
                List<ClassOrInterfaceDeclaration> classes = cu.findAll(ClassOrInterfaceDeclaration.class);
                classCount += classes.size();

                List<MethodInfo.JsonClasses> classesLists = new ArrayList<>();

                for (ClassOrInterfaceDeclaration clazz : classes) {

                    // --- className.getMethods() 相当 ---
                    List<MethodDeclaration> methods = clazz.getMethods();
                    methodCount += methods.size();

                    List<MethodInfo.JsonMethods> jsonMethodsLists = new ArrayList<>();

                    for (MethodDeclaration method : methods) {
                        List<MethodInfo.JsonArgs> jsonArgs = getMethodsParam(method.getParameters().stream().collect(Collectors.toList()));
                        MethodInfo.JsonMethods jsonMethods  = getClassMethods(method, jsonArgs);
                        jsonMethodsLists.add(jsonMethods);
                        csvDataLists.add(convertCsvData(
                                jsonMethods,
                                clazz.getNameAsString(),
                                filePath,
                                cu
                        ));
                    }

                    // JsonClassesType の組み立て
                    MethodInfo.JsonClasses.ClassesInner inner = new MethodInfo.JsonClasses.ClassesInner();
                    inner.className = clazz.getNameAsString();
                    inner.method = jsonMethodsLists;

                    MethodInfo.JsonClasses jsonClasses = new MethodInfo.JsonClasses();
                    jsonClasses.classes = inner;
                    classesLists.add(jsonClasses);

                    // --- JsonAppLevelClassesType の組み立て ---
                    // TS版: classProps → getScope / getStaticKeyword
                    // Java版: フィールドのアクセス修飾子をクラスのアクセス修飾子で代用
                    List<String> classScopes = new ArrayList<>();
                    clazz.getModifiers().forEach(m -> classScopes.add(m.getKeyword().asString()));

                    List<String> classStatics = new ArrayList<>();
                    clazz.getModifiers().forEach(m -> {
                        if (m.getKeyword() == com.github.javaparser.ast.Modifier.Keyword.STATIC) {
                            classStatics.add("static");
                        }
                    });

                    List<String> classImplements = new ArrayList<>();
                    for (ClassOrInterfaceType impl : clazz.getImplementedTypes()) {
                        classImplements.add(impl.getNameAsString());
                    }

                    // Java にデコレータはないが、アノテーションを代用
                    List<String> classDecorators = new ArrayList<>();
                    for (AnnotationExpr anno : clazz.getAnnotations()) {
                        classDecorators.add(anno.toString());
                    }

                    MethodInfo.JsonAppLevelClasses jsonAppLevelClasses = new MethodInfo.JsonAppLevelClasses();
                    jsonAppLevelClasses.className = clazz.getNameAsString();
                    jsonAppLevelClasses.accessModifier = classScopes;
                    jsonAppLevelClasses.staticFlag = classStatics;
                    jsonAppLevelClasses.implementsList = classImplements;
                    jsonAppLevelClasses.decorators = classDecorators;
                    jsonAppLevelClasses.methodCount = methods.size();
                    jsonAppLevelClasses.classStartRow = clazz.getBegin().map(p -> p.line).orElse(0);
                    jsonAppLevelClasses.classEndRow = clazz.getEnd().map(p -> p.line).orElse(0);

                    jsonAppLevelClassesTypeLists.add(jsonAppLevelClasses);
                }

                // --- imports ---
                List<String> classImports = new ArrayList<>();
                cu.getImports().forEach(im -> classImports.add(im.toString().trim()));

                // --- TS版の "is Function" ダミー行 ---
                // Javaにクラス外関数は存在しないため funcCount=0 のまま。
                // TS版の classesLists.push(fClasses) に相当するダミーは追加しない。

                // --- JsonMethodLevelFilesType ---
                MethodInfo.JsonMethodLevelFiles jsonMethodLevelFileType = new MethodInfo.JsonMethodLevelFiles();
                jsonMethodLevelFileType.filePath = filePath.toString().replace(config.getTargetDir(), ".");
                jsonMethodLevelFileType.classes = classesLists;
                jsonMethodLevelFilesType.add(jsonMethodLevelFileType);

                // --- JsonAppLevelFilesType ---
                MethodInfo.JsonAppLevelFiles jsonAppLevelFileType =
                        new MethodInfo.JsonAppLevelFiles();
                jsonAppLevelFileType.filePath = filePath.toString().replace(config.getTargetDir(), ".");
                jsonAppLevelFileType.classes = new ArrayList<>(jsonAppLevelClassesTypeLists);
                jsonAppLevelFileType.imports = classImports;
                jsonAppLevelFileType.fileRowsCount = cu.getEnd().map(p -> p.line).orElse(0);

                jsonAppLevelFileTypeLists.add(jsonAppLevelFileType);

                System.out.println(filePath.getFileName());
            }

            // --- ループ後の最終ディレクトリ分を出力 ---
            // TS版では for ループ内で次のディレクトリに変わったタイミングで出力していたため
            // 最後のディレクトリ分はループ終了後に別途出力が必要
            if (!jsonMethodLevelFilesType.isEmpty()) {
                MethodInfo.JsonMethodLevel jsonMethodLevelTypeFinal = new MethodInfo.JsonMethodLevel();
                jsonMethodLevelTypeFinal.directoryPath = directoryPathTmp.replace(config.getTargetDir(), ".");
                jsonMethodLevelTypeFinal.files = new ArrayList<>(jsonMethodLevelFilesType);

                String finalOutFileName = "ast_MethodLevel_" + Paths.get(directoryPathTmp).getFileName() + ".json";
                JsonOutput.writeJsonFile(jsonMethodLevelTypeFinal, finalOutFileName, config);
            }

            // --- アプリレベルJSON出力 ---
            MethodInfo.JsonAppLevel jsonAppLevelType = new MethodInfo.JsonAppLevel();
            jsonAppLevelType.appName  = config.getAppName();
            jsonAppLevelType.directory = config.getTargetDir();
            jsonAppLevelType.language = "Java";

            MethodInfo.JsonAppLevel.Summary summary = new MethodInfo.JsonAppLevel.Summary();
            summary.totalFiles   = sourceFiles.size();
            summary.totalClasses = classCount;
            summary.totalMethods = methodCount;
            summary.totalFuncs   = funcCount;
            jsonAppLevelType.summary = summary;
            jsonAppLevelType.files   = jsonAppLevelFileTypeLists;

            // TS版: await writeJsonFile(jsonAppLevelType) → 引数1つ＝アプリレベル固定ファイル名
            JsonOutput.writeJsonFile(jsonAppLevelType, config);
            // TS版: await writeCsvFile(csvDataLists)
            CsvOutput.writeCsvFile(csvDataLists, config);

        } catch (IOException e) {
            System.err.println("catch Error: " + e.getMessage());
            return false;
        }
        return true;
    }

    // -----------------------------------------------------------------------
    // convertCsvData() 相当
    // -----------------------------------------------------------------------
    public MethodInfo.CsvRow convertCsvData(
            MethodInfo.JsonMethods jsonData,
            String classNameText,
            Path filePath,
            CompilationUnit cu) {

        MethodInfo.CsvRow row = new MethodInfo.CsvRow();
        row.filePath       = filePath.toString().replace(config.getTargetDir(), ".");
        row.fileName       = filePath.getFileName().toString();
        row.className      = classNameText;
        row.methodName     = jsonData.methodName;
        row.role           = jsonData.role;
        row.argumentsCount = jsonData.args != null ? jsonData.args.size() : 0;
        row.returnType     = jsonData.returnType;
        row.startRow       = jsonData.methodStartRow;
        row.endRow         = jsonData.methodEndRow;
        row.accessModifier = jsonData.accessModifier;
        row.staticFlag     = jsonData.staticFlag;
        row.abstractFlag   = jsonData.abstractFlag;
        row.asyncFlag      = jsonData.asyncFlag; // Java版は常にfalse
        return row;
    }

    // -----------------------------------------------------------------------
    // getClassMethods() 相当
    // TS版の getFunctionsData() はJavaに対応物がないため getClassMethods() に統合
    // -----------------------------------------------------------------------
    public MethodInfo.JsonMethods getClassMethods(
            MethodDeclaration method,
            List<MethodInfo.JsonArgs> jsonArgs) {

        // --- jsDocs 相当: Javadocコメントを role として取得 ---
        String jsDoc = method.getJavadoc()
                .map(jd -> jd.toComment().toString())
                .orElse("役割記載なし");

        // --- accessModifiers 相当 ---
        StringBuilder accessModifier = new StringBuilder();
        method.getModifiers().forEach(m -> accessModifier.append(m.getKeyword().asString()).append(" "));

        // --- decorators 相当: アノテーションで代用 ---
        List<String> decorators = new ArrayList<>();
        for (AnnotationExpr anno : method.getAnnotations()) {
            decorators.add(anno.toString());
        }

        // --- 戻り値型 ---
        String returnType = method.getType().isVoidType()
                ? "戻り値なし"
                : method.getTypeAsString();

        MethodInfo.JsonMethods jsonMethods = new MethodInfo.JsonMethods();
        jsonMethods.methodName     = method.getNameAsString();
        jsonMethods.role           = jsDoc.trim();
        jsonMethods.accessModifier = accessModifier.toString().trim();
        jsonMethods.staticFlag     = method.isStatic();
        jsonMethods.abstractFlag   = method.isAbstract();
        jsonMethods.asyncFlag      = false; // Java に非同期修飾子は存在しない
        jsonMethods.decorators     = decorators;
        jsonMethods.args           = jsonArgs;
        jsonMethods.returnType     = returnType;
        jsonMethods.methodStartRow = method.getBegin().map(p -> p.line).orElse(0);
        jsonMethods.methodEndRow   = method.getEnd().map(p -> p.line).orElse(0);
        return jsonMethods;
    }

    // -----------------------------------------------------------------------
    // getMethodsParam() 相当
    // -----------------------------------------------------------------------
    public List<MethodInfo.JsonArgs> getMethodsParam(List<Parameter> params) {

        List<MethodInfo.JsonArgs> jsonArgs = new ArrayList<>();
        for (Parameter param : params) {

            MethodInfo.JsonArgs arg = new MethodInfo.JsonArgs();
            arg.argName         = param.getNameAsString();
            arg.argType         = param.getTypeAsString();
            // Java にデフォルト値構文は存在しない → 空文字
            arg.argDefaultValue = "";
            // Java に省略可能引数（?）は存在しない → false
            // ただし可変長引数（varargs）を省略可能と見なす場合は以下に変更
            // arg.argOptional = param.isVarArgs();
            arg.argOptional     = false;

            jsonArgs.add(arg);
        }
        return jsonArgs;
    }
}