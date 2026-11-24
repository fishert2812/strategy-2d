extends RefCounted
## Проба «Ручьи» (proby/streams_sim.gd): ручей, проведённый пальцем, захватывает колонию;
## встречный ручей врага его съедает; два бота доигрывают партию за 2–6 минут, и партии разные.

const Flow := preload("res://proby/streams_sim.gd")


func _cfg() -> Dictionary:
	return JSON.parse_string(FileAccess.get_file_as_string("res://proby/proby.json")).streams


func _sim(seed: int) -> Flow:
	var s := Flow.new(_cfg(), seed, Vector2(720, 1400), 120.0)
	s.bots = {}
	return s


func _weakest(s: Flow) -> int:
	var best := -1
	for i in s.colonies.size():
		if s.colonies[i].side == Flow.NONE and (best < 0 or s.colonies[i].mass < s.colonies[best].mass):
			best = i
	return best


func test_stream_captures_and_meets_enemy_stream() -> String:
	var s := _sim(5)
	var t := _weakest(s)
	var bend := PackedVector2Array([s.colonies[0].pos.lerp(s.colonies[t].pos, 0.5) + Vector2(40, 0)])
	s.set_stream(0, t, bend)
	var sec := 0.0
	while s.colonies[t].side != Flow.ME and sec < 30.0:
		s.step(0.05)
		sec += 0.05
	print("    паспорт: ничья колония захвачена за %.1f с" % sec)
	if s.colonies[t].side != Flow.ME:
		return "за 30 с ручей не захватил ничью колонию"
	# Встречный ручей: враг течёт навстречу по тому же пути — клетки гибнут парами.
	var s2 := _sim(5)
	s2.colonies[1].pos = s2.colonies[0].pos + Vector2(0, -500)
	s2.set_stream(0, 1, PackedVector2Array())
	s2.set_stream(1, 0, PackedVector2Array())
	var hits := [0]
	s2.event.connect(func(k, _p, _s): if k == "hit": hits[0] += 1)
	for i in 200:
		s2.step(0.05)
	print("    паспорт: встречных гибелей за 10 с: %d" % hits[0])
	return "" if hits[0] >= 10 else "встречные ручьи почти не сталкиваются: %d" % hits[0]


func test_two_bots_finish_and_games_differ() -> String:
	var ends: Array = []
	var firsts := {}
	for seed in [1, 2, 3, 4, 5]:
		var s := Flow.new(_cfg(), seed, Vector2(720, 1400), 120.0)
		s.bots[Flow.ME] = s.new_bot()
		var t := 0.0
		while t < 480.0 and s.owns(Flow.ME) and s.owns(Flow.FOE):
			s.step(0.1)
			t += 0.1
			if not firsts.has(seed) and s.colonies[1].to >= 0:
				firsts[seed] = s.colonies[1].to
		ends.append(t)
	ends.sort()
	print("    паспорт: конец партий, с: %s; первые цели врага: %s" % [str(ends), str(firsts.values())])
	if ends[2] < 90.0 or ends[2] > 400.0:
		return "медианная партия ботов %d с, а нужно 90–400" % ends[2]
	if firsts.values().all(func(v): return v == firsts.values()[0]):
		return "враг во всех партиях бьёт одну и ту же первую цель"
	return ""
