#!/usr/bin/env bash
# eda_vokrug: «Заплыв» — еда на экране не кончается ни у растущей колонии, ни у стоящей (урок L056, vokrug.js, data.json eda_vokrug).
set -u
. "$(dirname "${BASH_SOURCE[0]}")/../check_mode.sh"; run_in fast || exit 0
command -v node >/dev/null || { echo "  нет node — проверить еду вокруг колонии нечем"; exit 1; }
timeout 300 node proby/zaplyv/test_eda_vokrug.mjs
