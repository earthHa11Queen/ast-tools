#!/usr/bin/env bash

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPOSITORY_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

BACKEND_TEST_DIR="${REPOSITORY_ROOT}/BackendTest"
BACKEND_TEST_CONFIG_DIR="${BACKEND_TEST_DIR}/config"
LANGUAGE_ENV_DIR="${BACKEND_TEST_DIR}/languages"
OUTPUT_DIR="${BACKEND_TEST_DIR}/results"

SQLITE_DIR="${REPOSITORY_ROOT}/SQLite"
SQLITE_RESULT_DIR="${SQLITE_DIR}/results"

DATA_MASTER_DIR="${REPOSITORY_ROOT}/Docs/10_DataMaster"
LANGUAGE_DESIGN_DIR="${DATA_MASTER_DIR}/languages"
PROMPT_DIR="${REPOSITORY_ROOT}/Docs/20_Prompt"

MIRROR_PRINCIPLE_SPEC="${DATA_MASTER_DIR}/mirror_principle_spec.md"
PROJECT_QUALITY_FILE="${DATA_MASTER_DIR}/quality_priority_table.md"

TEST_SPEC_VALIDATION="${SQLITE_RESULT_DIR}/test_spec_validation.csv"
TEST_DATA_INSTRUCTION="${SQLITE_RESULT_DIR}/test_data_instruction.csv"

PACKAGE_DIR="${OUTPUT_DIR}/testcode_generation_input"
PACKAGE_FILE="${OUTPUT_DIR}/testcode_generation_input.tar.gz"

SELECTED_TARGET_NAME=""
SELECTED_TARGET_DIRECTORY=""
SELECTED_LANGUAGE=""
TEST_FRAMEWORK=""
AST_CONFIG_FILE=""
AST_CONFIG_TYPE=""
TARGET_APP_DIR_KEY=""
DESIGN_YAML_FILE=""
GENERATION_PROMPT_FILE=""
LANGUAGE_ENV_CSV=""

