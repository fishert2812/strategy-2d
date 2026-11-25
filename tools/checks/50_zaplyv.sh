#!/usr/bin/env bash
# zaplyv: проба «Заплыв» (proby/zaplyv, Three.js) — логика мира без экрана через node: еда, деление, амёба
# и капсула, фаги и CRISPR, мир без краёв, разные миры, простой игрок живёт дольше минуты.
# Запуск в WebKit и время кадра проверяет tools/web/check_zaplyv.sh в workflow web.
set -u
. "$(dirname "${BASH_SOURCE[0]}")/../check_mode.sh"; run_in fast || exit 0
command -v node >/dev/null || { echo "  нет node — проверить «Заплыв» нечем"; exit 1; }
# три части параллельно (PART=a|b|c в test.mjs): целиком файл шёл 300 с при пределе 300 и красил чужие PR (25.11).
d=$(mktemp -d); pids=""
for p in a b c; do PART=$p timeout 300 node proby/zaplyv/test.mjs > "$d/$p" 2>&1 & pids="$pids $!"; done
r=0; for pid in $pids; do wait $pid || r=1; done
out=$(cat "$d/a" "$d/b" "$d/c"); rm -rf "$d"; echo "$out"
# паспорт целого (правило 3.3): частей три, и каждая проверка файла отработала ровно в одной из них
n=$(grep -c "^check(" proby/zaplyv/test.mjs); m=$(grep -cE "^  (ок |ПРОВАЛ)" <<<"$out")
echo "  паспорт: проверок в файле $n, отработало в трёх частях $m${ONLY:+ (ONLY=$ONLY — только её проверки)}"
if [ -n "${ONLY:-}" ]; then [ "$m" -ge 1 ] || { echo "  ПРОВАЛ части: с ONLY=$ONLY не отработало ни одной проверки"; exit 1; }
elif [ "$n" != "$m" ]; then echo "  ПРОВАЛ части: отработало $m проверок из $n — часть упала или проверка выпала из деления"; exit 1
fi
exit $r
