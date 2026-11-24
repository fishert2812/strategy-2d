#!/usr/bin/env bash
# selftest (М10): каждому сторожу подаём нарочно сломанный пример и ждём красного,
# а исправный пример обязан пройти. Сторож, который перестал ловить, делает этот шаг красным.
set -u
ROOT=$(pwd); fail=0
WT=$(mktemp -d)/wt
git worktree add -q --detach "$WT" HEAD 2>/dev/null || { echo "  selftest: не создать копию"; exit 1; }
git update-ref refs/remotes/origin/selftest-base HEAD
cleanup() { git -C "$ROOT" worktree remove --force "$WT"; git -C "$ROOT" update-ref -d refs/remotes/origin/selftest-base; }
trap cleanup EXIT
# case <имя> <шаг> <ждём: red|green> <команды поломки>
case_() {
  local name=$1 step=$2 want=$3; shift 3
  (cd "$WT" && git reset -q --hard HEAD && git clean -qfd && eval "$*" &&
   git -c user.name=selftest -c user.email=selftest@local commit -qam selftest --allow-empty >/dev/null)
  (cd "$WT" && BASE_REF=selftest-base bash "$ROOT/tools/checks/$step" >/dev/null 2>&1); rc=$?
  (cd "$WT" && git reset -q --hard selftest-base 2>/dev/null || git reset -q --hard origin/selftest-base)
  got=green; [ $rc -ne 0 ] && got=red
  if [ "$got" = "$want" ]; then echo "  ок: $name ($want)"; else echo "  SELFTEST: $name — ждали $want, а вышло $got"; fail=1; fi
}
NUM='python3 -c "import json;print(json.load(open(\"data/version.json\"))[\"number\"])"'
BUMP='n=$('"$NUM"'); m=${n%.*}.$(( ${n#*.} + 1 )); printf "{\n\t\"number\": \"%s\"\n}\n" "$m" > data/version.json'
case_ "вторая команда в check.yml" 20_guards.sh red 'echo "      - run: echo второй" >> .github/workflows/check.yml'
case_ "урок без защиты" 20_guards.sh red 'echo "| L999 | проба | проба | нет |" >> lessons.md'
case_ "номер не сходится с CHANGELOG" 25_changelog.sh red 'printf "{\"number\": \"9.99\"}\n" > data/version.json'
case_ "test_L004: видимое без строки в CHANGELOG" 25_changelog.sh red 'echo "# проба" >> scripts/main.gd'
case_ "test_L005: новая версия без «Зачем игроку»" 26_meaning.sh red "$BUMP"' && sed -i "0,/^- \*\*/s//- **$m** (проба, PR #0): проба.\n&/" CHANGELOG.md'
case_ "доказывает несуществующий тест" 26_meaning.sh red "$BUMP"' && sed -i "0,/^- \*\*/s//- **$m** (проба, PR #0): проба. Зачем игроку: проба. Доказывает: \`test_nonexistent_probe\`.\n&/" CHANGELOG.md'
case_ "исправная новая версия" 26_meaning.sh green "$BUMP"' && sed -i "0,/^- \*\*/s//- **$m** (проба, PR #0): проба. Зачем игроку: проба. Доказывает: \`test_selftest_probe\`.\n&/" CHANGELOG.md && printf "extends RefCounted\nfunc test_selftest_probe() -> String:\n\treturn \"\"\n" > tests/test_selftest_probe.gd && git add -A'
case_ "test_L017: невидимый слой поверх кнопок «Заплыва»" 52_zaplyv_tap.sh red "sed -i 's|<div id=\"note\"|<div style=\"position:fixed;inset:0;z-index:99\"></div>&|' proby/zaplyv/index.html"
case_ "test_L017: флажок молчит после касания" 52_zaplyv_tap.sh red "sed -i 's|n.classList.add(.on.);|/* нет отклика */|' proby/zaplyv/main.js"
# Остановка: открытая issue stop делает PR красным, метка fix пропускает.
GITHUB_BASE_REF=main STOP_ISSUES="#0 проба" PR_LABELS= bash tools/checks/05_stop.sh >/dev/null 2>&1 &&
  { echo "  SELFTEST: остановка не сделала PR красным"; fail=1; } || echo "  ок: остановка (red)"
GITHUB_BASE_REF=main STOP_ISSUES="#0 проба" PR_LABELS=fix bash tools/checks/05_stop.sh >/dev/null 2>&1 &&
  echo "  ок: остановка и метка fix (green)" || { echo "  SELFTEST: метка fix не прошла остановку"; fail=1; }
exit $fail
