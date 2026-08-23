#!/usr/bin/env bash

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPOSITORY_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

SQLITE_DIR="${REPOSITORY_ROOT}/SQLite"
DB_FILE="${SQLITE_DIR}/ast_tools.db"
DML_INSERT_DIR="${SQLITE_DIR}/dml_insert"
MASTER_DIR="${REPOSITORY_ROOT}/Docs/10_DataMaster"

echo "================================="
echo "Import Master 開始"
echo "================================="

import_csv() {
    csv_name="$1"
    tmp_table="$2"
    sql_name="$3"

    csv_file="${MASTER_DIR}/${csv_name}"
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
    "lang_data_models.csv" \
    "lang_data_models_tmp" \
    "data_tmp_to_lang_data_models.sql"

import_csv \
    "mirror_x_axis.csv" \
    "mirror_x_axis_tmp" \
    "data_tmp_to_mirror_x_axis.sql"

import_csv \
    "mirror_y_axis.csv" \
    "mirror_y_axis_tmp" \
    "data_tmp_to_mirror_y_axis.sql"

import_csv \
    "mirror_z_axis.csv" \
    "mirror_z_axis_tmp" \
    "data_tmp_to_mirror_z_axis.sql"

echo "================================="
echo "Import Master 完了"
echo "================================="