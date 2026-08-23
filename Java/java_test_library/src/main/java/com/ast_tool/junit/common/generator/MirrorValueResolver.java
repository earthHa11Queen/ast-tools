package com.ast_tool.junit.common.generator;

import com.ast_tool.junit.common.model.DataRole;
import com.ast_tool.junit.common.model.GeneratedValue;
import com.ast_tool.junit.common.model.TestDataInstruction;

public final class MirrorValueResolver {

    private final MirrorXValueGenerator x = new MirrorXValueGenerator();
    private final MirrorYValueGenerator y = new MirrorYValueGenerator();
    private final MirrorZValueGenerator z = new MirrorZValueGenerator();
    private final NormalValueGenerator normal = new NormalValueGenerator();

    public GeneratedValue resolve(TestDataInstruction instruction) {
        if (instruction.dataRole() == DataRole.FIXED) {
            return GeneratedValue.value(instruction.fixedValue());
        }

        boolean hasX = hasMirror(instruction.mirrorX());
        boolean hasY = hasMirror(instruction.mirrorY());
        boolean hasZ = hasMirror(instruction.mirrorZ());
        int count = (hasX ? 1 : 0) + (hasY ? 1 : 0) + (hasZ ? 1 : 0);

        if (count > 1) {
            throw new IllegalStateException(
                    "Multiple Mirror axes are not supported by the current contract: "
                            + instruction.key()
            );
        }

        if (hasX) {
            return x.generate(instruction, instruction.mirrorX());
        }
        if (hasY) {
            return y.generate(instruction, instruction.mirrorY());
        }
        if (hasZ) {
            return z.generate(instruction, instruction.mirrorZ());
        }

        return normal.generate(instruction);
    }

    private static boolean hasMirror(String value) {
        return value != null && !value.isBlank() && !"-".equals(value.trim());
    }
}
