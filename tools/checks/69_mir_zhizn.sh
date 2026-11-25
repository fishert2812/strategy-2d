#!/usr/bin/env bash
# mir_zhizn: живой мир записью (proby/zaplyv/mir_zhizn.js) — существа из записей едят, растут, делятся, гибнут и охотятся по общим
# правилам зон; мир живёт 10 минут сам, вещество не берётся из ничего. Самопроверка: без правил встреч никто никого не ест,
# и test_mir_zhivet обязан покраснеть.
set -u
. "$(dirname "${BASH_SOURCE[0]}")/../check_mode.sh"; run_in fast || exit 0
command -v node >/dev/null || { echo "  нет node — мир проверить нечем"; exit 1; }
timeout 240 node proby/zaplyv/test_mir_zhizn.mjs || exit 1
off=$(MIR_LOMAT=1 timeout 240 node proby/zaplyv/test_mir_zhizn.mjs 2>&1)
if grep -q 'ПРОВАЛ test_mir_zhivet' <<<"$off"; then
  echo "  самопроверка: без правил встреч — test_mir_zhivet красный (так и должно быть)"
else
  echo "  САМОПРОВЕРКА: правила встреч выключены, а test_mir_zhivet зелёный — проверка ничего не доказывает"; exit 1
fi
