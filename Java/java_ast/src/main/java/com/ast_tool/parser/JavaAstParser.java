package com.ast_tool.parser;

import com.ast_tool.AppConfig;
import com.ast_tool.model.MethodInfo;
import com.ast_tool.output.CsvOutput;
import com.github.javaparser.ParserConfiguration;
import com.github.javaparser.StaticJavaParser;
import com.github.javaparser.ast.CompilationUnit;
import com.github.javaparser.ast.Modifier;
import com.github.javaparser.ast.body.ClassOrInterfaceDeclaration;
import com.github.javaparser.ast.body.ConstructorDeclaration;
import com.github.javaparser.ast.body.EnumConstantDeclaration;
import com.github.javaparser.ast.body.EnumDeclaration;
import com.github.javaparser.ast.body.FieldDeclaration;
import com.github.javaparser.ast.body.MethodDeclaration;
import com.github.javaparser.ast.body.Parameter;
import com.github.javaparser.ast.body.VariableDeclarator;
import com.github.javaparser.ast.comments.JavadocComment;
import com.github.javaparser.ast.expr.AnnotationExpr;
import com.github.javaparser.ast.expr.MemberValuePair;
import com.github.javaparser.ast.stmt.BlockStmt;
import com.github.javaparser.ast.stmt.Statement;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;
import java.util.stream.Stream;

/**
 * JavaAstParser
 * TS版 parser.ts の Java移植版。
 * ソースファイルレベルCSV・メソッドレベルCSV・フィールドレベルCSVの3種類を組み立てて出力する。
 *
 * 【新規】フィールドレベルCSV（ast_field_level）について：
 * クラスのフィールド（fieldKind="field"）と、メソッド/コンストラクタの引数
 * （fieldKind="parameter"）を、同じ構造で1行ずつ記録する。
 * 
 * @Min/@Max/@Size等の検証アノテーションから、境界値を数値としてその場で抽出する
 *                                                （C2網羅の議論と同じ原則：文字列化してから後でパースし直すのではなく、
 *                                                ASTがまだ構文を正しく持っている時点で構造化された値として保存する）。
 *                                                該当アノテーションが見つからない場合は
 *                                                -1（センチネル値）とする。
 *
 *                                                ---
 *                                                TS版との主な差分（言語仕様の違いによる意図的な調整）
 *                                                ---
 *                                                ・Javaにはトップレベル（クラス外）の関数・変数・定数が存在しないため、
 *                                                「クラス外(-)行」は必ず生成するが、methodCount/variableCount/constantCountは常に0になる。
 *                                                importListとlineCountはファイル単位の事実として引き続き意味を持つため、そのまま記録する。
 *                                                ・ClassOrInterfaceDeclarationを対象にしているため、interfaceのdefault/staticメソッドも
 *                                                通常のメソッドとして処理される（abstractなシグネチャのみのメソッドは本体が無いため
 *                                                構造行が0件・引数行のみになる）。ネストされたクラス（インナークラス）も
 *                                                findAllで再帰的に検出され、個別のクラス行として扱われる
 *                                                （TSにはクラスのメンバーとしてのネストという概念が直接無いため、Javaならではの拡張）。
 *                                                ・enumはクラスと同じ枠組み（クラス行＋メソッド行）で対応した。列挙子自体は定数として
 *                                                constantCountに含め、列挙子の一覧を表す専用行（processContent="enum"、
 *                                                処理2=-1で衝突を回避）をメソッドレベルCSVに追加した。recordは今回のスコープ外とした。
 *                                                ・非同期(async)はJavaに存在しないため常にハイフン。代わりにsynchronized/finalを
 *                                                methodTypeに追加した（独自拡張・要確認）。
 *                                                ・戻り値型はTS版に合わせ、生の型テキスト（void等）をそのまま使う
 *                                                （v1のJavaでは「戻り値なし」という日本語ラベルに変換していたが、v2ではTS版との
 *                                                表記統一を優先し、この変換をやめた。要確認）。
 *                                                ・コンストラクタは複数存在しても全てが本体を持つ（TSと異なり、オーバーロードシグネチャの
 *                                                ような本体の無い宣言は存在しない）ため、単純にConstructor1,
 *                                                Constructor2...と連番にできる。
 *                                                ・readonly相当としてfinal修飾子を「定数」判定に使用した
 *                                                （ただしinterfaceのフィールドは暗黙にfinalであり、ソースコード上finalの記載が
 *                                                無い場合がある。この場合isFinal()がfalseを返し「変数」に分類される可能性がある。要確認）。
 *
 *                                                v1で発生した実際の不具合を踏まえた対応：
 *                                                ・相対パス算出は単純な文字列置換ではなくPath#relativize()を使う
 *                                                （Windows環境でconfig側がスラッシュ表記、Path#toString()がバックスラッシュに
 *                                                正規化される場合の不一致を避けるため）。
 *                                                ・v2はディレクトリ単位のファイル分割出力を行わない（JSON全廃に伴い、
 *                                                v1で問題になっていた出力ファイル名の衝突・上書き問題はv2の設計そのものに存在しない）。
 */
