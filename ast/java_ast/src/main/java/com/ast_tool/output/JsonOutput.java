package com.ast_tool.output;

import com.ast_tool.AppConfig;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

/**
 * json_output.ts の writeJsonFile() をJavaへ変換したもの。
 *
 * TS版との対応：
 *   JSON.stringify(jsonData, null, 2)  → ObjectMapper（インデント有り）
 *   fs.writeFileSync(path, value)      → Files.writeString()
 *   fileName == ""                     → fileName が null または空文字
 *   encoding: "utf-8"                  → StandardCharsets.UTF_8
 *
 * TS版の writeJsonFile は引数が2パターンある：
 *   1. writeJsonFile(jsonData)              → アプリレベルJSON（固定ファイル名）
 *   2. writeJsonFile(jsonData, fileName)    → メソッドレベルJSON（動的ファイル名）
 * Javaではオーバーロードで表現する。
 */
public class JsonOutput {

    private static final ObjectMapper MAPPER = new ObjectMapper()
            .enable(SerializationFeature.INDENT_OUTPUT);

    // -----------------------------------------------------------------------
    // writeJsonFile(jsonData) 相当
    // TS版: writeJsonFile(jsonAppLevelType) ← 引数1つ＝固定ファイル名
    // -----------------------------------------------------------------------
    public static boolean writeJsonFile(Object jsonData, AppConfig config) {
        return writeJsonFile(jsonData, "", config);
    }

    // -----------------------------------------------------------------------
    // writeJsonFile(jsonData, fileName) 相当
    // TS版: writeJsonFile(jsonMethodLevelType, `ast_MethodLevel_....json`)
    // -----------------------------------------------------------------------
    public static boolean writeJsonFile(Object jsonData, String fileName, AppConfig config) {
        try {
            // TS版: if (fileName == "") { jsonFileName = Config.JSON_FILENAME; }
            String jsonFileName = (fileName == null || fileName.isEmpty())
                    ? config.getJsonFilename()
                    : fileName;

            // 出力ディレクトリが存在しない場合は作成
            Path outputDir = Paths.get(config.getOutputDir());
            Files.createDirectories(outputDir);

            // TS版: fs.writeFileSync(path.join(Config.DEFAULT_OUTPUT_DIR, jsonFileName), jsonValue)
            File outputFile = outputDir.resolve(jsonFileName).toFile();

            // TS版: JSON.stringify(jsonData, null, 2) → INDENT_OUTPUT で同等
            MAPPER.writeValue(outputFile, jsonData);

            return true;

        } catch (IOException e) {
            System.err.println("JSON出力エラー: " + e.getMessage());
            return false;
        }
    }
}