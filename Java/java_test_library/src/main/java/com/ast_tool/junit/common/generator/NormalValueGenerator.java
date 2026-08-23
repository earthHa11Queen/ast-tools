package com.ast_tool.junit.common.generator;

import com.ast_tool.junit.common.model.GeneratedValue;
import com.ast_tool.junit.common.model.TestDataInstruction;

public final class NormalValueGenerator {

    public GeneratedValue generate(TestDataInstruction instruction) {
        String conv = instruction.convModel().toUpperCase();
        return switch (conv) {
            case "STRING" -> GeneratedValue.value("test");
            case "CHAR" -> GeneratedValue.value("A");
            case "NUMBER" -> GeneratedValue.value("1");
            case "DECIMAL" -> GeneratedValue.value("1.0");
            case "BOOLEAN" -> GeneratedValue.value("true");
            case "DATE" -> GeneratedValue.value("2000-01-01");
            case "DATETIME" -> GeneratedValue.value("2000-01-01T00:00:00");
            case "ENUM" -> enumNormal(instruction);
            case "-", "" -> GeneratedValue.noValue();
            default -> throw new IllegalStateException(
                    "Normal generation is unsupported for convModel=" + instruction.convModel()
                            + ". Project DTO/Object construction must stay outside Runtime Common."
            );
        };
    }

    private GeneratedValue enumNormal(TestDataInstruction instruction) {
        if (!instruction.referenceValues().isEmpty()) {
            return GeneratedValue.value(instruction.referenceValues().get(0));
        }
        if (!instruction.fixedValue().isEmpty()) {
            return GeneratedValue.value(instruction.fixedValue());
        }
        throw new IllegalStateException(
                "ENUM normal value requires referenceValues or fixedValue: " + instruction.key()
        );
    }
}
