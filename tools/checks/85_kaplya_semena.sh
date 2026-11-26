#!/usr/bin/env bash
# kaplya_semena: сторож семян рода форка (proby/zaplyv/kaplya/test_semena.mjs), книга П76, П94.
# Семена: защита от убийцы и умения прошлого тела, впереди по курсу, одно берёшь касанием; самопроверка — без защиты ловится.
set -u
. "$(dirname "${BASH_SOURCE[0]}")/../check_mode.sh"; run_in fast || exit 0
command -v node >/dev/null || { echo "  нет node — проверить нечем"; exit 1; }
timeout 60 node proby/zaplyv/kaplya/test_semena.mjs || exit 1