selectLanguage() {
    while true
    do
        echo "================================="
        echo "Backend Test対象言語を選択してください"
        echo "================================="
        echo "Java       [1]"
        echo "TypeScript [2]"
        echo "C#         [3]"
        echo "Go         [4]"
        echo "PHP        [5]"
        echo "Python     [6]"
        echo "Ruby       [7]"
        echo "================================="

        read -r -p "選択値を入力してください: " selected_value

        case "${selected_value}" in
            1)
                SELECTED_TARGET_NAME="Java"
                SELECTED_TARGET_DIRECTORY="Java"
                SELECTED_LANGUAGE="java"
                TEST_FRAMEWORK="JUnit"
                AST_CONFIG_FILE="${REPOSITORY_ROOT}/Java/config.json"
                AST_CONFIG_TYPE="json"
                TARGET_APP_DIR_KEY="targetAppDir"
                ;;
            2)
                SELECTED_TARGET_NAME="TypeScript"
                SELECTED_TARGET_DIRECTORY="Typescript"
                SELECTED_LANGUAGE="typescript"
                TEST_FRAMEWORK="Jest"
                AST_CONFIG_FILE="${REPOSITORY_ROOT}/Typescript/config.ts"
                AST_CONFIG_TYPE="typescript"
                TARGET_APP_DIR_KEY="TARGET_APP_DIR"
                ;;
            3)
                SELECTED_TARGET_NAME="C#"
                SELECTED_TARGET_DIRECTORY="Csharp"
                SELECTED_LANGUAGE="csharp"
                TEST_FRAMEWORK="XUnit"
                AST_CONFIG_FILE="${REPOSITORY_ROOT}/Csharp/config.json"
                AST_CONFIG_TYPE="json"
                TARGET_APP_DIR_KEY="targetAppDir"
                ;;
            4)
                SELECTED_TARGET_NAME="Go"
                SELECTED_TARGET_DIRECTORY="Go"
                SELECTED_LANGUAGE="go"
                TEST_FRAMEWORK="Gotest"
                AST_CONFIG_FILE="${REPOSITORY_ROOT}/Go/config.json"
                AST_CONFIG_TYPE="json"
                TARGET_APP_DIR_KEY="targetAppDir"
                ;;
            5)
                SELECTED_TARGET_NAME="PHP"
                SELECTED_TARGET_DIRECTORY="PHP"
                SELECTED_LANGUAGE="php"
                TEST_FRAMEWORK="PHPUnit"
                AST_CONFIG_FILE="${REPOSITORY_ROOT}/PHP/config.json"
                AST_CONFIG_TYPE="json"
                TARGET_APP_DIR_KEY="targetAppDir"
                ;;
            6)
                SELECTED_TARGET_NAME="Python"
                SELECTED_TARGET_DIRECTORY="Python"
                SELECTED_LANGUAGE="python"
                TEST_FRAMEWORK="Pytest"
                AST_CONFIG_FILE="${REPOSITORY_ROOT}/Python/config.json"
                AST_CONFIG_TYPE="json"
                TARGET_APP_DIR_KEY="targetAppDir"
                ;;
            7)
                SELECTED_TARGET_NAME="Ruby"
                SELECTED_TARGET_DIRECTORY="Ruby"
                SELECTED_LANGUAGE="ruby"
                TEST_FRAMEWORK="RSpec"
                AST_CONFIG_FILE="${REPOSITORY_ROOT}/Ruby/config.json"
                AST_CONFIG_TYPE="json"
                TARGET_APP_DIR_KEY="targetAppDir"
                ;;
            *)
                echo "入力された値に対応する対象はありません。"
                echo "もう一度選択してください。"
                echo "---------------------------------"
                continue
                ;;
        esac

        DESIGN_YAML_FILE="${LANGUAGE_DESIGN_DIR}/${TEST_FRAMEWORK}DesignYAML.md"
        GENERATION_PROMPT_FILE="${PROMPT_DIR}/BackendTest_${TEST_FRAMEWORK}_Generation.md"
        LANGUAGE_ENV_CSV="${LANGUAGE_ENV_DIR}/${SELECTED_LANGUAGE}.csv"

        while true
        do
            echo "---------------------------------"
            echo "選択言語              : ${SELECTED_TARGET_NAME}"
            echo "テストフレームワーク  : ${TEST_FRAMEWORK}"
            echo "AST結果ディレクトリ   : ${SELECTED_TARGET_DIRECTORY}/results"
            echo "設計YAML              : ${DESIGN_YAML_FILE}"
            echo "生成プロンプト        : ${GENERATION_PROMPT_FILE}"
            echo "---------------------------------"

            read -r -p "この内容で実行しますか？ [y/n]: " confirm_value

            case "${confirm_value}" in
                y|Y)
                    echo "選択を確定しました: ${SELECTED_TARGET_NAME}"
                    return 0
                    ;;
                n|N)
                    echo "対象選択へ戻ります。"
                    echo "---------------------------------"
                    break
                    ;;
                *)
                    echo "yまたはnを入力してください。"
                    ;;
            esac
        done
    done
}

requireContentFile() {
    file_label="$1"
    file_path="$2"

    if [ -z "${file_path}" ]; then
        echo "ERROR: ${file_label}が設定されていません。"
        return 1
    fi

    if [ ! -f "${file_path}" ]; then
        echo "ERROR: ${file_label}が存在しません。"
        echo "${file_path}"
        return 1
    fi

    if ! grep -q '[^[:space:]]' "${file_path}"
    then
        echo "ERROR: ${file_label}が空です。"
        echo "${file_path}"
        return 1
    fi

    return 0
}

readJsonValue() {
    config_file="$1"
    config_key="$2"

    grep -m 1 "\"${config_key}\"" "${config_file}" |
        sed -E 's/^[^:]*:[[:space:]]*"([^"]*)".*/\1/'
}

readTypeScriptValue() {
    config_file="$1"
    config_key="$2"

    grep -m 1 -E \
        "export const ${config_key}[[:space:]]*=" \
        "${config_file}" |
        sed -E "s/^[^=]*=[[:space:]]*[\"']([^\"']*)[\"'].*/\1/"
}

