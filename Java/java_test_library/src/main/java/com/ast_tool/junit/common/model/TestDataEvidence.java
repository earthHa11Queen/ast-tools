package com.ast_tool.junit.common.model;

public record TestDataEvidence(
        String caseNo,
        String dataId,
        String targetId,
        DataRole dataRole,
        String convModel,
        String mirrorX,
        String mirrorY,
        String mirrorZ,
        String validationMin,
        String validationMax,
        boolean nullable,
        String referenceType,
        int elementIndex,
        ValueState valueState,
        String actualValue,
        int actualLength,
        TestDataMode runMode
) {
    public TestDataEvidenceKey key() {
        return new TestDataEvidenceKey(caseNo, dataId, elementIndex);
    }

    public GeneratedValue generatedValue() {
        return switch (valueState) {
            case NULL -> GeneratedValue.nullValue();
            case EMPTY -> GeneratedValue.emptyValue();
            case VALUE -> GeneratedValue.value(actualValue);
            case NO_VALUE -> GeneratedValue.noValue();
        };
    }
}