public class JavaAstParser {

    private final AppConfig config;
    private final StructureExtractor structureExtractor = new StructureExtractor();

    public JavaAstParser(AppConfig config) {
        this.config = config;
    }

    public boolean execParse() {

        List<MethodInfo.SourceFileRow> sourceFileRows = new ArrayList<>();
        List<MethodInfo.MethodRow> methodRows = new ArrayList<>();
        List<MethodInfo.FieldRow> fieldRows = new ArrayList<>();

        StaticJavaParser.getParserConfiguration()
                .setLanguageLevel(ParserConfiguration.LanguageLevel.JAVA_21);

        try {
            List<Path> sourceFiles;
            try (Stream<Path> walk = Files.walk(Paths.get(config.getTargetAppDir()))) {
                sourceFiles = walk
                        .filter(Files::isRegularFile)
                        .filter(p -> p.toString().endsWith(".java"))
                        .filter(p -> !p.toString().contains(java.io.File.separator + "test" + java.io.File.separator))
                        .sorted()
                        .collect(Collectors.toList());
            }

            for (Path filePath : sourceFiles) {
                System.out.println(filePath.getFileName());
                try {
                    processSourceFile(filePath, sourceFileRows, methodRows, fieldRows);
                } catch (Exception parseEx) {
                    System.err.println("Parse Error: " + filePath + " -> " + parseEx.getMessage());
                }
            }

            CsvOutput csvOutput = new CsvOutput();
            csvOutput.writeSourceFileCsv(sourceFileRows, config);
            csvOutput.writeMethodCsv(methodRows, config);
            csvOutput.writeFieldCsv(fieldRows, config);

        } catch (IOException e) {
            System.err.println("catch Error: " + e.getMessage());
            return false;
        }
        return true;
    }

