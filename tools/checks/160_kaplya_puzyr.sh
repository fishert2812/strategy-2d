#!/usr/bin/env bash
# kaplya_puzyr: в пузыре амёбы клетку видно, к концу переваривания она сжимается (урок L095; proby/zaplyv/kaplya/test_puzyr.cjs).
# Самопроверка без сжатия краснеет.
set -u
. "$(dirname "${BASH_SOURCE[0]}")/../check_mode.sh"; run_in fast || exit 0
command -v node >/dev/null || { echo "  нет node — проверить нечем"; exit 1; }
. tools/web/kaplya_pw.sh; [ -f "$PW" ] || { echo "  нет playwright — проверить нечем"; exit 1; }
timeout 600 node proby/zaplyv/kaplya/test_puzyr.cjs || exit 1
