package com.ast_tool.junit.common;

import com.ast_tool.junit.common.container.ContainerFactory;
import com.ast_tool.junit.common.container.ContainerSizeResolver;
import com.ast_tool.junit.common.container.JavaReferenceTypeResolver;
import com.ast_tool.junit.common.converter.RuntimeValueConverter;
import com.ast_tool.junit.common.evidence.TestDataEvidenceRecorder;
import com.ast_tool.junit.common.generator.MirrorValueResolver;
import com.ast_tool.junit.common.model.GeneratedValue;
import com.ast_tool.junit.common.model.TestDataEvidence;
import com.ast_tool.junit.common.model.TestDataEvidenceKey;
import com.ast_tool.junit.common.model.TestDataInstruction;
import com.ast_tool.junit.common.model.TestDataKey;
import com.ast_tool.junit.common.model.TestDataMode;
import com.ast_tool.junit.common.model.ValueState;
import com.ast_tool.junit.common.reader.TestDataCsvReader;
import com.ast_tool.junit.common.reader.TestDataReplayReader;

import java.math.BigDecimal;
import java.nio.file.Path;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

public final class TestDataRuntime implements AutoCloseable {

    private final TestDataMode mode;
    private final Map<TestDataKey, TestDataInstruction> instructions;
    private final Map<TestDataEvidenceKey, TestDataEvidence> replay;
    private final MirrorValueResolver resolver;
    private final RuntimeValueConverter converter;
    private final TestDataEvidenceRecorder recorder;
    private final ContainerSizeResolver containerSizes;
    private final ContainerFactory containerFactory;
    private final JavaReferenceTypeResolver javaTypes;

    /**
     * Occurrence index is scoped by CaseNo + dataId.
     * Root/scalar direct getValue rows use -1; repeated child instances use 0..N.
     */
    private final Map<TestDataKey, Integer> occurrenceCounters = new LinkedHashMap<>();

    private TestDataRuntime(Builder builder) {
        this.mode = Objects.requireNonNull(builder.mode, "mode");
        this.instructions = new TestDataCsvReader().read(
                Objects.requireNonNull(builder.instructionCsv, "instructionCsv")
        );
        this.replay = mode == TestDataMode.REPLAY
                ? new TestDataReplayReader().read(
                        Objects.requireNonNull(builder.replayInputCsv, "replayInputCsv")
                )
                : Map.of();
        this.recorder = builder.evidenceOutputCsv == null
                ? null
                : new TestDataEvidenceRecorder(builder.evidenceOutputCsv);
        this.resolver = new MirrorValueResolver();
        this.converter = new RuntimeValueConverter();
        this.containerSizes = new ContainerSizeResolver();
        this.containerFactory = new ContainerFactory();
        this.javaTypes = new JavaReferenceTypeResolver();
    }

    public static Builder builder() {
        return new Builder();
    }

    public static TestDataRuntime fromSystemProperties() {
        String instruction = requiredProperty("testDataFile");
        String evidence = System.getProperty("testDataEvidenceFile");
        String replay = System.getProperty("testDataReplayFile");
        TestDataMode mode = TestDataMode.from(System.getProperty("testDataMode"));

        Builder builder = builder()
                .instructionCsv(Path.of(instruction))
                .mode(mode);

        if (evidence != null && !evidence.isBlank()) {
            builder.evidenceOutputCsv(Path.of(evidence));
        }
        if (replay != null && !replay.isBlank()) {
            builder.replayInputCsv(Path.of(replay));
        }

        return builder.build();
    }

    public <T> T getValue(String caseNo, String dataId, Class<T> type) {
        TestDataInstruction instruction = requireInstruction(caseNo, dataId);

        if (isContainer(instruction)) {
            Object generated = resolveContainer(instruction, -1);
            return containerFactory.cast(generated, type);
        }

        GeneratedValue generated = resolveScalar(instruction, -1, false, 0);
        return converter.convert(generated, type);
    }

    public TestDataInstruction getInstruction(String caseNo, String dataId) {
        return requireInstruction(caseNo, dataId);
    }

    public TestDataMode mode() {
        return mode;
    }

    private Object resolveContainer(TestDataInstruction instruction, int elementIndex) {
        ContainerState state = resolveContainerState(instruction, elementIndex);

        if (state.state == ValueState.NULL) {
            recordContainer(instruction, elementIndex, ValueState.NULL, -1);
            return null;
        }
        if (state.size == 0) {
            Object empty = createEmptyContainer(instruction);
            recordContainer(instruction, elementIndex, ValueState.EMPTY, 0);
            return empty;
        }

        Object result;
        String conv = instruction.convModel().toUpperCase();
        if ("MAP".equals(conv)) {
            result = resolveMap(instruction, state.size);
        } else if ("COLLECTION".equals(conv) || "ARRAY".equals(conv)) {
            result = resolveSequence(instruction, state.size);
        } else {
            throw new IllegalStateException("Unsupported container convModel: " + instruction.convModel());
        }

        recordContainer(instruction, elementIndex, ValueState.VALUE, state.size);
        return result;
    }

