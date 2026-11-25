#!/usr/bin/env bash
# povtory (урок L048, test_L048): правило повторов из tools/povtory.py — повтор просьбы Романа без хозяина, урока
# и защиты больше суток даёт остановку в metrics.py. Здесь — самопроверка на нарочно сломанных примерах.
set -u
python3 -I tools/povtory.py --selftest
