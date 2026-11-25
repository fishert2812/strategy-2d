#!/usr/bin/env bash
# Режим проверки (справочник, раздел 3, «Три режима»). Шаг из tools/checks/ подключает этот файл и вызывает
# `run_in <режимы…> || exit 0`: в других режимах шаг печатает, что пропущен, и проходит.
#   full  — все шаги, со сторожем сторожей; раз в час на main (workflow full.yml, CHECK_FULL=1) и по запросу.
#   kniga — PR трогает только книгу и документы: только книжные шаги и сторожа, 2–3 минуты.
#   fast  — всё остальное: тесты, игра, кнопки, паспорт, без selftest; до 10 минут.

# Файлы, правка которых не меняет игру. Тексты игры (kniga/teksty_*.json) читает сама игра — это не книга.
kniga_file() {
  case "$1" in
    proby/zaplyv/kniga/teksty_*.json) return 1 ;;
    proby/zaplyv/kniga/*|docs/*|design/*|feedback/*|posts/*) return 0 ;;
    CHANGELOG.md|lessons.md|tasks.md|CLAUDE.md) return 1 ;;
    *.md) [[ "$1" != */* ]] ;;
    *) return 1 ;;
  esac
}
# Режим по списку изменённых файлов (stdin): пустой список или хоть один не книжный файл — fast.
mode_of_files() {
  local f n=0
  while IFS= read -r f; do
    [ -z "$f" ] && continue
    n=$((n + 1)); kniga_file "$f" || { echo fast; return; }
  done
  [ $n -gt 0 ] && echo kniga || echo fast
}
check_mode() {
  [ "${CHECK_FULL:-}" = 1 ] && { echo full; return; }
  [ -n "${CHECK_MODE:-}" ] && { echo "$CHECK_MODE"; return; }
  # Книжный режим только для PR (или у автора до PR); коммит в main проверяется как fast.
  [ "${CI:-}" = true ] && [ -z "${GITHUB_BASE_REF:-}" ] && { echo fast; return; }
  local base=origin/${GITHUB_BASE_REF:-main}
  git rev-parse -q --verify "$base" >/dev/null || { echo fast; return; }
  git diff --name-only "$base"...HEAD | mode_of_files
}
run_in() {
  local m; m=$(check_mode)
  [ "$m" = full ] && return 0
  for want in "$@"; do [ "$m" = "$want" ] && return 0; done
  echo "  пропущен: режим $m (шаг идёт в режимах: full $*)"
  return 1
}
