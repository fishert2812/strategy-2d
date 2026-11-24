#!/usr/bin/env bash
# kniga: книга «Заплыва» сверяется с игрой. Всё, что есть в игре (карточка существа, ген), имеет запись
# в proby/zaplyv/kniga/zapisi; запись «в игре» ссылается на живой код; тексты игры совпадают с книгой;
# номера не повторяются; запись не уходит на следующий шаг без своего слоя. Потом самопроверка:
# на нарочно сломанных примерах сверка обязана дать красное.
set -u
command -v node >/dev/null || { echo "  нет node — сверить книгу нечем"; exit 1; }
node proby/zaplyv/kniga/sverka.mjs || exit 1
node proby/zaplyv/kniga/sverka.mjs --selftest
