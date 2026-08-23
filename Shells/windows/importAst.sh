#!/usr/bin/env bash

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPOSITORY_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

source "${SCRIPT_DIR}/selectLanguage.sh"

selectLanguage

AST_RESULT_DIR="${REPOSITORY_ROOT}/${SELECTED_TARGET_DIRECTORY}/results"

SQLITE_DIR="${REPOSITORY_ROOT}/SQLite"
DB_FILE="${SQLITE_DIR}/ast_tools.db"
DML_INSERT_DIR="${SQLITE_DIR}/dml_insert"

AST_SOURCE_FILE_CSV="${AST_RESULT_DIR}/ast_source_file_level.csv"
AST_METHOD_CSV="${AST_RESULT_DIR}/ast_method_level.csv"
AST_FIELD_CSV="${AST_RESULT_DIR}/ast_field_level.csv"

AST_SOURCE_FILE_IMPORTED=false
AST_METHOD_IMPORTED=false
AST_FIELD_IMPORTED=false

echo "================================="
echo "Import AST 開始"
echo "================================="

import_tmp() {
    csv_file="$1"
    tmp_table="$2"

    echo "対象CSVファイル: ${csv_file}"

    if [ ! -f "${csv_file}" ]; then
        echo "CSVファイルなし: ${csv_file}"
        echo "ImportとINSERTを行いません。"
        echo "---------------------------------"
        return 1
    fi

    csv_file_windows="$(cygpath -m "${csv_file}")"

    echo "Import先テーブル: ${tmp_table}"

    sqlite3 "${DB_FILE}" \
        ".mode csv" \
        ".import --skip 1 \"${csv_file_windows}\" \"${tmp_table}\""

    result=$?

    if [ "${result}" -eq 0 ]; then
        echo "Import完了: ${csv_file}"
    else
        echo "Import ERROR: ${csv_file}"
    fi

    echo "---------------------------------"

    return "${result}"
}

execute_insert() {
    sql_name="$1"

    sql_file="${DML_INSERT_DIR}/${sql_name}"

    echo "実行SQLファイル: ${sql_file}"

    sqlite3 "${DB_FILE}" < "${sql_file}"
    result=$?

    if [ "${result}" -eq 0 ]; then
        echo "INSERT完了: ${sql_file}"
    else
        echo "INSERT ERROR: ${sql_file}"
    fi

    echo "---------------------------------"
}

if import_tmp \
    "${AST_FIELD_CSV}" \
    "ast_field_level_tmp"
then
    AST_FIELD_IMPORTED=true
fi

if import_tmp \
    "${AST_METHOD_CSV}" \
    "ast_method_level_tmp"
then
    AST_METHOD_IMPORTED=true
fi

if import_tmp \
    "${AST_SOURCE_FILE_CSV}" \
    "ast_source_file_level_tmp"
then
    AST_SOURCE_FILE_IMPORTED=true
fi

if [ "${AST_FIELD_IMPORTED}" = true ]; then
    execute_insert "data_tmp_to_ast_field_level.sql"
fi

if [ "${AST_METHOD_IMPORTED}" = true ]; then
    execute_insert "data_tmp_to_ast_method_level.sql"
fi

if [ "${AST_SOURCE_FILE_IMPORTED}" = true ]; then
    execute_insert "data_tmp_to_ast_source_file_level.sql"
fi

echo "================================="
echo "Import AST 完了"
echo "================================="