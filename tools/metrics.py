# metrics.py: М7–М9 справочника. Раз в день (workflow metrics) читает GitHub и:
#  М8 — заводит черновик урока (issue lesson-draft) на откат в main, красный main, слияние без зелёной проверки,
#       ошибку Романа (issue roman-bug без черновика);
#  М9 — черновик урока старше трёх дней или М7 — правка в main старше 48 часов без выкладки: заводит остановку (issue stop);
#  переписывает страницу «Мерила». DRY=1 — только печать; NOW=2026-11-27T00:00:00Z — поддельное «сейчас» для проб.
import datetime as dt, json, os, re, sys, urllib.request

REPO = os.environ.get("REPO", "fishert2812/strategy-2d")
TOKEN = os.environ.get("GITHUB_TOKEN", "")
DRY = os.environ.get("DRY") == "1"
NOW = dt.datetime.fromisoformat(os.environ.get("NOW", dt.datetime.now(dt.timezone.utc).isoformat()).replace("Z", "+00:00"))
DAY = dt.timedelta(days=1)


def api(path, method="GET", body=None):
    req = urllib.request.Request("https://api.github.com/repos/%s/%s" % (REPO, path), method=method,
                                 data=json.dumps(body).encode() if body is not None else None)
    req.add_header("Accept", "application/vnd.github+json")
    req.add_header("Content-Type", "application/json")
    if TOKEN:
        req.add_header("Authorization", "Bearer " + TOKEN)
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.loads(r.read() or "null")


def when(s):
    return dt.datetime.fromisoformat(s.replace("Z", "+00:00"))


def issues(label, state="all"):
    return [i for i in api("issues?labels=%s&state=%s&per_page=100" % (label, state)) if "pull_request" not in i]


def ensure(label, key, title, body):
    """Заводит issue с меткой, если issue с этим ключом ещё нет (в любом состоянии)."""
    mark = "<!-- metrics:%s -->" % key
    if any(mark in (i.get("body") or "") for i in issues(label)):
        return False
    print("заводит %s: %s" % (label, title))
    if not DRY:
        api("issues", "POST", {"title": title, "labels": [label], "body": body + "\n\n" + mark})
    return True


since = NOW - 7 * DAY
# События до запуска сбора (24.11.2026) уже разобраны вручную (уроки L001–L005), их не заводим заново.
START = when(os.environ.get("START", "2026-11-24T06:30:00Z"))
commits = [c for c in api("commits?sha=main&per_page=100") if when(c["commit"]["committer"]["date"]) <= NOW]
runs = api("actions/runs?branch=main&event=push&per_page=100")["workflow_runs"]
pulls = api("pulls?state=closed&base=main&per_page=100")
found = []
for c in commits:
    first = c["commit"]["message"].splitlines()[0]
    if (first.startswith("Revert") or "Откат" in first) and when(c["commit"]["committer"]["date"]) >= START:
        found.append(("revert-" + c["commit"]["committer"]["date"][:10], "Откат в main: " + first[:80], "Коммит %s откатывает слитое." % c["sha"][:7]))
for r in runs:
    if r["name"] == "check" and r["conclusion"] == "failure" and when(r["created_at"]) >= START:
        found.append(("redmain-" + r["head_sha"][:7], "Красный main на %s" % r["head_sha"][:7], r["html_url"]))
for p in pulls:
    if not p.get("merged_at") or when(p["merged_at"]) < max(since, START):
        continue
    checks = api("commits/%s/check-runs?per_page=100" % p["head"]["sha"])["check_runs"]
    if not any(c["name"] == "check" and c["conclusion"] == "success" for c in checks):
        found.append(("nogreen-%d" % p["number"], "Слит без зелёной проверки: PR #%d" % p["number"], p["html_url"]))
