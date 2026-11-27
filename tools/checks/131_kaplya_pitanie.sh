#!/usr/bin/env bash
# kaplya_pitanie: лестница питания «Капли» (Роман 27.11 14:48; 26.11 23:08; pravki_po_blokam.md Ж.3; proby/zaplyv/kaplya/test_pitanie.mjs).
# «Глотать» не первой и не второй картой и только после «Плотоядного»; «Плотоядный» после оружия; точки убитого всасывает только он, сытнее. Самопроверки краснеют.
set -u
. "$(dirname "${BASH_SOURCE[0]}")/../check_mode.sh"; run_in fast || exit 0
command -v node >/dev/null || { echo "  нет node — проверить нечем"; exit 1; }
timeout 60 node proby/zaplyv/kaplya/test_pitanie.mjs || exit 1
