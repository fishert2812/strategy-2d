extends RefCounted
## Тропа воинов по пальцу (issue #26): ломаная, кончается где угодно, встреча отрядов, следующая цель.


func _run(sim: Sim, seconds: float, each := Callable()) -> void:
	for i in int(seconds / 0.05):
		sim.step(0.05)
		if each.is_valid():
			each.call()


func _warriors(sim: Sim, side: int) -> Array:
	return sim.units.filter(func(u): return u.side == side and u.kind == "warrior")


## Палец ведёт тропу в обход: от казармы влево через печенье, потом вверх к дому врага. Нитка цепляется за печенье.
func test_bent_route_goes_through_the_bend() -> String:
	var sim := Sim.new()
	var b := sim.build(Sim.PLAYER, "barracks", Vector2(360, 760))
	var trail := []
	for i in 21:
		trail.append(Vector2(360, 760).lerp(Vector2(40, 520), i / 20.0) + Vector2(randf_range(-6, 6), randf_range(-6, 6)))
	for i in 21:
		trail.append(Vector2(40, 520).lerp(Vector2(350, 110), i / 20.0) + Vector2(randf_range(-6, 6), randf_range(-6, 6)))
	if not sim.set_route(b, trail):
		return "ломаная тропа не легла"
	if b.route.size() < 2:
		return "нитка не обогнула печенье на изгибе: %s" % [b.route]
	if b.target.get("kind") != "home":
		return "конец тропы не прилип к дому врага"
	var near := [INF]
	_run(sim, 40.0, func():
		for u in _warriors(sim, Sim.PLAYER):
			near[0] = minf(near[0], u.pos.distance_to(Vector2(110, 500))))
	if near[0] > 60:
		return "отряд не прошёл через изгиб: ближе всего %d" % near[0]
	return ""


## Конец тропы в чистом поле: отряд доходит, стоит и держит место.
func test_route_end_in_field_holds_place() -> String:
	var sim := Sim.new()
	var b := sim.build(Sim.PLAYER, "barracks", Vector2(360, 760))
	var end := Vector2(250, 500)
	if not sim.set_route(b, [Vector2(330, 650), end]):
		return "тропа в поле не легла"
	if not b.target.is_empty():
		return "у тропы в поле появилась цель: %s" % b.target.kind
	_run(sim, 35.0)
	var out := _warriors(sim, Sim.PLAYER).filter(func(u): return u.go)
	if out.is_empty():
		return "на свисток никто не вышел"
	_run(sim, 25.0)
	for u in out:
		if u.pos.distance_to(end) > 40:
			return "воин не держит место в конце тропы: в %d от конца" % u.pos.distance_to(end)
	return ""


## Тропы крест-накрест: отряды выходят на свисток и дерутся на перекрёстке, до построек не дойдя.
func test_squads_meet_on_crossing() -> String:
	var sim := Sim.new()
	sim.gold = [200, 200]
	var mine := sim.build(Sim.PLAYER, "barracks", Vector2(260, 780))
	var theirs := sim.build(Sim.ENEMY, "barracks", Vector2(460, 220))
	sim.set_route(mine, [Vector2(460, 220)])
	sim.set_route(theirs, [Vector2(260, 780)])
	var fights := []
	sim.changed.connect(func(what, d): if what == "killed": fights.append([d.pos, sim.time]))
	var hurt := [INF]
	_run(sim, 45.0, func():
		if hurt[0] == INF and (mine.hp < mine.max_hp or theirs.hp < theirs.max_hp):
			hurt[0] = sim.time)
	if fights.is_empty():
		return "отряды не встретились"
	var mid := Vector2(360, 500)
	if fights[0][0].distance_to(mid) > 160 or fights[0][1] > hurt[0]:
		return "первый бой в %s на %.1f с, а не на перекрёстке до постройки" % [fights[0][0], fights[0][1]]
	return ""


## Цель разрушена — отряд сам идёт к ближайшей следующей постройке врага, тропа перескакивает.
func test_squad_moves_on_to_next_target() -> String:
	var sim := Sim.new()
	sim.gold[Sim.ENEMY] = 200
	var camp := sim.build(Sim.ENEMY, "camp", Vector2(250, 170))
	var b := sim.build(Sim.PLAYER, "barracks", Vector2(360, 760))
	sim.set_route(b, [camp.pos])
	_run(sim, 120.0)
	if camp.hp > 0:
		return "лагерь врага цел через 120 с"
	if b.target.get("kind") != "home" or b.route.is_empty() or b.route[-1] != b.target.pos:
		return "после лагеря тропа не перескочила на дом врага: %s" % b.target.get("kind")
	if b.target.hp >= b.target.max_hp:
		return "отряд не пошёл ломать дом врага"
	return ""


## Пальцем на экране: ведёшь от казармы в обход и отпускаешь — ложится та же нитка, что была под пальцем.
func test_finger_draws_bent_route() -> String:
	var tree := Engine.get_main_loop() as SceneTree
	var holder := Control.new()
	holder.size = Vector2(720, 1281)
	holder.mouse_filter = Control.MOUSE_FILTER_IGNORE
	tree.root.add_child(holder)
	var battle: Control = load("res://scenes/battle.tscn").instantiate()
	holder.add_child(battle)
	await tree.process_frame
	await tree.process_frame
	var sim: Sim = battle.sim
	var b := sim.build(Sim.PLAYER, "barracks", Vector2(360, 760))
	var way := [Vector2(360, 760), Vector2(40, 520), Vector2(350, 110)]
	var e := InputEventScreenTouch.new()
	e.pressed = true
	e.position = battle.world.to_global(way[0])
	battle.get_viewport().push_input(e, true)
	for leg in 2:
		for i in range(1, 16):
			var m := InputEventScreenDrag.new()
			m.position = battle.world.to_global(way[leg].lerp(way[leg + 1], i / 15.0))
			battle.get_viewport().push_input(m, true)
	var shown := Array(battle._drag.line.points)
	var up := InputEventScreenTouch.new()
	up.position = battle.world.to_global(way[2])
	battle.get_viewport().push_input(up, true)
	var route: Array = b.route.duplicate()
	var target: String = b.target.get("kind", "")
	holder.free()
	if shown != [b.pos] + route:
		return "под пальцем %s, а легло %s" % [shown, [b.pos] + route]
	if route.size() < 2 or route[0].distance_to(Vector2(110, 500)) > 70:
		return "палец провёл тропу в обход, а легла %s" % [route]
	if target != "home":
		return "конец тропы у дома врага, а цель «%s»" % target
	return ""
