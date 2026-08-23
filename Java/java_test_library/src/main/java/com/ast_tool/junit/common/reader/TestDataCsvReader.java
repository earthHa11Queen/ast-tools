package com.ast_tool.junit.common.reader;

import com.ast_tool.junit.common.model.DataRole;
import com.ast_tool.junit.common.model.TestDataInstruction;
import com.ast_tool.junit.common.model.TestDataKey;
import com.ast_tool.junit.common.util.CsvUtil;

import java.nio.file.Path;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

public final class TestDataCsvReader {

    public Map<TestDataKey, TestDataInstruction> read(Path path) {
        List<List<String>> rows = CsvUtil.read(path);
        if (rows.isEmpty()) {
            throw new IllegalStateException("Instruction CSV is empty: " + path);
        }

        Map<String, Integer> header = header(rows.get(0));
        require(header,
                "CaseNo", "dataId", "targetId", "dataRole", "convModel",
                "mirrorX", "mirrorY", "mirrorZ",
                "validationMin", "validationMax", "nullable",
                "referenceType", "fixedValue", "referenceValues");

        Map<TestDataKey, TestDataInstruction> result = new LinkedHashMap<>();
        for (int i = 1; i < rows.size(); i++) {
            List<String> row = rows.get(i);
            if (isBlankRow(row)) {
                continue;
            }

            TestDataInstruction instruction = new TestDataInstruction(
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
                    value(row, header, "fixedValue"),
                    splitReferenceValues(value(row, header, "referenceValues"))
            );

            TestDataInstruction previous = result.putIfAbsent(instruction.key(), instruction);
            if (previous != null) {
                throw new IllegalStateException(
                        "Duplicate instruction key: " + instruction.key()
                );
            }
        }

        return Map.copyOf(result);
    }

    private static Map<String, Integer> header(List<String> values) {
        Map<String, Integer> header = new HashMap<>();
        for (int i = 0; i < values.size(); i++) {
            String name = values.get(i).trim();
            if (!name.isEmpty()) {
                header.put(name, i);
            }
        }
        return header;
    }

    private static void require(Map<String, Integer> header, String... names) {
        for (String name : names) {
            if (!header.containsKey(name)) {
                throw new IllegalStateException("Missing CSV column: " + name);
            }
        }
    }

    private static String value(List<String> row, Map<String, Integer> header, String name) {
        int index = header.get(name);
        return index < row.size() ? row.get(index) : "";
    }

    private static boolean isBlankRow(List<String> row) {
        return row.stream().allMatch(v -> v == null || v.isBlank());
    }

    private static boolean parseBoolean(String value) {
        if (value == null || value.isBlank() || "-".equals(value.trim())) {
            return false;
        }
        String v = value.trim();
        return "1".equals(v)
                || "true".equalsIgnoreCase(v)
                || "yes".equalsIgnoreCase(v);
    }

    private static List<String> splitReferenceValues(String value) {
        if (value == null || value.isBlank() || "-".equals(value.trim())) {
            return List.of();
        }
        String[] parts = value.split("\\s+/\\s+");
        List<String> result = new ArrayList<>();
        for (String part : parts) {
            if (!part.isBlank()) {
                result.add(part.trim());
            }
        }
        return List.copyOf(result);
    }
}