readTargetAppDirectory() {
    if [ "${AST_CONFIG_TYPE}" = "json" ]; then
        readJsonValue \
            "${AST_CONFIG_FILE}" \
            "${TARGET_APP_DIR_KEY}"
    else
        readTypeScriptValue \
            "${AST_CONFIG_FILE}" \
            "${TARGET_APP_DIR_KEY}"
    fi
}

copyFile() {
    source_file="$1"
    destination_file="$2"

    cp "${source_file}" "${destination_file}"
    result=$?

    if [ "${result}" -eq 0 ]; then
        echo "コピー完了: ${source_file}"
    else
        echo "ERROR: コピー失敗: ${source_file}"
        return 1
    fi

    return 0
}

echo "================================="
echo "Backend Test入力パッケージ作成 開始"
echo "================================="

selectLanguage

echo "================================="
echo "必要ファイルを確認します"
echo "================================="

requireContentFile \
    "テストフレームワーク設計YAML" \
    "${DESIGN_YAML_FILE}" ||
    exit 2

requireContentFile \
    "Backend Test生成プロンプト" \
    "${GENERATION_PROMPT_FILE}" ||
    exit 2

requireContentFile \
    "AST config" \
    "${AST_CONFIG_FILE}" ||
    exit 2

requireContentFile \
    "言語環境定義CSV" \
    "${LANGUAGE_ENV_CSV}" ||
    exit 2

requireContentFile \
    "鏡の原理仕様" \
    "${MIRROR_PRINCIPLE_SPEC}" ||
    exit 2

requireContentFile \
    "品質観点優先順位表" \
    "${PROJECT_QUALITY_FILE}" ||
    exit 2

requireContentFile \
    "Validation済みTest Specification" \
    "${TEST_SPEC_VALIDATION}" ||
    exit 2

requireContentFile \
    "Test Data Instruction" \
    "${TEST_DATA_INSTRUCTION}" ||
    exit 2

AST_RESULT_DIR="${REPOSITORY_ROOT}/${SELECTED_TARGET_DIRECTORY}/results"

AST_SOURCE_FILE_LEVEL="${AST_RESULT_DIR}/ast_source_file_level.csv"
AST_METHOD_LEVEL="${AST_RESULT_DIR}/ast_method_level.csv"
AST_FIELD_LEVEL="${AST_RESULT_DIR}/ast_field_level.csv"

requireContentFile \
    "AST Source File Level CSV" \
    "${AST_SOURCE_FILE_LEVEL}" ||
    exit 2

requireContentFile \
    "AST Method Level CSV" \
    "${AST_METHOD_LEVEL}" ||
    exit 2

requireContentFile \
    "AST Field Level CSV" \
    "${AST_FIELD_LEVEL}" ||
    exit 2

APP_DIR="$(readTargetAppDirectory)"

if [ -z "${APP_DIR}" ]; then
    echo "ERROR: AST configから対象アプリディレクトリを取得できません。"
    echo "Config: ${AST_CONFIG_FILE}"
    echo "Key   : ${TARGET_APP_DIR_KEY}"
    exit 2
fi

APP_DIR="$(echo "${APP_DIR}" | sed 's#\\#/#g')"

if echo "${APP_DIR}" | grep -Eq '^[A-Za-z]:/'
then
    APP_DIR="$(cygpath -u "${APP_DIR}")"
fi

echo "================================="
echo "選択内容"
echo "================================="
echo "言語                    : ${SELECTED_TARGET_NAME}"
echo "テストフレームワーク    : ${TEST_FRAMEWORK}"
echo "Application Directory   : ${APP_DIR}"
echo "AST Result Directory    : ${AST_RESULT_DIR}"
echo "Test Design YAML        : ${DESIGN_YAML_FILE}"
echo "Generation Prompt       : ${GENERATION_PROMPT_FILE}"
echo "================================="

rm -rf "${PACKAGE_DIR}"
rm -f "${PACKAGE_FILE}"

mkdir -p "${PACKAGE_DIR}/prompt"
mkdir -p "${PACKAGE_DIR}/test_design"
mkdir -p "${PACKAGE_DIR}/mirror"
mkdir -p "${PACKAGE_DIR}/test_spec"
mkdir -p "${PACKAGE_DIR}/instruction"
mkdir -p "${PACKAGE_DIR}/ast"
mkdir -p "${PACKAGE_DIR}/environment"
mkdir -p "${PACKAGE_DIR}/quality"

