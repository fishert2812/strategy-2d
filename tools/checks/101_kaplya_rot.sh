#!/usr/bin/env bash
# kaplya_rot: сторож водоворота у рта (Ш2, kolonia_eda_boy.md, закон З6; proby/zaplyv/kaplya/test_rot.mjs).
# Кусок перед носом уходит в рот спиралью за 0,4–1 с, сзади и сбоку еда не тянется, «Магнит» удлиняет конус; самопроверки — прямая и конус вокруг ловятся.
set -u
. "$(dirname "${BASH_SOURCE[0]}")/../check_mode.sh"; run_in fast || exit 0
command -v node >/dev/null || { echo "  нет node — проверить нечем"; exit 1; }
timeout 60 node proby/zaplyv/kaplya/test_rot.mjs || exit 1
