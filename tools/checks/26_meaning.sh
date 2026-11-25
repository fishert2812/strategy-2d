#!/usr/bin/env bash
# meaning: новая версия в CHANGELOG.md объясняет, зачем это игроку, и называет тест,
# который доказывает именно это на игре (не «функция вызвалась»). Тест добавлен или изменён в этом PR.
# Формат строки: - **0.23** (дата, PR #N): что видно. Зачем игроку: … Доказывает: `test_имя`.
set -u
. "$(dirname "${BASH_SOURCE[0]}")/../check_mode.sh"; run_in fast kniga || exit 0
base=origin/${BASE_REF:-${GITHUB_BASE_REF:-}}
if [ "$base" = "origin/" ] || ! git rev-parse -q --verify "$base" >/dev/null; then
  echo "  нет базы PR — смысл не сверяю"; exit 0
fi
num=$(python3 -c "import json;print(json.load(open('data/version.json'))['number'])" 2>/dev/null)
was=$(git show "$base:data/version.json" 2>/dev/null | python3 -c "import json,sys;print(json.load(sys.stdin)['number'])" 2>/dev/null)
if [ "$num" = "$was" ]; then echo "  новой версии нет — смысл не нужен"; exit 0; fi
line=$(grep -m1 -E "^- \*\*${num//./\\.}\*\*" CHANGELOG.md)
fail=0
bad() { echo "  СМЫСЛ: $1"; fail=1; }
[[ "$line" == *"Зачем игроку:"* ]] || bad "у версии $num нет «Зачем игроку: …»"
t=$(grep -oE 'Доказывает: `test_[A-Za-z0-9_]+`' <<<"$line" | grep -oE 'test_[A-Za-z0-9_]+')
if [ -z "$t" ]; then
  bad "у версии $num нет «Доказывает: \`test_…\`»"
elif ! grep -rqE "^func $t\(" tests/; then
  bad "тест $t не найден в tests/"
elif ! git diff "$base"...HEAD -- tests/ | grep -qE "^\+.*$t|^\+func $t\("; then
  bad "тест $t не добавлен и не изменён в этом PR"
fi
[ $fail -eq 0 ] && echo "  версия $num: зачем игроку есть, доказывает $t"
exit $fail
