#!/usr/bin/env bash

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPOSITORY_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

SQLITE_DIR="${REPOSITORY_ROOT}/SQLite"
RESULT_DIR="${SQLITE_DIR}/results"

DATA_MASTER_DIR="${REPOSITORY_ROOT}/Docs/10_DataMaster"
PROMPT_DIR="${REPOSITORY_ROOT}/Docs/20_Prompt"

PROMPT_TEMPLATE="${PROMPT_DIR}/SQLite_Test_Spec.md"
PROMPT_OUTPUT="${RESULT_DIR}/prompt_test_spec.md"

AI_INPUT_CSV="${RESULT_DIR}/v_all_ai_input.csv"
ALL_TEST_SPEC_CSV="${RESULT_DIR}/v_all_test_spec.csv"

MIRROR_SPEC="${DATA_MASTER_DIR}/mirror_principle_spec.md"
MIRROR_X="${DATA_MASTER_DIR}/mirror_x_axis.csv"
MIRROR_Y="${DATA_MASTER_DIR}/mirror_y_axis.csv"
MIRROR_Z="${DATA_MASTER_DIR}/mirror_z_axis.csv"

CASE_NO_RULE="${DATA_MASTER_DIR}/case_no_rule.md"
QUALITY_PRIORITY_TABLE="${DATA_MASTER_DIR}/quality_priority_table.md"
TEST_SPEC_FORMAT="${DATA_MASTER_DIR}/test-spec-format.md"

VAL_MIRROR_SPEC='{{MIRROR_PRINCIPLE_SPEC}}'
VAL_MIRROR_X='{{MIRROR_X_DATA}}'
VAL_MIRROR_Y='{{MIRROR_Y_DATA}}'
VAL_MIRROR_Z='{{MIRROR_Z_DATA}}'

VAL_CASE_NO_RULE='{{CASE_NO_RULE}}'
VAL_QUALITY_PRIORITY_TABLE='{{QUALITY_PRIORITY_TABLE}}'
VAL_TEST_SPEC_FORMAT='{{TEST_SPEC_FORMAT}}'

VAL_AI_INPUT_CSV='{{V_AI_INPUT_CSV}}'

CASE_NO_FORMAT="UTAPI-{SERIAL}"
CASE_NO_PREFIX="UTAPI"
CASE_NO_SERIAL_DIGITS="6"
CASE_NO_SEPARATOR="-"
CASE_NO_START="1"
PROJECT_QUALITY_LEVEL="4"

VAL_CASE_NO_FORMAT='{{CASE_NO_FORMAT}}'
VAL_CASE_NO_PREFIX='{{CASE_NO_PREFIX}}'
VAL_CASE_NO_SERIAL_DIGITS='{{CASE_NO_SERIAL_DIGITS}}'
VAL_CASE_NO_SEPARATOR='{{CASE_NO_SEPARATOR}}'
VAL_CASE_NO_START='{{CASE_NO_START}}'
VAL_PROJECT_QUALITY_LEVEL='{{PROJECT_QUALITY_LEVEL}}'

WORK_FILE="${RESULT_DIR}/prompt_test_spec_work.md"
STEP_FILE="${RESULT_DIR}/prompt_test_spec_step.md"

replace_file() {
    placeholder="$1"
    insert_file="$2"

    if ! grep -Fq "${placeholder}" "${WORK_FILE}"; then
        echo "プレースホルダなし: ${placeholder}"
        return
    fi

    echo "ファイル置換: ${placeholder}"
    echo "挿入ファイル: ${insert_file}"

    awk \
        -v placeholder="${placeholder}" \
        -v insert_file="${insert_file}" \
        '
        {
            if (index($0, placeholder) > 0) {
                line_number = 0

                while ((getline insert_line < insert_file) > 0) {
                    if (line_number == 0) {
                        sub(/^\357\273\277/, "", insert_line)
                    }

                    print insert_line
                    line_number++
                }

                close(insert_file)
            } else {
                print $0
            }
        }
        ' \
        "${WORK_FILE}" \
        > "${STEP_FILE}"

    mv "${STEP_FILE}" "${WORK_FILE}"
}

replace_value() {
    placeholder="$1"
    value="$2"

    if ! grep -Fq "${placeholder}" "${WORK_FILE}"; then
        echo "プレースホルダなし: ${placeholder}"
        return
    fi

    echo "値置換: ${placeholder}"
    echo "設定値: ${value}"

    awk \
        -v placeholder="${placeholder}" \
        -v value="${value}" \
        '
        {
            line = $0

            while (index(line, placeholder) > 0) {
                position = index(line, placeholder)
                before = substr(line, 1, position - 1)
                after = substr(
                    line,
                    position + length(placeholder)
                )

                line = before value after
            }

            print line
        }
        ' \
        "${WORK_FILE}" \
        > "${STEP_FILE}"

    mv "${STEP_FILE}" "${WORK_FILE}"
}

echo "================================="
echo "Generate Test Specification Prompt 開始"
echo "================================="

echo "テスト仕様生成用CSVを出力します。"
echo "---------------------------------"

bash "${SCRIPT_DIR}/exportAiInput.sh"
bash "${SCRIPT_DIR}/exportTestSpec.sh"
bash "${SCRIPT_DIR}/exportAllTestSpec.sh"

echo "---------------------------------"
echo "テスト仕様生成用CSVの出力が完了しました。"
echo "---------------------------------"

cp "${PROMPT_TEMPLATE}" "${WORK_FILE}"

replace_file \
    "${VAL_MIRROR_SPEC}" \
    "${MIRROR_SPEC}"

replace_file \
    "${VAL_MIRROR_X}" \
    "${MIRROR_X}"

replace_file \
    "${VAL_MIRROR_Y}" \
    "${MIRROR_Y}"

replace_file \
    "${VAL_MIRROR_Z}" \
    "${MIRROR_Z}"

replace_file \
    "${VAL_CASE_NO_RULE}" \
    "${CASE_NO_RULE}"

replace_file \
    "${VAL_QUALITY_PRIORITY_TABLE}" \
    "${QUALITY_PRIORITY_TABLE}"

replace_file \
    "${VAL_AI_INPUT_CSV}" \
    "${AI_INPUT_CSV}"

replace_file \
    "${VAL_TEST_SPEC_FORMAT}" \
    "${TEST_SPEC_FORMAT}"

replace_value \
    "${VAL_CASE_NO_FORMAT}" \
    "${CASE_NO_FORMAT}"

replace_value \
    "${VAL_CASE_NO_PREFIX}" \
    "${CASE_NO_PREFIX}"

replace_value \
    "${VAL_CASE_NO_SERIAL_DIGITS}" \
    "${CASE_NO_SERIAL_DIGITS}"

replace_value \
    "${VAL_CASE_NO_SEPARATOR}" \
    "${CASE_NO_SEPARATOR}"

replace_value \
    "${VAL_CASE_NO_START}" \
    "${CASE_NO_START}"

replace_value \
    "${VAL_PROJECT_QUALITY_LEVEL}" \
    "${PROJECT_QUALITY_LEVEL}"

mv "${WORK_FILE}" "${PROMPT_OUTPUT}"
rm -f "${STEP_FILE}"

sed -i 's/\r$//' "${PROMPT_OUTPUT}"

echo "================================="
echo "Generate Test Specification Prompt 完了"
echo "================================="
echo "生成ファイル: ${PROMPT_OUTPUT}"