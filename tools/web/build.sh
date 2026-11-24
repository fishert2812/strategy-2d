#!/usr/bin/env bash
# Веб-сборка игры для постоянного адреса: bash tools/web/build.sh <папка> [главная сцена].
# С главной сценой собирается проба (например res://proby/streams.tscn) без картинок игры; без неё — игра без проб.
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
MAIN=${2:-}
if [ -n "$MAIN" ]; then
  sed -i 's#^exclude_filter=.*#exclude_filter="art/*,audio/*,scenes/*,scripts/*"#' export_presets.cfg
else
  sed -i 's#^exclude_filter=.*#exclude_filter="proby/*"#' export_presets.cfg
fi
# Зонд для проверки (web_probe.gd) живёт только в веб-сборке: project.godot возвращается как был.
mkdir -p out && cp project.godot out/project.godot.orig
cp tools/web/web_probe.gd web_probe.gd
[ -n "$MAIN" ] && sed -i "s#^run/main_scene=.*#run/main_scene=\"$MAIN\"#" project.godot
printf '\n[autoload]\n\nWebProbe="*res://web_probe.gd"\n' >> project.godot
rm -rf out/web_raw "$OUT"; mkdir -p out/web_raw
timeout 300 godot --headless --import >/dev/null 2>&1 || true
timeout 300 godot --headless --export-release Web out/web_raw/index.html >/dev/null 2>&1 || true
rm -f export_presets.cfg web_probe.gd web_probe.gd.uid
cp out/project.godot.orig project.godot
test -s out/web_raw/index.wasm || { echo "экспорт не дал index.wasm"; exit 1; }
python3 -I tools/web/patch_site.py out/web_raw "$OUT" "$SHA"
touch "$OUT/.nojekyll"
echo "сборка $SHA -> $OUT"
