#!/usr/bin/env bash
# kaplya_yad_partiya: обычный заплыв без меток — «Яд» с первой секунды, живой кокк крупнее тебя умирает от яда под двумя настоящими пальцами (урок L123; proby/zaplyv/kaplya/test_yad_partiya.cjs).
# Самопроверка (window.kaplyaYadKartoy) краснеет.
set -u
. "$(dirname "${BASH_SOURCE[0]}")/../check_mode.sh"; run_in fast || exit 0
command -v node >/dev/null || { echo "  нет node — проверить нечем"; exit 1; }
. tools/web/kaplya_pw.sh; [ -f "$PW" ] || { echo "  нет playwright — проверить нечем"; exit 1; }
timeout 400 node proby/zaplyv/kaplya/test_yad_partiya.cjs || exit 1
