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
import java.util.Map;
import java.util.TreeMap;
import java.util.stream.Collectors;
import java.util.stream.Stream;

/**
 * parser.ts の execParse() を Java へ変換したもの。
 *
 * TS版との対応：
 * Project#getSourceFiles() → Files.walk() + StaticJavaParser.parse()
 * sourceFile.getClasses() → cu.findAll(ClassOrInterfaceDeclaration.class)
 * sourceFile.getFunctions() → Java にクラス外関数は存在しない
 * → TS版の "is Function" ダミー行に相当する処理は省略
 * async/await → 同期処理に変換（JavaParser は同期 API）
 *
 * --- 修正履歴（2026-07） ---
 * 【バグ修正1】ディレクトリ内にサブディレクトリが混在すると、ファイル一覧の辞書順ソートの都合で
 * 「同じディレクトリの分」が2回に分断され、同名の出力JSON（ast_MethodLevel_[dir].json）が
 * 2回書き込まれて先の分が上書き消失するバグを修正した。
 * 修正方法：「直前のファイルと比較してディレクトリが変わったら出力する」という逐次判定をやめ、
 * ファイル一覧を先に Map<ディレクトリパス, ファイル一覧> へ明示的にグルーピングしてから、
 * ディレクトリ単位で1回ずつ処理・出力する方式に変更した。
 * あわせて、出力ファイル名を「ディレクトリの末尾フォルダ名のみ」から
 * 「サニタイズしたディレクトリの相対パス全体」に変更した。
 * 末尾フォルダ名だけだと、例えば controller/user と service/user のように
 * 末尾フォルダ名が同じで実体が異なる別ディレクトリが存在した場合、
 * 同種の上書き事故が再発しうるため。
 * --- 修正履歴（2026-07 その2） ---
 * 【バグ修正3】config.json の TargetAppDir をスラッシュ表記（例: "C:/Users/..."）で
 * 記述した場合、Windows環境では Path#toString() がバックスラッシュに正規化するため、
 * 文字列としての単純な .replace(config.getTargetDir(), ...) によるプレフィックス除去が
 * 一致せず失敗していた。結果、出力ファイル名にドライブレターのコロン(:)が
 * 残ってしまい、Windowsのファイル名として不正なため実行時エラーになっていた。
 * Path#relativize() を使った、区切り文字の表記に依存しない相対パス計算に修正した。
 * あわせて、ファイル名生成箇所ではWindowsで使用できない文字
 * （: * ? " < > |）を念のため除去する防御的処理も追加した。
 * --- 修正履歴（2026-07 その3） ---
 * 【バグ修正4】出力ファイル名が常にTARGET_APP_DIRからの相対パス全体になっており、
 * ディレクトリが深いプロジェクトでは意味の読み取れない長大なファイル名になっていた。
 * 「基本は末尾フォルダ名のみ、同名衝突がある場合だけ親フォルダ名を付与する」という
 * 段階的な方式に変更した（buildOutputFileName()）。sanitizeDirName()は、
 * 親フォルダ名を付けてもなお衝突する稀なケースのフォールバック専用とした。
 */
public class JavaAstParser {

    private final AppConfig config;

    public JavaAstParser(AppConfig config) {
        this.config = config;
    }

    // -----------------------------------------------------------------------
    // 【バグ修正3・新規】TargetAppDirからの相対パスを、区切り文字の表記に依存せず算出する
    // 文字列の単純置換ではなく Path#relativize() を使うため、
    // config.json が "C:/Users/..." のようにスラッシュ表記でも、
    // Windows上で Path#toString() がバックスラッシュに正規化されていても正しく動作する
    // -----------------------------------------------------------------------
    private String relativizePath(Path fullPath) {
        try {
            Path base = Paths.get(config.getTargetDir()).toAbsolutePath().normalize();
            Path target = fullPath.toAbsolutePath().normalize();
            Path relative = base.relativize(target);
            // 表示用に区切り文字はスラッシュへ統一する（ast-tools全体の表記に合わせる）
            return "./" + relative.toString().replace(java.io.File.separator, "/");
        } catch (Exception e) {
            // relativize不能な場合（対象がTargetAppDir配下でない等）は絶対パスのまま返す
            System.err.println("相対パス算出に失敗したため絶対パスを使用します: " + fullPath + " - " + e.getMessage());
            return fullPath.toString();
        }
    }

