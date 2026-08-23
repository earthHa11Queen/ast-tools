#!/usr/bin/env bash

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPOSITORY_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

SQLITE_DIR="${REPOSITORY_ROOT}/SQLite"
DB_FILE="${SQLITE_DIR}/ast_tools.db"
CREATE_DIR="${SQLITE_DIR}/create"

echo "================================="
echo "Create Indexes 開始"
echo "================================="

shopt -s nullglob

sql_files=(
    "${CREATE_DIR}"/index.sql
    "${CREATE_DIR}"/index_*.sql
)

for sql_file in "${sql_files[@]}"
do
    echo "実行SQLファイル: ${sql_file}"

    sqlite3 "${DB_FILE}" < "${sql_file}"
    result=$?

    if [ "${result}" -eq 0 ]; then
        echo "完了: ${sql_file}"
    else
        echo "ERROR: ${sql_file}"
    fi

    echo "---------------------------------"
done

echo "================================="
echo "Create Indexes 完了"
echo "================================="