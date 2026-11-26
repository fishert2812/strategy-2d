#!/usr/bin/env bash
# vors: ворс без щели на любом теле (proby/zaplyv/test_vors.mjs) — записи движка стоят на общем теле и общем ворсе, запись живой игры
# (пометка igra) в листы движка не идёт. Самопроверка внутри: прежняя туфелька с ресничками пучками обязана покраснеть.
set -u
. "$(dirname "${BASH_SOURCE[0]}")/../check_mode.sh"; run_in fast || exit 0
command -v node >/dev/null || { echo "  нет node — ворс проверить нечем"; exit 1; }
timeout 60 node proby/zaplyv/test_vors.mjs || exit 1
