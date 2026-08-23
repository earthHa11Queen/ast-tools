#!/usr/bin/env bash

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPOSITORY_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

SQLITE_DIR="${REPOSITORY_ROOT}/SQLite"
DB_FILE="${SQLITE_DIR}/ast_tools.db"
DROP_DIR="${SQLITE_DIR}/drop"

echo "================================="
echo "Drop Tables 開始"
echo "================================="

shopt -s nullglob

sql_files=(
    "${DROP_DIR}"/*.sql
)

for sql_file in "${sql_files[@]}"
do
    if [ "$(basename "${sql_file}")" = "drop_index.sql" ]; then
        continue
    fi

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
echo "Drop Tables 完了"
echo "================================="