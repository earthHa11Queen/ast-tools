package com.ast_tool;

import com.ast_tool.parser.JavaAstParser;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.io.File;

/**
 * main.ts の main() 関数をJavaへ変換したもの。
 *
 * TS版との対応：
 *   async function main() → public static void main(String[] args)
 *   await execParse()     → execParse()（JavaParserは同期APIのため await 不要）
 */
public class Main {

    public static void main(String[] args) {

        // config.jsonのパス（引数があれば使う、なければデフォルト）
        String configPath = args.length > 0 ? args[0] : "./config.json";

        try {
            ObjectMapper mapper = new ObjectMapper();
            AppConfig config = mapper.readValue(new File(configPath), AppConfig.class);

            // TS版: const result = await execParse();
            JavaAstParser parser = new JavaAstParser(config);
            boolean result = parser.execParse();

            // TS版: if (result) { ... } else { ... }
            if (result) {
                System.out.println("Success!!!!");
            } else {
                System.out.println("Error......");
            }

        } catch (Exception e) {
            System.err.println("Config読み込みエラー: " + e.getMessage());
            System.out.println("Error......");
        }
    }
}