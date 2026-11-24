#!/usr/bin/env bash
# zaplyv_vid: слой «вид и анимации» «Заплыва» (proby/zaplyv/vid.js, fx.js) — у каждого события мира своя анимация.
set -u
command -v node >/dev/null || { echo "  нет node — вид проверить нечем"; exit 1; }
timeout 60 node proby/zaplyv/test_vid.mjs
