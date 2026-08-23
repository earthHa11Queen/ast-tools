package com.ast_tool.junit.common.model;

import java.util.List;
import java.util.Objects;

public record TestDataInstruction(
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
        String fixedValue,
        List<String> referenceValues
) {
    public TestDataInstruction {
        Objects.requireNonNull(caseNo, "caseNo");
        Objects.requireNonNull(dataId, "dataId");
        Objects.requireNonNull(dataRole, "dataRole");
        convModel = normalize(convModel);
        mirrorX = normalizeDash(mirrorX);
        mirrorY = normalizeDash(mirrorY);
        mirrorZ = normalizeDash(mirrorZ);
        validationMin = normalizeDash(validationMin);
        validationMax = normalizeDash(validationMax);
        referenceType = normalizeDash(referenceType);
        fixedValue = fixedValue == null ? "" : fixedValue;
        referenceValues = referenceValues == null ? List.of() : List.copyOf(referenceValues);
    }

    public TestDataKey key() {
        return new TestDataKey(caseNo, dataId);
    }

    private static String normalize(String value) {
        return value == null ? "" : value.trim();
    }

    private static String normalizeDash(String value) {
        if (value == null || value.isBlank()) {
            return "-";
        }
        return value.trim();
    }
}
