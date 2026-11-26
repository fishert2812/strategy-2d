#!/usr/bin/env bash
# kaplya_stroki: сторож строк форка без рода (proby/zaplyv/kaplya/test_stroki.mjs), книга П125, П11.
# В текстах kaplya.json и строках say() нет глаголов прошедшего времени про игрока; самопроверки — «Ты съела», «Уснула!» ловятся.
set -u
. "$(dirname "${BASH_SOURCE[0]}")/../check_mode.sh"; run_in fast || exit 0
command -v node >/dev/null || { echo "  нет node — проверить нечем"; exit 1; }
timeout 60 node proby/zaplyv/kaplya/test_stroki.mjs || exit 1
