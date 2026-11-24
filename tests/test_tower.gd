extends RefCounted
## Башня-лучник (design/bashnya_luchnik.md): держит место сама; один отряд её не берёт, два берут.

const DT := 0.05


## Башня игрока в (360, 500), уже заведённая, и n воинов врага, вышедших по нитке через points.
func _setup(n: int, points: Array) -> Dictionary:
	var sim := Sim.new()
	var tower := sim._add_building(Sim.PLAYER, "tower", Vector2(360, 500))
	tower.awake = true
	var barracks := sim._add_building(Sim.ENEMY, "barracks", Vector2(360, 200))
	sim.gold[Sim.ENEMY] = -1000  # своих новых воинов казарма не родит
	sim.whistle = 1000.0
	sim.set_route(barracks, points)
	for i in n:
		var post := Vector2((i % 4 - 1.5) * 14, (i / 4) * 14)
		sim.units.append({"id": 900 + i, "side": Sim.ENEMY, "kind": "warrior", "pos": barracks.pos + post, "hp": sim.cfg.warrior.hp, "home": barracks, "cd": 0.0, "post": post, "go": true, "leg": 0})
	return {"sim": sim, "tower": tower}


func _run(sim: Sim, seconds: float) -> void:
	for i in int(seconds / DT):
		sim.step(DT)


func _hp(sim: Sim) -> Array:
	return sim.units.filter(func(u): return u.side == Sim.ENEMY).map(func(u): return u.hp)


func test_squad_passes_through_circle_bruised() -> String:
	var s := _setup(4, [Vector2(360, 500), Vector2(360, 760)])
	_run(s.sim, 15.0)
	var hp := _hp(s.sim)
	var lost: float = 4 * s.sim.cfg.warrior.hp - hp.reduce(func(a, b): return a + b, 0.0)
	if hp.size() != 4 or lost < 30 or lost > 50:
		return "сквозь круг прошло %d из 4, потеряно здоровья %d (ждали 30–50)" % [hp.size(), lost]
	print("    отряд прошёл сквозь круг, потерял %d здоровья" % lost)
	return ""


func test_one_squad_does_not_take_tower_two_do() -> String:
	var one := _setup(4, [Vector2(360, 500)])
	_run(one.sim, 60.0)
	if one.tower.hp <= 0:
		return "один отряд из 4 взял башню"
	var two := _setup(8, [Vector2(360, 500)])
	_run(two.sim, 60.0)
	if two.tower.hp > 0 or _hp(two.sim).size() < 6:
		return "два отряда: башня %d здоровья, выжило %d из 8 (ждали пала и не меньше 6)" % [two.tower.hp, _hp(two.sim).size()]
	print("    один отряд: у башни %d из 220; два отряда: выжило %d из 8" % [one.tower.hp, _hp(two.sim).size()])
	return ""


func test_tower_wakes_on_whistle_and_eats_crumbs() -> String:
	var s := _setup(1, [Vector2(360, 470)])
	var sim: Sim = s.sim
	s.tower.awake = false
	_run(sim, 10.0)
	if _hp(sim)[0] < sim.cfg.warrior.hp:
		return "башня стреляет до свистка"
	sim.gold[Sim.PLAYER] = 3
	sim.whistle = DT
	_run(sim, 5.0)
	if _hp(sim)[0] < sim.cfg.warrior.hp or not s.tower.slept:
		return "без крошек на свистке башня не уснула"
	sim.gold[Sim.PLAYER] = 20
	sim.whistle = DT
	_run(sim, 3.0)
	if _hp(sim)[0] >= sim.cfg.warrior.hp or sim.gold[Sim.PLAYER] > 20 - sim.cfg.tower.upkeep + 5:
		return "с крошками башня не проснулась или не взяла %d крошек" % sim.cfg.tower.upkeep
	return ""


func test_tower_spares_buildings_and_far_units() -> String:
	var s := _setup(2, [Vector2(360, 500 - 130 - 5)])  # отряд встаёт сразу за кругом
	var sim: Sim = s.sim
	var camp := sim._add_building(Sim.ENEMY, "camp", Vector2(360, 420))
	_run(sim, 15.0)
	if camp.hp < camp.max_hp or _hp(sim) != [60.0, 60.0]:
		return "башня била постройку или воина за кругом"
	return ""


## Новичок: два лагеря у ближних печений и больше ничего; с башней — ещё одна башня у лагеря на первой минуте.
## Возвращает, на какой секунде враг сломал первый лагерь.
func _first_camp_lost(tower_at: Vector2) -> float:
	var sim := Sim.new()
	var enemy := Enemy.new(sim)
	var lost := [0.0]
	sim.changed.connect(func(what, b): if what == "destroyed" and b.kind == "camp" and b.side == Sim.PLAYER and lost[0] == 0.0: lost[0] = sim.time)
	for i in int(600 / DT):
		enemy.step(DT)
		sim.step(DT)
		var camps := sim.of_side(Sim.PLAYER, "camp")
		if camps.size() < 2 and sim.time < 30:
			var c := sim.build(Sim.PLAYER, "camp", [Vector2(250, 830), Vector2(470, 830)][camps.size()])
			if not c.is_empty():
				sim.set_path(c, [Vector2(170, 760), Vector2(550, 760)][camps.size()])
		if tower_at != Vector2.ZERO and sim.time > 40 and sim.time < 60 and sim.of_side(Sim.PLAYER, "tower").is_empty():
			sim.build(Sim.PLAYER, "tower", tower_at)
		if lost[0] > 0 or sim.winner != -1:
			break
	return lost[0] if lost[0] > 0 else 600.0


func test_tower_keeps_novice_camp_longer() -> String:
	var bare := _first_camp_lost(Vector2.ZERO)
	var guarded := _first_camp_lost(Vector2(250, 750))
	print("    первый лагерь новичка пал: без башни %d:%02d, с башней %d:%02d" % [int(bare) / 60, int(bare) % 60, int(guarded) / 60, int(guarded) % 60])
	if guarded <= bare:
		return "с башней у лагеря новичок теряет лагерь не позже, чем без неё"
	return ""