    private Object resolveSequence(TestDataInstruction root, int size) {
        TestDataInstruction child = requireInstruction(root.caseNo(), root.dataId() + "[]");
        List<Object> values = new ArrayList<>(size);
        boolean uniqueRequired = "ARRAY".equalsIgnoreCase(root.convModel())
                || isSetReference(root.referenceType());

        for (int i = 0; i < size; i++) {
            int childIndex = nextOccurrence(child.key());
            Object value = resolveChild(child, childIndex, uniqueRequired, i);
            values.add(value);
        }
        return containerFactory.createCollection(root.convModel(), root.referenceType(), values);
    }

    private Object resolveMap(TestDataInstruction root, int size) {
        TestDataInstruction keyInstruction = requireInstruction(root.caseNo(), root.dataId() + "{key}");
        TestDataInstruction valueInstruction = requireInstruction(root.caseNo(), root.dataId() + "{value}");

        List<Object> keys = new ArrayList<>(size);
        List<Object> values = new ArrayList<>(size);
        for (int i = 0; i < size; i++) {
            int keyIndex = nextOccurrence(keyInstruction.key());
            int valueIndex = nextOccurrence(valueInstruction.key());
            keys.add(resolveChild(keyInstruction, keyIndex, true, i));
            values.add(resolveChild(valueInstruction, valueIndex, false, i));
        }
        return containerFactory.createMap(keys, values);
    }

    private Object resolveChild(
            TestDataInstruction instruction,
            int elementIndex,
            boolean uniqueRequired,
            int siblingIndex
    ) {
        if (isContainer(instruction)) {
            if (uniqueRequired) {
                throw new IllegalStateException(
                        "Unique container/object child generation is not supported: " + instruction.key()
                );
            }
            return resolveContainer(instruction, elementIndex);
        }

        GeneratedValue generated = resolveScalar(
                instruction,
                elementIndex,
                uniqueRequired,
                siblingIndex
        );
        Class<?> type = javaTypes.resolveScalarClass(instruction.referenceType());
        return converter.convert(generated, type);
    }

    private GeneratedValue resolveScalar(
            TestDataInstruction instruction,
            int elementIndex,
            boolean uniqueRequired,
            int siblingIndex
    ) {
        GeneratedValue generated;
        int actualLength;

        if (mode == TestDataMode.REPLAY) {
            TestDataEvidence evidence = requireReplay(instruction, elementIndex);
            generated = evidence.generatedValue();
            actualLength = evidence.actualLength();
        } else {
            generated = resolver.resolve(instruction);
            if (uniqueRequired) {
                generated = makeUnique(instruction, generated, siblingIndex);
            }
            actualLength = generated.actualLength();
        }

        if (recorder != null) {
            recorder.record(instruction, elementIndex, generated, actualLength, mode);
        }
        return generated;
    }

    private ContainerState resolveContainerState(TestDataInstruction instruction, int elementIndex) {
        if (mode == TestDataMode.REPLAY) {
            TestDataEvidence evidence = requireReplay(instruction, elementIndex);
            return switch (evidence.valueState()) {
                case NULL -> new ContainerState(ValueState.NULL, -1);
                case EMPTY -> new ContainerState(ValueState.EMPTY, 0);
                case VALUE -> {
                    if (evidence.actualLength() < 0) {
                        throw new IllegalStateException(
                                "Replay container VALUE requires actualLength >= 0: " + evidence.key()
                        );
                    }
                    yield new ContainerState(ValueState.VALUE, evidence.actualLength());
                }
                case NO_VALUE -> throw new IllegalStateException(
                        "Container replay cannot use NO_VALUE: " + evidence.key()
                );
            };
        }

        int size = containerSizes.resolve(instruction);
        if (size == -1) {
            return new ContainerState(ValueState.NULL, -1);
        }
        return new ContainerState(size == 0 ? ValueState.EMPTY : ValueState.VALUE, size);
    }

    private Object createEmptyContainer(TestDataInstruction instruction) {
        String conv = instruction.convModel().toUpperCase();
        if ("MAP".equals(conv)) {
            return containerFactory.createMap(List.of(), List.of());
        }
        return containerFactory.createCollection(conv, instruction.referenceType(), List.of());
    }

