#!/usr/bin/env bash
# rost: режим «Рост» «Заплыва» (proby/zaplyv/rost.js, числа rost.json) — клетка не делится и растёт без потолка, каждый рост дольше,
# еда открывается по ростам, выросшую не берут мелкие пасти; обычный заплыв как был.
# Самопроверка: те же проверки в обычном заплыве (ROST_OFF=1) — доказательства test_rost_pasti и test_rost_plavno обязаны покраснеть.
set -u
command -v node >/dev/null || { echo "  нет node — режим роста проверить нечем"; exit 1; }
timeout 300 node proby/zaplyv/test_rost.mjs || exit 1
off=$(ROST_OFF=1 timeout 300 node proby/zaplyv/test_rost.mjs 2>&1)
if grep -q 'ПРОВАЛ test_rost_pasti' <<<"$off" && grep -q 'ПРОВАЛ test_rost_plavno' <<<"$off"; then
  echo "  самопроверка: без режима выросшую съедают и масса прыгает — test_rost_pasti и test_rost_plavno красные (так и должно быть)"
else
  echo "  САМОПРОВЕРКА: режим выключен, а test_rost_pasti зелёный — проверка ничего не доказывает"; exit 1
fi
