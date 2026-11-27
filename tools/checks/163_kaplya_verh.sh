#!/usr/bin/env bash
# kaplya_verh: поверх паузы, «Генома», «Гибели» и итога нет кнопки «Яд», карточки и столбиков игры (урок L098; proby/zaplyv/kaplya/test_verh.cjs).
# Самопроверка (body.staryjVerh) краснеет.
set -u
. "$(dirname "${BASH_SOURCE[0]}")/../check_mode.sh"; run_in fast || exit 0
command -v node >/dev/null || { echo "  нет node — проверить нечем"; exit 1; }
. tools/web/kaplya_pw.sh; [ -f "$PW" ] || { echo "  нет playwright — проверить нечем"; exit 1; }
timeout 300 node proby/zaplyv/kaplya/test_verh.cjs || exit 1
