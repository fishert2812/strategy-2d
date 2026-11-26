#!/usr/bin/env bash
# kaplya_boj: сторож одной таблицы боя «кто кого и чем» (proby/zaplyv/kaplya/test_boj.mjs, kaplya.json «boj»). Роман 26.11 21:05: «без оружия ты безмозен даже перед омегой»;
# 21:42: «приведи в порядок… Надо ведь упрощать себе жизнь». «Яд» и «Нить-игла» убивают ровню не дольше 10 с, без оружия ровня жива; строки таблицы полны;
# новый житель бьётся строкой. Самопроверки — мгновенный яд, ручной яд мимо таблицы и строка без силы ловятся.
set -u
. "$(dirname "${BASH_SOURCE[0]}")/../check_mode.sh"; run_in fast || exit 0
command -v node >/dev/null || { echo "  нет node — проверить нечем"; exit 1; }
timeout 120 node proby/zaplyv/kaplya/test_boj.mjs || exit 1
