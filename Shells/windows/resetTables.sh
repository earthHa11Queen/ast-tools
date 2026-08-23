#!/usr/bin/env bash

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "================================="
echo "Reset Tables 開始"
echo "================================="

bash "${SCRIPT_DIR}/dropTables.sh"
bash "${SCRIPT_DIR}/createTables.sh"

echo "================================="
echo "Reset Tables 完了"
echo "================================="