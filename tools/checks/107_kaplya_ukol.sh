#!/usr/bin/env bash
# kaplya_ukol: сторож Ш3 «кто колет тебя» (kolonia_eda_boy.md, законы З2–З3; proby/zaplyv/kaplya/test_ukol.mjs).
# Гарпун соперницы бьёт по геному, а не по массе: ровню убивают не раньше 4 уколов, большую не убивают 10, без урона геном лечится; самопроверка — удар по массе краснеет.
set -u
. "$(dirname "${BASH_SOURCE[0]}")/../check_mode.sh"; run_in fast || exit 0
command -v node >/dev/null || { echo "  нет node — проверить нечем"; exit 1; }
timeout 60 node proby/zaplyv/kaplya/test_ukol.mjs || exit 1
