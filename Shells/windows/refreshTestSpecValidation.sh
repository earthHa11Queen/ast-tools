#!/usr/bin/env bash

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPOSITORY_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

SQLITE_DIR="${REPOSITORY_ROOT}/SQLite"
DB_FILE="${SQLITE_DIR}/ast_tools.db"
DML_INSERT_DIR="${SQLITE_DIR}/dml_insert"
SQL_FILE="${DML_INSERT_DIR}/ist_test_spec_validation_candidates.sql"

echo "================================="
echo "Refresh Test Specification Validation 開始"
echo "================================="

echo "実行SQLファイル: ${SQL_FILE}"

sqlite3 "${DB_FILE}" < "${SQL_FILE}"
result=$?

if [ "${result}" -eq 0 ]; then
    echo "完了: ${SQL_FILE}"
else
    echo "ERROR: ${SQL_FILE}"
fi

echo "================================="
echo "Refresh Test Specification Validation 完了"
echo "================================="