package com.ast_tool.junit.common.model;

import java.util.Objects;

/**
 * Evidence / Replay key.
 * elementIndex=-1 means that element numbering does not apply to the row.
 */
public record TestDataEvidenceKey(String caseNo, String dataId, int elementIndex) {
    public TestDataEvidenceKey {
        Objects.requireNonNull(caseNo, "caseNo");
        Objects.requireNonNull(dataId, "dataId");
        if (caseNo.isBlank()) {
            throw new IllegalArgumentException("caseNo must not be blank");
        }
        if (dataId.isBlank()) {
            throw new IllegalArgumentException("dataId must not be blank");
        }
        if (elementIndex < -1) {
            throw new IllegalArgumentException("elementIndex must be -1 or greater");
        }
    }
}
