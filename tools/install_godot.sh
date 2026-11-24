#!/usr/bin/env bash
# Ставит Godot версии из .godot-version в /opt/godot и ссылку /usr/local/bin/godot.
# Его вызывает check.sh в CI; им же можно поставить Godot в облачном треде.
set -eu
cd "$(dirname "$0")/.."
V=$(tr -d '[:space:]' < .godot-version)
SUDO=""; [ "$(id -u)" -ne 0 ] && SUDO="sudo"
$SUDO mkdir -p /opt/godot
curl -sSfL -o /tmp/godot.zip "https://github.com/godotengine/godot/releases/download/${V}-stable/Godot_v${V}-stable_linux.x86_64.zip"
$SUDO unzip -o -q /tmp/godot.zip -d /opt/godot && rm /tmp/godot.zip
$SUDO ln -sf "/opt/godot/Godot_v${V}-stable_linux.x86_64" /usr/local/bin/godot
godot --headless --version
