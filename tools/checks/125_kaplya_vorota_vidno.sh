#!/usr/bin/env bash
# kaplya_vorota_vidno: ворота «выданное видно на теле» «Капли» (урок L071, kolonia_eda_boy.md 13.4 Б4; proby/zaplyv/kaplya/test_vorota_vidno.cjs).
# Каждый ген, который игра может выдать, меняет кадр твоей клетки и малышки в студии движка; ждущие части — в kaplya.json vorota.zhdut с причиной. Самопроверка краснеет.
set -u
. "$(dirname "${BASH_SOURCE[0]}")/../check_mode.sh"; run_in fast || exit 0
command -v node >/dev/null || { echo "  нет node — проверить нечем"; exit 1; }
. tools/web/kaplya_pw.sh; [ -f "$PW" ] || { echo "  нет playwright — проверить нечем"; exit 1; }
timeout 180 node proby/zaplyv/kaplya/test_vorota_vidno.cjs || exit 1
