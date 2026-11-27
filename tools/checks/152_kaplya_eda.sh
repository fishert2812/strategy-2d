#!/usr/bin/env bash
# kaplya_eda: еда у клетки съедается (урок L077, пачка 1 п. 6–7; proby/zaplyv/kaplya/test_eda_magnit.mjs). Сахар ешь с первой секунды,
# магнит не тянет то, что ещё не съесть. Самопроверка со старым (сахар с первого роста, магнит тянет всё) краснеет.
set -u
. "$(dirname "${BASH_SOURCE[0]}")/../check_mode.sh"; run_in fast || exit 0
command -v node >/dev/null || { echo "  нет node — проверить нечем"; exit 1; }
timeout 60 node proby/zaplyv/kaplya/test_eda_magnit.mjs || exit 1
