#!/usr/bin/env bash

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPOSITORY_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

SQLITE_DIR="${REPOSITORY_ROOT}/SQLite"
DB_FILE="${SQLITE_DIR}/ast_tools.db"
VIEW_DIR="${SQLITE_DIR}/view"

echo "================================="
echo "Create Views 開始"
echo "================================="

for sql_file in "${VIEW_DIR}"/v_*.sql
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
echo "Create Views 完了"
echo "================================="