    private void processSourceFile(
            Path filePath,
            List<MethodInfo.SourceFileRow> sourceFileRows,
            List<MethodInfo.MethodRow> methodRows,
            List<MethodInfo.FieldRow> fieldRows) throws IOException {

        CompilationUnit cu = StaticJavaParser.parse(filePath);

        String fileName = filePath.getFileName().toString();
        String directoryPath = relativizePath(filePath.getParent());
        String filePathForMethod = relativizePath(filePath);

        // --- ハイフン行（クラス外）---
        // Javaにはトップレベルの関数・変数・定数が存在しないため、method/variable/constantは常に0
        List<String> importTexts = cu.getImports().stream()
                .map(im -> im.toString().trim())
                .collect(Collectors.toList());
        String importList = importTexts.isEmpty() ? MethodInfo.HYPHEN : String.join(" / ", importTexts);
        int lineCount = cu.getEnd().map(p -> p.line).orElse(0);

        MethodInfo.SourceFileRow hyphenRow = new MethodInfo.SourceFileRow();
        hyphenRow.appName = config.getTargetAppName();
        hyphenRow.fileName = fileName;
        hyphenRow.directoryPath = directoryPath;
        hyphenRow.className = MethodInfo.HYPHEN;
        hyphenRow.importList = importList;
        hyphenRow.lineCount = lineCount;
        hyphenRow.methodCount = 0;
        hyphenRow.variableCount = 0;
        hyphenRow.constantCount = 0;
        sourceFileRows.add(hyphenRow);

        // --- クラス（interface含む。ネストされたクラスも個別に扱う）---
        List<ClassOrInterfaceDeclaration> classes = cu.findAll(ClassOrInterfaceDeclaration.class);
        // 【新規】enum（列挙型）もクラスと同じ枠組みで扱う
        List<EnumDeclaration> enums = cu.findAll(EnumDeclaration.class);

        if (classes.isEmpty() && enums.isEmpty()) {
            // 【TS版のprocess1=0代表行に相当】このファイルにはクラスもenumも一切無い。
            // Javaではpackage-info.java等、極めて稀なケースに限られる。
            methodRows.add(buildEmptyFileRow(filePathForMethod, fileName));
        }

        for (ClassOrInterfaceDeclaration cls : classes) {
            addClassRow(sourceFileRows, cls, fileName, directoryPath);

            String clsName = cls.getNameAsString() != null ? cls.getNameAsString() : fileName;

            // 【新規】クラスフィールドをフィールドレベルCSVへ記録する
            addFieldRows(fieldRows, filePathForMethod, clsName, cls.getFields());

            List<ConstructorDeclaration> constructors = cls.getConstructors();
            List<MethodDeclaration> methods = cls.getMethods();

            // コンストラクタを常に先頭（process1の若い番号）にし、その後メソッドへ連番で続ける
            int process1 = 0;

            for (ConstructorDeclaration ctor : constructors) {
                process1++;
                addConstructorRows(methodRows, fieldRows, filePathForMethod, clsName, ctor, process1);
            }
            for (MethodDeclaration method : methods) {
                process1++;
                addMethodRows(methodRows, fieldRows, filePathForMethod, clsName, method, process1);
            }
            // メソッド・コンストラクタが1つも無いクラス（プロパティのみ等）については、
            // メソッドレベルCSV側に代表行を作る仕様は無いため、行を生成しない（TS版と同様）。
        }

        // --- enum（列挙型）---
        // enumはクラスと同じ枠組み（クラス行＋メソッド行）で扱う。
        // 追加で、列挙子（PENDING, COMPLETED, ...）自体を「定数」としてconstantCountに含め、
        // 列挙子の一覧そのものを表す専用の1行（processContent="enum"）をメソッドレベルCSVに追加する。
        for (EnumDeclaration en : enums) {
            addEnumClassRow(sourceFileRows, en, fileName, directoryPath);

            String enumName = en.getNameAsString();

            // 【新規】enumのフィールドもフィールドレベルCSVへ記録する
            addFieldRows(fieldRows, filePathForMethod, enumName, en.getFields());

            List<ConstructorDeclaration> enumConstructors = en.getConstructors();
            List<MethodDeclaration> enumMethods = en.getMethods();

            int process1 = 0;
            int firstConstructorProcess1 = -1;

            for (ConstructorDeclaration ctor : enumConstructors) {
                process1++;
                if (firstConstructorProcess1 == -1)
                    firstConstructorProcess1 = process1;
                addConstructorRows(methodRows, fieldRows, filePathForMethod, enumName, ctor, process1);
            }
            for (MethodDeclaration method : enumMethods) {
                process1++;
                addMethodRows(methodRows, fieldRows, filePathForMethod, enumName, method, process1);
            }

            // 【新規】列挙子格納レコード：process1はコンストラクタ（無ければ1固定）に合わせ、
            // process2=-1で通常の構造単位とは絶対に衝突しない座標にする
            int representativeProcess1 = firstConstructorProcess1 != -1 ? firstConstructorProcess1 : 1;
            String representativeMethodName = "Constructor" + representativeProcess1;
            addEnumConstantRow(methodRows, filePathForMethod, enumName, representativeMethodName,
                    representativeProcess1, en);
        }
    }

