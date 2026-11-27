#!/usr/bin/env bash
# kaplya_ugroza: кромка угрозы «Капли» (блок В.2; proby/zaplyv/kaplya/test_ugroza.mjs). Игроки 3b2484a: «Смерть есть, а удара нет».
# Кромка горит у того, кто идёт на тебя; каждый охотник с края кадра к удару горит не меньше za с и мигает; у воронок — с края тяги. Самопроверки краснеют.
set -u
. "$(dirname "${BASH_SOURCE[0]}")/../check_mode.sh"; run_in fast || exit 0
command -v node >/dev/null || { echo "  нет node — проверить нечем"; exit 1; }
timeout 60 node proby/zaplyv/kaplya/test_ugroza.mjs || exit 1
