package com.ast_tool.junit.common.generator;

public record MirrorId(String raw, String symbolicId) {

    public static MirrorId parse(String value) {
        if (value == null || value.isBlank() || "-".equals(value.trim())) {
            throw new IllegalArgumentException("Mirror ID is empty");
        }
        String raw = value.trim();
        int colon = raw.indexOf(':');
        String symbolic = colon >= 0 ? raw.substring(colon + 1) : raw;
        if (symbolic.isBlank()) {
            throw new IllegalArgumentException("Invalid Mirror ID: " + raw);
        }
        return new MirrorId(raw, symbolic);
    }
}
