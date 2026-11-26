#!/usr/bin/env bash
# kaplya_sposoby: сторож способов «Присоска» и «Общие соки» форка (proby/zaplyv/kaplya/test_sposoby.mjs), книга П18, П19.
# Присоска: прилипла к крупному через 1 с, пьёшь, он стряхивает; соки: стоишь у комка — еда течёт; способы приходят событием; самопроверка — присоска без «прилипнуть» ловится.
set -u
. "$(dirname "${BASH_SOURCE[0]}")/../check_mode.sh"; run_in fast || exit 0
command -v node >/dev/null || { echo "  нет node — проверить нечем"; exit 1; }
timeout 60 node proby/zaplyv/kaplya/test_sposoby.mjs || exit 1
