#!/usr/bin/env bash
# kaplya_zagruzka: сторож загрузочного экрана «Капли» (proby/zaplyv/kaplya/test_zagruzka.cjs). Роман 26.11 22:02: «загрузка идет какое то время
# черным экраном сделай - какой то загрузочный экран!… ДНК». Пока игра грузится, видна спираль, она растёт, а когда игра пошла — уходит.
# Самопроверка — страница без загрузочного экрана обязана дать «чёрный экран».
set -u
. "$(dirname "${BASH_SOURCE[0]}")/../check_mode.sh"; run_in fast || exit 0
command -v node >/dev/null || { echo "  нет node — проверить нечем"; exit 1; }
. tools/web/kaplya_pw.sh; [ -f "$PW" ] || { echo "  нет playwright — проверить нечем"; exit 1; }
timeout 120 node proby/zaplyv/kaplya/test_zagruzka.cjs || exit 1
