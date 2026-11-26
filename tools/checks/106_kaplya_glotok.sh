#!/usr/bin/env bash
# kaplya_glotok: строка о проглоченном жителе говорит выгоду числом (Роман 26.11 22:20 «Что дает то это все? Не понимаю»; proby/zaplyv/kaplya/test_glotok.mjs).
set -u
. "$(dirname "${BASH_SOURCE[0]}")/../check_mode.sh"; run_in fast || exit 0
command -v node >/dev/null || { echo "  нет node — проверить нечем"; exit 1; }
timeout 60 node proby/zaplyv/kaplya/test_glotok.mjs || exit 1
