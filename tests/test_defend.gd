extends RefCounted
## Защита построек (геймдизайнер, 0.29: «в Разгроме воины почти не дерутся»): бьют мою постройку —
## ждущие свистка воины ближних казарм бегут её защищать, 5 секунд без ударов — назад на пост.


func _run(sim: Sim, seconds: float) -> void:
	for i in int(seconds * 60):
		sim.step(1.0 / 60.0)


func _guard(sim: Sim, b: Dictionary) -> Dictionary:
	return sim.units.filter(func(u): return is_same(u.home, b))[0]


func test_waiting_guards_run_to_beaten_building_within_radius() -> String:
	var sim := Sim.new()
	sim.gold = [1000, 1000]
	var camp := sim.build(Sim.PLAYER, "camp", Vector2(360, 600))
	var r: float = sim.cfg.defend.radius
	var near := sim.build(Sim.PLAYER, "barracks", camp.pos + Vector2(r, 0))
	var far := sim.build(Sim.PLAYER, "barracks", camp.pos - Vector2(r + 1, 0))
	_run(sim, 6.0)
	var a := _guard(sim, near)
	var b := _guard(sim, far)
	var was := [a.pos.distance_to(camp.pos), b.pos.distance_to(camp.pos)]
	var raider := {"id": 999, "side": Sim.ENEMY, "kind": "warrior", "pos": camp.pos + Vector2(0, -40), "hp": 600.0, "home": camp, "cd": 0.0, "post": Vector2.ZERO, "go": false, "leg": 0}
	sim.units.append(raider)
	sim._hit(raider, camp)
	_run(sim, 4.0)
	if a.pos.distance_to(camp.pos) > 60 or raider.hp >= 600.0:
		return "воин казармы в %d от битого лагеря не прибежал и не бьёт (до лагеря %d)" % [r, a.pos.distance_to(camp.pos)]
	if b.pos.distance_to(camp.pos) < was[1] - 5:
		return "воин казармы в %d от лагеря побежал, а не должен" % (r + 1)
	sim.units.erase(raider)
	_run(sim, sim.cfg.defend.seconds + 6.0)
	if a.pos.distance_to(near.pos) > 80:
		return "тревога кончилась, а воин не вернулся на пост (до казармы %d)" % a.pos.distance_to(near.pos)
	return ""


func test_marching_squad_does_not_turn_to_defend() -> String:
	var sim := Sim.new()
	sim.gold = [1000, 1000]
	var camp := sim.build(Sim.PLAYER, "camp", Vector2(360, 600))
	var b := sim.build(Sim.PLAYER, "barracks", Vector2(500, 700))
	sim.set_route(b, [Vector2(500, 150)])
	_run(sim, sim.whistle + 0.5)
	var u := _guard(sim, b)
	if not u.go:
		return "отряд не вышел на свисток"
	var y: float = u.pos.y
	var raider := {"id": 999, "side": Sim.ENEMY, "kind": "warrior", "pos": camp.pos + Vector2(0, -40), "hp": 600.0, "home": camp, "cd": 0.0, "post": Vector2.ZERO, "go": false, "leg": 0}
	sim.units.append(raider)
	sim._hit(raider, camp)
	_run(sim, 2.0)
	if u.pos.y > y - 100:
		return "воин на марше свернул защищать лагерь (y был %d, стал %d)" % [y, u.pos.y]
	return ""


## Зачем игроку: в «Разгроме» враг, пришедший ломать мой лагерь или казарму, получает бой, а не ломает
## без помехи: в 6 партиях простого бота ждущие свистка воины сбивают не меньше 40 чужих (без защиты — около 25).
func test_rout_has_fights() -> String:
	var t: RefCounted = load("res://tests/test_enemy.gd").new()
	var guards := [0]
	for k in 6:
		var sim := Sim.new()
		var enemy := Enemy.new(sim)
		sim.changed.connect(func(what, d):
			if what == "killed" and d.kind == "warrior":
				var by := sim.units.filter(func(u): return u.id == d.by)
				if not by.is_empty() and by[0].side == Sim.PLAYER and not by[0].go:
					guards[0] += 1)
		var think := -k * 0.3
		while sim.winner == -1 and sim.time < 600:
			enemy.step(0.05)
			sim.step(0.05)
			think += 0.05
			if think >= 2.0:
				think = 0.0
				t._rush(sim)
	print("    «Разгром», простой бот, 6 партий: защитники сбили %d" % guards[0])
	return "" if guards[0] >= 40 else "в «Разгроме» защитники сбили за 6 партий %d чужих воинов (ждали от 40)" % guards[0]
