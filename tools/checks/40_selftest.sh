#!/usr/bin/env bash
# selftest (М10): каждому сторожу подаём нарочно сломанный пример и ждём красного,
# а исправный пример обязан пройти. Сторож, который перестал ловить, делает этот шаг красным.
set -u
. "$(dirname "${BASH_SOURCE[0]}")/../check_mode.sh"; run_in || exit 0
ROOT=$(pwd); fail=0
WT=$(mktemp -d)/wt
git worktree add -q --detach "$WT" HEAD 2>/dev/null || { echo "  selftest: не создать копию"; exit 1; }
git update-ref refs/remotes/origin/selftest-base HEAD
cleanup() { git -C "$ROOT" worktree remove --force "$WT"; git -C "$ROOT" update-ref -d refs/remotes/origin/selftest-base; }
trap cleanup EXIT
# case <имя> <шаг> <ждём: red|green> <команды поломки>
case_() {
  local name=$1 step=$2 want=$3; shift 3
  (cd "$WT" && git reset -q --hard HEAD && git clean -qfd && eval "$*" &&
   git -c user.name=selftest -c user.email=selftest@local commit -qam selftest --allow-empty >/dev/null)
  (cd "$WT" && BASE_REF=selftest-base bash "$ROOT/tools/checks/$step" >/dev/null 2>&1); rc=$?
  (cd "$WT" && git reset -q --hard selftest-base 2>/dev/null || git reset -q --hard origin/selftest-base)
  got=green; [ $rc -ne 0 ] && got=red
  if [ "$got" = "$want" ]; then echo "  ок: $name ($want)"; else echo "  SELFTEST: $name — ждали $want, а вышло $got"; fail=1; fi
}
NUM='python3 -c "import json;print(json.load(open(\"data/version.json\"))[\"number\"])"'
BUMP='n=$('"$NUM"'); m=${n%.*}.$(( ${n#*.} + 1 )); printf "{\n\t\"number\": \"%s\"\n}\n" "$m" > data/version.json'
case_ "вторая команда в check.yml" 20_guards.sh red 'echo "      - run: echo второй" >> .github/workflows/check.yml'
case_ "полная проверка без расписания" 20_guards.sh red "sed -i '/- cron:/d' .github/workflows/full.yml"
case_ "книжный режим глотает игру" 20_guards.sh red "sed -i 's/proby\/zaplyv\/kniga\/teksty_\*.json) return 1/nothing) return 1/' tools/check_mode.sh"
case_ "урок без защиты" 20_guards.sh red 'echo "| L999 | проба | проба | нет |" >> lessons.md'
case_ "номер не сходится с CHANGELOG" 25_changelog.sh red 'printf "{\"number\": \"9.99\"}\n" > data/version.json'
case_ "test_L004: видимое без строки в CHANGELOG" 25_changelog.sh red 'echo "# проба" >> scripts/main.gd'
case_ "test_L005: новая версия без «Зачем игроку»" 26_meaning.sh red "$BUMP"' && sed -i "0,/^- \*\*/s//- **$m** (проба, PR #0): проба.\n&/" CHANGELOG.md'
case_ "доказывает несуществующий тест" 26_meaning.sh red "$BUMP"' && sed -i "0,/^- \*\*/s//- **$m** (проба, PR #0): проба. Зачем игроку: проба. Доказывает: \`test_nonexistent_probe\`.\n&/" CHANGELOG.md'
case_ "исправная новая версия" 26_meaning.sh green "$BUMP"' && sed -i "0,/^- \*\*/s//- **$m** (проба, PR #0): проба. Зачем игроку: проба. Доказывает: \`test_selftest_probe\`.\n&/" CHANGELOG.md && printf "extends RefCounted\nfunc test_selftest_probe() -> String:\n\treturn \"\"\n" > tests/test_selftest_probe.gd && git add -A'
# «Заплыв»: на каждый урок L008–L016 возвращаем ошибку в игру — проверка с этим номером обязана покраснеть (ONLY — только она).
Z=proby/zaplyv
ONLY=L008 case_ "test_L008: фаг снова гонится" 50_zaplyv.sh red "sed -i 's/(fx - g.vx)/(fx + (this.me[0] ? Math.sign(this.me[0].x - g.x) * 300 : 0) - g.vx)/' $Z/sim.js"
ONLY=L009 case_ "test_L009: деление только касанием" 50_zaplyv.sh red "sed -i 's/\"auto_split\": 3,/\"auto_split\": 999,/' $Z/data.json"
ONLY=L010 case_ "test_L010: еда без размера" 50_zaplyv.sh red "sed -i 's/const z = f.s || 1;/const z = 1;/' $Z/sim.js"
ONLY=L011 case_ "test_L011: рывки в разворотах" 50_zaplyv.sh red "sed -i 's/a.a += Math.abs(a.om \\* dt) > Math.abs(d) ? d : a.om \\* dt;/a.a += d;/' $Z/sim.js"
ONLY=L030 case_ "test_L030: запятая кусает без прицела" 50_zaplyv.sh red "sed -i 's/if (!b.aim) { b.a += Math.PI;/if (false) { b.a += Math.PI;/' $Z/sim.js"
ONLY=L030 case_ "test_L030: признак воронки в последний миг" 50_zaplyv.sh red "sed -i 's/\"lead\": 1.5,/\"lead\": 0.01,/' $Z/data.json"
ONLY=L012 case_ "test_L012: потолок мутаций" 50_zaplyv.sh red "sed -i 's/\"gene_every\": 5/\"gene_every\": 999/' $Z/data.json"
ONLY=L013 case_ "test_L013: опасность у самого старта" 50_zaplyv.sh red "sed -i 's/const safe = far < c.safe_chunks;/const safe = false;/' $Z/sim.js"
ONLY=L014 case_ "test_L014: запятая не рождается в мире" 50_zaplyv.sh red "sed -i 's/ this.bdellos.push({ ...pt()/ 0 \&\& this.bdellos.push({ ...pt()/' $Z/sim.js"
ONLY=L016 case_ "test_L016: токсин снова бьёт не родню" 50_zaplyv.sh red "sed -i 's/if (q.strain \&\& !q.gone/if (!q.gone/' $Z/sim.js"
ONLY=L019 case_ "test_L019: существо без места в Альманахе" 50_zaplyv.sh red "python3 -c \"import json;p='$Z/almanah.json';d=json.load(open(p));d['items'].pop('amoeba');json.dump(d,open(p,'w'))\""
case_ "test_L017: невидимый слой поверх кнопок «Заплыва»" 52_zaplyv_tap.sh red "sed -i 's|<div id=\"note\"|<div style=\"position:fixed;inset:0;z-index:99\"></div>&|' proby/zaplyv/index.html"
case_ "test_L017: флажок молчит после касания" 52_zaplyv_tap.sh red "sed -i 's|n.classList.add(.on.);|/* нет отклика */|' proby/zaplyv/main.js"
ONLY=L043 case_ "test_L043: опасный встречается молча" 52_zaplyv_tap.sh red "sed -i \"s/if (fresh || t.otnoshenie === 'opasen') say/if (fresh) say/\" $Z/main.js"
ONLY=L057 case_ "test_L057: слой свечения снова мал для колонии, крошки пропадают" 52_zaplyv_tap.sh red "sed -i 's/\"dots\": { \"glow\": 24000, \"ink\": 12000 }/\"dots\": { \"glow\": 3000, \"ink\": 3000 }/' $Z/data.json"
ONLY=L046 case_ "test_L046: слизь снова мутной пеленой" 52_zaplyv_tap.sh red "sed -i 's/\"core\": 0.55, \"core_a\": 0.02/\"core\": 1.2, \"core_a\": 0.06/' $Z/data.json"
ONLY=L053 case_ "test_L053: выбор навыка снова останавливает мир" 52_zaplyv_tap.sh red "sed -i 's/    if (!this.me.length) return; \/\/ выбор навыка/    if (this.choice.length || !this.me.length) return; \/\/ выбор навыка/' $Z/sim.js"
ONLY=L042 case_ "test_L042: вирус сел молча" 52_zaplyv_tap.sh red "sed -i \"s/tell('stick', 'Сел вирус! Резко развернись — стряхнёшь, пока не впрыснул');//\" $Z/main.js"
ONLY=L044 case_ "test_L044: Альманах молчит, что цвета — метки" 52_zaplyv_tap.sh red "sed -i 's/\$(.knote.).hidden = !S.note;/\$(\"knote\").hidden = true;/' $Z/almanah.js"
ONLY=L050 case_ "test_L050: деление снова рывком (vid.birth не вызван)" 52_zaplyv_tap.sh red "sed -i 's/vid.birth(a, time, world.me)/({ d: [0, 0], pinch: 0 })/' $Z/main.js"
ONLY=L045 case_ "test_L045: вирус снова слетает от любого поворота" 50_zaplyv.sh red "sed -i 's/ \&\& c.inject - g.t < c.phage_shake//' $Z/sim.js"
ONLY=L052 case_ "test_L052: кадр снова не в полную плотность" 52_zaplyv_tap.sh red "sed -i 's/\"dpr_full\": 3,/\"dpr_full\": 2.5,/' $Z/data.json"
ONLY=L021 case_ "test_L021: значки генов пропали" 52_zaplyv_tap.sh red "sed -i 's/^function icon(g) {/function icon(g) { return String();/' $Z/main.js"
case_ "test_L035: слова не впечатаны в картинку" 52_zaplyv_tap.sh red "sed -i 's/lines.forEach((l, k) => g.fillText/lines.forEach((l, k) => String/; s/g.fillText(.⚑ . + head, pad, ih + pad + 22);//' $Z/main.js"
case_ "test_L034: ✕ не убирает отметку" 52_zaplyv_tap.sh red "sed -i 's/marks.splice(i, 1); keepMarks();/keepMarks();/' $Z/main.js"
case_ "test_L036: ночь пересоздаёт холст каждый кадр" 52_zaplyv_tap.sh red "sed -i 's/if (oc.width !== ow || oc.height !== oh) { oc.width = ow; oc.height = oh; }/oc.width = ow; oc.height = oh;/' $Z/main.js"
case_ "test_L038: кадр в двойной плотности на экране тройной" 52_zaplyv_tap.sh red "sed -i 's/\"dpr_max\": 2.5/\"dpr_max\": 2/' $Z/data.json"
case_ "test_L039: сестра за кадром без стрелки" 52_zaplyv_tap.sh red "sed -i 's/if (on(x, y, -8)) continue; const bad/continue; const bad/' $Z/main.js"
case_ "test_L040: полоса роста стоит на месте" 52_zaplyv_tap.sh red "sed -i 's/(top.m - sp \/ 2) \/ (sp \/ 2)/1/' $Z/main.js"
case_ "test_L031: лист гибели помнит прокрутку" 52_zaplyv_tap.sh red "sed -i 's/\$(.end.).scrollTop = 0; //' $Z/main.js"
case_ "test_L025: кнопки гибели ниже края экрана" 52_zaplyv_tap.sh red "sed -i 's/flex-shrink: 0; position: sticky;/flex-shrink: 0;/' $Z/index.html"
# L018 (расширен) и L024 «антибред»: черновая строка умения мимо книги, описание в data.json, слово мира без имени из Альманаха, умение без теста-обещания — красное.
case_ "test_L018: выбор дочки снова с черновой строкой" 52_zaplyv_tap.sh red "sed -i \"s/b.children\[2\].textContent = mut.daet(world, g, geneBook(g));/b.children[2].textContent = 'отпустил палец у водоросли';/\" $Z/main.js"
ONLY=L018 case_ "test_L018: описание умения снова в data.json" 50_zaplyv.sh red "sed -i 's/\"fim\": \"fimH\"/\"fim\": \"отпустил палец у водоросли\"/' $Z/data.json"
ONLY=L024 case_ "test_L024: «водоросль» вместо имени из Альманаха" 50_zaplyv.sh red "sed -i 's/Отпусти палец у зелёной нити/Отпусти палец у водоросли/' $Z/kniga/teksty_genov.json"
ONLY=L024 case_ "test_L024: умение дочке до встречи" 50_zaplyv.sh red "sed -i 's/return !this.genes\[g\] \&\& (this.posle/return !this.genes[g] || (this.posle/' $Z/sim.js"
ONLY=L024 case_ "test_L024: умение без теста-обещания" 50_zaplyv.sh red "sed -i 's/сон-персистер \[spore\]/сон-персистер/' $Z/test.mjs"
# L032: амёба снова ждёт у спящей — проснувшуюся съедает
ONLY=L032 case_ "test_L032: спора просыпается у амёбы" 50_zaplyv.sh red "sed -i 's/if (a \&\& a.spore > 0) { const d/if (false) { const d/; s/if (!this.amoebas.some(m => dist(m, a) < radius(m.m) + c.spore_safe)/if (true/' $Z/sim.js"
ONLY=L032 case_ "test_L032: спящую снова держат запятые и колокольчик" 50_zaplyv.sh red "sed -i 's/a.free = Math.max(a.free || 0, 1); //' $Z/sim.js"
# L047: пунктирная нить, свой рендер образцом, навык в игре без приёмки — красное
ONLY=L047 case_ "test_L047: нить снова пунктиром" 60_kirpichi.sh red "sed -i 's/tube\.put(pts, ws, mix(P\.skin, P\.skin2, [^;]*;/pts.forEach((q, k) => k % 4 || glow.put(...q, ws[k], ...P.energy, 0.9));/' $Z/kirpichi.js"
ONLY=L047 case_ "test_L047: образец — свой рендер" 60_kirpichi.sh red "sed -i 's/\"obrazec\": \"ref_21.jpg\"/\"obrazec\": \"niti_ryadom_s_obrazcom.png\"/' $Z/kirpichi.json"
ONLY=L047 case_ "test_L047: навык в игре без приёмки" 60_kirpichi.sh red "sed -i '0,/\"v_igre\": false/s//\"v_igre\": true/' $Z/kirpichi.json"
# L033: «Чует еду» без пальца снова стоит
ONLY=L033 case_ "test_L033: без пальца клетка с умением стоит" 50_zaplyv.sh red "sed -i 's/} else if (this.genes.sense) {/} else if (false) {/' $Z/sim.js"
# L054: запятые снова плодят рой и нападают без передышки
ONLY=L054 case_ "test_L054: выводок без предела" 50_zaplyv.sh red "sed -i 's/c.bdello_nest.cap - near)/99)/' $Z/sim.js"
ONLY=L054 case_ "test_L054: гнездо без передышки" 50_zaplyv.sh red "sed -i 's/if (prey \\&\\& !calm \\&\\& r()/if (prey \\&\\& r()/' $Z/sim.js"
# L055: деление снова с толчком и с выдуманной перетяжкой
ONLY=L055 case_ "test_L055: дочка с толчком" 53_zaplyv_vid.sh red "sed -i 's/vx: c.vx, vy: c.vy,/vx: c.vx - ax * 60, vy: c.vy - ay * 60,/' $Z/sim.js"
ONLY=L055 case_ "test_L055: палочка толстеет, а не длиннеет" 53_zaplyv_vid.sh red "sed -i 's/half: D.half0 \\* 2 \\* fm/half: D.half0 * (1 + fm)/' $Z/vid.js"
# L051: дочки снова складываются бок о бок
ONLY=L051 case_ "test_L051: сёстры дрейфуют врозь" 50_zaplyv.sh red "sed -i 's/ kid.drift = c.drift;//' $Z/sim.js"
# L049: колония снова застревает на четырёх
ONLY=L049 case_ "test_L049: само-деление снова отпускает дочек с четырёх" 50_zaplyv.sh red "sed -i 's/\"auto_max\": 10/\"auto_max\": 4/' $Z/data.json"
case_ "test_L029: камера тянется к отставшим вдали" 52_zaplyv_tap.sh red "sed -i 's/const flock = live.filter(a => Math.hypot(a.x - lead.x, a.y - lead.y) < C.group)/const flock = world.me/' $Z/main.js"
ONLY=L022 case_ "test_L022: вирус снова красный, как запятая" 50_zaplyv.sh red "sed -i 's/\"phage\": \[0.92, 0.9, 1.0\]/\"phage\": [1.0, 0.3, 0.4]/' $Z/data.json"
ONLY=L023 case_ "test_L023: флажок не вырезает кадр" 52_zaplyv_tap.sh red "sed -i 's/^function flagAt(cx, cy) {/function flagAt(cx, cy) { return;/' $Z/main.js"
ONLY=L020 case_ "test_L020: зелёные жгутики" 50_zaplyv.sh red "sed -i 's/\"color\": \[0.74, 0.87, 1.0\]/\"color\": [0.3, 1.0, 0.4]/' $Z/data.json"
# Слой «вид и анимации» «Заплыва» (53_zaplyv_vid.sh): событие без анимации и умение, не видное на теле, обязаны дать красное.
case_ "test_vid_events: удар о капсулу без анимации" 53_zaplyv_vid.sh red "sed -i \"s/if (k === 'bump') { R(0, 24); poke(x, y); }//\" $Z/fx.js"
case_ "test_vid_skills_seen: капсулу не видно" 53_zaplyv_vid.sh red "sed -i 's/if (lk.halo) {/if (false) {/' $Z/vid.js"
# Остановка: открытая issue stop делает PR красным, метка fix пропускает.
GITHUB_BASE_REF=main STOP_ISSUES="#0 проба" PR_LABELS= bash tools/checks/05_stop.sh >/dev/null 2>&1 &&
  { echo "  SELFTEST: остановка не сделала PR красным"; fail=1; } || echo "  ок: остановка (red)"
GITHUB_BASE_REF=main STOP_ISSUES="#0 проба" PR_LABELS=fix bash tools/checks/05_stop.sh >/dev/null 2>&1 &&
  echo "  ок: остановка и метка fix (green)" || { echo "  SELFTEST: метка fix не прошла остановку"; fail=1; }
exit $fail
