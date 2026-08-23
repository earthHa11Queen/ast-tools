#!/usr/bin/env bash

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPOSITORY_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

source "${SCRIPT_DIR}/selectLanguage.sh"

selectLanguage

CLEANER_RESULT_DIR="${REPOSITORY_ROOT}/${SELECTED_TARGET_DIRECTORY}/results"

SQLITE_DIR="${REPOSITORY_ROOT}/SQLite"
DB_FILE="${SQLITE_DIR}/ast_tools.db"
DML_INSERT_DIR="${SQLITE_DIR}/dml_insert"

echo "================================="
echo "Import Cleaner 開始"
echo "================================="

import_csv() {
    csv_name="$1"
    tmp_table="$2"
    sql_name="$3"

    csv_file="${CLEANER_RESULT_DIR}/${csv_name}"
    sql_file="${DML_INSERT_DIR}/${sql_name}"

    echo "対象CSVファイル: ${csv_file}"

    if [ ! -f "${csv_file}" ]; then
        echo "CSVファイルなし: ${csv_file}"
        echo "ImportとINSERTを行いません。"
        echo "---------------------------------"
        return
    fi

    csv_file_windows="$(cygpath -m "${csv_file}")"

    echo "Import先テーブル: ${tmp_table}"

    sqlite3 "${DB_FILE}" \
        ".mode csv" \
        ".import --skip 1 \"${csv_file_windows}\" \"${tmp_table}\""

    import_result=$?

    if [ "${import_result}" -eq 0 ]; then
        echo "Import完了: ${csv_file}"
    else
        echo "Import ERROR: ${csv_file}"
    fi

    echo "実行SQLファイル: ${sql_file}"

    sqlite3 "${DB_FILE}" < "${sql_file}"
    insert_result=$?

    if [ "${insert_result}" -eq 0 ]; then
        echo "INSERT完了: ${sql_file}"
    else
        echo "INSERT ERROR: ${sql_file}"
    fi

    echo "---------------------------------"
}

import_csv \
    "args_data.csv" \
    "args_data_tmp" \
    "data_tmp_to_args_data.sql"

import_csv \
    "dto_data.csv" \
    "dto_data_tmp" \
    "data_tmp_to_dto_data.sql"

import_csv \
    "enum_data.csv" \
    "enum_data_tmp" \
    "data_tmp_to_enum_data.sql"

import_csv \
    "field_data.csv" \
    "field_data_tmp" \
    "data_tmp_to_field_data.sql"

import_csv \
    "importlist_data.csv" \
    "importlist_data_tmp" \
    "data_tmp_to_importlist_data.sql"

import_csv \
    "object_data.csv" \
    "object_data_tmp" \
    "data_tmp_to_object_data.sql"

import_csv \
    "return_data.csv" \
    "return_data_tmp" \
    "data_tmp_to_return_data.sql"

echo "================================="
echo "Import Cleaner 完了"
echo "================================="