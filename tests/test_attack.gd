extends RefCounted
## Пункт 4: казарма и тропа атаки, бой, победа.


func _run(sim: Sim, seconds: float) -> void:
	for i in int(seconds * 60):
		sim.step(1.0 / 60.0)
		if sim.winner != -1:
			return


func test_barracks_path_destroys_enemy_home() -> String:
	var sim := Sim.new()
	var barracks := sim.build(Sim.PLAYER, "barracks", Vector2(360, 760))
	if not sim.set_path(barracks, Vector2(380, 130)):
		return "тропа казармы не прилипла к дому врага"
	_run(sim, 300.0)
	if sim.winner != Sim.PLAYER:
		return "за 300 с дом врага не разрушен (победитель %d)" % sim.winner
	return ""


func test_warriors_kill_carriers_on_the_way() -> String:
	var sim := Sim.new()
	sim.gold[Sim.ENEMY] = 200
	var camp := sim.build(Sim.ENEMY, "camp", Vector2(250, 170))
	sim.set_path(camp, Vector2(170, 240))
	var barracks := sim.build(Sim.PLAYER, "barracks", Vector2(360, 760))
	sim.set_path(barracks, camp.pos)
	# Отряд выходит на первый свисток (20 с), ломает лагерь к ~62 с.
	_run(sim, 90.0)
	if camp.hp > 0:
		return "лагерь врага цел через 90 с"
	if sim.units.any(func(u): return u.side == Sim.ENEMY):
		return "у врага остались носильщики"
	return ""


func test_barracks_without_path_guards_home() -> String:
	var sim := Sim.new()
	var mine := sim.build(Sim.PLAYER, "barracks", Vector2(360, 760))
	sim.gold[Sim.ENEMY] = 200
	var theirs := sim.build(Sim.ENEMY, "barracks", Vector2(360, 240))
	_run(sim, 13.0)
	sim.set_path(theirs, Vector2(360, 900))
	_run(sim, 40.0)
	var home: Dictionary = sim.of_side(Sim.PLAYER, "home")[0]
	if home.hp < home.max_hp:
		return "охрана у казармы не встретила набег: у дома %d из %d" % [home.hp, home.max_hp]
	return ""
