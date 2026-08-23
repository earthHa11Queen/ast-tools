package com.ast_tool.junit.common.container;

import java.math.BigDecimal;
import java.math.BigInteger;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZonedDateTime;
import java.util.UUID;

/** Java-only resolver for the common Instruction referenceType contract. */
public final class JavaReferenceTypeResolver {

    public Class<?> resolveScalarClass(String referenceType) {
        String raw = rawType(referenceType);
        return switch (raw) {
            case "String", "java.lang.String" -> String.class;
            case "char" -> char.class;
            case "Character", "java.lang.Character" -> Character.class;
            case "int" -> int.class;
            case "Integer", "java.lang.Integer" -> Integer.class;
            case "long" -> long.class;
            case "Long", "java.lang.Long" -> Long.class;
            case "short" -> short.class;
            case "Short", "java.lang.Short" -> Short.class;
            case "byte" -> byte.class;
            case "Byte", "java.lang.Byte" -> Byte.class;
            case "double" -> double.class;
            case "Double", "java.lang.Double" -> Double.class;
            case "float" -> float.class;
            case "Float", "java.lang.Float" -> Float.class;
            case "boolean" -> boolean.class;
            case "Boolean", "java.lang.Boolean" -> Boolean.class;
            case "BigDecimal", "java.math.BigDecimal" -> BigDecimal.class;
            case "BigInteger", "java.math.BigInteger" -> BigInteger.class;
            case "LocalDate", "java.time.LocalDate" -> LocalDate.class;
            case "LocalDateTime", "java.time.LocalDateTime" -> LocalDateTime.class;
            case "OffsetDateTime", "java.time.OffsetDateTime" -> OffsetDateTime.class;
            case "ZonedDateTime", "java.time.ZonedDateTime" -> ZonedDateTime.class;
            case "UUID", "java.util.UUID" -> UUID.class;
            default -> load(raw);
        };
    }

    public String rawType(String referenceType) {
        if (referenceType == null) {
            return "";
        }
        String value = referenceType.trim();
        int generic = value.indexOf('<');
        if (generic >= 0) {
            value = value.substring(0, generic).trim();
        }
        return value;
    }

    public boolean isJavaArray(String referenceType) {
        return referenceType != null && referenceType.trim().endsWith("[]");
    }

    public Class<?> arrayComponentClass(String referenceType) {
        if (!isJavaArray(referenceType)) {
            throw new IllegalArgumentException("Not a Java array referenceType: " + referenceType);
        }
        String component = referenceType.trim().substring(0, referenceType.trim().length() - 2).trim();
        return resolveScalarClass(component);
    }

    private static Class<?> load(String name) {
        if (name == null || name.isBlank() || "-".equals(name)) {
            throw new IllegalStateException("referenceType is not resolvable: " + name);
        }
        try {
            return Class.forName(name);
        } catch (ClassNotFoundException first) {
            try {
                return Class.forName("java.lang." + name);
            } catch (ClassNotFoundException second) {
                throw new IllegalStateException("Java type cannot be resolved: " + name, first);
            }
        }
    }
}