    private void addClassRow(
            List<MethodInfo.SourceFileRow> sourceFileRows,
            ClassOrInterfaceDeclaration cls,
            String fileName,
            String directoryPath) {
        int methodCount = cls.getMethods().size() + cls.getConstructors().size();

        int variableCount = 0;
        int constantCount = 0;
        for (FieldDeclaration field : cls.getFields()) {
            // 1つの宣言に複数変数がまとめて書かれている場合（例: int a, b;）も宣言数ぶん個別にカウントする
            int varCountInDecl = field.getVariables().size();
            if (field.isFinal()) {
                constantCount += varCountInDecl;
            } else {
                variableCount += varCountInDecl;
            }
        }

        MethodInfo.SourceFileRow row = new MethodInfo.SourceFileRow();
        row.appName = config.getTargetAppName();
        row.fileName = fileName;
        row.directoryPath = directoryPath;
        row.className = cls.getNameAsString();
        row.importList = MethodInfo.HYPHEN;
        row.lineCount = -1;
        row.methodCount = methodCount;
        row.variableCount = variableCount;
        row.constantCount = constantCount;
        sourceFileRows.add(row);
    }

    private void addConstructorRows(
            List<MethodInfo.MethodRow> methodRows,
            List<MethodInfo.FieldRow> fieldRows,
            String filePath,
            String className,
            ConstructorDeclaration ctor,
            int process1) {
        String methodName = "Constructor" + process1;
        String returnType = MethodInfo.HYPHEN; // コンストラクタに戻り値の概念は無いため固定

        List<Modifier> modifiers = ctor.getModifiers();
        Optional<JavadocComment> javadoc = ctor.getJavadocComment();
        List<Parameter> params = ctor.getParameters();
        List<Statement> bodyStatements = new ArrayList<>(ctor.getBody().getStatements());

        // static/abstract/async/synchronized/finalはコンストラクタに存在しないためmethodTypeは常にハイフン
        String methodType = MethodInfo.HYPHEN;

        String role = extractRole(javadoc);
        String accessModifier = extractAccessModifier(modifiers);

        writeRows(methodRows, fieldRows, filePath, className, methodName, process1, bodyStatements,
                role, returnType, methodType, accessModifier, params);
    }

    private void addMethodRows(
            List<MethodInfo.MethodRow> methodRows,
            List<MethodInfo.FieldRow> fieldRows,
            String filePath,
            String className,
            MethodDeclaration method,
            int process1) {
        String methodName = method.getNameAsString();
        String returnType = method.getType().asString(); // TS版に合わせ生の型テキストをそのまま使う（void等）

        List<Modifier> modifiers = method.getModifiers();
        Optional<JavadocComment> javadoc = method.getJavadocComment();
        List<Parameter> params = method.getParameters();
        // abstract/interfaceのシグネチャのみのメソッドは本体を持たない
        List<Statement> bodyStatements = method.getBody()
                .map(BlockStmt::getStatements)
                .<List<Statement>>map(ArrayList::new)
                .orElseGet(ArrayList::new);

        List<String> flags = new ArrayList<>();
        if (method.isStatic())
            flags.add("静的");
        if (method.isAbstract())
            flags.add("抽象");
        // 【Java独自拡張】synchronized・finalはTSに無い概念だが、メソッドの重要な特性のため追加した
        if (method.isSynchronized())
            flags.add("synchronized");
        if (method.isFinal())
            flags.add("final");
        String methodType = flags.isEmpty() ? MethodInfo.HYPHEN : String.join("+", flags);

        String role = extractRole(javadoc);
        String accessModifier = extractAccessModifier(modifiers);

        writeRows(methodRows, fieldRows, filePath, className, methodName, process1, bodyStatements,
                role, returnType, methodType, accessModifier, params);
    }

    private String extractRole(Optional<JavadocComment> javadoc) {
        return javadoc.map(JavadocComment::toString)
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .orElse(MethodInfo.NO_ROLE_TEXT);
    }

