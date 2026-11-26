#!/usr/bin/env bash
# kaplya_genom_dnk: сторож экрана генов спиралью ДНК «Капли» (proby/zaplyv/kaplya/test_genom_dnk.cjs). Роман 26.11 22:05: «экран где у нас гены
# сделать тоже ДНК… нажатие подсвечивало участок ДНК… приближая и разбирая ДНК». Каждый ген — виток, касание наезжает и расплетает, карточка того же гена.
# Самопроверка — раскладка, потерявшая ген, ловится.
set -u
. "$(dirname "${BASH_SOURCE[0]}")/../check_mode.sh"; run_in fast || exit 0
command -v node >/dev/null || { echo "  нет node — проверить нечем"; exit 1; }
. tools/web/kaplya_pw.sh; [ -f "$PW" ] || { echo "  нет playwright — проверить нечем"; exit 1; }
timeout 120 node proby/zaplyv/kaplya/test_genom_dnk.cjs || exit 1
