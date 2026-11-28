#!/usr/bin/env bash
# kaplya_pustye_krugi: нет пустого кольца джойстика, тёмных пустых портретов и пузырей-колец (уроки L133, L134); proby/zaplyv/kaplya/test_pustye_krugi.cjs.
# Самопроверка (kaplyaStaryjKrugDzh, kaplyaStaryePortrety, kaplyaStaryePuzyri) краснеет.
set -u
. "$(dirname "${BASH_SOURCE[0]}")/../check_mode.sh"; run_in fast || exit 0
command -v node >/dev/null || { echo "  нет node — проверить нечем"; exit 1; }
. tools/web/kaplya_pw.sh; [ -f "$PW" ] || { echo "  нет playwright — проверить нечем"; exit 1; }
timeout 300 node proby/zaplyv/kaplya/test_pustye_krugi.cjs || exit 1