    // -----------------------------------------------------------------------
    // execParse() 相当
    // -----------------------------------------------------------------------
    public boolean execParse() {

        List<MethodInfo.JsonAppLevelClasses> jsonAppLevelClassesTypeLists = new ArrayList<>();
        List<MethodInfo.JsonAppLevelFiles> jsonAppLevelFileTypeLists = new ArrayList<>();
        int classCount = 0;
        int methodCount = 0;
        // Java にクラス外関数は存在しないため funcCount は常に 0
        int funcCount = 0;

        List<MethodInfo.CsvRow> csvDataLists = new ArrayList<>();

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

            // 【バグ修正1】ファイル一覧の辞書順ソートに依存した逐次判定はやめ、
            // 先にディレクトリごとへ明示的にグルーピングする。
            // TreeMapによりディレクトリの処理順序も決定的（辞書順）に保たれる。
            Map<String, List<Path>> filesByDirectory = new TreeMap<>();
            for (Path filePath : sourceFiles) {
                String dir = filePath.getParent().toString();
                filesByDirectory.computeIfAbsent(dir, k -> new ArrayList<>()).add(filePath);
            }

            // --- ディレクトリ単位で処理する ---
            for (Map.Entry<String, List<Path>> dirEntry : filesByDirectory.entrySet()) {

                String currentDirPath = dirEntry.getKey();
                List<MethodInfo.JsonMethodLevelFiles> jsonMethodLevelFilesForDir = new ArrayList<>();

                for (Path filePath : dirEntry.getValue()) {

                    System.out.println(filePath.getFileName());

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
                            List<MethodInfo.JsonArgs> jsonArgs = getMethodsParam(
                                    method.getParameters().stream().collect(Collectors.toList()));
                            MethodInfo.JsonMethods jsonMethods = getClassMethods(method, jsonArgs);
                            jsonMethodsLists.add(jsonMethods);
                            csvDataLists.add(convertCsvData(
                                    jsonMethods,
                                    clazz.getNameAsString(),
                                    filePath,
                                    cu));
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

                    // --- JsonMethodLevelFilesType ---
                    MethodInfo.JsonMethodLevelFiles jsonMethodLevelFileType = new MethodInfo.JsonMethodLevelFiles();
                    jsonMethodLevelFileType.filePath = relativizePath(filePath);
                    jsonMethodLevelFileType.classes = classesLists;
                    jsonMethodLevelFilesForDir.add(jsonMethodLevelFileType);

                    // --- JsonAppLevelFilesType ---
                    // 【注意：未修正のまま残しているバグ】
                    // jsonAppLevelClassesTypeLists はファイルをまたいでクリアされないため、
                    // ここでの classes は「このファイルのクラスのみ」ではなく
                    // 「これまで処理した全ファイルのクラスの累積」になっている（v1から存在する別バグ）。
                    // 今回の修正スコープ外のため、元のロジックのまま変更していない。
                    MethodInfo.JsonAppLevelFiles jsonAppLevelFileType = new MethodInfo.JsonAppLevelFiles();
                    jsonAppLevelFileType.filePath = relativizePath(filePath);
                    jsonAppLevelFileType.classes = new ArrayList<>(jsonAppLevelClassesTypeLists);
                    jsonAppLevelFileType.imports = classImports;
                    jsonAppLevelFileType.fileRowsCount = cu.getEnd().map(p -> p.line).orElse(0);

                    jsonAppLevelFileTypeLists.add(jsonAppLevelFileType);

                    System.out.println(filePath.getFileName());
                }

                // --- このディレクトリ分をここで1回だけ出力する ---
                if (!jsonMethodLevelFilesForDir.isEmpty()) {
                    MethodInfo.JsonMethodLevel jsonMethodLevelType = new MethodInfo.JsonMethodLevel();
                    jsonMethodLevelType.directoryPath = relativizePath(Paths.get(currentDirPath));
                    jsonMethodLevelType.files = jsonMethodLevelFilesForDir;

                    String outFileName = "ast_MethodLevel_"
                            + buildOutputFileName(currentDirPath, new ArrayList<>(filesByDirectory.keySet())) + ".json";
                    JsonOutput.writeJsonFile(jsonMethodLevelType, outFileName, config);
                }
            }

            // --- アプリレベルJSON出力 ---
            MethodInfo.JsonAppLevel jsonAppLevelType = new MethodInfo.JsonAppLevel();
            jsonAppLevelType.appName = config.getAppName();
            jsonAppLevelType.directory = config.getTargetDir();
            jsonAppLevelType.language = "Java";

            MethodInfo.JsonAppLevel.Summary summary = new MethodInfo.JsonAppLevel.Summary();
            summary.totalFiles = sourceFiles.size();
            summary.totalClasses = classCount;
            summary.totalMethods = methodCount;
            summary.totalFuncs = funcCount;
            jsonAppLevelType.summary = summary;
            jsonAppLevelType.files = jsonAppLevelFileTypeLists;

            JsonOutput.writeJsonFile(jsonAppLevelType, config);
            CsvOutput.writeCsvFile(csvDataLists, config);

        } catch (IOException e) {
            System.err.println("catch Error: " + e.getMessage());
            return false;
        }
        return true;
    }

    // -----------------------------------------------------------------------
    // 【バグ修正1・追加分／バグ修正3で更新】ディレクトリパスから、出力ファイル名として安全な文字列を生成する
    // 末尾フォルダ名だけでは別ディレクトリ同士の名前衝突が起こりうるため、
    // TargetAppDirからの相対パス全体をサニタイズして使用する。
    // relativizePath()を使うことで、区切り文字の表記違いによるプレフィックス除去の失敗を防ぐ。
    // さらに、Windowsのファイル名として使用できない文字（: * ? " < > |）を念のため除去する。
    // -----------------------------------------------------------------------
    private String sanitizeDirName(String absoluteDirPath) {
        String relative = relativizePath(Paths.get(absoluteDirPath));
        String sanitized = relative
                .replaceFirst("^\\./", "")
                .replaceAll("[\\\\/]+", "_")
                .replaceAll("[:*?\"<>|]", "");
        return sanitized.isEmpty() ? "root" : sanitized;
    }

    // -----------------------------------------------------------------------
    // 【バグ修正・出力ファイル名の見直し】
    // 従来 sanitizeDirName() を出力ファイル名として常にそのまま使っていたが、
    // これはTARGET_APP_DIRからの相対パス全体を使うため、ディレクトリが深い
    // プロジェクトでは意味の読み取れない長大なファイル名になっていた。
    //
    // 段階的な方式に変更した：
    // 1. 基本は末尾フォルダ名のみ（例: ast_MethodLevel_FileOperation.json）
    // 2. 同じ末尾フォルダ名を持つ別ディレクトリが他にも存在する場合のみ、
    // 直上の親フォルダ名を付与して曖昧さを解消する
    // 3. それでもなお衝突する稀なケースのみ、sanitizeDirName()（相対パス全体）にフォールバックする
    // -----------------------------------------------------------------------
    private List<String> pathSegments(String path) {
        return java.util.Arrays.stream(path.split("[\\\\/]+"))
                .filter(s -> !s.isEmpty())
                .collect(Collectors.toList());
    }

    private String baseNameOf(String path) {
        List<String> segs = pathSegments(path);
        return segs.isEmpty() ? "root" : segs.get(segs.size() - 1);
    }

    private String buildOutputFileName(String dirPath, List<String> allDirPaths) {
        List<String> segs = pathSegments(dirPath);
        String base = segs.isEmpty() ? "root" : segs.get(segs.size() - 1);

        long sameBaseCount = allDirPaths.stream().filter(d -> baseNameOf(d).equals(base)).count();

        String candidate = base;

        if (sameBaseCount > 1) {
            String parent = segs.size() >= 2 ? segs.get(segs.size() - 2) : "";
            candidate = parent.isEmpty() ? base : parent + "_" + base;

            final String finalCandidate = candidate;
            long stillColliding = allDirPaths.stream().filter(d -> {
                List<String> s = pathSegments(d);
                String b = s.isEmpty() ? "root" : s.get(s.size() - 1);
                if (!b.equals(base))
                    return false;
                String p = s.size() >= 2 ? s.get(s.size() - 2) : "";
                String c = p.isEmpty() ? b : p + "_" + b;
                return c.equals(finalCandidate);
            }).count();

            if (stillColliding > 1) {
                candidate = sanitizeDirName(dirPath);
            }
        }

        return candidate.replaceAll("[:*?\"<>|]", "");
    }

    public MethodInfo.CsvRow convertCsvData(
            MethodInfo.JsonMethods jsonData,
            String classNameText,
            Path filePath,
            CompilationUnit cu) {

        MethodInfo.CsvRow row = new MethodInfo.CsvRow();
        row.filePath = relativizePath(filePath);
        row.fileName = filePath.getFileName().toString();
        row.className = classNameText;
        row.methodName = jsonData.methodName;
        row.role = jsonData.role;
        row.argumentsCount = jsonData.args != null ? jsonData.args.size() : 0;
        row.returnType = jsonData.returnType;
        row.startRow = jsonData.methodStartRow;
        row.endRow = jsonData.methodEndRow;
        row.accessModifier = jsonData.accessModifier;
        row.staticFlag = jsonData.staticFlag;
        row.abstractFlag = jsonData.abstractFlag;
        row.asyncFlag = jsonData.asyncFlag; // Java版は常にfalse
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
        jsonMethods.methodName = method.getNameAsString();
        jsonMethods.role = jsDoc.trim();
        jsonMethods.accessModifier = accessModifier.toString().trim();
        jsonMethods.staticFlag = method.isStatic();
        jsonMethods.abstractFlag = method.isAbstract();
        jsonMethods.asyncFlag = false; // Java に非同期修飾子は存在しない
        jsonMethods.decorators = decorators;
        jsonMethods.args = jsonArgs;
        jsonMethods.returnType = returnType;
        jsonMethods.methodStartRow = method.getBegin().map(p -> p.line).orElse(0);
        jsonMethods.methodEndRow = method.getEnd().map(p -> p.line).orElse(0);
        return jsonMethods;
    }

    // -----------------------------------------------------------------------
    // getMethodsParam() 相当
    // -----------------------------------------------------------------------
    public List<MethodInfo.JsonArgs> getMethodsParam(List<Parameter> params) {

        List<MethodInfo.JsonArgs> jsonArgs = new ArrayList<>();
        for (Parameter param : params) {

            MethodInfo.JsonArgs arg = new MethodInfo.JsonArgs();
            arg.argName = param.getNameAsString();
            arg.argType = param.getTypeAsString();
            // Java にデフォルト値構文は存在しない → 空文字
            arg.argDefaultValue = "";
            // Java に省略可能引数（?）は存在しない → false
            arg.argOptional = false;

            jsonArgs.add(arg);
        }
        return jsonArgs;
    }
}