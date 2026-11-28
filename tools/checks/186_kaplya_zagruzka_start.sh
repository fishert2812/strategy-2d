#!/usr/bin/env bash
# kaplya_zagruzka_start: загрузочный экран «Капли» не замедляет старт игры (proby/zaplyv/kaplya/test_zagruzka_start.cjs).
# Урок 28.11: живая 3D-спираль загрузки (#556) замедлила старт игры в 10 раз и была откачена. Первый кадр игры и кадры за 7 с
# с загрузкой не хуже, чем без неё. Самопроверка — нарочно тяжёлая загрузка обязана провалить замер.
set -u
. "$(dirname "${BASH_SOURCE[0]}")/../check_mode.sh"; run_in fast || exit 0
command -v node >/dev/null || { echo "  нет node — проверить нечем"; exit 1; }
. tools/web/kaplya_pw.sh; [ -f "$PW" ] || { echo "  нет playwright — проверить нечем"; exit 1; }
timeout 200 node proby/zaplyv/kaplya/test_zagruzka_start.cjs || exit 1