    private String extractAccessModifier(List<Modifier> modifiers) {
        String modText = modifiers.stream()
                .map(m -> m.getKeyword().asString())
                .collect(Collectors.joining(" "))
                .trim();
        return modText.isEmpty() ? MethodInfo.HYPHEN : modText;
    }

    // --- 構造行＋引数専用行の共通組み立て処理（コンストラクタ・メソッド共通） ---
    private void writeRows(
            List<MethodInfo.MethodRow> methodRows,
            List<MethodInfo.FieldRow> fieldRows,
            String filePath,
            String className,
            String methodName,
            int process1,
            List<Statement> bodyStatements,
            String role,
            String returnType,
            String methodType,
            String accessModifier,
            List<Parameter> params) {
        List<StructureExtractor.StructureRow> structureRows = structureExtractor.buildStructureRows(bodyStatements,
                process1);

        for (StructureExtractor.StructureRow sr : structureRows) {
            MethodInfo.MethodRow row = new MethodInfo.MethodRow();
            row.filePath = filePath;
            row.className = className;
            row.methodName = methodName;
            row.processCoords = sr.coords;
            row.processContent = sr.content;
            row.role = role;
            row.returnType = returnType;
            row.methodType = methodType;
            row.accessModifier = accessModifier;
            row.args = buildEmptyArgs();
            methodRows.add(row);
        }

        // --- 引数専用行（処理2〜9はすべて0、処理内容="引数"） ---
        // Javaの引数には既定値（デフォルト値）という概念が無いため、TS版と異なり修飾子＋型＋名前のみが入る
        List<String> argTexts = params.stream().map(Parameter::toString).collect(Collectors.toList());

        int[] argCoords = new int[MethodInfo.MAX_NEST_DEPTH];
        argCoords[0] = process1;

        MethodInfo.MethodRow argRow = new MethodInfo.MethodRow();
        argRow.filePath = filePath;
        argRow.className = className;
        argRow.methodName = methodName;
        argRow.processCoords = argCoords;
        argRow.processContent = MethodInfo.ARGUMENT_ROW_CONTENT;
        argRow.role = role;
        argRow.returnType = returnType;
        argRow.methodType = methodType;
        argRow.accessModifier = accessModifier;
        argRow.args = buildArgsColumns(argTexts);
        methodRows.add(argRow);

        // 【新規】各引数について、検証アノテーション等をフィールドレベルCSVへ個別に記録する
        addParameterFieldRows(fieldRows, filePath, className, methodName, params);
    }

    // --- 【新規】クラス/enumのフィールドをフィールドレベルCSVへ記録する ---
    // 1つの宣言に複数変数がまとめて書かれている場合（例: int a, b;）も宣言数ぶん個別に記録する
    private void addFieldRows(
            List<MethodInfo.FieldRow> fieldRows,
            String filePath,
            String className,
            List<FieldDeclaration> fields) {
        for (FieldDeclaration field : fields) {
            List<AnnotationExpr> annotations = field.getAnnotations();
            boolean isFinal = field.isFinal();
            for (VariableDeclarator vd : field.getVariables()) {
                fieldRows.add(buildFieldRow(
                        filePath, className, null, "field",
                        vd.getNameAsString(), vd.getTypeAsString(), isFinal, annotations));
            }
        }
    }

    // --- 【新規】メソッド/コンストラクタの引数をフィールドレベルCSVへ記録する ---
    private void addParameterFieldRows(
            List<MethodInfo.FieldRow> fieldRows,
            String filePath,
            String className,
            String methodName,
            List<Parameter> params) {
        for (Parameter param : params) {
            fieldRows.add(buildFieldRow(
                    filePath, className, methodName, "parameter",
                    param.getNameAsString(), param.getTypeAsString(), param.isFinal(),
                    param.getAnnotations()));
        }
    }

