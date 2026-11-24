extends RefCounted
## Пункты 1–2: поле, золото, постройка, победа и поражение, «Ещё раз».


func test_field_has_two_homes_and_seven_deposits() -> String:
	var sim := Sim.new()
	if sim.of_side(Sim.PLAYER, "home").size() != 1 or sim.of_side(Sim.ENEMY, "home").size() != 1:
		return "домов не по одному у сторон"
	if sim.deposits.size() != 7:
		return "залежей %d, а нужно 7" % sim.deposits.size()
	return ""


func test_build_near_own_costs_gold() -> String:
	var sim := Sim.new()
	var home: Dictionary = sim.of_side(Sim.PLAYER, "home")[0]
	var start: int = sim.gold[Sim.PLAYER]
	if sim.build(Sim.PLAYER, "camp", home.pos + Vector2(120, 0)).is_empty():
		return "лагерь рядом с домом не построился"
	if sim.gold[Sim.PLAYER] != start - sim.cfg.buildings.camp.cost:
		return "золото %d, а ждали %d" % [sim.gold[Sim.PLAYER], start - sim.cfg.buildings.camp.cost]
	var far := sim.can_build(Sim.PLAYER, "camp", Vector2(360, 300))
	if far != "далеко от своих":
		return "у врага строить можно: «%s»" % far
	sim.gold[Sim.PLAYER] = 0
	if sim.can_build(Sim.PLAYER, "camp", home.pos + Vector2(-120, 0)) != "мало золота":
		return "без золота строить можно"
	return ""


func test_home_drips_gold() -> String:
	var sim := Sim.new()
	for i in 200:
		sim.step(1.0 / 60.0)
	var want: int = sim.cfg.start_gold + 2 * sim.cfg.home_drip.gold
	if sim.gold[Sim.PLAYER] != want:
		return "за 3,3 с золота %d, ждали %d" % [sim.gold[Sim.PLAYER], want]
	return ""


func test_destroying_all_buildings_ends_game() -> String:
	for side in [Sim.ENEMY, Sim.PLAYER]:
		var sim := Sim.new()
		var home: Dictionary = sim.of_side(side, "home")[0]
		sim.damage(home, home.hp)
		if sim.winner != 1 - side:
			return "разрушен дом стороны %d, а победитель %d" % [side, sim.winner]
	return ""


func test_end_screen_and_again() -> String:
	var battle: Control = load("res://scenes/battle.tscn").instantiate()
	(Engine.get_main_loop() as SceneTree).root.add_child(battle)
	var home: Dictionary = battle.sim.of_side(Sim.ENEMY, "home")[0]
	battle.sim.damage(home, home.hp)
	var shown: bool = battle.get_node("End").visible
	var title: String = battle.get_node("End/Center/Box/Title").text
	battle.get_node("End/Center/Box/Again").pressed.emit()
	var again: bool = not battle.get_node("End").visible and battle.sim.buildings.size() == 2
	battle.free()
	if not shown or title != "Победа!":
		return "после разрушения дома врага нет окна «Победа!»"
	if not again:
		return "«Ещё раз» не начал партию заново"
	return ""
