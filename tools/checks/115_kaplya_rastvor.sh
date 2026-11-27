#!/usr/bin/env bash
# kaplya_rastvor: сторож растворения, «Глотать» по размеру и слабого старта «Капли» (kolonia_eda_boy.md Ш29–Ш31; proby/zaplyv/kaplya/test_rastvor.mjs).
# «Глотать 1» берёт целиком только мелкое, крупное тает у оболочки и отпадает, если уплыть; на старте четыре вида быстрее тебя. Самопроверки краснеют.
set -u
. "$(dirname "${BASH_SOURCE[0]}")/../check_mode.sh"; run_in fast || exit 0
command -v node >/dev/null || { echo "  нет node — проверить нечем"; exit 1; }
timeout 60 node proby/zaplyv/kaplya/test_rastvor.mjs || exit 1