echo "================================="
echo "入力ファイルをコピーします"
echo "================================="

copyFile \
    "${GENERATION_PROMPT_FILE}" \
    "${PACKAGE_DIR}/prompt/$(basename "${GENERATION_PROMPT_FILE}")" ||
    exit 2

copyFile \
    "${DESIGN_YAML_FILE}" \
    "${PACKAGE_DIR}/test_design/$(basename "${DESIGN_YAML_FILE}")" ||
    exit 2

copyFile \
    "${MIRROR_PRINCIPLE_SPEC}" \
    "${PACKAGE_DIR}/mirror/mirror_principle_spec.md" ||
    exit 2

copyFile \
    "${TEST_SPEC_VALIDATION}" \
    "${PACKAGE_DIR}/test_spec/test_spec_validation.csv" ||
    exit 2

copyFile \
    "${TEST_DATA_INSTRUCTION}" \
    "${PACKAGE_DIR}/instruction/test_data_instruction.csv" ||
    exit 2

copyFile \
    "${AST_SOURCE_FILE_LEVEL}" \
    "${PACKAGE_DIR}/ast/ast_source_file_level.csv" ||
    exit 2

copyFile \
    "${AST_METHOD_LEVEL}" \
    "${PACKAGE_DIR}/ast/ast_method_level.csv" ||
    exit 2

copyFile \
    "${AST_FIELD_LEVEL}" \
    "${PACKAGE_DIR}/ast/ast_field_level.csv" ||
    exit 2

copyFile \
    "${PROJECT_QUALITY_FILE}" \
    "${PACKAGE_DIR}/quality/quality_priority_table.md" ||
    exit 2

echo "================================="
echo "対象アプリの環境ファイルを取得します"
echo "================================="

while IFS=',' read -r environment_file_path code_fence
do
    environment_file_path="$(
        echo "${environment_file_path}" |
            sed 's/\r$//'
    )"

    if [ "${environment_file_path}" = "filePath" ]; then
        continue
    fi

    if [ -z "${environment_file_path}" ]; then
        continue
    fi

    search_directory="${APP_DIR}"
    found_environment_file=""

    while [ "${search_directory}" != "/" ]
    do
        if [ -f "${search_directory}/${environment_file_path}" ]; then
            found_environment_file="${search_directory}/${environment_file_path}"
            break
        fi

        parent_directory="$(dirname "${search_directory}")"

        if [ "${parent_directory}" = "${search_directory}" ]; then
            break
        fi

        search_directory="${parent_directory}"
    done

    if [ -n "${found_environment_file}" ]; then
        destination_directory="$(
            dirname \
                "${PACKAGE_DIR}/environment/${environment_file_path}"
        )"

        mkdir -p "${destination_directory}"

        copyFile \
            "${found_environment_file}" \
            "${PACKAGE_DIR}/environment/${environment_file_path}" ||
            exit 2
    else
        echo "未検出: ${environment_file_path}"
    fi
done < "${LANGUAGE_ENV_CSV}"

echo "================================="
echo "入力パッケージを圧縮します"
echo "================================="

cd "${OUTPUT_DIR}" || exit 2

tar \
    -czf \
    "$(basename "${PACKAGE_FILE}")" \
    "$(basename "${PACKAGE_DIR}")"

tar_result=$?

cd "${REPOSITORY_ROOT}" || exit 2

if [ "${tar_result}" -eq 0 ]; then
    echo "圧縮完了: ${PACKAGE_FILE}"
else
    echo "ERROR: 圧縮失敗: ${PACKAGE_FILE}"
    exit 2
fi

echo "================================="
echo "Backend Test入力パッケージ作成 完了"
echo "================================="
echo "言語                  : ${SELECTED_TARGET_NAME}"
echo "テストフレームワーク  : ${TEST_FRAMEWORK}"
echo "出力ファイル          : ${PACKAGE_FILE}"
echo "================================="