    private MethodInfo.FieldRow buildFieldRow(
            String filePath, String className, String methodName, String kind,
            String name, String type, boolean isFinal, List<AnnotationExpr> annotations) {
        MethodInfo.FieldRow row = new MethodInfo.FieldRow();
        row.filePath = filePath;
        row.className = className;
        row.methodName = methodName;
        row.fieldKind = kind;
        row.fieldName = name;
        row.fieldType = type;
        row.isFinal = isFinal;
        row.validationMin = extractAnnotationBound(annotations, "min");
        row.validationMax = extractAnnotationBound(annotations, "max");
        row.nullable = extractNullable(annotations);
        row.rawAnnotations = annotations.isEmpty()
                ? MethodInfo.HYPHEN
                : annotations.stream().map(AnnotationExpr::toString).collect(Collectors.joining(" "));
        return row;
    }

    // 【取れれば実値、取れなければ-1】@Min(1)のような単一値アノテーション、
    // @Size(min=, max=)のような名前付きペアの両方に対応する
    private int extractAnnotationBound(List<AnnotationExpr> annotations, String bound) {
        for (AnnotationExpr ann : annotations) {
            String name = ann.getNameAsString();
            if (bound.equals("min") && name.equals("Min") && ann.isSingleMemberAnnotationExpr()) {
                return parseIntSafely(ann.asSingleMemberAnnotationExpr().getMemberValue().toString());
            }
            if (bound.equals("max") && name.equals("Max") && ann.isSingleMemberAnnotationExpr()) {
                return parseIntSafely(ann.asSingleMemberAnnotationExpr().getMemberValue().toString());
            }
            if (name.equals("Size") && ann.isNormalAnnotationExpr()) {
                for (MemberValuePair pair : ann.asNormalAnnotationExpr().getPairs()) {
                    if (pair.getNameAsString().equals(bound)) {
                        return parseIntSafely(pair.getValue().toString());
                    }
                }
            }
        }
        return -1;
    }

    // 【取れれば実値、取れなければ-1】NotNull系の有無から判定する
    private int extractNullable(List<AnnotationExpr> annotations) {
        for (AnnotationExpr ann : annotations) {
            String name = ann.getNameAsString();
            if (name.equals("NotNull") || name.equals("NotBlank") || name.equals("NotEmpty")) {
                return 0; // 明示的にnullable不可
            }
            if (name.equals("Nullable")) {
                return 1; // 明示的にnullable可
            }
        }
        return -1; // 判定不能
    }

    private int parseIntSafely(String text) {
        try {
            return Integer.parseInt(text.trim());
        } catch (NumberFormatException e) {
            return -1;
        }
    }

    // --- enum専用：クラス行に相当する行を組み立てる ---
    private void addEnumClassRow(
            List<MethodInfo.SourceFileRow> sourceFileRows,
            EnumDeclaration en,
            String fileName,
            String directoryPath) {
        int methodCount = en.getMethods().size() + en.getConstructors().size();

        int variableCount = 0;
        int constantCount = 0;
        for (FieldDeclaration field : en.getFields()) {
            int varCountInDecl = field.getVariables().size();
            if (field.isFinal()) {
                constantCount += varCountInDecl;
            } else {
                variableCount += varCountInDecl;
            }
        }
        // 列挙子自体（PENDING, COMPLETED, ...）も定数として数える
        constantCount += en.getEntries().size();

        MethodInfo.SourceFileRow row = new MethodInfo.SourceFileRow();
        row.appName = config.getTargetAppName();
        row.fileName = fileName;
        row.directoryPath = directoryPath;
        row.className = en.getNameAsString();
        row.importList = MethodInfo.HYPHEN;
        row.lineCount = -1;
        row.methodCount = methodCount;
        row.variableCount = variableCount;
        row.constantCount = constantCount;
        sourceFileRows.add(row);
    }

