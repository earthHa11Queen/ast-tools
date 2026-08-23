package com.ast_tool.junit.common.generator;

import com.ast_tool.junit.common.model.DataRole;
import com.ast_tool.junit.common.model.TestDataInstruction;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class MirrorYValueGeneratorTest {

    private final MirrorYValueGenerator generator = new MirrorYValueGenerator();

    @Test
    void allSevenYIds() {
        TestDataInstruction string = instruction("STRING", "2", "6");

        assertNullValue(generator.generate(string, "1:length_null"));
        assertEquals("", generator.generate(string, "2:length_empty").serializedValue());
        assertEquals(2, generator.generate(string, "3:length_min").actualLength());
        assertEquals(1, generator.generate(string, "4:length_min_minus_1").actualLength());
        assertEquals(6, generator.generate(string, "5:length_max").actualLength());
        assertEquals(7, generator.generate(string, "6:length_max_plus_1").actualLength());
        assertEquals(4, generator.generate(string, "7:length_normal_mid").actualLength());
    }

    @Test
    void numericBoundaries() {
        TestDataInstruction number = instruction("NUMBER", "1", "65535");

        assertEquals("1", generator.generate(number, "3:length_min").serializedValue());
        assertEquals("0", generator.generate(number, "4:length_min_minus_1").serializedValue());
        assertEquals("65535", generator.generate(number, "5:length_max").serializedValue());
        assertEquals("65536", generator.generate(number, "6:length_max_plus_1").serializedValue());
        assertEquals("32768", generator.generate(number, "7:length_normal_mid").serializedValue());
    }

    private static void assertNullValue(com.ast_tool.junit.common.model.GeneratedValue value) {
        assertEquals(com.ast_tool.junit.common.model.ValueState.NULL, value.state());
    }

    private static TestDataInstruction instruction(String conv, String min, String max) {
        return new TestDataInstruction(
                "UTAPI-1",
                "request.value",
                "target",
                DataRole.TARGET,
                conv,
                "-",
                "-",
                "-",
                min,
                max,
                false,
                "-",
                "",
                List.of()
        );
    }
}
