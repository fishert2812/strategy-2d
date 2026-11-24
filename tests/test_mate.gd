extends RefCounted
## «Шах и мат» (design/shah_i_mat.md): разбил кружку — победил; кружку бьют — ждущие воины бегут её защищать.

const DT := 0.05


func _run(sim: Sim, seconds: float) -> void:
	for i in int(seconds / DT):
		sim.step(DT)


## Партия против врага; play(sim) — ход игрока раз в секунду. Время победы (+), поражения (−) или 0.
func _match(mode: String, play: Callable, overrides := {}) -> float:
	var sim := Sim.new(overrides.merged({"mode": mode}))
	if overrides.has("alarm"):
		sim.mode.alarm = overrides.alarm
	var enemy := Enemy.new(sim)
	var think := 0.0
	for i in int(600 / DT):
		enemy.step(DT)
		sim.step(DT)
		think += DT
		if think >= 1.0:
			think = 0.0
			play.call(sim)
		if sim.winner != -1:
			return sim.time if sim.winner == Sim.PLAYER else -sim.time
	return 0.0


## Снайпер из прогонов геймдизайнера: казармы у кружки врага, все нитки на неё, один лагерь.
func _sniper(sim: Sim) -> void:
	var nb := sim.of_side(Sim.PLAYER, "barracks").size()
	if nb < 1:
		sim.build(Sim.PLAYER, "barracks", Vector2(360, 260))
	elif sim.of_side(Sim.PLAYER, "camp").is_empty():
		var c := sim.build(Sim.PLAYER, "camp", Vector2(250, 820))
		if not c.is_empty():
			sim.set_path(c, Vector2(170, 760))
	elif nb < 4:
		sim.build(Sim.PLAYER, "barracks", Vector2(240 + 80 * nb, 260))
	for b in sim.of_side(Sim.PLAYER, "barracks"):
		if b.target.is_empty() and not sim.of_side(Sim.ENEMY, "home").is_empty():
			sim.set_path(b, sim.of_side(Sim.ENEMY, "home")[0].pos)


func test_broken_mug_is_mate_only_in_mate() -> String:
	for mode in ["rout", "mate"]:
		var sim := Sim.new({"mode": mode})
		sim.gold[Sim.ENEMY] = 100
		sim.build(Sim.ENEMY, "camp", Vector2(250, 170))
		sim.damage(sim.of_side(Sim.ENEMY, "home")[0], 99999)
		var want := Sim.PLAYER if mode == "mate" else -1
		if sim.winner != want:
			return "«%s»: кружка врага разбита, лагерь цел — победитель %d, ждали %d" % [mode, sim.winner, want]
		sim.gold[Sim.ENEMY] = 1000
		if mode == "rout" and not sim.build(Sim.ENEMY, "barracks", Vector2(400, 200)).is_empty():
			return "«Разгром»: без кружки враг всё ещё строит"
	return ""


func test_check_calls_waiting_guards_to_mug() -> String:
	var sim := Sim.new({"mode": "mate"})
	sim.gold = [1000, 1000]
	var mug: Dictionary = sim.of_side(Sim.PLAYER, "home")[0]
	var b := sim.build(Sim.PLAYER, "barracks", Vector2(600, 600))
	_run(sim, 6.0)
	var guard: Dictionary = sim.units.filter(func(u): return u.side == Sim.PLAYER)[0]
	var raider := {"id": 999, "side": Sim.ENEMY, "kind": "warrior", "pos": mug.pos + Vector2(0, -60), "hp": 60.0, "home": mug, "cd": 0.0, "post": Vector2.ZERO, "go": false, "leg": 0}
	sim.units.append(raider)
	sim._hit(raider, mug)
	var checks := [0]
	sim.changed.connect(func(what, _d): if what == "check": checks[0] += 1)
	_run(sim, 4.0)
	if guard.pos.distance_to(mug.pos) > guard.pos.distance_to(b.pos):
		return "шах: ждущий воин не побежал к кружке (до кружки %d)" % guard.pos.distance_to(mug.pos)
	sim.units.erase(raider)
	_run(sim, 5.0 + 6.0)
	if guard.pos.distance_to(b.pos) > 80:
		return "тревога кончилась, а воин не вернулся к казарме"
	return ""


func test_sniper_does_not_win_early_and_builder_wins() -> String:
	var rout_test = load("res://tests/test_enemy.gd").new()
	var sniper := _match("mate", _sniper)
	var builder := _match("mate", rout_test._rush)
	var no_alarm := _match("mate", _sniper, {"alarm": 0.0})
	print("    «Шах и мат»: снайпер %.0f с, простой игрок %.0f с; без тревоги снайпер %.0f с" % [sniper, builder, no_alarm])
	if sniper > 0 and sniper < 240:
		return "снайпер разбил кружку врага раньше 4:00 (%.0f с)" % sniper
	if builder <= 0:
		return "простой игрок не победил в «Шах и мат» за 10 минут (%.0f)" % builder
	if not (no_alarm > 0 and no_alarm < 240):
		return "самопроверка: без тревоги снайпер должен побеждать раньше 4:00, а итог %.0f" % no_alarm
	return ""
