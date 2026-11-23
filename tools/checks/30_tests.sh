#!/usr/bin/env bash
# tests: тесты логики без экрана, с фиксированной частотой кадров.
# Ошибка скрипта во время теста — провал, даже если тест «вернул успех».
set -u
"$GODOT" --headless --path . --fixed-fps 60 --script res://tests/run_tests.gd >out/tests.log 2>&1
code=$?
grep -E "^  (ок|ПРОВАЛ)|^ТЕСТЫ|SCRIPT ERROR|^\s+at: " out/tests.log
if grep -q "SCRIPT ERROR" out/tests.log; then echo "  в тестах ошибки скрипта"; exit 1; fi
exit $code
