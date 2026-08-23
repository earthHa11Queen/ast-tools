package com.ast_tool.junit.common.generator;

import com.ast_tool.junit.common.model.GeneratedValue;
import com.ast_tool.junit.common.model.TestDataInstruction;

import java.math.BigDecimal;
import java.math.RoundingMode;

public final class MirrorYValueGenerator {

    private final NormalValueGenerator normal = new NormalValueGenerator();

    public GeneratedValue generate(TestDataInstruction instruction, String mirrorId) {
        String id = MirrorId.parse(mirrorId).symbolicId();

        return switch (id) {
            case "length_null" -> GeneratedValue.nullValue();
            case "length_empty" -> GeneratedValue.emptyValue();
            case "length_min" -> boundary(instruction, Boundary.MIN);
            case "length_min_minus_1" -> boundary(instruction, Boundary.MIN_MINUS_ONE);
            case "length_max" -> boundary(instruction, Boundary.MAX);
            case "length_max_plus_1" -> boundary(instruction, Boundary.MAX_PLUS_ONE);
            case "length_normal_mid" -> middle(instruction);
            default -> throw new IllegalStateException("Unsupported Mirror Y ID: " + mirrorId);
        };
    }

    private GeneratedValue boundary(TestDataInstruction i, Boundary boundary) {
        String conv = i.convModel().toUpperCase();
        if ("STRING".equals(conv) || "CHAR".equals(conv)) {
            int length = switch (boundary) {
                case MIN -> requiredInt(i.validationMin(), "validationMin", i);
                case MIN_MINUS_ONE -> requiredInt(i.validationMin(), "validationMin", i) - 1;
                case MAX -> requiredInt(i.validationMax(), "validationMax", i);
                case MAX_PLUS_ONE -> requiredInt(i.validationMax(), "validationMax", i) + 1;
            };
            if (length < 0) {
                throw new IllegalStateException("Calculated string length is negative: " + i.key());
            }
            return GeneratedValue.value(repeat("A", length));
        }

        if ("NUMBER".equals(conv) || "DECIMAL".equals(conv)) {
            BigDecimal value = switch (boundary) {
                case MIN -> requiredDecimal(i.validationMin(), "validationMin", i);
                case MIN_MINUS_ONE -> requiredDecimal(i.validationMin(), "validationMin", i)
                        .subtract(BigDecimal.ONE);
                case MAX -> requiredDecimal(i.validationMax(), "validationMax", i);
                case MAX_PLUS_ONE -> requiredDecimal(i.validationMax(), "validationMax", i)
                        .add(BigDecimal.ONE);
            };
            return GeneratedValue.value(normalize(value));
        }

        throw new IllegalStateException(
                "Mirror Y boundary generation unsupported for convModel=" + i.convModel()
                        + ": " + i.key()
        );
    }

    private GeneratedValue middle(TestDataInstruction i) {
        String conv = i.convModel().toUpperCase();

        if ("STRING".equals(conv) || "CHAR".equals(conv)) {
            Integer min = optionalInt(i.validationMin());
            Integer max = optionalInt(i.validationMax());

            if (min == null && max == null) {
                return normal.generate(i);
            }

            int length;
            if (min != null && max != null) {
                length = min + Math.max(0, max - min) / 2;
            } else if (min != null) {
                length = Math.max(min, 1);
            } else {
                length = Math.max(0, max / 2);
            }
            return GeneratedValue.value(repeat("A", length));
        }

        if ("NUMBER".equals(conv) || "DECIMAL".equals(conv)) {
            BigDecimal min = optionalDecimal(i.validationMin());
            BigDecimal max = optionalDecimal(i.validationMax());

            if (min == null && max == null) {
                return normal.generate(i);
            }
            BigDecimal value;
            if (min != null && max != null) {
                value = min.add(max).divide(BigDecimal.valueOf(2), 16, RoundingMode.HALF_UP);
            } else if (min != null) {
                value = min;
            } else {
                value = max;
            }
            return GeneratedValue.value(normalize(value));
        }

        return normal.generate(i);
    }

    private static int requiredInt(String value, String name, TestDataInstruction i) {
        Integer parsed = optionalInt(value);
        if (parsed == null) {
            throw new IllegalStateException(name + " is required for " + i.key());
        }
        return parsed;
    }

    private static Integer optionalInt(String value) {
        if (isUndefined(value)) {
            return null;
        }
        try {
            int parsed = Integer.parseInt(value.trim());
            return parsed == -1 ? null : parsed;
        } catch (NumberFormatException e) {
            throw new IllegalStateException("Invalid integer constraint: " + value, e);
        }
    }

    private static BigDecimal requiredDecimal(String value, String name, TestDataInstruction i) {
        BigDecimal parsed = optionalDecimal(value);
        if (parsed == null) {
            throw new IllegalStateException(name + " is required for " + i.key());
        }
        return parsed;
    }

    private static BigDecimal optionalDecimal(String value) {
        if (isUndefined(value)) {
            return null;
        }
        try {
            BigDecimal parsed = new BigDecimal(value.trim());
            return parsed.compareTo(BigDecimal.valueOf(-1)) == 0 ? null : parsed;
        } catch (NumberFormatException e) {
            throw new IllegalStateException("Invalid decimal constraint: " + value, e);
        }
    }

    private static boolean isUndefined(String value) {
        return value == null || value.isBlank() || "-".equals(value.trim());
    }

    private static String repeat(String seed, int count) {
        return seed.repeat(count);
    }

    private static String normalize(BigDecimal value) {
        return value.stripTrailingZeros().toPlainString();
    }

    private enum Boundary {
        MIN,
        MIN_MINUS_ONE,
        MAX,
        MAX_PLUS_ONE
    }
}
