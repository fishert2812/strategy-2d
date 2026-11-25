#!/usr/bin/env bash
# sposobnost: каждая из способностей sposobnosti.json получает вид по общим правилам признаков (proby/zaplyv/sposobnost.js) и проигрывается
# только принятыми заготовками на любом существе. Самопроверка: «налив» объявлен принятым — test_sposobnost_tolko_prinyatye обязан покраснеть.
set -u
. "$(dirname "${BASH_SOURCE[0]}")/../check_mode.sh"; run_in fast || exit 0
command -v node >/dev/null || { echo "  нет node — способности проверить нечем"; exit 1; }
timeout 120 node proby/zaplyv/test_sposobnost.mjs || exit 1
off=$(SPOSOB_LOMAT=1 timeout 120 node proby/zaplyv/test_sposobnost.mjs 2>&1)
if grep -q 'ПРОВАЛ test_sposobnost_tolko_prinyatye' <<<"$off"; then
  echo "  самопроверка: непринятый налив в проигрыше — test_sposobnost_tolko_prinyatye красный (так и должно быть)"
else
  echo "  САМОПРОВЕРКА: налив без приёмки пошёл в проигрыш, а test_sposobnost_tolko_prinyatye зелёный — проверка ничего не доказывает"; exit 1
fi
