package com.ast_tool.cleaner;

import com.github.javaparser.StaticJavaParser;
import com.github.javaparser.ast.NodeList;
import com.github.javaparser.ast.body.Parameter;
import com.github.javaparser.ast.type.ArrayType;
import com.github.javaparser.ast.type.ClassOrInterfaceType;
import com.github.javaparser.ast.type.Type;
import com.github.javaparser.ast.type.WildcardType;

import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.atomic.AtomicInteger;

public class JavaAstCleaner {
    private static final String HYPHEN = "-";
    private static final String ARGUMENT_ROW = "引数";
    private static final String ENUM_ROW = "enum";
    private static final int MAX_ARGS = 20;

    private final CleanerConfig config;
    private final Map<String, String> typeModel = new HashMap<>();
    private final AtomicInteger objectId = new AtomicInteger(1);
    private final List<List<String>> objectRows = new ArrayList<>();

    public JavaAstCleaner(CleanerConfig config) {
        this.config = config;
    }

    public boolean execute() {
        try {
            List<Map<String, String>> sourceRows = CsvUtil.read(Paths.get(config.sourceFileCsv));
            List<Map<String, String>> methodRows = CsvUtil.read(Paths.get(config.methodCsv));
            List<Map<String, String>> fieldRows = CsvUtil.read(Paths.get(config.fieldCsv));
            loadTypeModel();

            Path out = Paths.get(config.outputDir);
            writeImport(out, sourceRows);
            writeEnum(out, methodRows);
            writeArgs(out, methodRows, fieldRows);
            writeField(out, fieldRows);
            writeDto(out, sourceRows, fieldRows);
            writeReturn(out, methodRows);
            writeObject(out);
            return true;
        } catch (Exception e) {
            System.err.println("Cleaner処理失敗: " + e.getMessage());
            e.printStackTrace(System.err);
            return false;
        }
    }

    private void loadTypeModel() throws Exception {
        for (Map<String, String> row : CsvUtil.read(Paths.get(config.langDataModelsCsv))) {
            if (!config.language.equalsIgnoreCase(row.getOrDefault("language", ""))) continue;
            String raw = row.getOrDefault("data_model", "").trim();
            String conv = row.getOrDefault("conv_model", "").trim();
            if (!raw.isEmpty() && !conv.isEmpty()) typeModel.put(raw, conv);
        }
    }

    private void writeImport(Path out, List<Map<String, String>> sourceRows) throws Exception {
        List<List<String>> rows = new ArrayList<>();
        List<Map<String, String>> orderedSourceRows = new ArrayList<>(sourceRows);
        orderedSourceRows.sort(Comparator.comparing((Map<String, String> r) -> r.getOrDefault("appName", "")).thenComparing(r -> r.getOrDefault("fileName", "")).thenComparing(r -> r.getOrDefault("directoryPath", "")));
        int n = 1;
        for (Map<String, String> row : orderedSourceRows) {
            String raw = row.getOrDefault("importList", HYPHEN).trim();
            if (raw.isEmpty() || HYPHEN.equals(raw)) continue;
            for (String token : raw.split("\\s*/\\s*")) {
                String value = token.trim();
                if (value.startsWith("import ")) value = value.substring(7).trim();
                if (value.endsWith(";")) value = value.substring(0, value.length() - 1).trim();
                if (value.isEmpty()) continue;
                rows.add(new ArrayList<>(List.of(String.valueOf(n++), row.getOrDefault("appName", ""), row.getOrDefault("fileName", ""), row.getOrDefault("directoryPath", ""), value)));
            }
        }
        writeCleanCsv(out.resolve("importlist_data.csv"), List.of("n", "appName", "fileName", "directoryPath", "importList"), rows, Set.of("n"));
    }

    private void writeEnum(Path out, List<Map<String, String>> methodRows) throws Exception {
        List<List<String>> rows = new ArrayList<>();
        int n = 1;
        for (Map<String, String> row : methodRows) {
            if (!ENUM_ROW.equals(row.getOrDefault("processContent", ""))) continue;
            int page = parseInt(row.getOrDefault("process3", "0"));
            for (int i = 1; i <= MAX_ARGS; i++) {
                String value = row.getOrDefault("arg" + i, HYPHEN).trim();
                if (value.isEmpty() || HYPHEN.equals(value)) continue;
                int enumIndex = page * MAX_ARGS + i;
                rows.add(List.of(String.valueOf(n++), row.getOrDefault("filePath", ""), row.getOrDefault("className", ""), String.valueOf(enumIndex), value, "ENUM"));
            }
        }
        writeCleanCsv(out.resolve("enum_data.csv"), List.of("n", "filePath", "enumName", "enumIndex", "enumValue", "convModel"), rows, Set.of("n", "enumIndex"));
    }

