package com.ast_tool;

import com.ast_tool.parser.JavaAstParser;

/**
 * Main
 * TS版 main.ts に対応するエントリーポイント。
 * 実行方法: java -jar xxx-with-dependencies.jar [config.jsonのパス]
 * 引数省略時は ./config.json を読み込む
 */
public class Main {

    public static void main(String[] args) {
        String configPath = args.length > 0 ? args[0] : "../config.json";

        AppConfig config;
        try {
            config = AppConfig.load(configPath);
        } catch (Exception e) {
            System.err.println("Config読み込みエラー: " + e.getMessage());
            System.out.println("Error......");
            return;
        }

        boolean result = new JavaAstParser(config).execParse();
        if (result) {
            System.out.println("Success!!!!");
        } else {
            System.out.println("Error......");
        }
    }
}
