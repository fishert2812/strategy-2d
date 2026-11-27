#!/usr/bin/env bash
# kaplya_vzaimodeystviya: песочница всех взаимодействий «Капли» (pravki_po_blokam.md Д.11; proby/zaplyv/kaplya/progon_vzaimodeystviy.mjs).
# Каждое оружие (и «без оружия») × каждый житель таблицы boj: ответ мира за 0,3 с, причина отказа видна, три повтора совпали. Иначе красный.
set -u
. "$(dirname "${BASH_SOURCE[0]}")/../check_mode.sh"; run_in fast || exit 0
command -v node >/dev/null || { echo "  нет node — проверить нечем"; exit 1; }
timeout 120 node proby/zaplyv/kaplya/progon_vzaimodeystviy.mjs --md /dev/null || exit 1
