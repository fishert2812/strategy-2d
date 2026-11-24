#!/usr/bin/env bash
# metrics.sh: запускает tools/metrics.py (М7–М9 справочника). В CI — раз в день из workflow metrics.
set -eu
cd "$(dirname "$0")/.."
python3 -I tools/metrics.py
