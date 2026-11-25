#!/usr/bin/env bash
# povedenie: поведение существ без игрока (proby/zaplyv/povedenie.js, числа povedenie.json; карта движка, кусок 5) —
# одни правила на всех: бежит от крупного, гонится за мелким, ест, отдыхает сытым, тянется к своим, идёт по полю, бродит;
# разъезд семьи в тесноте (Г36) и поиск бурого комка носом без пальца (Г44), палец главнее.
# Самопроверка: с анкетой без страха, охоты, разъезда и носа (POV_LOMAT=1) test_pov_ubegaet, test_pov_ohota, test_pov_razezd и test_pov_nos обязаны покраснеть.
set -u
. "$(dirname "${BASH_SOURCE[0]}")/../check_mode.sh"; run_in fast || exit 0
command -v node >/dev/null || { echo "  нет node — поведение проверить нечем"; exit 1; }
timeout 60 node proby/zaplyv/test_povedenie.mjs || exit 1
off=$(POV_LOMAT=1 timeout 60 node proby/zaplyv/test_povedenie.mjs 2>&1)
for t in ubegaet ohota razezd nos; do
  grep -q "ПРОВАЛ test_pov_$t" <<<"$off" || { echo "  САМОПРОВЕРКА: правило выключено, а test_pov_$t зелёный — он ничего не доказывает"; exit 1; }
done
echo "  самопроверка: без страха, охоты, разъезда и носа в анкете их проверки красные (так и должно быть)"
