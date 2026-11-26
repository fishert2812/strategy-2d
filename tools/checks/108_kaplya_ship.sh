#!/usr/bin/env bash
# kaplya_ship: сторож Ш25 «Шип» (kolonia_eda_boy.md; Роман 26.11 21:05; proby/zaplyv/kaplya/test_ship.mjs).
# Шип носом убивает ровню не дольше 10 с, без оружия её не убить; у нового оружия есть вид на теле из движка; самопроверки — шип без силы и оружие без вида краснеют.
set -u
. "$(dirname "${BASH_SOURCE[0]}")/../check_mode.sh"; run_in fast || exit 0
command -v node >/dev/null || { echo "  нет node — проверить нечем"; exit 1; }
timeout 60 node proby/zaplyv/kaplya/test_ship.mjs || exit 1
