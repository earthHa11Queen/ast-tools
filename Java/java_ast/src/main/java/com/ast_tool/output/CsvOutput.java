package com.ast_tool.output;

import com.ast_tool.AppConfig;
import com.ast_tool.model.MethodInfo;

import java.io.BufferedWriter;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.stream.Collectors;

/**
 * CsvOutput
 * TS版 csv_output.ts の Java移植版。
 * ソースファイルレベルCSV・メソッドレベルCSVの2種類のみを出力する。
 * JSON出力は行わない（JSON全廃に伴い、JsonOutput.java相当のクラスは作成していない）。
 *
 * BOM無しUTF-8で固定出力する（Excelでの文字化け防止。TS版のwriteFile()と同じ対応）。
 * v1のJavaで発生した「config.jsonのencoding設定を無視してMS932固定になっていた」不具合の
 * 反省を踏まえ、v2では設定項目自体を設けず、実装を1本化した。
 */
public class CsvOutput {

    public void writeSourceFileCsv(List<MethodInfo.SourceFileRow> rows, AppConfig config) throws IOException {
        String headerLine = String.join(",", escapeAll(MethodInfo.SOURCE_FILE_ROW_HEADER));

        List<String> lines = rows.stream().map(r -> String.join(",",
                escapeCsv(r.appName),
                escapeCsv(r.fileName),
                escapeCsv(r.directoryPath),
                escapeCsv(r.className),
                escapeCsv(r.importList),
                escapeCsv(String.valueOf(r.lineCount)),
                escapeCsv(String.valueOf(r.methodCount)),
                escapeCsv(String.valueOf(r.variableCount)),
                escapeCsv(String.valueOf(r.constantCount)))).collect(Collectors.toList());

        writeFile(config.getSourceFileCsvFilename(), headerLine + "\n" + String.join("\n", lines), config);
    }

    public void writeMethodCsv(List<MethodInfo.MethodRow> rows, AppConfig config) throws IOException {
        List<String> header = MethodInfo.buildMethodRowHeader();
        String headerLine = String.join(",", escapeAll(header.toArray(new String[0])));

        List<String> lines = rows.stream().map(r -> {
            StringBuilder sb = new StringBuilder();
            sb.append(escapeCsv(r.filePath)).append(",");
            sb.append(escapeCsv(r.className)).append(",");
            sb.append(escapeCsv(r.methodName));
            for (int i = 0; i < MethodInfo.MAX_NEST_DEPTH; i++) {
                sb.append(",").append(escapeCsv(String.valueOf(r.processCoords[i])));
            }
            sb.append(",").append(escapeCsv(r.processContent));
            sb.append(",").append(escapeCsv(r.role));
            sb.append(",").append(escapeCsv(r.returnType));
            sb.append(",").append(escapeCsv(r.methodType));
            sb.append(",").append(escapeCsv(r.accessModifier));
            for (int i = 0; i < MethodInfo.MAX_ARG_COLUMNS; i++) {
                String arg = (i < r.args.length && r.args[i] != null) ? r.args[i] : MethodInfo.HYPHEN;
                sb.append(",").append(escapeCsv(arg));
            }
            return sb.toString();
        }).collect(Collectors.toList());

        writeFile(config.getMethodCsvFilename(), headerLine + "\n" + String.join("\n", lines), config);
    }

    // 【新規】フィールドレベルCSV（3つ目のCSV）の出力
    public void writeFieldCsv(List<MethodInfo.FieldRow> rows, AppConfig config) throws IOException {
        String headerLine = String.join(",", escapeAll(MethodInfo.FIELD_ROW_HEADER));

        List<String> lines = rows.stream().map(r -> String.join(",",
                escapeCsv(r.filePath),
                escapeCsv(r.className),
                escapeCsv(r.methodName == null ? "" : r.methodName),
                escapeCsv(r.fieldKind),
                escapeCsv(r.fieldName),
                escapeCsv(r.fieldType),
                escapeCsv(r.isFinal ? "1" : "0"),
                escapeCsv(String.valueOf(r.validationMin)),
                escapeCsv(String.valueOf(r.validationMax)),
                escapeCsv(String.valueOf(r.nullable)),
                escapeCsv(r.rawAnnotations))).collect(Collectors.toList());

        writeFile(config.getFieldCsvFilename(), headerLine + "\n" + String.join("\n", lines), config);
    }

    private void writeFile(String filename, String content, AppConfig config) throws IOException {
        Path outputDir = Paths.get(config.getOutputDir());
        Files.createDirectories(outputDir);
        Path outputPath = outputDir.resolve(filename);

        try (BufferedWriter writer = Files.newBufferedWriter(outputPath, StandardCharsets.UTF_8)) {
            writer.write(content);
        }
        long lineCount = content.chars().filter(c -> c == '\n').count() + 1;
        System.out.println(filename + ": " + lineCount + "行");
    }

    // escapeCsv: ダブルクォートは全置換（tsjs側で修正済みの挙動を踏襲）
    public static String escapeCsv(String value) {
        if (value == null)
            return "";
        if (value.contains("\"") || value.contains(",") || value.contains("\n") || value.contains("\r")) {
            return "\"" + value.replace("\"", "\"\"") + "\"";
        }
        return value;
    }

    private String[] escapeAll(String[] values) {
        String[] result = new String[values.length];
        for (int i = 0; i < values.length; i++) {
            result[i] = escapeCsv(values[i]);
        }
        return result;
    }
}
