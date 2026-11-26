#!/usr/bin/env bash
# kaplya_rost: сторож роста форка (proby/zaplyv/kaplya/test_rost.mjs), книга П49, П51, П54.
# Длина 2 мкм × масса^(1/3), вехи один раз навсегда, +10 % к худению за умение; самопроверка — «Глотать» умением не считается.
set -u
. "$(dirname "${BASH_SOURCE[0]}")/../check_mode.sh"; run_in fast || exit 0
command -v node >/dev/null || { echo "  нет node — проверить нечем"; exit 1; }
timeout 60 node proby/zaplyv/kaplya/test_rost.mjs || exit 1
