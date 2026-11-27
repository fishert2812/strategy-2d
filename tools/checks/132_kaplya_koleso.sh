#!/usr/bin/env bash
# kaplya_koleso: сторож колеса стаи и перелива массы «Капли» (pravki_po_blokam.md Е.3 п. 9–12, Е.4; proby/zaplyv/kaplya/test_koleso.mjs).
# После обмена твоя масса прежняя, ген и темп копии твои, прежнее тело в стае; камера на большом; копию съели — масса твоя; схватили — обрыв и повтор; цели колеса не меньше 44 точек.
# В игре (колесо, отмена, перелив) проверяет test_menyu_staya.cjs в шаге 118. Самопроверки краснеют.
set -u
. "$(dirname "${BASH_SOURCE[0]}")/../check_mode.sh"; run_in fast || exit 0
command -v node >/dev/null || { echo "  нет node — проверить нечем"; exit 1; }
timeout 60 node proby/zaplyv/kaplya/test_koleso.mjs || exit 1