    private void writeArgs(Path out, List<Map<String, String>> methodRows, List<Map<String, String>> fieldRows) throws Exception {
        Map<String, Map<String, String>> paramFields = new HashMap<>();
        for (Map<String, String> row : fieldRows) {
            if (!"parameter".equals(row.getOrDefault("fieldKind", ""))) continue;
            paramFields.put(paramKey(row.get("filePath"), row.get("className"), row.get("methodName"), row.get("fieldName")), row);
        }

        List<List<String>> rows = new ArrayList<>();
        int n = 1;
        for (Map<String, String> row : methodRows) {
            if (!ARGUMENT_ROW.equals(row.getOrDefault("processContent", ""))) continue;
            for (int i = 1; i <= MAX_ARGS; i++) {
                String rawArg = row.getOrDefault("arg" + i, HYPHEN).trim();
                if (rawArg.isEmpty() || HYPHEN.equals(rawArg)) continue;
                try {
                    Parameter p = StaticJavaParser.parseParameter(rawArg);
                    String rawType = p.getType().toString();
                    String name = p.getNameAsString();
                    String conv = resolveConvModel(p.getType());
                    int rootObjectId = registerTypeTree("ARG", row.getOrDefault("filePath", ""), row.getOrDefault("className", ""), row.getOrDefault("methodName", ""), name, i, p.getType());
                    Map<String, String> field = paramFields.get(paramKey(row.get("filePath"), row.get("className"), row.get("methodName"), name));
                    rows.add(List.of(
                            String.valueOf(n++), row.getOrDefault("filePath", ""), row.getOrDefault("className", ""), row.getOrDefault("methodName", ""), row.getOrDefault("process1", "-1"), String.valueOf(i),
                            name, rawArg, rawType, conv,
                            field == null ? "-1" : field.getOrDefault("validationMin", "-1"),
                            field == null ? "-1" : field.getOrDefault("validationMax", "-1"),
                            field == null ? "-1" : field.getOrDefault("nullable", "-1"),
                            field == null ? HYPHEN : field.getOrDefault("rawAnnotations", HYPHEN),
                            rootObjectId == 0 ? "-1" : String.valueOf(rootObjectId)));
                } catch (Exception e) {
                    rows.add(List.of(String.valueOf(n++), row.getOrDefault("filePath", ""), row.getOrDefault("className", ""), row.getOrDefault("methodName", ""), row.getOrDefault("process1", "-1"), String.valueOf(i), HYPHEN, rawArg, HYPHEN, "OBJECT", "-1", "-1", "-1", HYPHEN, HYPHEN));
                }
            }
        }
        writeCleanCsv(out.resolve("args_data.csv"), List.of("n", "filePath", "className", "methodName", "process1", "argIndex", "argName", "argRaw", "rawType", "convModel", "validationMin", "validationMax", "nullable", "rawAnnotations", "objectRootId"), rows, Set.of("n", "process1", "argIndex", "validationMin", "validationMax", "nullable", "objectRootId"));
    }

    private void writeField(Path out, List<Map<String, String>> fieldRows) throws Exception {
        List<List<String>> rows = new ArrayList<>();
        int n = 1;
        for (Map<String, String> row : fieldRows) {
            if (!"field".equals(row.getOrDefault("fieldKind", ""))) continue;
            String rawType = row.getOrDefault("fieldType", HYPHEN);
            String conv = "OBJECT";
            int rootObjectId = 0;
            try {
                Type type = StaticJavaParser.parseType(rawType);
                conv = resolveConvModel(type);
                rootObjectId = registerTypeTree("FIELD", row.getOrDefault("filePath", ""), row.getOrDefault("className", ""), "", row.getOrDefault("fieldName", ""), -1, type);
            } catch (Exception ignored) {}
            rows.add(List.of(String.valueOf(n++), row.getOrDefault("filePath", ""), row.getOrDefault("className", ""), row.getOrDefault("fieldName", ""), rawType, conv,
                    row.getOrDefault("isFinal", "0"), row.getOrDefault("validationMin", "-1"), row.getOrDefault("validationMax", "-1"), row.getOrDefault("nullable", "-1"), row.getOrDefault("rawAnnotations", HYPHEN), rootObjectId == 0 ? "-1" : String.valueOf(rootObjectId)));
        }
        writeCleanCsv(out.resolve("field_data.csv"), List.of("n", "filePath", "className", "fieldName", "rawType", "convModel", "isFinal", "validationMin", "validationMax", "nullable", "rawAnnotations", "objectRootId"), rows, Set.of("n", "isFinal", "validationMin", "validationMax", "nullable", "objectRootId"));
    }