drafts = issues("lesson-draft")
for b in issues("roman-bug", "open"):
    if any(l["name"] == "lesson-draft" for l in b["labels"]):
        continue
    if not any("#%d" % b["number"] in (d.get("body") or "") for d in drafts):
        found.append(("roman-%d" % b["number"], "Ошибка Романа без урока: #%d %s" % (b["number"], b["title"][:60]), "Ошибку нашёл Роман: #%d." % b["number"]))
found = list({k: (k, t, b) for k, t, b in found}.values())
new = sum(ensure("lesson-draft", k, "Черновик урока: " + t, b + "\nЧто случилось, причина, защита test_Lxxx и строка в lessons.md закрывают черновик.") for k, t, b in found)

# М9: черновик старше трёх дней. М7: самая старая правка main, которой нет в выкладке web.
causes = ["черновик урока #%d открыт больше трёх дней" % d["number"] for d in drafts
          if d["state"] == "open" and NOW - when(d["created_at"]) > 3 * DAY]
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import glob, povtory  # урок L048: повтор просьбы Романа без хозяина, урока и защиты больше суток — остановка
code = "\n".join(open(f, encoding="utf-8", errors="ignore").read() for f in glob.glob("tests/*.gd") + glob.glob("tools/**/*.*", recursive=True) + glob.glob("proby/**/*.mjs", recursive=True))
causes += povtory.causes(issues("povtor", "open"), open("lessons.md", encoding="utf-8").read(), code, NOW)
web_ok = [r for r in runs if r["name"] == "web" and r["conclusion"] == "success"]
deployed = web_ok[0]["head_sha"] if web_ok else None
waiting = []
for c in commits:
    if c["sha"] == deployed:
        break
    waiting.append(c)
if waiting:
    age = NOW - when(waiting[-1]["commit"]["committer"]["date"])
    if age > 2 * DAY:
        causes.append("правка %s ждёт выкладки %d ч" % (waiting[-1]["sha"][:7], age.total_seconds() // 3600))
stops = issues("stop", "open")
if causes and not stops:
    print("остановка: " + "; ".join(causes))
    if not DRY:
        api("issues", "POST", {"title": "Остановка: " + causes[0], "labels": ["stop"],
                               "body": "Новые задачи стоят, пока причина не уйдёт (PR с меткой fix проходят).\n\n- " + "\n- ".join(causes)})
elif not causes:
    for s in stops:
        print("снимает остановку #%d" % s["number"])
        if not DRY:
            api("issues/%d" % s["number"], "PATCH", {"state": "closed"})

week = [p for p in pulls if p.get("merged_at") and when(p["merged_at"]) >= since]
proc = sum(1 for p in week if any(l["name"] == "process" for l in p["labels"]))
reverts = sum(1 for k, _, _ in found if k.startswith("revert-"))
rows = [("Слито PR за 7 дней", len(week)), ("Из них с меткой process", "%d (%d %%)" % (proc, 100 * proc // max(1, len(week)))),
        ("Откатов в main с 24.11 (по дням)", reverts),
        ("Красных прогонов check на main", sum(1 for r in runs if r["name"] == "check" and r["conclusion"] == "failure")),
        ("Ошибок Романа (roman-bug), всего", len(issues("roman-bug"))),
        ("Открытых черновиков уроков", sum(1 for d in drafts if d["state"] == "open")),
        ("Новых черновиков сегодня", new), ("Правок main ждут выкладки", len(waiting)),
        ("Остановка", "; ".join(causes) or "нет")]
page = "Обновляет tools/metrics.py раз в день, руками не править. %s UTC\n\n| Мерило | Значение |\n|---|---|\n" % NOW.strftime("%d.%m.%Y %H:%M")
page += "\n".join("| %s | %s |" % r for r in rows)
print(page)
if not DRY:
    old = [i for i in api("issues?state=open&per_page=100") if i["title"] == "Мерила"]
    if old:
        api("issues/%d" % old[0]["number"], "PATCH", {"body": page})
    else:
        api("issues", "POST", {"title": "Мерила", "body": page})
