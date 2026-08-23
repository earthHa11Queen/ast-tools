package com.ast_tool;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.io.IOException;
import java.nio.file.Path;
import java.nio.file.Paths;

/**
 * Java AST解析で使用する設定。
 *
 * トップディレクトリのconfig.jsonを読み込む。
 * このクラスで使用しないCleaner用の設定項目などは無視する。
 *
 * 相対パスは、実行時のカレントディレクトリではなく、
 * 読み込んだconfig.jsonの配置ディレクトリを基準に解決する。
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public class AppConfig {

    private String targetAppDir;
    private String targetAppName;
    private String outputDir;
    private String sourceFileCsvFilename;
    private String methodCsvFilename;
    private String fieldCsvFilename;

    /**
     * Configファイルを読み込む。
     *
     * @param configPath config.jsonのパス
     * @return 読み込みおよびパス解決済みの設定
     * @throws IOException Configの読み込みに失敗した場合
     */
    public static AppConfig load(String configPath) throws IOException {
        Path configFile = Paths.get(configPath)
                .toAbsolutePath()
                .normalize();

        ObjectMapper mapper = new ObjectMapper();
        AppConfig config = mapper.readValue(
                configFile.toFile(),
                AppConfig.class
        );

        Path configBaseDir = configFile.getParent();

        config.targetAppDir = resolve(
                configBaseDir,
                config.targetAppDir
        );

        config.outputDir = resolve(
                configBaseDir,
                config.outputDir
        );

        return config;
    }

    /**
     * 相対パスをConfig配置ディレクトリ基準で解決する。
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

    public String getTargetAppDir() {
        return targetAppDir;
    }

    public void setTargetAppDir(String targetAppDir) {
        this.targetAppDir = targetAppDir;
    }

    public String getTargetAppName() {
        return targetAppName;
    }

    public void setTargetAppName(String targetAppName) {
        this.targetAppName = targetAppName;
    }

    public String getOutputDir() {
        return outputDir;
    }

    public void setOutputDir(String outputDir) {
        this.outputDir = outputDir;
    }

    public String getSourceFileCsvFilename() {
        return sourceFileCsvFilename != null
                ? sourceFileCsvFilename
                : "ast_source_file_level.csv";
    }

    public void setSourceFileCsvFilename(String sourceFileCsvFilename) {
        this.sourceFileCsvFilename = sourceFileCsvFilename;
    }

    public String getMethodCsvFilename() {
        return methodCsvFilename != null
                ? methodCsvFilename
                : "ast_method_level.csv";
    }

    public void setMethodCsvFilename(String methodCsvFilename) {
        this.methodCsvFilename = methodCsvFilename;
    }

    public String getFieldCsvFilename() {
        return fieldCsvFilename != null
                ? fieldCsvFilename
                : "ast_field_level.csv";
    }

    public void setFieldCsvFilename(String fieldCsvFilename) {
        this.fieldCsvFilename = fieldCsvFilename;
    }
}