    // --- enum専用：列挙子（PENDING, COMPLETED, ...）の一覧を表す専用行を組み立てる ---
    // 座標は [process1, -1, page, 0, 0, 0, 0, 0, 0] とし、process2=-1で通常の構造単位・
    // 引数専用行のどちらとも絶対に衝突しない値にする（transition_reactのcost=-1と同じ発想）。
    // 列挙子が21件以上ある場合は、process3をページ番号（0始まり）として20件ずつ複数行に分割する。
    // 列挙子が0件の場合でも、他の行種別と同様に最低1行（全列ハイフン）は保証する。
    private void addEnumConstantRow(
            List<MethodInfo.MethodRow> methodRows,
            String filePath,
            String className,
            String methodName,
            int process1,
            EnumDeclaration en) {
        List<String> constantNames = en.getEntries().stream()
                .map(EnumConstantDeclaration::getNameAsString)
                .collect(Collectors.toList());

        int totalChunks = constantNames.isEmpty()
                ? 1
                : (int) Math.ceil(constantNames.size() / (double) MethodInfo.MAX_ARG_COLUMNS);

        for (int page = 0; page < totalChunks; page++) {
            int fromIndex = page * MethodInfo.MAX_ARG_COLUMNS;
            int toIndex = Math.min(fromIndex + MethodInfo.MAX_ARG_COLUMNS, constantNames.size());
            List<String> chunk = constantNames.isEmpty()
                    ? new ArrayList<>()
                    : constantNames.subList(fromIndex, toIndex);

            int[] coords = new int[MethodInfo.MAX_NEST_DEPTH];
            coords[0] = process1;
            coords[1] = -1; // 【enum専用マーカー】
            coords[2] = page; // 20件を超える場合のページ番号（0始まり）

            MethodInfo.MethodRow row = new MethodInfo.MethodRow();
            row.filePath = filePath;
            row.className = className;
            row.methodName = methodName;
            row.processCoords = coords;
            row.processContent = "enum";
            row.role = MethodInfo.NO_ROLE_TEXT;
            row.returnType = MethodInfo.HYPHEN;
            row.methodType = MethodInfo.HYPHEN;
            row.accessModifier = MethodInfo.HYPHEN;
            row.args = buildArgsColumns(chunk);
            methodRows.add(row);
        }
    }

    private String[] buildEmptyArgs() {
        String[] arr = new String[MethodInfo.MAX_ARG_COLUMNS];
        java.util.Arrays.fill(arr, MethodInfo.HYPHEN);
        return arr;
    }

    private String[] buildArgsColumns(List<String> argTexts) {
        String[] cols = buildEmptyArgs();
        for (int i = 0; i < argTexts.size() && i < MethodInfo.MAX_ARG_COLUMNS; i++) {
            cols[i] = argTexts.get(i);
        }
        return cols;
    }

    // process1=0：ファイル全体に処理内容が無い場合の代表行（クラスが1つも無いファイル用）
    private MethodInfo.MethodRow buildEmptyFileRow(String filePath, String fileName) {
        MethodInfo.MethodRow row = new MethodInfo.MethodRow();
        row.filePath = filePath;
        row.className = fileName;
        row.methodName = MethodInfo.HYPHEN;
        row.processCoords = new int[MethodInfo.MAX_NEST_DEPTH]; // 全て0（process1も0）
        row.processContent = "";
        row.role = MethodInfo.NO_ROLE_TEXT;
        row.returnType = MethodInfo.HYPHEN;
        row.methodType = MethodInfo.HYPHEN;
        row.accessModifier = MethodInfo.HYPHEN;
        row.args = buildEmptyArgs();
        return row;
    }

    // 【v1での実際の不具合を踏まえた対応】TARGET_APP_DIRからの相対パス算出は、単純な文字列置換ではなく
    // Path#relativize()を使う。Windows環境でconfig側がスラッシュ表記、Path#toString()の結果が
    // バックスラッシュに正規化される場合の不一致（過去に実際にエラーとなった）を避けるため。
    private String relativizePath(Path fullPath) {
        try {
            Path base = Paths.get(config.getTargetAppDir()).toAbsolutePath().normalize();
            Path target = fullPath.toAbsolutePath().normalize();
            Path relative = base.relativize(target);
            return "./" + relative.toString().replace(java.io.File.separator, "/");
        } catch (Exception e) {
            System.err.println("相対パス算出に失敗したため絶対パスを使用します: " + fullPath + " - " + e.getMessage());
            return fullPath.toString();
        }
    }
}
