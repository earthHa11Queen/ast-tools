package com.ast_tool.output;

import com.ast_tool.AppConfig;
import com.ast_tool.model.MethodInfo;

import java.io.BufferedWriter;
import java.io.IOException;
import java.nio.charset.Charset;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.List;

/**
 * csv_output.ts の writeCsvFile() / createRowCsv() / escapeCsv() を
 * Javaへ変換したもの。
 *
 * TS版との対応：
 * fs.writeFileSync() → BufferedWriter（Charset指定）
 * Object.values(csvData[i]) → CsvRow.toStringArray()
 * async/await → 同期処理
 *
 * TS版の writeCsvFile は先頭行が CsvHeader オブジェクトかどうかで
 * startNum を 0/1 切り替えているが、Java版は CsvRow のリストだけを
 * 受け取る設計のため、ヘッダーは HEADER 定数から必ず生成する。
 * （TS版の if (csvData[0] == CsvHeader) 分岐に相当）
 *
 * --- 修正履歴（2026-07） ---
 * 【バグ修正2】文字コードが config.json の "encoding" 設定を無視し、
 * Charset.forName("MS932")（Shift_JIS）に決め打ちされていた。
 * config.getEncoding()（未指定時のデフォルトは "UTF-8"）から取得するよう修正した。
 * これによりJSON出力（Jackson、UTF-8固定）とCSV出力の文字コードが、
 * デフォルト設定において一致するようになる。
 * なお、MS932運用を引き続き行いたい場合は config.json の "encoding" に
 * "MS932" または "Shift_JIS" を指定すれば、従来通りの挙動になる。
 */
public class CsvOutput {

    // -----------------------------------------------------------------------
    // writeCsvFile() 相当
    // -----------------------------------------------------------------------
    public static void writeCsvFile(List<MethodInfo.CsvRow> csvData, AppConfig config)
            throws IOException {

        // TS版: Object.values(CsvHeader).join(',')
        String headerCsv = String.join(",",
                escapeAll(MethodInfo.CsvRow.HEADER));

        // TS版: rowCsv = await createRowCsv(csvData, 0)
        List<String> rowCsvLines = createRowCsv(csvData);

        // TS版: `${headerCsv}\n${rowCsv.join("\n")}`
        String csvContent = headerCsv + "\n" + String.join("\n", rowCsvLines);

        // 【バグ修正2】config.json の "encoding" 設定を反映する（従来は MS932 固定だった）
        Charset charset;
        try {
            charset = Charset.forName(config.getEncoding());
        } catch (Exception e) {
            System.err.println(
                    "指定されたencoding \"" + config.getEncoding() + "\" は不正なため、UTF-8を使用します: " + e.getMessage());
            charset = Charset.forName("UTF-8");
        }

        // 出力ディレクトリが存在しない場合は作成
        Path outputDir = Paths.get(config.getOutputDir());
        Files.createDirectories(outputDir);

        Path outputPath = outputDir.resolve(config.getCsvFilename());

        // TS版: fs.writeFileSync(path.join(Config.DEFAULT_OUTPUT_DIR,
        // Config.CSV_FILENAME), csvWriteData)
        try (BufferedWriter writer = Files.newBufferedWriter(outputPath, charset)) {
            writer.write(csvContent);
        }
    }

    // -----------------------------------------------------------------------
    // createRowCsv() 相当
    // TS版: startNum を 0 固定で呼ぶパターンに統一（Java版はヘッダー混入なし）
    // -----------------------------------------------------------------------
    public static List<String> createRowCsv(List<MethodInfo.CsvRow> csvData) {

        List<String> rowCsvLines = new ArrayList<>();

        for (MethodInfo.CsvRow row : csvData) {

            // TS版: Object.values(csvData[i]) → toStringArray()
            String[] values = row.toStringArray();

            List<String> escaped = new ArrayList<>();
            for (String v : values) {
                // TS版: await escapeCsv(e)
                escaped.add(escapeCsv(v));
            }

            // TS版: rowCsv.push(values) → カンマ結合して1行に
            rowCsvLines.add(String.join(",", escaped));
        }

        return rowCsvLines;
    }

    // -----------------------------------------------------------------------
    // escapeCsv() 相当
    // TS版: /[",\n\r]/.test(stringValue) → 正規表現でエスケープ要否判定
    // TS版: stringValue.replace('"', '""') → Javaでは replaceAll を使う
    // ※TS版は replace('"', '""') だが、これは最初の1文字しか置換しない
    // Javaでは全置換の replaceAll に修正（より正確な動作）
    // -----------------------------------------------------------------------
    public static String escapeCsv(String value) {

        if (value == null) {
            return "";
        }

        // TS版: const stringValue = String(jsonValue)
        String stringValue = value;

        // TS版: if (/[",\n\r]/.test(stringValue))
        if (stringValue.contains("\"") || stringValue.contains(",") || stringValue.contains("\n")
                || stringValue.contains("\r")) {

            // TS版: stringValue.replace('"', '""')
            // TS版はString.replaceだが第1引数がcharのため最初の1文字のみ置換。
            // Javaでは意図通り全置換になるよう replaceAll を使う。
            String escaped = stringValue.replaceAll("\"", "\"\"");
            return "\"" + escaped + "\"";
        }

        return stringValue;
    }

    // -----------------------------------------------------------------------
    // ヘッダー配列のエスケープ（内部ユーティリティ）
    // -----------------------------------------------------------------------
    private static List<String> escapeAll(String[] values) {
        List<String> result = new ArrayList<>();
        for (String v : values) {
            result.add(escapeCsv(v));
        }
        return result;
    }
}