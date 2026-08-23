package com.ast_tool.junit.common.model;

public record GeneratedValue(ValueState state, String serializedValue) {

    public static GeneratedValue nullValue() {
        return new GeneratedValue(ValueState.NULL, "");
    }

    public static GeneratedValue emptyValue() {
        return new GeneratedValue(ValueState.EMPTY, "");
    }

    public static GeneratedValue value(String value) {
        return new GeneratedValue(ValueState.VALUE, value == null ? "" : value);
    }

    public static GeneratedValue noValue() {
        return new GeneratedValue(ValueState.NO_VALUE, "");
    }

    public int actualLength() {
        if (state == ValueState.NULL || state == ValueState.NO_VALUE) {
            return -1;
        }
        return serializedValue.codePointCount(0, serializedValue.length());
    }
}
