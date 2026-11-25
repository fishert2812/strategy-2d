#!/usr/bin/env bash
# zony: зоны на теле существа (proby/zaplyv/zony.js) — рот, оболочка, посадка, сцепка, удар сидят на контуре тела и едут за формой;
# касание двух существ называет пару зон. Самопроверка: если рот переставить на корму, test_zony_mesto обязан покраснеть.
set -u
. "$(dirname "${BASH_SOURCE[0]}")/../check_mode.sh"; run_in fast || exit 0
command -v node >/dev/null || { echo "  нет node — зоны проверить нечем"; exit 1; }
timeout 60 node proby/zaplyv/test_zony.mjs || exit 1
off=$(ZONY_LOMAT=1 timeout 60 node proby/zaplyv/test_zony.mjs 2>&1)
if grep -q 'ПРОВАЛ test_zony_mesto' <<<"$off"; then
  echo "  самопроверка: рот на корме — test_zony_mesto красный (так и должно быть)"
else
  echo "  САМОПРОВЕРКА: рот переставлен на корму, а test_zony_mesto зелёный — проверка ничего не доказывает"; exit 1
fi
