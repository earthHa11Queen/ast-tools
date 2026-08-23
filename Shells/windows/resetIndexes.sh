#!/usr/bin/env bash

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "================================="
echo "Reset Indexes 開始"
echo "================================="

bash "${SCRIPT_DIR}/dropIndexes.sh"
bash "${SCRIPT_DIR}/createIndexes.sh"

echo "================================="
echo "Reset Indexes 完了"
echo "================================="