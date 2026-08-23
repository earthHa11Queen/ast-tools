#!/usr/bin/env bash

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPOSITORY_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

SQLITE_DIR="${REPOSITORY_ROOT}/SQLite"
DB_FILE="${SQLITE_DIR}/ast_tools.db"
RESULT_DIR="${SQLITE_DIR}/results"

VALID_OUTPUT_FILE="${RESULT_DIR}/test_spec_validation.csv"
NG_OUTPUT_FILE="${RESULT_DIR}/test_spec_validation_ng.csv"

echo "================================="
echo "Export Test Specification Validation 開始"
echo "================================="

echo "出力元View: v_test_spec_validation"
echo "出力CSVファイル: ${VALID_OUTPUT_FILE}"

sqlite3 \
    -header \
    -csv \
    "${DB_FILE}" \
    "SELECT * FROM v_test_spec_validation;" \
    > "${VALID_OUTPUT_FILE}"

valid_result=$?

if [ "${valid_result}" -eq 0 ]; then
    sed -i 's/\r$//' "${VALID_OUTPUT_FILE}"
    echo "完了: ${VALID_OUTPUT_FILE}"
else
    echo "ERROR: ${VALID_OUTPUT_FILE}"
fi

echo "---------------------------------"

echo "出力元View: v_test_spec_validation_ng"
echo "出力CSVファイル: ${NG_OUTPUT_FILE}"

sqlite3 \
    -header \
    -csv \
    "${DB_FILE}" \
    "SELECT * FROM v_test_spec_validation_ng;" \
    > "${NG_OUTPUT_FILE}"

ng_result=$?

if [ "${ng_result}" -eq 0 ]; then
    sed -i 's/\r$//' "${NG_OUTPUT_FILE}"
    echo "完了: ${NG_OUTPUT_FILE}"
else
    echo "ERROR: ${NG_OUTPUT_FILE}"
fi

echo "================================="
echo "Export Test Specification Validation 完了"
echo "================================="