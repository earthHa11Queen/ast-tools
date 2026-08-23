package com.ast_tool.junit.common.model;

public enum DataRole {
    TARGET,
    NORMAL,
    FIXED;

    public static DataRole from(String value) {
        if (value == null || value.isBlank() || "-".equals(value.trim())) {
            return NORMAL;
        }
        return DataRole.valueOf(value.trim().toUpperCase());
    }
}
