#!/usr/bin/env bash
# kaplya_boj_tablica: одна таблица боя «Капли» (pravki_po_blokam.md Д.6; proby/zaplyv/kaplya/test_boj_tablica.mjs).
# Каждый житель капли — строка в kaplya.json boj.celi; толчок и щипок кокка, укол соперницы — из таблицы, мир их слушается, код не читает их мимо. Самопроверки краснеют.
set -u
. "$(dirname "${BASH_SOURCE[0]}")/../check_mode.sh"; run_in fast || exit 0
command -v node >/dev/null || { echo "  нет node — проверить нечем"; exit 1; }
timeout 60 node proby/zaplyv/kaplya/test_boj_tablica.mjs || exit 1
