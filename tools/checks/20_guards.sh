#!/usr/bin/env bash
# guards: сторожа без запуска игры (справочник, раздел 3).
set -u
fail=0
bad() { echo "  СТОРОЖ: $1"; fail=1; }

# 1. check.yml запускает только tools/check.sh: ровно одна команда run, и это она.
y=.github/workflows/check.yml
if [ ! -f $y ]; then bad "нет $y"; else
  runs=$(grep -cE '^\s*(- )?run:' $y)
  only=$(grep -cE '^\s*(- )?run: bash tools/check.sh\s*$' $y)
  [ "$runs" -ne 1 ] || [ "$only" -ne 1 ] && bad "в $y команд run: $runs, а должна быть одна — bash tools/check.sh"
fi

# 2. Правила не больше 8192 байт.
size=$(wc -c < docs/pravila_proekta.md)
[ "$size" -gt 8192 ] && bad "docs/pravila_proekta.md $size байт, больше 8192"

# 3. В scripts/ не рисуем кодом (исключения — tools/draw_allowed.txt).
while IFS= read -r hit; do
  file=${hit%%:*}
  grep -qxF "$file" tools/draw_allowed.txt 2>/dev/null || bad "рисование кодом: $hit"
done < <(grep -rnE 'draw_[a-z]+\(|Polygon2D' scripts/ 2>/dev/null || true)

# 4. Каждый файл в art/ и audio/ записан в art/LICENSES.md.
while IFS= read -r f; do
  grep -qF "$f" art/LICENSES.md || bad "нет в art/LICENSES.md: $f"
done < <(find art audio -type f ! -name 'LICENSES.md' ! -name '*.import' 2>/dev/null)

# 5. У каждого урока в lessons.md есть защита test_Lxxx.
for id in $(grep -oE '\bL[0-9]{3}\b' lessons.md 2>/dev/null | sort -u); do
  grep -rqE "test_$id\b" tests/ tools/ || bad "урок $id без защиты test_$id"
done

# 6. Не больше 300 строк кода в PR (метка big снимает предел; CI передаёт PR_LABELS).
# Считаем против базы PR: в CI это GITHUB_BASE_REF (PR цепочкой стоит на другой ветке), иначе main.
base=origin/${BASE_REF:-${GITHUB_BASE_REF:-main}}
if git rev-parse -q --verify "$base" >/dev/null && [[ "${PR_LABELS:-}" != *big* ]]; then
  lines=$(git diff --numstat "$base"...HEAD -- '*.gd' '*.sh' '*.py' '*.yml' | awk '{s+=$1+$2} END {print s+0}')
  [ "$lines" -gt 300 ] && bad "в PR $lines строк кода, больше 300"
  echo "  строк кода против ${base#origin/}: $lines"
fi

[ $fail -eq 0 ] && echo "  сторожа: все чисто"
exit $fail
