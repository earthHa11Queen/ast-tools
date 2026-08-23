package com.ast_tool.junit.common.reader;

import com.ast_tool.junit.common.model.DataRole;
import com.ast_tool.junit.common.model.TestDataEvidence;
import com.ast_tool.junit.common.model.TestDataEvidenceKey;
import com.ast_tool.junit.common.model.TestDataMode;
import com.ast_tool.junit.common.model.ValueState;
import com.ast_tool.junit.common.util.CsvUtil;

import java.nio.file.Path;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

public final class TestDataReplayReader {

    public Map<TestDataEvidenceKey, TestDataEvidence> read(Path path) {
        List<List<String>> rows = CsvUtil.read(path);
        if (rows.isEmpty()) {
            throw new IllegalStateException("Replay CSV is empty: " + path);
        }

        Map<String, Integer> header = header(rows.get(0));
        require(header,
                "CaseNo", "dataId", "targetId", "dataRole", "convModel",
                "mirrorX", "mirrorY", "mirrorZ",
                "validationMin", "validationMax", "nullable", "referenceType",
                "elementIndex", "valueState", "actualValue", "actualLength", "runMode");

        Map<TestDataEvidenceKey, TestDataEvidence> result = new LinkedHashMap<>();
        for (int i = 1; i < rows.size(); i++) {
            List<String> row = rows.get(i);
            if (row.stream().allMatch(v -> v == null || v.isBlank())) {
                continue;
            }

            TestDataEvidence evidence = new TestDataEvidence(
                    value(row, header, "CaseNo"),
                    value(row, header, "dataId"),
                    value(row, header, "targetId"),
                    DataRole.from(value(row, header, "dataRole")),
                    value(row, header, "convModel"),
                    value(row, header, "mirrorX"),
                    value(row, header, "mirrorY"),
                    value(row, header, "mirrorZ"),
                    value(row, header, "validationMin"),
                    value(row, header, "validationMax"),
                    parseBoolean(value(row, header, "nullable")),
                    value(row, header, "referenceType"),
                    Integer.parseInt(value(row, header, "elementIndex")),
                    ValueState.valueOf(value(row, header, "valueState").trim().toUpperCase()),
                    value(row, header, "actualValue"),
                    Integer.parseInt(value(row, header, "actualLength")),
                    TestDataMode.from(value(row, header, "runMode"))
            );

            TestDataEvidence previous = result.putIfAbsent(evidence.key(), evidence);
            if (previous != null) {
                throw new IllegalStateException("Duplicate replay key: " + evidence.key());
            }
        }
        return Map.copyOf(result);
    }

    private static Map<String, Integer> header(List<String> values) {
        Map<String, Integer> header = new HashMap<>();
        for (int i = 0; i < values.size(); i++) {
            header.put(values.get(i).trim(), i);
        }
        return header;
    }

    private static void require(Map<String, Integer> header, String... names) {
        for (String name : names) {
            if (!header.containsKey(name)) {
                throw new IllegalStateException("Missing replay CSV column: " + name);
            }
        }
    }

    private static String value(List<String> row, Map<String, Integer> header, String name) {
        int index = header.get(name);
        return index < row.size() ? row.get(index) : "";
    }

    private static boolean parseBoolean(String value) {
        String v = value == null ? "" : value.trim();
        return "1".equals(v)
                || "true".equalsIgnoreCase(v)
                || "yes".equalsIgnoreCase(v);
    }
}
