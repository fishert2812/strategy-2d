#!/usr/bin/env bash
# evo: режим «Эволюция» «Заплыва» (proby/zaplyv/evo.js, числа evo.json; план design/zaplyv_rezhim_evolyuciya.md) —
# рост «Роста» без предела и выбор новой способности на каждом росте; умения семьи одной клетке не предлагают.
# Самопроверка: те же заплывы в «Росте» (EVO_OFF=1) — доказательство test_evo_vybor обязано покраснеть.
set -u
command -v node >/dev/null || { echo "  нет node — режим «Эволюция» проверить нечем"; exit 1; }
timeout 300 node proby/zaplyv/test_evo.mjs || exit 1
off=$(EVO_OFF=1 timeout 300 node proby/zaplyv/test_evo.mjs 2>&1)
if grep -q 'ПРОВАЛ test_evo_vybor' <<<"$off"; then
  echo "  самопроверка: в «Росте» выбора на росте нет — test_evo_vybor красный (так и должно быть)"
else
  echo "  САМОПРОВЕРКА: режим выключен, а test_evo_vybor зелёный — проверка ничего не доказывает"; exit 1
fi
