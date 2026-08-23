package com.ast_tool.junit.common.generator;

import com.ast_tool.junit.common.model.GeneratedValue;
import com.ast_tool.junit.common.model.TestDataInstruction;

import java.math.BigDecimal;

public final class MirrorZValueGenerator {

    private final NormalValueGenerator normal = new NormalValueGenerator();

    public GeneratedValue generate(TestDataInstruction instruction, String mirrorId) {
        String id = MirrorId.parse(mirrorId).symbolicId();

        return switch (id) {
            case "half-width_only" -> GeneratedValue.value("ABC123");
            case "full-width_only" -> GeneratedValue.value("ＡＢＣ１２３");
            case "letters_only" -> GeneratedValue.value("AbCd");
            case "numbers_only" -> GeneratedValue.value("1234");
            case "symbols_only" -> GeneratedValue.value("!@#$");
            case "mixed_half-width_and_full-width" -> GeneratedValue.value("AＢ1２");
            case "alphanumeric_mix" -> GeneratedValue.value("Ab12");
            case "chaotic_mix" -> GeneratedValue.value("AＢ1２!＠漢");

            case "integer_positive" -> GeneratedValue.value("1");
            case "integer_negative" -> GeneratedValue.value("-1");
            case "integer_zero" -> GeneratedValue.value("0");
            case "decimal_positive" -> GeneratedValue.value("1.5");
            case "decimal_negative" -> GeneratedValue.value("-1.5");
            case "decimal_repeating" -> GeneratedValue.value("0.3333333333333333");

            case "zero-padding_enabled", "zero_padded" -> GeneratedValue.value("0001");
            case "zero-padding_disabled", "not_zero_padded" -> GeneratedValue.value("1");
            case "sign_indication_plus_sign_included" -> GeneratedValue.value("+1");
            case "sign_indication_minus_sign_included" -> GeneratedValue.value("-1");
            case "exponential_notation" -> GeneratedValue.value("1E3");
            case "comma-separated" -> GeneratedValue.value("1,000");

            case "valid_value", "within_valid_range" -> normal.generate(instruction);
            case "invalid_value" -> GeneratedValue.value("__INVALID__");
            case "out_of_range" -> outOfRange(instruction);
            case "leap_year" -> GeneratedValue.value("2000-02-29");
            case "with_time_zone" -> GeneratedValue.value("2000-01-01T00:00:00+09:00");
            case "without_time_zone" -> GeneratedValue.value("2000-01-01T00:00:00");

            case "unix_timestamp__seconds" -> GeneratedValue.value("946684800");
            case "unix_timestamp__milliseconds" -> GeneratedValue.value("946684800000");
            case "unix_timestamp__negative" -> GeneratedValue.value("-1");
            case "unix_timestamp__32_bit_boundary" -> GeneratedValue.value("2147483647");

            case "excel_serial__integer" -> GeneratedValue.value("36526");
            case "excel_serial__decimal" -> GeneratedValue.value("36526.5");
            case "excel_serial__negative" -> GeneratedValue.value("-1");
            case "excel_serial__feb_29_1900_bug" -> GeneratedValue.value("60");

            case "half-width@" -> GeneratedValue.value("@");
            case "full-width@" -> GeneratedValue.value("＠");
            case "invalid_domain" -> GeneratedValue.value("invalid_domain");
            case "with_hyphen" -> GeneratedValue.value("123-4567");
            case "without_hyphen" -> GeneratedValue.value("1234567");
            case "insufficient_length" -> GeneratedValue.value("1");
            case "within_definition" -> enumWithin(instruction);
            case "outside_the_definition" -> GeneratedValue.value("__OUTSIDE_DEFINITION__");

            case "space" -> GeneratedValue.value(" ");
            case "line_break_code_crlf" -> GeneratedValue.value("\r\n");
            case "line_break_code_lf" -> GeneratedValue.value("\n");
            case "tab" -> GeneratedValue.value("\t");
            case "control_character_null" -> GeneratedValue.value("\u0000");
            case "surrogate_pair" -> GeneratedValue.value("😀");
            case "environment-dependent_character" -> GeneratedValue.value("①");
            case "character_with_mapping_differences" -> GeneratedValue.value("髙");

            // Values are deterministic test strings. Selection of these IDs is done upstream.
            case "sql" -> GeneratedValue.value("' OR '1'='1");
            case "os_command" -> GeneratedValue.value("echo mirror_test");
            case "html/script" -> GeneratedValue.value("<script>alert(1)</script>");
            case "mathematical_formula" -> GeneratedValue.value("1+1");

            case "db_null", "null" -> GeneratedValue.nullValue();
            case "empty" -> GeneratedValue.emptyValue();
            case "undefined" -> GeneratedValue.value("__UNDEFINED__");

            default -> throw new IllegalStateException("Unsupported Mirror Z ID: " + mirrorId);
        };
    }

    private GeneratedValue enumWithin(TestDataInstruction instruction) {
        if (instruction.referenceValues().isEmpty()) {
            throw new IllegalStateException(
                    "within_definition requires referenceValues: " + instruction.key()
            );
        }
        return GeneratedValue.value(instruction.referenceValues().get(0));
    }

    private GeneratedValue outOfRange(TestDataInstruction instruction) {
        String max = instruction.validationMax();
        if (isDefined(max) && !"-1".equals(max.trim())) {
            return GeneratedValue.value(
                    new BigDecimal(max.trim()).add(BigDecimal.ONE).stripTrailingZeros().toPlainString()
            );
        }
        String min = instruction.validationMin();
        if (isDefined(min) && !"-1".equals(min.trim())) {
            return GeneratedValue.value(
                    new BigDecimal(min.trim()).subtract(BigDecimal.ONE).stripTrailingZeros().toPlainString()
            );
        }
        throw new IllegalStateException(
                "out_of_range requires validationMin or validationMax: " + instruction.key()
        );
    }

    private static boolean isDefined(String value) {
        return value != null && !value.isBlank() && !"-".equals(value.trim());
    }
}