    private TestDataEvidence requireReplay(TestDataInstruction instruction, int elementIndex) {
        TestDataEvidenceKey key = new TestDataEvidenceKey(
                instruction.caseNo(), instruction.dataId(), elementIndex
        );
        TestDataEvidence evidence = replay.get(key);
        if (evidence == null) {
            throw new IllegalStateException(
                    "Replay data not found. Generation fallback is forbidden: " + key
            );
        }
        return evidence;
    }

    private void recordContainer(
            TestDataInstruction instruction,
            int elementIndex,
            ValueState state,
            int actualLength
    ) {
        if (recorder != null) {
            recorder.recordContainer(instruction, elementIndex, state, actualLength, mode);
        }
    }

    private GeneratedValue makeUnique(
            TestDataInstruction instruction,
            GeneratedValue value,
            int siblingIndex
    ) {
        if (siblingIndex == 0 || value.state() != ValueState.VALUE) {
            return value;
        }

        String conv = instruction.convModel().toUpperCase();
        String raw = value.serializedValue();
        return switch (conv) {
            case "STRING" -> GeneratedValue.value(raw + "_" + siblingIndex);
            case "CHAR" -> GeneratedValue.value(String.valueOf((char) ('A' + siblingIndex)));
            case "NUMBER" -> GeneratedValue.value(
                    new BigDecimal(raw).add(BigDecimal.valueOf(siblingIndex)).stripTrailingZeros().toPlainString()
            );
            case "DECIMAL" -> GeneratedValue.value(
                    new BigDecimal(raw).add(BigDecimal.valueOf(siblingIndex)).stripTrailingZeros().toPlainString()
            );
            case "DATE" -> GeneratedValue.value(
                    LocalDate.parse(raw).plusDays(siblingIndex).toString()
            );
            case "DATETIME" -> GeneratedValue.value(
                    LocalDateTime.parse(raw).plusSeconds(siblingIndex).toString()
            );
            case "ENUM" -> uniqueEnum(instruction, siblingIndex);
            default -> throw new IllegalStateException(
                    "Cannot deterministically create unique value for convModel="
                            + instruction.convModel() + ": " + instruction.key()
            );
        };
    }

    private GeneratedValue uniqueEnum(TestDataInstruction instruction, int siblingIndex) {
        if (instruction.referenceValues().size() <= siblingIndex) {
            throw new IllegalStateException(
                    "Not enough unique ENUM referenceValues for container: " + instruction.key()
            );
        }
        return GeneratedValue.value(instruction.referenceValues().get(siblingIndex));
    }

    private int nextOccurrence(TestDataKey key) {
        int next = occurrenceCounters.getOrDefault(key, 0);
        occurrenceCounters.put(key, next + 1);
        return next;
    }

    private TestDataInstruction requireInstruction(String caseNo, String dataId) {
        TestDataKey key = new TestDataKey(caseNo, dataId);
        TestDataInstruction instruction = instructions.get(key);
        if (instruction == null) {
            throw new IllegalStateException("Instruction not found: " + key);
        }
        return instruction;
    }

    private static boolean isContainer(TestDataInstruction instruction) {
        String conv = instruction.convModel().toUpperCase();
        return "COLLECTION".equals(conv) || "ARRAY".equals(conv) || "MAP".equals(conv);
    }

    private static boolean isSetReference(String referenceType) {
        if (referenceType == null) {
            return false;
        }
        String raw = referenceType.trim();
        int generic = raw.indexOf('<');
        if (generic >= 0) {
            raw = raw.substring(0, generic);
        }
        int dot = raw.lastIndexOf('.');
        if (dot >= 0) {
            raw = raw.substring(dot + 1);
        }
        return raw.equals("Set") || raw.equals("HashSet") || raw.equals("LinkedHashSet");
    }

    @Override
    public void close() {
        // Recorder appends synchronously and owns no persistent stream.
    }

    private static String requiredProperty(String name) {
        String value = System.getProperty(name);
        if (value == null || value.isBlank()) {
            throw new IllegalStateException("Required system property is missing: " + name);
        }
        return value;
    }

    private record ContainerState(ValueState state, int size) {
    }

    public static final class Builder {
        private Path instructionCsv;
        private Path evidenceOutputCsv;
        private Path replayInputCsv;
        private TestDataMode mode = TestDataMode.GENERATE;

        private Builder() {
        }

        public Builder instructionCsv(Path value) {
            this.instructionCsv = value;
            return this;
        }

        public Builder evidenceOutputCsv(Path value) {
            this.evidenceOutputCsv = value;
            return this;
        }

        public Builder replayInputCsv(Path value) {
            this.replayInputCsv = value;
            return this;
        }

        public Builder mode(TestDataMode value) {
            this.mode = value;
            return this;
        }

        public TestDataRuntime build() {
            return new TestDataRuntime(this);
        }
    }
}
