#!/usr/bin/env bash
# changelog: номер версии в data/version.json совпадает с верхней строкой CHANGELOG.md,
# а PR, который меняет видимое (scenes, scripts, data, art, audio), добавляет строку и поднимает номер.
set -u
fail=0
bad() { echo "  ВЕРСИЯ: $1"; fail=1; }
num=$(python3 -c "import json;print(json.load(open('data/version.json'))['number'])" 2>/dev/null)
top=$(grep -m1 -oE '^- \*\*[0-9]+\.[0-9]+\*\*' CHANGELOG.md 2>/dev/null | grep -oE '[0-9]+\.[0-9]+')
[ -n "$num" ] || bad "нет номера в data/version.json"
[ "$num" = "$top" ] || bad "в data/version.json $num, а сверху CHANGELOG.md ${top:-ничего}"
base=origin/${BASE_REF:-${GITHUB_BASE_REF:-}}
if [ "$base" != "origin/" ] && git rev-parse -q --verify "$base" >/dev/null; then
  seen=$(git diff --name-only "$base"...HEAD -- scenes scripts data art audio | grep -v '^data/version.json$' | head -3)
  if [ -n "$seen" ]; then
    git diff --name-only "$base"...HEAD | grep -qx CHANGELOG.md || bad "видимое изменение ($(echo $seen)) без строки в CHANGELOG.md"
    was=$(git show "$base:data/version.json" 2>/dev/null | python3 -c "import json,sys;print(json.load(sys.stdin)['number'])" 2>/dev/null)
    [ "$was" != "$num" ] || bad "видимое изменение, а номер остался $num"
  fi
fi
[ $fail -eq 0 ] && echo "  версия $num, CHANGELOG сходится"
exit $fail
