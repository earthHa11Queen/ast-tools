package com.ast_tool.junit.common.model;

import java.util.Objects;

public record TestDataKey(String caseNo, String dataId) {
    public TestDataKey {
        Objects.requireNonNull(caseNo, "caseNo");
        Objects.requireNonNull(dataId, "dataId");
        if (caseNo.isBlank()) {
            throw new IllegalArgumentException("caseNo must not be blank");
        }
        if (dataId.isBlank()) {
            throw new IllegalArgumentException("dataId must not be blank");
        }
    }
}
