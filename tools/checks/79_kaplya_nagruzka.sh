#!/usr/bin/env bash
# kaplya_nagruzka: сторож нагрузки «Капли» (proby/zaplyv/kaplya/test_nagruzka.cjs). Роман 26.11: «Лагать и нагреваться телефон стал… большим стал».
# Большая клетка не тяжелее малышки больше чем в 1,5 раза (жителей телом, частей тел); самопроверка — без взвеси сторож краснеет.
set -u
. "$(dirname "${BASH_SOURCE[0]}")/../check_mode.sh"; run_in fast || exit 0
command -v node >/dev/null || { echo "  нет node — нагрузку проверить нечем"; exit 1; }
. tools/web/kaplya_pw.sh; [ -f "$PW" ] || { echo "  нет playwright — проверить нечем"; exit 1; }
timeout 300 node proby/zaplyv/kaplya/test_nagruzka.cjs || exit 1
