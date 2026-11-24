#!/usr/bin/env bash
# Пробы на самом адресе: bash tools/web/check_proby.sh <папка сайта> <адрес>.
# Для каждой папки сайта с index.html (zaplyv/, ruchi/ …) адрес <адрес>/<папка>/ должен отдавать
# те же файлы, что собраны (сверка по sha256). Провал: файла нет, не 200 или содержимое другое.
set -u
SITE=$1; URL=$2; bad=0; n=0
for d in "$SITE"/*/; do
  [ -f "$d/index.html" ] || continue
  name=$(basename "$d"); n=$((n+1))
  while IFS= read -r f; do
    rel=${f#"$d"}
    got=$(curl -fsS --retry 3 "$URL/$name/$rel" 2>/dev/null | sha256sum | cut -c1-64)
    want=$(sha256sum "$f" | cut -c1-64)
    [ "$got" = "$want" ] || { echo "  ПРОБА $name: $rel на адресе не совпадает с собранным"; bad=1; }
  done < <(find "$d" -type f ! -name '.*')
  [ $bad -eq 0 ] && echo "ПАСПОРТ: проба $name на адресе $URL/$name/ совпадает со сборкой"
done
[ $n -gt 0 ] || echo "ПАСПОРТ: проб в сборке нет"
exit $bad
