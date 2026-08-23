package com.ast_tool.cleaner;

import java.io.BufferedWriter;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

public final class CsvUtil {

    private CsvUtil() {}

    public static List<Map<String, String>> read(Path path) throws IOException {
        String text = Files.readString(path, StandardCharsets.UTF_8);
        List<List<String>> rows = parse(text);
        List<Map<String, String>> result = new ArrayList<>();
        if (rows.isEmpty()) return result;
        List<String> header = rows.get(0);
        for (int i = 1; i < rows.size(); i++) {
            List<String> values = rows.get(i);
            if (values.size() == 1 && values.get(0).isEmpty()) continue;
            Map<String, String> row = new LinkedHashMap<>();
            for (int c = 0; c < header.size(); c++) row.put(header.get(c), c < values.size() ? values.get(c) : "");
            result.add(row);
        }
        return result;
    }

    public static void write(Path path, List<String> header, List<List<String>> rows) throws IOException {
        Files.createDirectories(path.getParent());
        try (BufferedWriter writer = Files.newBufferedWriter(path, StandardCharsets.UTF_8)) {
            writer.write();
            writer.write(join(header));
            writer.newLine();
            for (List<String> row : rows) {
                writer.write(join(row));
                writer.newLine();
            }
        }
    }

    private static String join(List<String> values) {
        List<String> escaped = new ArrayList<>();
        for (String value : values) escaped.add(escape(value));
        return String.join(",", escaped);
    }

    private static String escape(String value) {
        if (value == null) return "";
        if (value.contains("\"") || value.contains(",") || value.contains("\n") || value.contains("\r")) return "\"" + value.replace("\"", "\"\"") + "\"";
        return value;
    }

    private static List<List<String>> parse(String text) {
        List<List<String>> rows = new ArrayList<>();
        List<String> row = new ArrayList<>();
        StringBuilder cell = new StringBuilder();
        boolean quoted = false;
        for (int i = 0; i < text.length(); i++) {
            char ch = text.charAt(i);
            if (quoted) {
                if (ch == '"') {
                    if (i + 1 < text.length() && text.charAt(i + 1) == '"') {
                        cell.append('"');
                        i++;
                    } else {
                        quoted = false;
                    }
                } else {
                    cell.append(ch);
                }
                continue;
            }
            if (ch == '"') {
                quoted = true;
            } else if (ch == ',') {
                row.add(cell.toString());
                cell.setLength(0);
            } else if (ch == '\n') {
                row.add(trimCr(cell.toString()));
                cell.setLength(0);
                rows.add(row);
                row = new ArrayList<>();
            } else {
                cell.append(ch);
            }
        }
        if (cell.length() > 0 || !row.isEmpty()) {
            row.add(trimCr(cell.toString()));
            rows.add(row);
        }
        return rows;
    }

    private static String trimCr(String value) {
        return value.endsWith("\r") ? value.substring(0, value.length() - 1) : value;
    }
}
