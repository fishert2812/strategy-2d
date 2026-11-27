#!/usr/bin/env bash
# kaplya_ameba_vtoroj: съела амёба, копия была в ней — просыпаешься за её краем, амёба сыта (урок L116; proby/zaplyv/kaplya/test_ameba_vtoroj.cjs).
# Самопроверка (window.kaplyaStaroeProbuzhdenie) краснеет.
set -u
. "$(dirname "${BASH_SOURCE[0]}")/../check_mode.sh"; run_in fast || exit 0
command -v node >/dev/null || { echo "  нет node — проверить нечем"; exit 1; }
. tools/web/kaplya_pw.sh; [ -f "$PW" ] || { echo "  нет playwright — проверить нечем"; exit 1; }
timeout 600 node proby/zaplyv/kaplya/test_ameba_vtoroj.cjs || exit 1
