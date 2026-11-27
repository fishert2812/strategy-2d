#!/usr/bin/env bash
# kaplya_zahvat: захват всегда кончается (урок L074, пачка 1 п. 3; proby/zaplyv/kaplya/test_zahvat.cjs). В живой игре амёба ловит тебя у сувойки на анабене:
# стоишь — гибель, крутишься — вырвалась; держат не дольше zahvat.predel + 1 с подряд и не двое разом. Самопроверка со старым поведением краснеет.
set -u
. "$(dirname "${BASH_SOURCE[0]}")/../check_mode.sh"; run_in fast || exit 0
command -v node >/dev/null || { echo "  нет node — проверить нечем"; exit 1; }
. tools/web/kaplya_pw.sh; [ -f "$PW" ] || { echo "  нет playwright — проверить нечем"; exit 1; }
timeout 60 node proby/zaplyv/kaplya/test_zahvat_uron.mjs || exit 1 # L086: в захвате здоровье тает, разворот рвёт хватку пасти
timeout 900 node proby/zaplyv/kaplya/test_zahvat.cjs || exit 1
