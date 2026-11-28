#!/usr/bin/env bash
# kaplya_tiho: в тихой воде охотники не охотятся, и крупные тоже (урок L130); proby/zaplyv/kaplya/test_tiho.cjs.
# Самопроверка (globalThis.kaplyaStarayaTihaya) краснеет.
set -u
. "$(dirname "${BASH_SOURCE[0]}")/../check_mode.sh"; run_in fast || exit 0
command -v node >/dev/null || { echo "  нет node — проверить нечем"; exit 1; }
. tools/web/kaplya_pw.sh; [ -f "$PW" ] || { echo "  нет playwright — проверить нечем"; exit 1; }
timeout 300 node proby/zaplyv/kaplya/test_tiho.cjs || exit 1
