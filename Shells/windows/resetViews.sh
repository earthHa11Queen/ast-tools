#!/usr/bin/env bash

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "================================="
echo "Reset Views 開始"
echo "================================="

bash "${SCRIPT_DIR}/dropViews.sh"
bash "${SCRIPT_DIR}/createViews.sh"

echo "================================="
echo "Reset Views 完了"
echo "================================="