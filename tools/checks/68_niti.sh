#!/usr/bin/env bash
# niti: жгутики и ворс рисуются одной гладкой трубкой на нить (body3d.niti), все нити кадра — одна сетка; без стыков-рисок у звеньев.
# Самопроверка: если из трубки выпала одна грань, test_niti_odna_trubka обязан покраснеть.
set -u
. "$(dirname "${BASH_SOURCE[0]}")/../check_mode.sh"; run_in fast || exit 0
command -v node >/dev/null || { echo "  нет node — нити проверить нечем"; exit 1; }
timeout 60 node proby/zaplyv/test_niti.mjs 2>/dev/null || exit 1 # предупреждения three.js (stderr) не нужны
off=$(NITI_LOMAT=1 timeout 60 node proby/zaplyv/test_niti.mjs 2>&1)
if grep -q 'ПРОВАЛ test_niti_odna_trubka' <<<"$off"; then
  echo "  самопроверка: выпала грань — test_niti_odna_trubka красный (так и должно быть)"
else
  echo "  САМОПРОВЕРКА: из трубки выпала грань, а test_niti_odna_trubka зелёный — проверка ничего не доказывает"; exit 1
fi
