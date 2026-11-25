#!/usr/bin/env bash
# mir_chislo: численность видов сводно по клеткам поля (proby/zaplyv/mir_chislo.js) — теми же законами, что поштучный мир: рост, голод, охота, расселение, граница сводно↔поштучно.
# Внутри самопроверка: охота без убыли добычи — красное.
set -u
. "$(dirname "${BASH_SOURCE[0]}")/../check_mode.sh"; run_in fast || exit 0
command -v node >/dev/null || { echo "  нет node — численность проверить нечем"; exit 1; }
timeout 120 node proby/zaplyv/test_mir_chislo.mjs
