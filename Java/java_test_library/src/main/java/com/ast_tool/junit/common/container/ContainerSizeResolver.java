package com.ast_tool.junit.common.container;

import com.ast_tool.junit.common.generator.MirrorId;
import com.ast_tool.junit.common.model.TestDataInstruction;

/**
 * Resolves Collection / Array / Map size from Mirror Y or NORMAL policy.
 */
public final class ContainerSizeResolver {

    public static final int NORMAL_SIZE = 3;

    public int resolve(TestDataInstruction instruction) {
        String mirrorY = instruction.mirrorY();
        if (mirrorY == null || mirrorY.isBlank() || "-".equals(mirrorY.trim())) {
            return normalSize(instruction);
        }

        String id = MirrorId.parse(mirrorY).symbolicId();
        return switch (id) {
            case "length_null" -> -1;
            case "length_empty" -> 0;
            case "length_min" -> required(instruction.validationMin(), "validationMin", instruction);
            case "length_min_minus_1" -> checkedSize(
                    required(instruction.validationMin(), "validationMin", instruction) - 1,
                    instruction
            );
            case "length_max" -> required(instruction.validationMax(), "validationMax", instruction);
            case "length_max_plus_1" -> checkedSize(
                    required(instruction.validationMax(), "validationMax", instruction) + 1,
                    instruction
            );
            case "length_normal_mid" -> normalSize(instruction);
            default -> throw new IllegalStateException(
                    "Unsupported Mirror Y ID for container: " + mirrorY + ": " + instruction.key()
            );
        };
    }

    private int normalSize(TestDataInstruction instruction) {
        Integer min = optional(instruction.validationMin());
        Integer max = optional(instruction.validationMax());

        int size = NORMAL_SIZE;
        if (min != null && size < min) {
            size = min;
        }
        if (max != null && size > max) {
            size = max;
        }
        return checkedSize(size, instruction);
    }

    private static int required(String raw, String name, TestDataInstruction instruction) {
        Integer value = optional(raw);
        if (value == null) {
            throw new IllegalStateException(name + " is required for " + instruction.key());
        }
        return checkedSize(value, instruction);
    }

    private static Integer optional(String raw) {
        if (raw == null || raw.isBlank() || "-".equals(raw.trim()) || "-1".equals(raw.trim())) {
            return null;
        }
        try {
            return Integer.parseInt(raw.trim());
        } catch (NumberFormatException e) {
            throw new IllegalStateException("Invalid container size constraint: " + raw, e);
        }
    }

    private static int checkedSize(int size, TestDataInstruction instruction) {
        if (size < 0) {
            throw new IllegalStateException(
                    "Container size cannot be negative: " + size + ": " + instruction.key()
            );
        }
        return size;
    }
}
