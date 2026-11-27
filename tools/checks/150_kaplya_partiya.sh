#!/usr/bin/env bash
# kaplya_partiya: сквозная партия «Капли» (урок L072; proby/zaplyv/kaplya/test_partiya.cjs). Бот играет пальцем с первой секунды и проверяет то, что увидит игрок:
# карточки с выбором и оружием, «Глотать» не раньше «Плотоядного», оружие пришло, ошибок нет. Самопроверка со старой выдачей «Глотать» краснеет.
set -u
. "$(dirname "${BASH_SOURCE[0]}")/../check_mode.sh"; run_in fast || exit 0
command -v node >/dev/null || { echo "  нет node — проверить нечем"; exit 1; }
. tools/web/kaplya_pw.sh; [ -f "$PW" ] || { echo "  нет playwright — проверить нечем"; exit 1; }
timeout 900 node proby/zaplyv/kaplya/test_partiya.cjs 45 || exit 1
