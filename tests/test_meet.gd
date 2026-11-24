extends RefCounted
## Метка встречи (Роман 24.11: «не понятно где будет стычка у воинов»): где мой отряд на этом ходу
## встретит чужих и сколько их — «мои : чужие».


func _foe(sim: Sim, home: Dictionary, pos: Vector2) -> Dictionary:
	var u := {"id": 900 + sim.units.size(), "side": Sim.ENEMY, "kind": "warrior", "pos": pos, "hp": 60.0, "home": home, "cd": 0.0, "post": Vector2.ZERO, "go": false, "leg": 0}
	sim.units.append(u)
	return u


func _squad(sim: Sim, b: Dictionary) -> void:
	for i in int(6 / 0.05):
		sim.step(0.05)


func test_meet_on_the_way_and_at_target() -> String:
	var sim := Sim.new()
	sim.gold = [1000, 1000]
	var b := sim.build(Sim.PLAYER, "barracks", Vector2(360, 760))
	_squad(sim, b)
	var n: int = sim.units.filter(func(u): return is_same(u.home, b)).size()
	if not sim.meet(b).is_empty():
		return "без тропы есть метка"
	sim.set_route(b, [Vector2(360, 100)])
	var home: Dictionary = sim.of_side(Sim.ENEMY, "home")[0]
	var at_end := sim.meet(b)
	if at_end.get("pos") != home.pos or at_end.n != [n, 0]:
		return "без чужих на пути метка не у цели или не %d : 0: %s" % [n, at_end]
	var guard_home := sim.build(Sim.ENEMY, "barracks", home.pos + Vector2(150, 60))
	_foe(sim, guard_home, guard_home.pos)
	_foe(sim, guard_home, guard_home.pos + Vector2(10, 0))
	at_end = sim.meet(b)
	if at_end.n != [n, 2]:
		return "у цели не посчитаны защитники ближней казармы: %s" % [at_end]
	_foe(sim, home, Vector2(380, 450))
	var way := sim.meet(b)
	if way.pos.distance_to(Vector2(380, 450)) > sim.cfg.warrior.march_aggro + 1 or way.pos.y < 400 or way.n[1] != 1:
		return "чужой на пути, а метка не там: %s" % [way]
	return ""


## Зачем игроку: перед свистком над местом будущей стычки видно «мои : чужие» — понятно, где и с кем будет бой.
func test_meet_mark_shown_before_whistle() -> String:
	var t: RefCounted = load("res://tests/test_touch.gd").new()
	var battle: Control = await t._battle(Vector2i(720, 1281))
	var sim: Sim = battle.sim
	var tree := Engine.get_main_loop() as SceneTree
	sim.gold = [1000, 1000]
	var b := sim.build(Sim.PLAYER, "barracks", Vector2(360, 760))
	for i in 6:
		var u := {"id": 800 + i, "side": Sim.PLAYER, "kind": "warrior", "pos": b.pos, "hp": 60.0, "home": b, "cd": 0.0, "post": Vector2.ZERO, "go": false, "leg": 0}
		sim.units.append(u)
	sim.set_route(b, [Vector2(360, 100)])
	_foe(sim, sim.of_side(Sim.ENEMY, "home")[0], Vector2(360, 450))
	sim.whistle = 15.0
	await tree.process_frame
	var why := ""
	if battle._meets.has(b.id):
		why = "метка видна задолго до свистка — шумит"
	sim.whistle = battle.look.meet.before - 1.0
	await tree.process_frame
	var l: Label = battle._meets.get(b.id)
	if why == "" and (l == null or l.text != "6 : 1"):
		why = "перед свистком нет метки «6 : 1»: %s" % (l.text if l else "нет")
	elif why == "" and absf(l.position.y + l.size.y / 2 + battle.look.meet.lift - 450) > sim.cfg.warrior.march_aggro:
		why = "метка не над местом стычки: %s" % l.position
	battle.get_parent().free()
	return why
