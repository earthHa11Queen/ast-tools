#!/usr/bin/env bash

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPOSITORY_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

SQLITE_DIR="${REPOSITORY_ROOT}/SQLite"
DB_FILE="${SQLITE_DIR}/ast_tools.db"
SELECT_DIR="${SQLITE_DIR}/select"
RESULT_DIR="${SQLITE_DIR}/results"

SQL_FILE="${SELECT_DIR}/s_junit_data_instruction.sql"
OUTPUT_FILE="${RESULT_DIR}/test_data_instruction.csv"

echo "================================="
echo "Export JUnit Data Instruction 開始"
echo "================================="

echo "実行SQLファイル: ${SQL_FILE}"
echo "出力CSVファイル: ${OUTPUT_FILE}"

sqlite3 \
    -header \
    -csv \
    "${DB_FILE}" \
    < "${SQL_FILE}" \
    > "${OUTPUT_FILE}"

result=$?

if [ "${result}" -eq 0 ]; then
    sed -i 's/\r$//' "${OUTPUT_FILE}"
    echo "完了: ${OUTPUT_FILE}"
else
    echo "ERROR: ${OUTPUT_FILE}"
fi

echo "================================="
echo "Export JUnit Data Instruction 完了"
echo "================================="