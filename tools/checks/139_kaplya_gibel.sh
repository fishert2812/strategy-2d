#!/usr/bin/env bash
# kaplya_gibel: экран гибели «Капли» называет того, кто убил (блок В.1; proby/zaplyv/kaplya/test_gibel.cjs).
# У каждого, кто может убить, есть имя и снимок; сверло — на том, в ком сверлила; значки игры не закрывают кнопки. Самопроверки краснеют.
set -u
. "$(dirname "${BASH_SOURCE[0]}")/../check_mode.sh"; run_in fast || exit 0
command -v node >/dev/null || { echo "  нет node — проверить нечем"; exit 1; }
. tools/web/kaplya_pw.sh; [ -f "$PW" ] || { echo "  нет playwright — проверить нечем"; exit 1; }
timeout 300 node proby/zaplyv/kaplya/test_gibel.cjs || exit 1
