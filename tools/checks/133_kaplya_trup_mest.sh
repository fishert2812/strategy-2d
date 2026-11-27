#!/usr/bin/env bash
# kaplya_trup_mest: сторож серого тела, «Глотать» пузырём и мести обидчику «Капли» (pravki_po_blokam.md Ж.3, Ж.4, Д.9; proby/zaplyv/kaplya/test_trup.mjs, test_mest.mjs).
# Убитый лежит trup.t секунд и лопается; с «Глотать» мелкое мёртвое втягивается и тает внутри; крупное не берётся. Кто тебя убил — обидчик; оружие, что его берёт, — «по зубам»; победа — «отомщено». Самопроверки краснеют.
set -u
. "$(dirname "${BASH_SOURCE[0]}")/../check_mode.sh"; run_in fast || exit 0
command -v node >/dev/null || { echo "  нет node — проверить нечем"; exit 1; }
timeout 60 node proby/zaplyv/kaplya/test_trup.mjs || exit 1
timeout 60 node proby/zaplyv/kaplya/test_mest.mjs || exit 1
