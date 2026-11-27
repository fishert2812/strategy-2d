#!/usr/bin/env bash
# kaplya_glava: сторож цели главы «Очисти каплю» (pravki_po_blokam.md блок Ц; proby/zaplyv/kaplya/test_glava.mjs).
# Очаги синегнойки растут сами; убил клетку очага — его сила −1 и копия рода; все вычищены — победа; зараза заняла каплю — поражение. Самопроверка краснеет.
set -u
. "$(dirname "${BASH_SOURCE[0]}")/../check_mode.sh"; run_in fast || exit 0
command -v node >/dev/null || { echo "  нет node — проверить нечем"; exit 1; }
timeout 60 node proby/zaplyv/kaplya/test_glava.mjs || exit 1
