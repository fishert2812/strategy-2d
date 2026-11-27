#!/usr/bin/env bash
# kaplya_novye_zhiteli: новые жители «Капли» (блок К п. 3; proby/zaplyv/kaplya/test_novye_zhiteli.mjs).
# Дидиний ловит туфельку, тебя-малышку не берёт; воронка трубача тянет, полным ходом уходишь; большая амёба берёт подросшую. Самопроверки краснеют.
set -u
. "$(dirname "${BASH_SOURCE[0]}")/../check_mode.sh"; run_in fast || exit 0
command -v node >/dev/null || { echo "  нет node — проверить нечем"; exit 1; }
timeout 60 node proby/zaplyv/kaplya/test_novye_zhiteli.mjs || exit 1
