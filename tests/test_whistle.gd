extends RefCounted
## Общий свисток (issue #24): воины копятся у казарм и выходят отрядами по свистку у обеих сторон разом.


func _warriors(sim: Sim, side: int) -> Array:
	return sim.units.filter(func(u): return u.side == side and u.kind == "warrior")


## Самый дальний от своей казармы воин стороны.
func _farthest(sim: Sim, side: int) -> float:
	var far := 0.0
	for u in _warriors(sim, side):
		far = maxf(far, u.pos.distance_to(u.home.pos))
	return far


func test_squads_leave_only_on_whistle() -> String:
	var sim := Sim.new()
	sim.gold = [200, 200]
	var mine := sim.build(Sim.PLAYER, "barracks", Vector2(360, 760))
	var theirs := sim.build(Sim.ENEMY, "barracks", Vector2(360, 240))
	sim.set_path(mine, Vector2(360, 100))
	sim.set_path(theirs, Vector2(360, 900))
	var whistles := [0]
	sim.changed.connect(func(what, _d): if what == "whistle": whistles[0] += 1)
	var every: float = sim.cfg.whistle.every
	while sim.time < every - 0.5:
		sim.step(0.05)
	for side in [Sim.PLAYER, Sim.ENEMY]:
		if _warriors(sim, side).size() < 2:
			return "до свистка у стороны %d накопилось воинов %d" % [side, _warriors(sim, side).size()]
		if _farthest(sim, side) > 80:
			return "сторона %d вышла до свистка: воин в %d от казармы" % [side, _farthest(sim, side)]
	while sim.time < every + 3.0:
		sim.step(0.05)
	if whistles[0] != 1:
		return "свистков за %d с: %d, ждали 1" % [every + 3, whistles[0]]
	for side in [Sim.PLAYER, Sim.ENEMY]:
		if _farthest(sim, side) < 150:
			return "на свисток сторона %d не вышла: дальний воин в %d от казармы" % [side, _farthest(sim, side)]
	return ""


## Вверху кольцо отсчёта; на свисток звук и тряска экрана.
func test_ring_counts_down_and_whistle_answers() -> String:
	var battle: Control = load("res://scenes/battle.tscn").instantiate()
	(Engine.get_main_loop() as SceneTree).root.add_child(battle)
	var sim: Sim = battle.sim
	var ring: Control = battle.get_node("Hud/Box/Top/Whistle")
	sim.step(sim.cfg.whistle.every - 5.0)
	battle._process(0.0)
	var shown := int(ring.get_node("Left").text)
	sim.step(5.1)
	var shake: float = battle.shake
	var played: int = battle.get_node("Feedback").played.get("whistle", 0)
	battle.free()
	if shown != 5:
		return "за 5 с до свистка кольцо показывает %d" % shown
	if played != 1 or shake <= 0:
		return "на свисток звуков %d, тряска %.1f" % [played, shake]
	return ""
