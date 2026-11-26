#!/usr/bin/env bash
# kaplya_potolok: сторож потолков роста «Капли» (книга П53; Роман 26.11 23:03 «Я вырос и что?»; proby/zaplyv/kaplya/test_potolok.mjs).
# Без объятия потолок 20 мкм и строка «найди кроху», после него 0,2 мм, после «много записей» дальше; самопроверка без потолков краснеет.
set -u
. "$(dirname "${BASH_SOURCE[0]}")/../check_mode.sh"; run_in fast || exit 0
command -v node >/dev/null || { echo "  нет node — проверить нечем"; exit 1; }
timeout 60 node proby/zaplyv/kaplya/test_potolok.mjs || exit 1
