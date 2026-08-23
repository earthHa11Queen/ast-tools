package com.ast_tool.cleaner;

public class Main {
    public static void main(String[] args) {
        String configPath = args.length > 0 ? args[0] : "../config.json";
        try {
            CleanerConfig config = CleanerConfig.load(configPath);
            boolean success = new JavaAstCleaner(config).execute();
            System.out.println(success ? "Success!!!!" : "Error......");
        } catch (Exception e) {
            System.err.println("Java AST Cleanerエラー: " + e.getMessage());
            e.printStackTrace(System.err);
            System.out.println("Error......");
        }
    }
}
