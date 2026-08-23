package com.ast_tool.junit.common.model;

public enum TestDataMode {
    GENERATE,
    REPLAY;

    public static TestDataMode from(String value) {
        if (value == null || value.isBlank()) {
            return GENERATE;
        }
        return TestDataMode.valueOf(value.trim().toUpperCase());
    }
}
