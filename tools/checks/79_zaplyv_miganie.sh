#!/usr/bin/env bash
# zaplyv_miganie: сторож мигания «Заплыва» (tools/web/test_miganie.cjs), образец — сторож «Капли» (78_kaplya_miganie.sh). Роман 26.11: «Почему экран мигает?» —
# снимок Альманаха вне кадра показывался на кадр вместо мира. Сторож читает каждый кадр холста; самопроверка — снимок без защиты он обязан поймать.
set -u
. "$(dirname "${BASH_SOURCE[0]}")/../check_mode.sh"; run_in fast || exit 0
command -v node >/dev/null || { echo "  нет node — мигание проверить нечем"; exit 1; }
timeout 240 node tools/web/test_miganie.cjs || exit 1
