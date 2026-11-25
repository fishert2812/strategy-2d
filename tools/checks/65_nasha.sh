#!/usr/bin/env bash
# nasha: наша клетка целиком из частей движка (proby/zaplyv/vid_chasti.js, запись vidy.nasha) — все части на месте, нити сплошные
# в покое и на ходу, слои оболочки ровно один в другом, нутро внутри; в конструкторе образец она, ползунки меняют её части.
# Самопроверка: с рваной нитью test_nasha_niti обязан покраснеть.
set -u
. "$(dirname "${BASH_SOURCE[0]}")/../check_mode.sh"; run_in fast || exit 0
command -v node >/dev/null || { echo "  нет node — нашу клетку проверить нечем"; exit 1; }
timeout 60 node proby/zaplyv/test_nasha.mjs || exit 1
off=$(NASHA_LOMAT=1 timeout 60 node proby/zaplyv/test_nasha.mjs 2>&1)
if grep -q 'ПРОВАЛ test_nasha_niti' <<<"$off"; then
  echo "  самопроверка: с рваной нитью test_nasha_niti красный (так и должно быть)"
else
  echo "  САМОПРОВЕРКА: нить порвана, а test_nasha_niti зелёный — проверка ничего не доказывает"; exit 1
fi
off=$(NASHA_OTORVAT=1 timeout 60 node proby/zaplyv/test_nasha.mjs 2>&1)
if grep -q 'ПРОВАЛ test_nasha_matrica' <<<"$off"; then
  echo "  самопроверка: жгутики оторваны от тела — test_nasha_matrica красный (так и должно быть)"
else
  echo "  САМОПРОВЕРКА: жгутики оторваны от тела, а test_nasha_matrica зелёный — проверка ничего не доказывает"; exit 1
fi
