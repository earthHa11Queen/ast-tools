#!/usr/bin/env bash

selectLanguage() {
    while true
    do
        echo "================================="
        echo "対象言語・技術を選択してください"
        echo "================================="
        echo "Java       [1]"
        echo "TypeScript [2]"
        echo "C#         [3]"
        echo "Go         [4]"
        echo "PHP        [5]"
        echo "Python     [6]"
        echo "Ruby       [7]"
        echo "Playwright [8]"
        echo "React      [9]"
        echo "Angular    [a]"
        echo "Vue        [b]"
        echo "================================="

        read -r -p "選択値を入力してください: " selected_value

        case "${selected_value}" in
            1)
                SELECTED_TARGET_NAME="Java"
                SELECTED_TARGET_DIRECTORY="Java"
                ;;
            2)
                SELECTED_TARGET_NAME="TypeScript"
                SELECTED_TARGET_DIRECTORY="Typescript"
                ;;
            3)
                SELECTED_TARGET_NAME="C#"
                SELECTED_TARGET_DIRECTORY="Csharp"
                ;;
            4)
                SELECTED_TARGET_NAME="Go"
                SELECTED_TARGET_DIRECTORY="Go"
                ;;
            5)
                SELECTED_TARGET_NAME="PHP"
                SELECTED_TARGET_DIRECTORY="PHP"
                ;;
            6)
                SELECTED_TARGET_NAME="Python"
                SELECTED_TARGET_DIRECTORY="Python"
                ;;
            7)
                SELECTED_TARGET_NAME="Ruby"
                SELECTED_TARGET_DIRECTORY="Ruby"
                ;;
            8)
                SELECTED_TARGET_NAME="Playwright"
                SELECTED_TARGET_DIRECTORY="Playwright"
                ;;
            9)
                SELECTED_TARGET_NAME="React"
                SELECTED_TARGET_DIRECTORY="React"
                ;;
            a|A)
                SELECTED_TARGET_NAME="Angular"
                SELECTED_TARGET_DIRECTORY="Angular"
                ;;
            b|B)
                SELECTED_TARGET_NAME="Vue"
                SELECTED_TARGET_DIRECTORY="Vue"
                ;;
            *)
                echo "入力された値に対応する対象はありません。"
                echo "もう一度選択してください。"
                echo "---------------------------------"
                continue
                ;;
        esac

        while true
        do
            echo "---------------------------------"
            echo "選択対象: ${SELECTED_TARGET_NAME}"
            echo "参照先ディレクトリ: ${SELECTED_TARGET_DIRECTORY}/results"
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

if [ "${BASH_SOURCE[0]}" = "$0" ]; then
    selectLanguage
fi