    private void writeDto(Path out, List<Map<String, String>> sourceRows, List<Map<String, String>> fieldRows) throws Exception {
        Set<String> knownClasses = new LinkedHashSet<>();
        for (Map<String, String> row : sourceRows) {
            String className = row.getOrDefault("className", HYPHEN);
            if (!className.isBlank() && !HYPHEN.equals(className)) knownClasses.add(className);
        }
        List<List<String>> rows = new ArrayList<>();
        int n = 1;
        for (Map<String, String> row : fieldRows) {
            if (!"field".equals(row.getOrDefault("fieldKind", ""))) continue;
            String className = row.getOrDefault("className", "");
            if (!knownClasses.contains(className)) continue;
            rows.add(List.of(String.valueOf(n++), row.getOrDefault("filePath", ""), className, row.getOrDefault("fieldName", ""), row.getOrDefault("fieldType", "")));
        }
        writeCleanCsv(out.resolve("dto_data.csv"), List.of("n", "filePath", "dtoName", "fieldName", "rawType"), rows, Set.of("n"));
    }

    private void writeReturn(Path out, List<Map<String, String>> methodRows) throws Exception {
        List<List<String>> rows = new ArrayList<>();
        int n = 1;
        Set<String> seen = new HashSet<>();
        for (Map<String, String> row : methodRows) {
            if (!ARGUMENT_ROW.equals(row.getOrDefault("processContent", ""))) continue;
            String key = row.getOrDefault("filePath", "") + "\u0001" + row.getOrDefault("className", "") + "\u0001" + row.getOrDefault("methodName", "") + "\u0001" + row.getOrDefault("process1", "-1");
            if (!seen.add(key)) continue;
            String rawType = row.getOrDefault("returnType", HYPHEN);
            String conv = HYPHEN;
            int rootObjectId = 0;
            if (!rawType.isBlank() && !HYPHEN.equals(rawType)) {
                try {
                    Type type = StaticJavaParser.parseType(rawType);
                    conv = resolveConvModel(type);
                    rootObjectId = registerTypeTree("RETURN", row.getOrDefault("filePath", ""), row.getOrDefault("className", ""), row.getOrDefault("methodName", ""), "return", -1, type);
                } catch (Exception e) {
                    conv = "OBJECT";
                }
            }
            rows.add(List.of(String.valueOf(n++), row.getOrDefault("filePath", ""), row.getOrDefault("className", ""), row.getOrDefault("methodName", ""), row.getOrDefault("process1", "-1"), rawType, conv, rootObjectId == 0 ? "-1" : String.valueOf(rootObjectId)));
        }
        writeCleanCsv(out.resolve("return_data.csv"), List.of("n", "filePath", "className", "methodName", "process1", "rawType", "convModel", "objectRootId"), rows, Set.of("n", "process1", "objectRootId"));
    }

    private void writeObject(Path out) throws Exception {
        writeCleanCsv(out.resolve("object_data.csv"), List.of("objectId", "parentObjectId", "ownerKind", "filePath", "className", "methodName", "ownerName", "ownerIndex", "position", "rawType", "baseType", "convModel", "referenceType"), objectRows, Set.of("objectId", "parentObjectId", "ownerIndex"));
    }

    private int registerTypeTree(String ownerKind, String filePath, String className, String methodName, String ownerName, int ownerIndex, Type type) {
        if (!needsObjectTree(type)) return 0;
        return addTypeNode(0, ownerKind, filePath, className, methodName, ownerName, ownerIndex, "ROOT", type);
    }

