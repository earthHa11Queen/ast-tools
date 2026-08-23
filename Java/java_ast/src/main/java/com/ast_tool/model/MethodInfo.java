package com.ast_tool.model;

import java.util.ArrayList;
import java.util.List;

/**
 * MethodInfo
 * TS版 method_info.ts の Java移植版。
 * JSON系のモデル（v1のJsonAppLevelType等）は廃止し、
 * 2種類のCSV行（ソースファイルレベル・メソッドレベル）に対応するモデルのみを定義する。
 */
public class MethodInfo {

    public static final int MAX_NEST_DEPTH = 9;
    public static final int MAX_ARG_COLUMNS = 20;
    public static final String ARGUMENT_ROW_CONTENT = "引数";
    public static final String NO_ROLE_TEXT = "記載なし";
    public static final String HYPHEN = "-";

    // ソースファイルレベルCSVの1行
    // 1ファイルにつき「クラス外(-)行」が必ず1行、加えてクラス数分の行が追加される
    public static class SourceFileRow {
        public String appName;
        public String fileName;
        public String directoryPath;
        public String className; // クラスが無い/クラス外の場合は "-"
        public String importList; // クラス外(-)行にのみ実際の値。クラス行では "-"
        public int lineCount; // クラス外(-)行にのみ実際の値。クラス行では -1 固定
        public int methodCount; // その行が表すスコープ内のメソッド数
        public int variableCount; // その行が表すスコープ内の変数の数
        public int constantCount; // その行が表すスコープ内の定数の数
    }

    public static final String[] SOURCE_FILE_ROW_HEADER = {
            "appName", "fileName", "directoryPath", "className", "importList",
            "lineCount", "methodCount", "variableCount", "constantCount"
    };

    // メソッドレベルCSVの1行
    // 1メソッド/コンストラクタにつき、制御構造の処理単位ごとに1行＋引数専用行が1行
    public static class MethodRow {
        public String filePath;
        public String className; // クラスが無ければ拡張子付きファイル名
        public String methodName;
        public int[] processCoords; // 長さ9固定 [処理1, 処理2, ..., 処理9]
        public String processContent; // 引数専用行では固定文字列「引数」
        public String role; // なければ「記載なし」
        public String returnType;
        public String methodType; // 例: "静的+抽象"。該当なしは "-"
        public String accessModifier; // 修飾子そのまま。なければ "-"
        public String[] args; // 長さ20固定。空きは "-"
    }

    public static List<String> buildMethodRowHeader() {
        List<String> header = new ArrayList<>();
        header.add("filePath");
        header.add("className");
        header.add("methodName");
        for (int i = 1; i <= MAX_NEST_DEPTH; i++) {
            header.add("process" + i);
        }
        header.add("processContent");
        header.add("role");
        header.add("returnType");
        header.add("methodType");
        header.add("accessModifier");
        for (int i = 1; i <= MAX_ARG_COLUMNS; i++) {
            header.add("arg" + i);
        }
        return header;
    }

    // ===================================================
    // フィールドレベルCSVの1行（3つ目のCSV）
    // クラスのフィールド（fieldKind="field"）と、メソッド/コンストラクタの
    // 引数（fieldKind="parameter"）の両方を、同じ構造で扱う。
    //
    // センチネル値の方針：
    // validationMin / validationMax = -1 … 該当する検証アノテーション/デコレータなし
    // nullable = -1 … NotNull系の有無を判定できるアノテーション自体が見つからなかった
    // 0: 明示的にnullable不可、1: 明示的にnullable可
    // ===================================================
    public static class FieldRow {
        public String filePath;
        public String className;
        public String methodName; // fieldKind="field"の場合はnull
        public String fieldKind; // "field" or "parameter"
        public String fieldName;
        public String fieldType;
        public boolean isFinal;
        public int validationMin; // -1: 該当なし
        public int validationMax; // -1: 該当なし
        public int nullable; // -1: 判定不能 / 0: NotNull系あり / 1: 明示的にnullable
        public String rawAnnotations; // 付与されている全アノテーションの生テキスト。無ければ "-"
    }

    public static final String[] FIELD_ROW_HEADER = {
            "filePath", "className", "methodName", "fieldKind", "fieldName", "fieldType",
            "isFinal", "validationMin", "validationMax", "nullable", "rawAnnotations"
    };
}
