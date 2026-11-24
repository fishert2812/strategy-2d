#!/usr/bin/env bash
# Единственная команда проверки. Запускает шаги из tools/checks/ по порядку.
# Итог — одна строка, она же в out/check.txt.
set -u
cd "$(dirname "$0")/.."
mkdir -p out
start=$(date +%s)
sha=$(git rev-parse --short HEAD 2>/dev/null || echo nogit)
echo "$sha" > version.txt
want=$(tr -d '[:space:]' < .godot-version)
export GODOT="${GODOT:-godot}"
got=$("$GODOT" --headless --version 2>/dev/null | head -1)
if [[ "$got" != "$want".stable* && "${CI:-}" == "true" ]]; then
  bash tools/install_godot.sh >/dev/null && got=$("$GODOT" --headless --version 2>/dev/null | head -1)
fi
echo "Godot: $got (нужен $want)"
steps=0; failed=""
if [[ "$got" != "$want".stable* ]]; then
  echo "Godot $got, а в .godot-version $want"; failed="godot"
else
  for step in tools/checks/*.sh; do
    name=$(basename "$step" .sh); name=${name#*_}
    echo "== $name"
    steps=$((steps + 1))
    if ! bash "$step"; then failed="$failed $name"; fi
  done
fi
t=$(( $(date +%s) - start ))
if [ -z "$failed" ]; then verdict="ЗЕЛЁНЫЙ"; else verdict="КРАСНЫЙ (${failed# })"; fi
line="ИТОГ: $verdict sha=$sha шагов=$steps время=$((t / 60))м$((t % 60))с"
echo "$line" | tee out/check.txt
[ -z "$failed" ]
