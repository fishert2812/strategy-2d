#!/usr/bin/env bash
# kaplya_kartinki: у карточек умений снимки клетки из движка (Роман 26.11 21:43; proby/zaplyv/kaplya/test_kartinki.mjs).
set -u
. "$(dirname "${BASH_SOURCE[0]}")/../check_mode.sh"; run_in fast || exit 0
command -v node >/dev/null || { echo "  нет node — проверить нечем"; exit 1; }
timeout 60 node proby/zaplyv/kaplya/test_kartinki.mjs || exit 1
