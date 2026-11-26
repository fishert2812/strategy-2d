#!/usr/bin/env bash
# kaplya_miganie: сторож мигания «Капли» (proby/zaplyv/kaplya/test_miganie.cjs). Роман 26.11: «Почему экран мигает?» — снимок Альманаха
# показывался на кадр вместо мира. Сторож читает каждый кадр холста и ловит вспышку или чёрный кадр; самопроверка — снимок без защиты он обязан поймать.
set -u
. "$(dirname "${BASH_SOURCE[0]}")/../check_mode.sh"; run_in fast || exit 0
command -v node >/dev/null || { echo "  нет node — мигание проверить нечем"; exit 1; }
timeout 240 node proby/zaplyv/kaplya/test_miganie.cjs || exit 1
