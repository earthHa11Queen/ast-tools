package com.ast_tool;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;

public class AppConfig {

    // config.json: "TargetAppDir"
    @JsonProperty("TargetAppDir")
    private String targetDir;

    // config.json: "DefaultOutputDir"
    @JsonProperty("DefaultOutputDir")
    private String outputDir;

    // config.json: "targetAppName"
    @JsonProperty("targetAppName")
    private String appName;

    // config.json: "encoding"
    @JsonProperty("encoding")
    private String encoding;

    // config.json: "csvFilename"
    @JsonProperty("csvFilename")
    private String csvFilename;

    // config.json: "jsonFilename"
    @JsonProperty("jsonFilename")
    private String jsonFilename;

    // config.json: "markdownFilename"
    @JsonProperty("markdownFilename")
    private String markdownFilename;

    // config.json: "extensions"
    // TS版の Config.EXTENSIONS 相当
    @JsonProperty("extensions")
    private List<String> extensions;

    // -----------------------------------------------------------------------
    // getter / setter
    // -----------------------------------------------------------------------
    public String getTargetDir()   { return targetDir; }
    public String getOutputDir()   { return outputDir; }
    public String getAppName()     { return appName; }
    public String getEncoding()    { return encoding != null ? encoding : "UTF-8"; }
    public List<String> getExtensions() { return extensions; }

    public String getCsvFilename() {
        return csvFilename != null ? csvFilename : "ast_result.csv";
    }
    public String getJsonFilename() {
        return jsonFilename != null ? jsonFilename : "ast_result.json";
    }
    public String getMarkdownFilename() {
        return markdownFilename != null ? markdownFilename : "ast_result.md";
    }

    public void setTargetDir(String v)        { this.targetDir = v; }
    public void setOutputDir(String v)        { this.outputDir = v; }
    public void setAppName(String v)          { this.appName = v; }
    public void setEncoding(String v)         { this.encoding = v; }
    public void setCsvFilename(String v)      { this.csvFilename = v; }
    public void setJsonFilename(String v)     { this.jsonFilename = v; }
    public void setMarkdownFilename(String v) { this.markdownFilename = v; }
    public void setExtensions(List<String> v) { this.extensions = v; }
}