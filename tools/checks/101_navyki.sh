#!/usr/bin/env bash
# navyki: умения видны на теле клетки (proby/zaplyv/test_navyki.mjs), Роман 26.11 21:10: «Визуальное улучшение должно происходить- чтобы игрок понимал что ему дали».
# Каждый уровень умения меняет запись клетки, у каждого умения есть снимок-образец на стенде; самопроверка — пустое умение ловится.
set -u
. "$(dirname "${BASH_SOURCE[0]}")/../check_mode.sh"; run_in fast || exit 0
command -v node >/dev/null || { echo "  нет node — проверить нечем"; exit 1; }
timeout 60 node proby/zaplyv/test_navyki.mjs || exit 1
