#!/usr/bin/env bash
# zakony: законы движка (proby/zaplyv/zakony.js) — скорость, разворот, снос, питание, цена жизни, прочность и рост любого существа
# считаются из его записи; при записи эталона все отношения равны 1. Самопроверка: если тяга не зависит от жгутиков,
# test_zakony_zhgutiki обязан покраснеть.
set -u
. "$(dirname "${BASH_SOURCE[0]}")/../check_mode.sh"; run_in fast || exit 0
command -v node >/dev/null || { echo "  нет node — законы проверить нечем"; exit 1; }
timeout 60 node proby/zaplyv/test_zakony.mjs || exit 1
off=$(ZAKONY_LOMAT=1 timeout 60 node proby/zaplyv/test_zakony.mjs 2>&1)
if grep -q 'ПРОВАЛ test_zakony_zhgutiki' <<<"$off"; then
  echo "  самопроверка: тяга без жгутиков — test_zakony_zhgutiki красный (так и должно быть)"
else
  echo "  САМОПРОВЕРКА: тяга не зависит от жгутиков, а test_zakony_zhgutiki зелёный — проверка ничего не доказывает"; exit 1
fi
# куда приложена тяга (25.11, хозяин движка): если тяга всегда на оси, жгутик сбоку не гнёт путь — test_zakony_tyaga_mesto обязан покраснеть
off=$(TYAGA_LOMAT=1 timeout 60 node proby/zaplyv/test_zakony.mjs 2>&1)
if grep -q 'ПРОВАЛ test_zakony_tyaga_mesto' <<<"$off"; then
  echo "  самопроверка: тяга всегда на оси — test_zakony_tyaga_mesto красный (так и должно быть)"
else
  echo "  САМОПРОВЕРКА: тяга всегда на оси, а test_zakony_tyaga_mesto зелёный — проверка ничего не доказывает"; exit 1
fi
