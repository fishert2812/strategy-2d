#!/usr/bin/env bash
# pravila: правила взаимодействия «Заплыва» (proby/zaplyv/pravila_mira.js, записи pravila_mira.json) — записи полны,
# клетка ест и грызёт по записям, новое взаимодействие получается одной записью без кода.
# Самопроверка: с нарочно испорченной записью test_pravila_zapisi обязан покраснеть.
set -u
. "$(dirname "${BASH_SOURCE[0]}")/../check_mode.sh"; run_in fast || exit 0
command -v node >/dev/null || { echo "  нет node — правила взаимодействия проверить нечем"; exit 1; }
timeout 120 node proby/zaplyv/test_pravila.mjs || exit 1
off=$(PRAVILA_LOMAT=1 timeout 120 node proby/zaplyv/test_pravila.mjs 2>&1)
if grep -q 'ПРОВАЛ test_pravila_zapisi' <<<"$off"; then
  echo "  самопроверка: испорченное правило поймано — test_pravila_zapisi красный (так и должно быть)"
else
  echo "  САМОПРОВЕРКА: правило испорчено, а test_pravila_zapisi зелёный — проверка ничего не доказывает"; exit 1
fi
