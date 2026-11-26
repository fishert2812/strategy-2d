#!/usr/bin/env bash
# rost: режим «Рост» «Заплыва» (proby/zaplyv/rost.js, числа rost.json) — клетка не делится и растёт без потолка, каждый рост дольше,
# еда открывается по ростам, выросшую не берут мелкие пасти; обычный заплыв как был.
# Самопроверка темпа: при сытости втрое меньше и втрое больше test_rost_temp обязан покраснеть (сторож с двух сторон).
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
for v in 0.06 0.54; do
  t=$(ROST_SYTOST=$v timeout 300 node proby/zaplyv/test_rost.mjs 2>&1)
  grep -q 'ПРОВАЛ test_rost_temp' <<<"$t" || { echo "  САМОПРОВЕРКА: при сытости $v test_rost_temp зелёный — сторож темпа не видит перекоса"; exit 1; }
done
echo "  самопроверка: при сытости втрое меньше и втрое больше test_rost_temp красный (так и должно быть)"
g=$(ROST_GRYZT=1e9 timeout 300 node proby/zaplyv/test_rost.mjs 2>&1)
grep -q 'ПРОВАЛ test_rost_bolshaya_ne_vyaznet' <<<"$g" || { echo "  САМОПРОВЕРКА: любой комок тормозит, а test_rost_bolshaya_ne_vyaznet зелёный — сторож хода большой клетки слепой"; exit 1; }
echo "  самопроверка: когда тормозит любой комок, test_rost_bolshaya_ne_vyaznet красный (так и должно быть)"
