#!/usr/bin/env bash
# kirpichi: кирпичи анимации навыков «Заплыва» (proby/zaplyv/kirpichi.js, kirpichi.json) и урок L047 —
# сплошные формы вместо пунктира, образец только Романа, в игру только с приёмкой свежим взглядом (proby/zaplyv/stend/PRIEMKA.md).
set -u
. "$(dirname "${BASH_SOURCE[0]}")/../check_mode.sh"; run_in fast || exit 0
command -v node >/dev/null || { echo "  нет node — кирпичи проверить нечем"; exit 1; }
timeout 60 node proby/zaplyv/test_kirpichi.mjs
