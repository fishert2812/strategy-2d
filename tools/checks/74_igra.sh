#!/usr/bin/env bash
# igra: игра-микромир на конструкторе (proby/zaplyv/stend/igra.html, логика stend/igra.js, тест test_igra.mjs) — палец ведёт клетку,
# она ест мелких и растёт без деления, цель называет вид над тобой, царь капли есть, после гибели просыпается сестра мельче.
set -u
. "$(dirname "${BASH_SOURCE[0]}")/../check_mode.sh"; run_in fast || exit 0
command -v node >/dev/null || { echo "  нет node — игру проверить нечем"; exit 1; }
timeout 120 node proby/zaplyv/test_igra.mjs || exit 1
