#!/usr/bin/env bash
# kaplya_kraj_strelka: знак очага у края экрана, нижняя строка не мигает, тревога о том, кто держит (урок L137); proby/zaplyv/kaplya/test_kraj_strelka.cjs.
# Самопроверка (kaplyaStarayaStrelka, kaplyaStaroeMiganie, kaplyaStarayaTrevogaKto) краснеет.
set -u
. "$(dirname "${BASH_SOURCE[0]}")/../check_mode.sh"; run_in fast || exit 0
command -v node >/dev/null || { echo "  нет node — проверить нечем"; exit 1; }
. tools/web/kaplya_pw.sh; [ -f "$PW" ] || { echo "  нет playwright — проверить нечем"; exit 1; }
timeout 300 node proby/zaplyv/kaplya/test_kraj_strelka.cjs || exit 1
