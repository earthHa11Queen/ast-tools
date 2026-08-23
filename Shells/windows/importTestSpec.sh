#!/usr/bin/env bash

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPOSITORY_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

SQLITE_DIR="${REPOSITORY_ROOT}/SQLite"
DB_FILE="${SQLITE_DIR}/ast_tools.db"
RESULT_DIR="${SQLITE_DIR}/results"
DML_DELETE_DIR="${SQLITE_DIR}/dml_delete"

CSV_FILE="${RESULT_DIR}/test_spec.csv"
DELETE_SQL="${DML_DELETE_DIR}/del_test_spec.sql"

echo "================================="
echo "Import Test Specification 開始"
echo "================================="

echo "対象CSVファイル: ${CSV_FILE}"

if [ ! -f "${CSV_FILE}" ]; then
    echo "CSVファイルなし: ${CSV_FILE}"
    echo "Importを行いません。"

    echo "================================="
    echo "Import Test Specification 完了"
    echo "================================="

    exit 0
fi

echo "実行SQLファイル: ${DELETE_SQL}"

sqlite3 "${DB_FILE}" < "${DELETE_SQL}"
delete_result=$?

if [ "${delete_result}" -eq 0 ]; then
    echo "DELETE完了: ${DELETE_SQL}"
else
    echo "DELETE ERROR: ${DELETE_SQL}"
fi

echo "---------------------------------"

csv_file_windows="$(cygpath -m "${CSV_FILE}")"

echo "Import先テーブル: test_spec"

sqlite3 "${DB_FILE}" \
    ".mode csv" \
    ".import --skip 1 \"${csv_file_windows}\" \"test_spec\""

import_result=$?

if [ "${import_result}" -eq 0 ]; then
    echo "Import完了: ${CSV_FILE}"
else
    echo "Import ERROR: ${CSV_FILE}"
fi

echo "================================="
echo "Import Test Specification 完了"
echo "================================="