#!/usr/bin/env bash
# test_L002: проверка WebKit не засчитывает прогон, который не дошёл до игры.
# Страница без игры (те же файлы рядом, но index.html пустой) должна дать провал с паспортом «до меню не дошёл».
set -u
SITE=$1
D=$(mktemp -d)
cp "$SITE"/* "$D"/ && echo nogame > "$D/version.txt" && echo '<p>нет игры</p>' > "$D/index.html"
(cd "$D" && exec python3 -m http.server 8001 >/dev/null 2>&1) & SRV=$!
sleep 1
bash "$(dirname "$0")/check_site.sh" http://localhost:8001 nogame | tee "$D/out.txt"; rc=${PIPESTATUS[0]}
kill $SRV
[ "$rc" -ne 0 ] || { echo "test_L002 ПРОВАЛ: страница без игры прошла проверку"; exit 1; }
grep -q "ПАСПОРТ: до меню не дошёл" "$D/out.txt" || { echo "test_L002 ПРОВАЛ: нет паспорта «до меню не дошёл»"; exit 1; }
echo "test_L002: прошёл"
