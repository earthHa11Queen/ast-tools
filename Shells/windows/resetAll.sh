#!/usr/bin/env bash

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "================================="
echo "Reset All 開始"
echo "================================="

bash "${SCRIPT_DIR}/resetTables.sh"
bash "${SCRIPT_DIR}/resetViews.sh"
bash "${SCRIPT_DIR}/resetIndexes.sh"

echo "================================="
echo "Reset All 完了"
echo "================================="