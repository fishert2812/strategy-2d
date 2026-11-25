#!/usr/bin/env bash
# povedenie: поведение существ без игрока (proby/zaplyv/povedenie.js, числа povedenie.json; карта движка, кусок 5) —
# одни правила на всех: бежит от крупного, гонится за мелким, ест, отдыхает сытым, тянется к своим, идёт по полю, бродит.
# Самопроверка: с анкетой без страха и охоты (POV_LOMAT=1) test_pov_ubegaet и test_pov_ohota обязаны покраснеть.
set -u
. "$(dirname "${BASH_SOURCE[0]}")/../check_mode.sh"; run_in fast || exit 0
command -v node >/dev/null || { echo "  нет node — поведение проверить нечем"; exit 1; }
timeout 60 node proby/zaplyv/test_povedenie.mjs || exit 1
off=$(POV_LOMAT=1 timeout 60 node proby/zaplyv/test_povedenie.mjs 2>&1)
if grep -q 'ПРОВАЛ test_pov_ubegaet' <<<"$off" && grep -q 'ПРОВАЛ test_pov_ohota' <<<"$off"; then
  echo "  самопроверка: без страха и охоты в анкете test_pov_ubegaet и test_pov_ohota красные (так и должно быть)"
else
  echo "  САМОПРОВЕРКА: страх и охота выключены, а проверки зелёные — они ничего не доказывают"; exit 1
fi
