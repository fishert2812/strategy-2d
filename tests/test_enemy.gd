extends RefCounted
## Враг (часть пункта 5): строит, добывает, нападает. Партия доигрывается до победы и до поражения.


const DT := 0.05

## Партия с шагом DT; play(sim) — ход игрока раз в every с, первый после delay. Возвращает время конца
## (минус — победа игрока) или 0.
func _match(play: Callable, limit := 600.0, every := 2.0, delay := 0.0) -> float:
	var sim := Sim.new()
	var enemy := Enemy.new(sim)
	var think := -delay
	for i in int(limit / DT):
		enemy.step(DT)
		sim.step(DT)
		think += DT
		if think >= every:
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


## Одной партии бота не верим (партии хаотичны): 12 партий при двух темпах игрока,
## простой игрок выигрывает больше половины, медиана конца — не дольше 10 минут.
func test_simple_player_wins() -> String:
	var ends := []
	for every in [1.0, 2.0]:
		for k in 6:
			ends.append(_match(_rush, 900.0, every, k * 0.3))
	var wins := ends.filter(func(t): return t < 0).size()
	var times := ends.map(func(t): return absf(t) if t != 0.0 else 900.0)
	times.sort()
	var median: float = (times[5] + times[6]) / 2.0
	print("    простой игрок: побед %d из 12, медиана конца %d:%02d" % [wins, int(median) / 60, int(median) % 60])
	if wins <= 6 or median > 600.0:
		return "простой игрок: побед %d из 12, медиана конца %d с (ждали больше 6 и не дольше 600)" % [wins, median]
	return ""


## Зачем игроку: башня у вражеского лагеря не бесплатна — враг замечает, кто бьёт его носильщиков,
## и шлёт на неё две казармы разом. Башня у лагеря врага падает в первую минуту после первой жертвы
## (раньше стояла почти две минуты и сбивала 40 носильщиков).
func test_tower_at_enemy_camp_gets_raided() -> String:
	var sim := Sim.new()
	var enemy := Enemy.new(sim)
	sim.gold[Sim.PLAYER] = 10000.0
	sim.set_path(sim.build(Sim.PLAYER, "camp", Vector2(250, 830)), Vector2(170, 760))  # набег обычно идёт на добычу
	var tower := {}
	var first := -1.0
	for i in int(300 / DT):
		enemy.step(DT)
		sim.step(DT)
		if tower.is_empty() and sim.time > 60:
			var camp: Dictionary = sim.of_side(Sim.ENEMY, "camp")[0]
			var mid: Vector2 = camp.pos.lerp(camp.target.pos, 0.5)
			for off in [Vector2(40, 80), Vector2(80, 40), Vector2(0, 100), Vector2(100, 80)]:
				if tower.is_empty() and sim.can_build(Sim.PLAYER, "tower", mid + off) == "":
					tower = sim.build(Sim.PLAYER, "tower", mid + off)
			if tower.is_empty():
				return "башню у лагеря врага не поставить"
		if first < 0 and tower.get("kills", 0) > 0:
			first = sim.time
		if not tower.is_empty() and tower.hp <= 0:
			if sim.time - first > 60:
				return "башня у лагеря врага сбила %d и простояла после первой жертвы %d с (ждали минуту)" % [tower.kills, sim.time - first]
			print("    башня у лагеря врага сбила %d, первая жертва %d с, пала на %d с" % [tower.kills, first, sim.time])
			return ""
	var on := sim.of_side(Sim.ENEMY, "barracks").filter(func(b): return is_same(b.target, tower)).size()
	return "башня у лагеря врага стоит 4 минуты, сбила %d, на неё идут казарм: %d" % [tower.get("kills", 0), on]
