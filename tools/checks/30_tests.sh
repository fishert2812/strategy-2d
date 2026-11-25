#!/usr/bin/env bash
# tests: тесты логики без экрана, с фиксированной частотой кадров.
# Ошибка скрипта во время теста — провал, даже если тест «вернул успех».
# Предел времени на прогон — TESTS_TIMEOUT секунд (по умолчанию 300): зависание — провал.
set -u
. "$(dirname "${BASH_SOURCE[0]}")/../check_mode.sh"; run_in fast || exit 0
GODOT="${GODOT:-godot}"
LIMIT="${TESTS_TIMEOUT:-300}"

run() { # $1 — лог, дальше — аргументы раннера
  local log=$1; shift
  timeout "$LIMIT" "$GODOT" --headless --path . --fixed-fps 60 --script res://tests/run_tests.gd "$@" >"$log" 2>&1
}

# Самопроверка раннера: неразбираемый тест-файл обязан дать красное за секунды.
fx=out/selftest_tests; rm -rf "$fx"; mkdir -p "$fx"
printf 'extends RefCounted\nfunc test_x() -> String:\n\treturn (\n' > "$fx/test_broken.gd"
LIMIT=30 run out/tests_selftest.log -- --dir=res://$fx
code=$?
if [ $code -eq 124 ] || ! grep -q "ПРОВАЛ test_broken.gd: файл не разбирается" out/tests_selftest.log; then
  echo "  САМОПРОВЕРКА: раннер не поймал неразбираемый тест (код $code)"; exit 1
fi
echo "  самопроверка раннера: неразбираемый файл пойман"

run out/tests.log
code=$?
grep -E "^  (ок|ПРОВАЛ)|^ТЕСТЫ|SCRIPT ERROR|^\s+at: " out/tests.log
if [ $code -eq 124 ]; then echo "  тесты не закончились за $LIMIT с"; exit 1; fi
if grep -q "SCRIPT ERROR" out/tests.log; then echo "  в тестах ошибки скрипта"; exit 1; fi
exit $code
