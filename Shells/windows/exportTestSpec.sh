#!/usr/bin/env bash

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPOSITORY_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

SQLITE_DIR="${REPOSITORY_ROOT}/SQLite"
DB_FILE="${SQLITE_DIR}/ast_tools.db"
RESULT_DIR="${SQLITE_DIR}/results"
OUTPUT_FILE="${RESULT_DIR}/test_spec.csv"

echo "================================="
echo "Export Test Specification 開始"
echo "================================="

echo "出力元テーブル: test_spec"
echo "出力CSVファイル: ${OUTPUT_FILE}"

sqlite3 \
    -header \
    -csv \
    "${DB_FILE}" \
    "SELECT * FROM test_spec;" \
    > "${OUTPUT_FILE}"

result=$?

if [ "${result}" -eq 0 ]; then
    sed -i 's/\r$//' "${OUTPUT_FILE}"
    echo "完了: ${OUTPUT_FILE}"
else
    echo "ERROR: ${OUTPUT_FILE}"
fi

echo "================================="
echo "Export Test Specification 完了"
echo "================================="