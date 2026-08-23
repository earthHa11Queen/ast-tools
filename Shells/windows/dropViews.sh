#!/usr/bin/env bash

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPOSITORY_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

SQLITE_DIR="${REPOSITORY_ROOT}/SQLite"
DB_FILE="${SQLITE_DIR}/ast_tools.db"
VIEW_DIR="${SQLITE_DIR}/view"

echo "================================="
echo "Drop Views 開始"
echo "================================="

shopt -s nullglob

view_files=(
    "${VIEW_DIR}"/v_*.sql
)

for view_file in "${view_files[@]}"
do
    view_name="$(basename "${view_file}" .sql)"
    sql="DROP VIEW IF EXISTS \"${view_name}\";"

    echo "実行SQL: ${sql}"

    sqlite3 "${DB_FILE}" "${sql}"
    result=$?

    if [ "${result}" -eq 0 ]; then
        echo "完了: ${view_name}"
    else
        echo "ERROR: ${view_name}"
    fi

    echo "---------------------------------"
done

echo "================================="
echo "Drop Views 完了"
echo "================================="