package com.ast_tool.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;

/**
 * method_info.ts の型定義群をJavaのPOJOクラスとして変換したもの。
 * Jackson でそのままシリアライズ可能な構造にしている。
 */
public class MethodInfo {

    // -----------------------------------------------------------------------
    // errorValue 相当の定数
    // -----------------------------------------------------------------------
    public static final String ERROR_METHOD_NAME = "get method name missed.";
    public static final String ERROR_CLASS_NAME  = "get Class name missed.";

    // -----------------------------------------------------------------------
    // CsvHeaderType 相当 --- CSV1行分のデータ
    // -----------------------------------------------------------------------
    public static class CsvRow {

        @JsonProperty("ファイルパス")
        public String filePath;

        @JsonProperty("ファイル名")
        public String fileName;

        @JsonProperty("クラス名")
        public String className;

        @JsonProperty("メソッド名")
        public String methodName;

        /** コメントから引用。無ければ「役割記載なし」 */
        @JsonProperty("役割")
        public String role;

        @JsonProperty("引数個数")
        public int argumentsCount;

        /** return無しなら「戻り値なし」 */
        @JsonProperty("戻り値の型")
        public String returnType;

        @JsonProperty("開始行番号")
        public int startRow;

        @JsonProperty("終了行番号")
        public int endRow;

        @JsonProperty("アクセス修飾子")
        public String accessModifier;

        @JsonProperty("静的メソッドフラグ")
        public boolean staticFlag;

        @JsonProperty("抽象メソッドフラグ")
        public boolean abstractFlag;

        @JsonProperty("非同期フラグ")
        public boolean asyncFlag;

        // CSV出力用ヘッダー文字列（TS版 CsvHeader 定数相当）
        public static final String[] HEADER = {
            "ファイルパス",
            "ファイル名",
            "クラス名",
            "メソッド名",
            "役割",
            "引数個数",
            "戻り値の型",
            "開始行番号",
            "終了行番号",
            "アクセス修飾子",
            "静的メソッドフラグ",
            "抽象メソッドフラグ",
            "非同期フラグ"
        };

        /** CsvRow → String配列に変換（OpenCSV書き出し用） */
        public String[] toStringArray() {
            return new String[]{
                filePath,
                fileName,
                className,
                methodName,
                role,
                String.valueOf(argumentsCount),
                returnType,
                String.valueOf(startRow),
                String.valueOf(endRow),
                accessModifier,
                String.valueOf(staticFlag),
                String.valueOf(abstractFlag),
                String.valueOf(asyncFlag)
            };
        }
    }

    // -----------------------------------------------------------------------
    // JsonArgsType 相当
    // -----------------------------------------------------------------------
    public static class JsonArgs {

        @JsonProperty("argName")
        public String argName;

        @JsonProperty("argType")
        public String argType;

        @JsonProperty("argDefaultValue")
        public String argDefaultValue;

        @JsonProperty("argOptional")
        public boolean argOptional;
    }

    // -----------------------------------------------------------------------
    // JsonMethodsType 相当
    // -----------------------------------------------------------------------
    public static class JsonMethods {

        @JsonProperty("methodName")
        public String methodName;

        @JsonProperty("role")
        public String role;

        @JsonProperty("accessModifier")
        public String accessModifier;

        @JsonProperty("staticFlag")
        public boolean staticFlag;

        @JsonProperty("abstractFlag")
        public boolean abstractFlag;

        /**
         * JavaにはJavaScript的な async はないが、
         * TS版との構造的対称性を保つためフィールドは残す。
         * JavaParser解析時は常に false をセットする。
         */
        @JsonProperty("asyncFlag")
        public boolean asyncFlag;

        @JsonProperty("decorators")
        public List<String> decorators;

        @JsonProperty("args")
        public List<JsonArgs> args;

        @JsonProperty("returnType")
        public String returnType;

        @JsonProperty("methodStartRow")
        public int methodStartRow;

        @JsonProperty("methodEndRow")
        public int methodEndRow;
    }

    // -----------------------------------------------------------------------
    // JsonAppLevelClassesType 相当
    // -----------------------------------------------------------------------
    public static class JsonAppLevelClasses {

        @JsonProperty("className")
        public String className;

        @JsonProperty("accessModifier")
        public List<String> accessModifier;

        @JsonProperty("staticFlag")
        public List<String> staticFlag;

        @JsonProperty("implements")
        public List<String> implementsList;

        @JsonProperty("decorators")
        public List<String> decorators;

        @JsonProperty("methodCount")
        public int methodCount;

        @JsonProperty("classStartRow")
        public int classStartRow;

        @JsonProperty("classEndRow")
        public int classEndRow;
    }

    // -----------------------------------------------------------------------
    // JsonAppLevelFilesType 相当
    // -----------------------------------------------------------------------
    public static class JsonAppLevelFiles {

        @JsonProperty("filePath")
        public String filePath;

        @JsonProperty("classes")
        public List<JsonAppLevelClasses> classes;

        @JsonProperty("imports")
        public List<String> imports;

        @JsonProperty("fileRowsCount")
        public int fileRowsCount;
    }

    // -----------------------------------------------------------------------
    // JsonAppLevelType 相当 --- アプリ全体サマリ
    // -----------------------------------------------------------------------
    public static class JsonAppLevel {

        @JsonProperty("appName")
        public String appName;

        @JsonProperty("language")
        public String language;

        @JsonProperty("directory")
        public String directory;

        @JsonProperty("summary")
        public Summary summary;

        @JsonProperty("files")
        public List<JsonAppLevelFiles> files;

        public static class Summary {

            @JsonProperty("totalFiles")
            public int totalFiles;

            @JsonProperty("totalClasses")
            public int totalClasses;

            @JsonProperty("totalMethods")
            public int totalMethods;

            /** Java版ではクラス外フリー関数は存在しないため常に0 */
            @JsonProperty("totalFuncs")
            public int totalFuncs;
        }
    }

    // -----------------------------------------------------------------------
    // JsonClassesType 相当
    // -----------------------------------------------------------------------
    public static class JsonClasses {

        @JsonProperty("classes")
        public ClassesInner classes;

        public static class ClassesInner {

            @JsonProperty("className")
            public String className;

            @JsonProperty("method")
            public List<JsonMethods> method;
        }
    }

    // -----------------------------------------------------------------------
    // JsonMethodLevelFilesType 相当
    // -----------------------------------------------------------------------
    public static class JsonMethodLevelFiles {

        @JsonProperty("filePath")
        public String filePath;

        @JsonProperty("classes")
        public List<JsonClasses> classes;
    }

    // -----------------------------------------------------------------------
    // JsonMethodLevelType 相当
    // -----------------------------------------------------------------------
    public static class JsonMethodLevel {

        @JsonProperty("directoryPath")
        public String directoryPath;

        @JsonProperty("files")
        public List<JsonMethodLevelFiles> files;
    }
}