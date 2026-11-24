#!/usr/bin/env bash
# Веб-сборка игры для постоянного адреса: bash tools/web/build.sh <папка>.
# Ставит шаблон web_nothreads той же версии Godot, экспортирует, режет wasm на части и правит оболочку (patch_site.py).
set -eu
cd "$(dirname "$0")/../.."
OUT=$1
V=$(tr -d '[:space:]' < .godot-version)
T=~/.local/share/godot/export_templates/${V}.stable
if [ ! -f "$T/web_nothreads_release.zip" ]; then
  mkdir -p "$T"
  curl -sSfL -o /tmp/tpl.tpz "https://github.com/godotengine/godot/releases/download/${V}-stable/Godot_v${V}-stable_export_templates.tpz"
  unzip -j -o -q /tmp/tpl.tpz templates/web_nothreads_release.zip templates/version.txt -d "$T" && rm /tmp/tpl.tpz
fi
SHA=$(git rev-parse --short HEAD)
echo "$SHA" > version.txt
cp tools/web/export_presets.cfg export_presets.cfg
rm -rf out/web_raw "$OUT"; mkdir -p out/web_raw
timeout 300 godot --headless --import >/dev/null 2>&1 || true
timeout 300 godot --headless --export-release Web out/web_raw/index.html >/dev/null 2>&1 || true
rm -f export_presets.cfg
test -s out/web_raw/index.wasm || { echo "экспорт не дал index.wasm"; exit 1; }
python3 -I tools/web/patch_site.py out/web_raw "$OUT" "$SHA"
touch "$OUT/.nojekyll"
echo "сборка $SHA -> $OUT"
