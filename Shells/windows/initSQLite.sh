#!/usr/bin/env bash

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPOSITORY_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

SQLITE_DIR="${REPOSITORY_ROOT}/SQLite"
DB_FILE="${SQLITE_DIR}/ast_tools.db"

echo "================================="
echo "Initialize SQLite 開始"
echo "================================="

echo "SQLite DB作成: ${DB_FILE}"

sqlite3 "${DB_FILE}" "VACUUM;"
result=$?

if [ "${result}" -eq 0 ]; then
    echo "完了: ${DB_FILE}"
else
    echo "ERROR: ${DB_FILE}"
fi

echo "---------------------------------"

bash "${SCRIPT_DIR}/createTables.sh"
bash "${SCRIPT_DIR}/createIndexes.sh"
bash "${SCRIPT_DIR}/createViews.sh"

echo "================================="
echo "Initialize SQLite 完了"
echo "================================="