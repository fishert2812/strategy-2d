#!/usr/bin/env bash
# mir_dolgo: мир живёт сам долго (proby/zaplyv/test_mir_dolgo.mjs) — полчаса капли без игрока ни один вид не забирает каплю и не вымирает,
# шаг мира с экраном в фокусе укладывается в кадр телефона. Пороги — mir.json «dolgo». Самопроверка (полный режим): сытный ил и обводы везде
# обязаны покраснеть.
set -u
. "$(dirname "${BASH_SOURCE[0]}")/../check_mode.sh"; run_in fast || exit 0
command -v node >/dev/null || { echo "  нет node — мир проверить нечем"; exit 1; }
timeout 420 node proby/zaplyv/test_mir_dolgo.mjs || exit 1
if [ "${CHECK_FULL:-}" = 1 ]; then MIR_DOLGO_SAMO=1 timeout 420 node proby/zaplyv/test_mir_dolgo.mjs || exit 1; fi
