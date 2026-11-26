#!/usr/bin/env bash
# kaplya_kormyozhka: сторож добычи по росту «Капли» (книга П35; proby/zaplyv/kaplya/test_kormyozhka.mjs).
# Вокруг клетки любой массы есть добыча 0,3–0,55 её массы, вид меняется с ростом; самопроверка краснеет.
set -u
. "$(dirname "${BASH_SOURCE[0]}")/../check_mode.sh"; run_in fast || exit 0
command -v node >/dev/null || { echo "  нет node — проверить нечем"; exit 1; }
timeout 60 node proby/zaplyv/kaplya/test_kormyozhka.mjs || exit 1
