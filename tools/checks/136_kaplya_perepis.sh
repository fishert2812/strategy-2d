#!/usr/bin/env bash
# kaplya_perepis: перепись жителей «Капли» (блок К, Роман 27.11 14:44: «в игре у меня 11 существ - нужно доабавиь много существ в каплю»; proby/zaplyv/kaplya/test_perepis.mjs).
# Пять партий новичка по 10 минут без рисования: в каждой не меньше 16 видов в кадре; каулобактеры с бродяжками не плодятся без предела. Самопроверки краснеют.
set -u
. "$(dirname "${BASH_SOURCE[0]}")/../check_mode.sh"; run_in fast || exit 0
command -v node >/dev/null || { echo "  нет node — проверить нечем"; exit 1; }
timeout 300 node proby/zaplyv/kaplya/test_perepis.mjs || exit 1
