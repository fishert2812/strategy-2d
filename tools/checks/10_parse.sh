#!/usr/bin/env bash
# parse: проект импортируется, и каждый .gd разбирается без ошибок.
set -u
"$GODOT" --headless --path . --import >out/import.log 2>&1
bad=0; n=0
while IFS= read -r f; do
  n=$((n + 1))
  out=$("$GODOT" --headless --path . --check-only --script "$f" 2>&1)
  if [ $? -ne 0 ] || grep -q "SCRIPT ERROR\|Parse Error" <<<"$out"; then
    echo "  не разбирается: $f"; grep -m3 "ERROR\|Error" <<<"$out" | sed 's/^/    /'; bad=$((bad + 1))
  fi
done < <(git ls-files --cached --others --exclude-standard '*.gd')
echo "  скриптов: $n, с ошибками: $bad"
[ "$n" -gt 0 ] && [ "$bad" -eq 0 ]
