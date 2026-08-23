package com.ast_tool.junit.common.generator;

import com.ast_tool.junit.common.model.GeneratedValue;
import com.ast_tool.junit.common.model.TestDataInstruction;

public final class MirrorXValueGenerator {

    public GeneratedValue generate(TestDataInstruction instruction, String mirrorId) {
        String id = MirrorId.parse(mirrorId).symbolicId();

        return switch (id) {
            // Current V4 confirmed X IDs.
            case "fw_alphanum" -> GeneratedValue.value("ＡＢＣ１２３");
            case "fw_kanji_common" -> GeneratedValue.value("日本語");
            case "hw_alphanum" -> GeneratedValue.value("AbC123");
            case "hw_symbol" -> GeneratedValue.value("!@#$%");
            case "hw_integer" -> GeneratedValue.value("123");
            case "hw_datetime" -> GeneratedValue.value("2000-01-01T00:00:00");

            // V3 compatibility.
            case "full_width" -> GeneratedValue.value("Ａ");
            case "half_width" -> GeneratedValue.value("A");

            default -> throw new IllegalStateException(
                    "Unsupported Mirror X ID: " + mirrorId
            );
        };
    }
}
