#!/usr/bin/env bash
# kaplya_karta: сторож карточек умений (Ш20, proby/zaplyv/kaplya/test_karta.cjs). Роман 26.11 21:10: «Пускай все таки карточки высвечиваются. И ты их выбираешь. Тапом».
# Пока лежат карточки, мир стоит; на каждой снимок, имя и строка; одно касание берёт; «Глотать» карточкой. Самопроверка — карточки без паузы ловятся.
set -u
. "$(dirname "${BASH_SOURCE[0]}")/../check_mode.sh"; run_in fast || exit 0
command -v node >/dev/null || { echo "  нет node — карточки проверить нечем"; exit 1; }
. tools/web/kaplya_pw.sh; [ -f "$PW" ] || { echo "  нет playwright — проверить нечем"; exit 1; }
timeout 300 node proby/zaplyv/kaplya/test_karta.cjs || exit 1
