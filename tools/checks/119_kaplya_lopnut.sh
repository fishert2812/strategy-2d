#!/usr/bin/env bash
# kaplya_lopnut: сторож «убитый лопается на точки внутренностей» «Капли» (kolonia_eda_boy.md Ш4, З4, З5; proby/zaplyv/kaplya/test_lopnut.mjs).
# Точек 2 + 3 × масса, вместе ценностью 0,4 × масса, цветами частей, встают за 0,5 с; таблица боя лопает точками, а не одинаковыми кусками. Самопроверки краснеют.
set -u
. "$(dirname "${BASH_SOURCE[0]}")/../check_mode.sh"; run_in fast || exit 0
command -v node >/dev/null || { echo "  нет node — проверить нечем"; exit 1; }
timeout 60 node proby/zaplyv/kaplya/test_lopnut.mjs || exit 1
