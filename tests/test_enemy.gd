extends RefCounted
## Враг (часть пункта 5): строит, добывает, нападает. Партия доигрывается до победы и до поражения.


const DT := 0.05

## Партия с шагом DT; play(sim) — ход игрока раз в 2 с. Возвращает время конца или -1.
func _match(play: Callable, limit := 600.0) -> float:
	var sim := Sim.new()
	var enemy := Enemy.new(sim)
	var think := 0.0
	for i in int(limit / DT):
		enemy.step(DT)
		sim.step(DT)
		think += DT
		if think >= 2.0:
			think = 0.0
			play.call(sim)
		if sim.winner != -1:
			return sim.time if sim.winner == Sim.ENEMY else -sim.time
	return 0.0


## Простой игрок: два лагеря к ближним залежам, потом к свободным; три казармы на врага.
func _rush(sim: Sim) -> void:
	var camps := sim.of_side(Sim.PLAYER, "camp")
	if camps.size() < 2:
		var at: Vector2 = [Vector2(250, 830), Vector2(470, 830)][camps.size()]
		var c := sim.build(Sim.PLAYER, "camp", at)
		if not c.is_empty():
			sim.set_path(c, [Vector2(170, 760), Vector2(550, 760)][camps.size()])
	elif sim.of_side(Sim.PLAYER, "barracks").size() < 3:
		var n := sim.of_side(Sim.PLAYER, "barracks").size()
		sim.build(Sim.PLAYER, "barracks", [Vector2(300, 750), Vector2(420, 750), Vector2(360, 640)][n])
	var helper := Enemy.new(sim)
	helper.side = Sim.PLAYER
	for c in camps:
		if c.target.get("gold", 0) <= 0 and not helper._free_deposit(c.pos).is_empty():
			sim.set_path(c, helper._free_deposit(c.pos).pos)
	for b in sim.of_side(Sim.PLAYER, "barracks"):
		if sim.time > 40 and (b.target.is_empty() or b.target.hp <= 0) and not sim.of_side(Sim.ENEMY).is_empty():
			sim.set_path(b, sim.of_side(Sim.ENEMY)[-1].pos)


func test_enemy_builds_and_mines() -> String:
	var sim := Sim.new()
	var enemy := Enemy.new(sim)
	for i in int(30 / DT):
		enemy.step(DT)
		sim.step(DT)
	var camps := sim.of_side(Sim.ENEMY, "camp").filter(func(c): return not c.target.is_empty())
	if camps.size() < 2:
		return "за 30 с у врага %d лагерей с тропой, ждали 2" % camps.size()
	return ""


func test_passive_player_loses() -> String:
	var t := _match(func(_s): pass)
	if t <= 0:
		return "игрок без действий не проиграл за 10 минут (итог %.0f)" % t
	print("    поражение бездействием на %d:%02d" % [int(t) / 60, int(t) % 60])
	return ""


func test_simple_player_wins() -> String:
	var t := _match(_rush)
	if t >= 0:
		return "простой игрок не победил за 10 минут (итог %.0f)" % t
	print("    победа простого игрока на %d:%02d" % [int(-t) / 60, int(-t) % 60])
	return ""


## Зачем игроку: башня у вражеского печенья отбивает его — лагерь врага, потерявший трёх носильщиков
## за свисток, уводит тропу на залежь мимо башен или затихает, а не кормит башню людьми (было 42 за 3 минуты).
func test_tower_drives_enemy_camp_off_cookie() -> String:
	var sim := Sim.new()
	var enemy := Enemy.new(sim)
	sim.gold[Sim.PLAYER] = 10000.0
	sim.set_path(sim.build(Sim.PLAYER, "camp", Vector2(250, 830)), Vector2(170, 760))
	var tower := {}
	var camp := {}
	var cookie := {}
	for i in int(240 / DT):
		enemy.step(DT)
		sim.step(DT)
		if tower.is_empty() and sim.time > 60:
			camp = sim.of_side(Sim.ENEMY, "camp")[0]
			cookie = camp.target
			var mid: Vector2 = camp.pos.lerp(cookie.pos, 0.5)
			for off in [Vector2(40, 80), Vector2(80, 40), Vector2(0, 100), Vector2(100, 80)]:
				if tower.is_empty() and sim.can_build(Sim.PLAYER, "tower", mid + off) == "":
					tower = sim.build(Sim.PLAYER, "tower", mid + off)
			if tower.is_empty():
				return "башню у лагеря врага не поставить"
	if is_same(camp.target, cookie) or tower.get("kills", 0) > 20:
		return "лагерь врага кормит башню людьми: сбито %d за 3 минуты (можно до 20), тропа на прежнее печенье: %s" % [tower.get("kills", 0), is_same(camp.target, cookie)]
	print("    башня у лагеря врага за 3 минуты сбила %d, дальше лагерь затих или ушёл" % tower.kills)
	return ""
