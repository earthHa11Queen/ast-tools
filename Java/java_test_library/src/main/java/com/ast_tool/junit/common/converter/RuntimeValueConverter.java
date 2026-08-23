package com.ast_tool.junit.common.converter;

import com.ast_tool.junit.common.model.GeneratedValue;
import com.ast_tool.junit.common.model.ValueState;

import java.math.BigDecimal;
import java.math.BigInteger;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZonedDateTime;
import java.util.UUID;

public final class RuntimeValueConverter {

    @SuppressWarnings({"unchecked", "rawtypes"})
    public <T> T convert(GeneratedValue generated, Class<T> type) {
        if (generated.state() == ValueState.NULL || generated.state() == ValueState.NO_VALUE) {
            return null;
        }

        String value = generated.serializedValue();

        Object converted;
        if (type == String.class || type == Object.class) {
            converted = value;
        } else if (type == Character.class || type == char.class) {
            if (value.codePointCount(0, value.length()) != 1) {
                throw new IllegalStateException("Cannot convert to char: " + value);
            }
            converted = value.charAt(0);
        } else if (type == Integer.class || type == int.class) {
            converted = Integer.valueOf(value);
        } else if (type == Long.class || type == long.class) {
            converted = Long.valueOf(value);
        } else if (type == Short.class || type == short.class) {
            converted = Short.valueOf(value);
        } else if (type == Byte.class || type == byte.class) {
            converted = Byte.valueOf(value);
        } else if (type == Double.class || type == double.class) {
            converted = Double.valueOf(value);
        } else if (type == Float.class || type == float.class) {
            converted = Float.valueOf(value);
        } else if (type == BigDecimal.class) {
            converted = new BigDecimal(value);
        } else if (type == BigInteger.class) {
            converted = new BigInteger(value);
        } else if (type == Boolean.class || type == boolean.class) {
            converted = Boolean.valueOf(value);
        } else if (type == LocalDate.class) {
            converted = LocalDate.parse(value);
        } else if (type == LocalDateTime.class) {
            converted = LocalDateTime.parse(value);
        } else if (type == OffsetDateTime.class) {
            converted = OffsetDateTime.parse(value);
        } else if (type == ZonedDateTime.class) {
            converted = ZonedDateTime.parse(value);
        } else if (type == UUID.class) {
            converted = UUID.fromString(value);
        } else if (type.isEnum()) {
            converted = Enum.valueOf((Class<? extends Enum>) type.asSubclass(Enum.class), value);
        } else {
            throw new IllegalStateException(
                    "Project-specific Object conversion is not supported: " + type.getName()
            );
        }

        return (T) converted;
    }
}
