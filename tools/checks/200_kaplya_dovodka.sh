#!/usr/bin/env bash
# kaplya_dovodka: доводка по живой партии 28.11 — пустая плашка стаи не висит мазком (L160), «Бодо рядом!» не мигает (L161),
# строка о новой части копии согласована (L162), цель яда не заливается белым (L163); proby/zaplyv/kaplya/test_dovodka.mjs и test_pustaya_plashka.cjs. Самопроверки на старом краснеют.
set -u
. "$(dirname "${BASH_SOURCE[0]}")/../check_mode.sh"; run_in fast || exit 0
command -v node >/dev/null || { echo "  нет node — проверить нечем"; exit 1; }
node proby/zaplyv/kaplya/test_dovodka.mjs || exit 1
. tools/web/kaplya_pw.sh; [ -f "$PW" ] || { echo "  нет playwright — проверить нечем"; exit 1; }
timeout 300 node proby/zaplyv/kaplya/test_pustaya_plashka.cjs || exit 1
