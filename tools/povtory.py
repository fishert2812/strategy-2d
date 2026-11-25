# povtory.py — защита от повторов (урок L048). Роман 25.11 10:29: «Уже который раз меню поправить прошу в чем проблема?
# То нужно какое то правило на подобные проблемы? Потому что не решаются уже который раз».
# Правило (наше, с 25.11): просьба Романа, повторённая второй раз, — issue с меткой povtor (в теле «повтор #N» первой просьбы).
# Через сутки у неё должен быть урок: строка в lessons.md с номером этой issue и защитой test_Lxxx, которая есть в коде,
# и хозяин — тред, указанный в issue строкой «хозяин: …». Иначе metrics.py ставит остановку новых задач.
# python3 -I tools/povtory.py --selftest — самопроверка на нарочно сломанных примерах.
import datetime as dt, re, sys

DAY = dt.timedelta(days=1)


def when(s):
    return dt.datetime.fromisoformat(s.replace("Z", "+00:00"))


def causes(issues, lessons, code, now):
    """issues — открытые issue с меткой povtor; lessons — текст lessons.md; code — тексты защит. Вернёт список причин остановки."""
    out = []
    for i in issues:
        n, body = i["number"], i.get("body") or ""
        if now - when(i["created_at"]) <= DAY:
            continue
        row = next((l for l in lessons.splitlines() if re.match(r"\| L\d{3} \|", l) and re.search(r"#%d\b" % n, l)), None)
        lid = re.match(r"\| (L\d{3}) \|", row).group(1) if row else None
        if not re.search(r"хозяин:\s*\S", body, re.I):
            out.append("повтор #%d без хозяина-треда больше суток" % n)
        elif not lid:
            out.append("повтор #%d без урока в lessons.md больше суток" % n)
        elif not re.search(r"test_%s\b" % lid, code):
            out.append("повтор #%d: урок %s без защиты test_%s" % (n, lid, lid))
    return out


if __name__ == "__main__" and "--selftest" in sys.argv:
    now = when("2026-11-27T00:00:00Z")
    good = {"number": 7, "created_at": "2026-11-25T02:30:00Z", "body": "повтор #3\nхозяин: Перестроить меню паузы"}
    L = "| L037 | Роман: меню снова (#7) | … | `test_L037` |"
    cases = [("всё есть", [good], L, "test_L037", 0),
             ("нет хозяина", [dict(good, body="повтор #3")], L, "test_L037", 1),
             ("нет урока", [good], "| L037 | другое | … |", "test_L037", 1),
             ("урок без защиты", [good], L, "", 1),
             ("моложе суток не трогаем", [dict(good, created_at="2026-11-26T12:00:00Z", body="")], "", "", 0)]
    bad = 0
    for name, iss, les, code, want in cases:
        got = len(causes(iss, les, code, now))
        ok = (got > 0) == (want > 0)
        print(("  ок   " if ok else "  ПРОВАЛ ") + "test_L048: %s — причин %d" % (name, got))
        bad += not ok
    sys.exit(1 if bad else 0)