    private int addTypeNode(int parentId, String ownerKind, String filePath, String className, String methodName, String ownerName, int ownerIndex, String position, Type type) {
        int id = objectId.getAndIncrement();
        String rawType = type.toString();
        String baseType = baseType(type);
        String conv = resolveConvModel(type);
        String reference = "OBJECT".equals(conv) ? baseType : HYPHEN;
        objectRows.add(List.of(String.valueOf(id), parentId == 0 ? "-1" : String.valueOf(parentId), ownerKind, filePath, className, methodName, ownerName, String.valueOf(ownerIndex), position, rawType, baseType, conv, reference));

        if (type instanceof ArrayType arrayType) addTypeNode(id, ownerKind, filePath, className, methodName, ownerName, ownerIndex, "ELEMENT", arrayType.getComponentType());
        if (type instanceof ClassOrInterfaceType classType && classType.getTypeArguments().isPresent()) {
            NodeList<Type> args = classType.getTypeArguments().get();
            String outerConv = resolveConvModel(classType);
            for (int i = 0; i < args.size(); i++) {
                String childPosition;
                if ("MAP".equals(outerConv) && i == 0) childPosition = "KEY";
                else if ("MAP".equals(outerConv) && i == 1) childPosition = "VALUE";
                else childPosition = "ELEMENT";
                addTypeNode(id, ownerKind, filePath, className, methodName, ownerName, ownerIndex, childPosition, normalizeWildcard(args.get(i)));
            }
        }
        return id;
    }

    private boolean needsObjectTree(Type type) {
        if (type instanceof ArrayType) return true;
        if (type instanceof ClassOrInterfaceType classType) {
            if (classType.getTypeArguments().isPresent()) return true;
            return "OBJECT".equals(resolveConvModel(type));
        }
        return false;
    }

    private Type normalizeWildcard(Type type) {
        if (!(type instanceof WildcardType w)) return type;
        if (w.getExtendedType().isPresent()) return w.getExtendedType().get();
        if (w.getSuperType().isPresent()) return w.getSuperType().get();
        return StaticJavaParser.parseType("Object");
    }

    private String resolveConvModel(Type type) {
        if (type instanceof ArrayType) return typeModel.getOrDefault("[]", "OBJECT");
        String key = baseType(type);
        return typeModel.getOrDefault(key, "OBJECT");
    }

    private String baseType(Type type) {
        if (type instanceof ArrayType) return "[]";
        if (type.isPrimitiveType()) return type.asPrimitiveType().toString();
        if (type.isVoidType()) return "void";
        if (type instanceof ClassOrInterfaceType classType) return classType.getNameAsString();
        return type.toString();
    }

    private void writeCleanCsv(Path path, List<String> header, List<List<String>> rows, Set<String> integerColumns) throws Exception {
        List<List<String>> normalizedRows = new ArrayList<>();
        for (List<String> row : rows) {
            List<String> normalized = new ArrayList<>();
            for (int i = 0; i < header.size(); i++) {
                String value = i < row.size() ? row.get(i) : null;
                normalized.add(integerColumns.contains(header.get(i)) ? integerValue(header.get(i), value) : textValue(value));
            }
            normalizedRows.add(normalized);
        }
        CsvUtil.write(path, header, normalizedRows);
    }

    private String textValue(String value) {
        if (value == null || value.trim().isEmpty()) return HYPHEN;
        return value;
    }

    private String integerValue(String columnName, String value) {
        if (value == null || value.trim().isEmpty() || HYPHEN.equals(value.trim())) return "-1";
        String normalized = value.trim();
        if ("isFinal".equals(columnName)) {
            if ("true".equalsIgnoreCase(normalized)) return "1";
            if ("false".equalsIgnoreCase(normalized)) return "0";
        }
        try {
            return String.valueOf(Long.parseLong(normalized));
        } catch (NumberFormatException e) {
            throw new IllegalArgumentException("整数列に数値化できない値があります: column=" + columnName + ", value=" + value);
        }
    }

    private String paramKey(String filePath, String className, String methodName, String fieldName) {
        return String.join("\u0001", safe(filePath), safe(className), safe(methodName), safe(fieldName));
    }

    private String safe(String value) {
        return value == null ? "" : value;
    }

    private int parseInt(String value) {
        try { return Integer.parseInt(value); } catch (Exception e) { return 0; }
    }
}