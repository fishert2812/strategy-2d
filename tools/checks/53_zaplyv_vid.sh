#!/usr/bin/env bash
# zaplyv_vid: слой «вид и анимации» «Заплыва» (proby/zaplyv/vid.js, fx.js) — у каждого события мира своя анимация.
set -u
. "$(dirname "${BASH_SOURCE[0]}")/../check_mode.sh"; run_in fast || exit 0
command -v node >/dev/null || { echo "  нет node — вид проверить нечем"; exit 1; }
timeout 60 node proby/zaplyv/test_vid.mjs
