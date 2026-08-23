package com.ast_tool.cleaner;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.nio.file.Path;
import java.nio.file.Paths;

/**
 * Java AST Cleanerで使用する設定。
 *
 * トップディレクトリのconfig.jsonを読み込む。
 * このクラスで使用しないAST解析用の設定項目などは無視する。
 *
 * outputDirとlangDataModelsCsvは、config.jsonの配置ディレクトリを
 * 基準に解決する。
 *
 * sourceFileCsv、methodCsv、fieldCsvは、AST解析結果を読み込むため、
 * 解決済みのoutputDirを基準に解決する。
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public class CleanerConfig {

    public String sourceFileCsv;
    public String methodCsv;
    public String fieldCsv;
    public String langDataModelsCsv;
    public String language = "java";
    public String outputDir;

    /**
     * Configファイルを読み込み、各パスを解決する。
     *
     * @param configPath config.jsonのパス
     * @return 読み込みおよびパス解決済みの設定
     * @throws Exception Configの読み込みまたはパス解決に失敗した場合
     */
    public static CleanerConfig load(String configPath) throws Exception {
        Path configFile = Paths.get(configPath)
                .toAbsolutePath()
                .normalize();

        ObjectMapper mapper = new ObjectMapper();
        CleanerConfig config = mapper.readValue(
                configFile.toFile(),
                CleanerConfig.class
        );

        Path configBaseDir = configFile.getParent();

        /*
         * ASTとCleanerが共用する出力ディレクトリ。
         * config.jsonの配置ディレクトリを基準に解決する。
         */
        config.outputDir = resolve(
                configBaseDir,
                config.outputDir
        );

        /*
         * ASTがoutputDirへ生成した3つのCSVを、
         * Cleanerの入力ファイルとして解決する。
         */
        Path outputBaseDir = Paths.get(config.outputDir);

        config.sourceFileCsv = resolve(
                outputBaseDir,
                config.sourceFileCsv
        );

        config.methodCsv = resolve(
                outputBaseDir,
                config.methodCsv
        );

        config.fieldCsv = resolve(
                outputBaseDir,
                config.fieldCsv
        );

        /*
         * 言語データモデルCSVはoutputDir内の生成物ではないため、
         * config.jsonの配置ディレクトリを基準に解決する。
         */
        config.langDataModelsCsv = resolve(
                configBaseDir,
                config.langDataModelsCsv
        );

        return config;
    }

    /**
     * 指定されたパスを基準ディレクトリから解決する。
     * 絶対パスの場合は正規化のみを行う。
     */
    private static String resolve(Path baseDir, String value) {
        if (value == null || value.isBlank()) {
            return value;
        }

        Path path = Paths.get(value);

        if (path.isAbsolute()) {
            return path.normalize().toString();
        }

        return baseDir.resolve(path)
                .normalize()
                .toString();
    }
}