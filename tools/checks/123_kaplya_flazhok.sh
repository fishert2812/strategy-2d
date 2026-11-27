#!/usr/bin/env bash
# kaplya_flazhok: сторож одного флажка на всех экранах «Капли» (урок L070; proby/zaplyv/kaplya/test_flazhok.cjs, kaplya/flazhok.js).
# Телефон 393×852: игра, карточки, вопрос, пауза, Геном, Альманах, Карта, Стая, Режимы, Ночь рода, гибель — на каждом флажок тянется на место
# и снимает экран; отправка — одна картинка с подписью на отметку. Самопроверки: флажок под окном и два фото на отметку — судья краснеет.
set -u
. "$(dirname "${BASH_SOURCE[0]}")/../check_mode.sh"; run_in fast || exit 0
command -v node >/dev/null || { echo "  нет node — проверить нечем"; exit 1; }
. tools/web/kaplya_pw.sh; [ -f "$PW" ] || { echo "  нет playwright — проверить нечем"; exit 1; }
timeout 180 node proby/zaplyv/kaplya/test_flazhok.cjs || exit 1
