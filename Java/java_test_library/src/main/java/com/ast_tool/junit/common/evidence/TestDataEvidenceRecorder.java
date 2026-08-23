package com.ast_tool.junit.common.evidence;

import com.ast_tool.junit.common.model.GeneratedValue;
import com.ast_tool.junit.common.model.TestDataInstruction;
import com.ast_tool.junit.common.model.TestDataMode;
import com.ast_tool.junit.common.model.ValueState;
import com.ast_tool.junit.common.util.CsvUtil;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;
import java.util.List;

public final class TestDataEvidenceRecorder {

    private static final List<String> HEADER = List.of(
            "CaseNo",
            "dataId",
            "targetId",
            "dataRole",
            "convModel",
            "mirrorX",
            "mirrorY",
            "mirrorZ",
            "validationMin",
            "validationMax",
            "nullable",
            "referenceType",
            "elementIndex",
            "valueState",
            "actualValue",
            "actualLength",
            "runMode"
    );

    private final Path output;

    public TestDataEvidenceRecorder(Path output) {
        this.output = output;
        ensureHeader();
    }

    public synchronized void record(
            TestDataInstruction instruction,
            GeneratedValue value,
            TestDataMode mode
    ) {
        record(instruction, -1, value, value.actualLength(), mode);
    }

    public synchronized void record(
            TestDataInstruction instruction,
            int elementIndex,
            GeneratedValue value,
            int actualLength,
            TestDataMode mode
    ) {
        if (elementIndex < -1) {
            throw new IllegalArgumentException("elementIndex must be -1 or greater");
        }
        CsvUtil.appendRow(output, List.of(
                instruction.caseNo(),
                instruction.dataId(),
                nullToEmpty(instruction.targetId()),
                instruction.dataRole().name(),
                instruction.convModel(),
                instruction.mirrorX(),
                instruction.mirrorY(),
                instruction.mirrorZ(),
                instruction.validationMin(),
                instruction.validationMax(),
                Boolean.toString(instruction.nullable()),
                instruction.referenceType(),
                Integer.toString(elementIndex),
                value.state().name(),
                value.serializedValue(),
                Integer.toString(actualLength),
                mode.name()
        ));
    }

    public synchronized void recordContainer(
            TestDataInstruction instruction,
            int elementIndex,
            ValueState state,
            int actualLength,
            TestDataMode mode
    ) {
        GeneratedValue value = switch (state) {
            case NULL -> GeneratedValue.nullValue();
            case EMPTY -> GeneratedValue.emptyValue();
            case VALUE -> GeneratedValue.value("");
            case NO_VALUE -> GeneratedValue.noValue();
        };
        record(instruction, elementIndex, value, actualLength, mode);
    }

    private void ensureHeader() {
        try {
            Path parent = output.toAbsolutePath().getParent();
            if (parent != null) {
                Files.createDirectories(parent);
            }
            if (!Files.exists(output) || Files.size(output) == 0) {
                Files.writeString(
                        output,
                        CsvUtil.toLine(HEADER) + System.lineSeparator(),
                        StandardCharsets.UTF_8,
                        StandardOpenOption.CREATE,
                        StandardOpenOption.TRUNCATE_EXISTING
                );
            }
        } catch (IOException e) {
            throw new IllegalStateException("Failed to initialize Evidence CSV: " + output, e);
        }
    }

    private static String nullToEmpty(String value) {
        return value == null ? "" : value;
    }
}
