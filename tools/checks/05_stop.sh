#!/usr/bin/env bash
# stop (М7, М9): пока открыта issue с меткой stop (её заводит tools/metrics.py), любой PR красный,
# кроме PR с меткой fix, который чинит причину. main не блокируем. Без сети шаг не решает и проходит.
set -u
[ -z "${GITHUB_BASE_REF:-}" ] && { echo "  не PR — остановку не сверяю"; exit 0; }
repo=${GITHUB_REPOSITORY:-fishert2812/strategy-2d}
# STOP_ISSUES подменяет ответ GitHub (для selftest).
open=${STOP_ISSUES-$(curl -sf "https://api.github.com/repos/$repo/issues?labels=stop&state=open" |
  python3 -c "import json,sys;print('; '.join('#%d %s' % (i['number'], i['title']) for i in json.load(sys.stdin)))")} || {
  echo "  GitHub не ответил — остановку не сверяю"; exit 0; }
[ -z "$open" ] && { echo "  остановки нет"; exit 0; }
[[ ",${PR_LABELS:-}," == *",fix,"* ]] && { echo "  остановка ($open), но PR с меткой fix — проходит"; exit 0; }
echo "  ОСТАНОВКА: $open. Новые задачи стоят; PR, который чинит причину, — с меткой fix."
exit 1
