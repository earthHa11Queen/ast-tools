#!/usr/bin/env bash

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPOSITORY_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

SQLITE_DIR="${REPOSITORY_ROOT}/SQLite"
DB_FILE="${SQLITE_DIR}/ast_tools.db"
DROP_DIR="${SQLITE_DIR}/drop"
SQL_FILE="${DROP_DIR}/drop_index.sql"

echo "================================="
echo "Drop Indexes 開始"
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
echo "Drop Indexes 完了"
echo "================================="