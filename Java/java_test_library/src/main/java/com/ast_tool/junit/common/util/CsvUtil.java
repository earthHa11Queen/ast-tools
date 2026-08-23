package com.ast_tool.junit.common.util;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.PushbackReader;
import java.io.Reader;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;
import java.util.ArrayList;
import java.util.List;

public final class CsvUtil {

    private CsvUtil() {
    }

    public static List<List<String>> read(Path path) {
        try (BufferedReader reader = Files.newBufferedReader(path, StandardCharsets.UTF_8)) {
            return parse(reader);
        } catch (IOException e) {
            throw new IllegalStateException("Failed to read CSV: " + path, e);
        }
    }

    static List<List<String>> parse(Reader source) throws IOException {
        PushbackReader reader = new PushbackReader(source, 2);
        List<List<String>> rows = new ArrayList<>();
        List<String> row = new ArrayList<>();
        StringBuilder cell = new StringBuilder();
        boolean quoted = false;
        boolean firstChar = true;

        int ch;
        while ((ch = reader.read()) != -1) {
            char c = (char) ch;

            if (firstChar) {
                firstChar = false;
                if (c == '\uFEFF') {
                    continue;
                }
            }

            if (quoted) {
                if (c == '"') {
                    int next = reader.read();
                    if (next == '"') {
                        cell.append('"');
                    } else {
                        quoted = false;
                        if (next != -1) {
                            reader.unread(next);
                        }
                    }
                } else {
                    cell.append(c);
                }
                continue;
            }

            if (c == '"') {
                quoted = true;
            } else if (c == ',') {
                row.add(cell.toString());
                cell.setLength(0);
            } else if (c == '\r' || c == '\n') {
                if (c == '\r') {
                    int next = reader.read();
                    if (next != '\n' && next != -1) {
                        reader.unread(next);
                    }
                }
                row.add(cell.toString());
                cell.setLength(0);
                rows.add(row);
                row = new ArrayList<>();
            } else {
                cell.append(c);
            }
        }

        if (quoted) {
            throw new IllegalStateException("CSV ended inside a quoted cell");
        }

        if (cell.length() > 0 || !row.isEmpty()) {
            row.add(cell.toString());
            rows.add(row);
        }

        return rows;
    }

    public static synchronized void appendRow(Path path, List<String> values) {
        try {
            Path parent = path.toAbsolutePath().getParent();
            if (parent != null) {
                Files.createDirectories(parent);
            }
            String line = toLine(values) + System.lineSeparator();
            Files.writeString(
                    path,
                    line,
                    StandardCharsets.UTF_8,
                    StandardOpenOption.CREATE,
                    StandardOpenOption.APPEND
            );
        } catch (IOException e) {
            throw new IllegalStateException("Failed to append CSV: " + path, e);
        }
    }

    public static String toLine(List<String> values) {
        StringBuilder out = new StringBuilder();
        for (int i = 0; i < values.size(); i++) {
            if (i > 0) {
                out.append(',');
            }
            out.append(escape(values.get(i)));
        }
        return out.toString();
    }

    private static String escape(String value) {
        String v = value == null ? "" : value;
        boolean quote = v.indexOf(',') >= 0
                || v.indexOf('"') >= 0
                || v.indexOf('\r') >= 0
                || v.indexOf('\n') >= 0;
        if (!quote) {
            return v;
        }
        return '"' + v.replace("\"", "\"\"") + '"';
    }
}
